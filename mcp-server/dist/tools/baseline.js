import { decodeJwt, expectString, objectSchema, optionalObject, redactSensitive, schema, stableJson, } from "../client.js";
const REQUIRED_TOKEN_CLAIMS = ["iss", "sub", "email"];
const OPTIONAL_TOKEN_CLAIMS = ["organization"];
const STRUCTURAL_TOKEN_CLAIMS = new Set([
    "iss", "sub", "email", "organization", "iat", "exp", "nbf", "jti", "aud", "azp", "typ",
    "scope", "session_state", "sid", "auth_time", "acr", "amr", "nonce", "realm_access", "resource_access",
]);
const FORBIDDEN_TOKEN_CLAIMS = new Set([
    "permission", "permissions", "relationship", "relationships", "tenant", "tenantid", "activetenant",
    "capability", "capabilities", "delegatedcapability", "delegatedcapabilities",
]);
export function baselineTools(client) {
    return [
        {
            name: "export_sanitized_baseline",
            description: "Export a sanitized realm baseline containing realm, clients, roles, flows, scopes, protocol mappers, IdPs, and LDAP components without secrets or PII.",
            inputSchema: objectSchema({ realm: schema.string("Target realm name.") }, ["realm"]),
            handler: async (input) => exportSanitizedBaseline(client, expectString(input, "realm")),
        },
        {
            name: "diff_sanitized_baseline",
            description: "Compare a prior sanitized baseline snapshot with the current Keycloak state without mutating anything or exposing secrets/PII.",
            inputSchema: objectSchema({
                realm: schema.string("Target realm name."),
                baseline: schema.object("Previous export_sanitized_baseline result."),
            }, ["realm", "baseline"]),
            handler: async (input) => {
                const realm = expectString(input, "realm");
                const baseline = optionalObject(input, "baseline");
                if (!baseline)
                    throw new Error("baseline is required.");
                validateBaselineSnapshot(baseline, realm);
                const [before, after] = await Promise.all([
                    Promise.resolve(sanitizeBaseline(baseline)),
                    exportSanitizedBaseline(client, realm),
                ]);
                const differences = diffValues(before, after);
                return {
                    status: differences.added.length || differences.removed.length || differences.changed.length ? "changed" : "unchanged",
                    realm,
                    added: differences.added,
                    removed: differences.removed,
                    changed: differences.changed,
                    before,
                    after,
                };
            },
        },
        {
            name: "validate_token_contract",
            description: "Validate the SaaS token contract locally: iss, sub, and email are required; organization is optional; permission, relationship, active-tenant, and delegated-capability claims are prohibited. Signature validation is not performed.",
            inputSchema: objectSchema({ token: schema.string("Compact JWT. It is decoded locally and never sent to Keycloak or another service.") }, ["token"]),
            handler: async (input) => validateTokenContract(expectString(input, "token")),
        },
    ];
}
async function exportSanitizedBaseline(client, realm) {
    const [serverInfo, realmRepresentation, clients, realmRoles, flows, scopes, identityProviders, ldapProviders] = await Promise.all([
        client.get("/admin/serverinfo"),
        client.get(client.realmPath(realm)),
        client.get(client.realmPath(realm, "/clients")),
        client.get(client.realmPath(realm, "/roles")),
        client.get(client.realmPath(realm, "/authentication/flows")),
        client.get(client.realmPath(realm, "/client-scopes")),
        client.get(client.realmPath(realm, "/identity-provider/instances")),
        client.get(client.realmPath(realm, "/components"), { type: "org.keycloak.storage.UserStorageProvider" }),
    ]);
    const clientDetails = await Promise.all(clients.map(async (clientRepresentation) => {
        const clientUuid = typeof clientRepresentation.id === "string" ? clientRepresentation.id : undefined;
        if (!clientUuid)
            return { client: clientRepresentation, roles: [], mappers: [] };
        const [roles, mappers] = await Promise.all([
            client.get(client.realmPath(realm, `/clients/${encodeURIComponent(clientUuid)}/roles`)),
            client.get(client.realmPath(realm, `/clients/${encodeURIComponent(clientUuid)}/protocol-mappers/models`)),
        ]);
        return { client: clientRepresentation, roles, mappers };
    }));
    const scopeDetails = await Promise.all(scopes.map(async (scope) => {
        const scopeId = typeof scope.id === "string" ? scope.id : undefined;
        if (!scopeId)
            return { scope, mappers: [] };
        return {
            scope,
            mappers: await client.get(client.realmPath(realm, `/client-scopes/${encodeURIComponent(scopeId)}/protocol-mappers/models`)),
        };
    }));
    const identityProviderDetails = await Promise.all(identityProviders.map(async (provider) => {
        const alias = typeof provider.alias === "string" ? provider.alias : undefined;
        if (!alias)
            return { provider, mappers: [] };
        return {
            provider,
            mappers: await client.get(client.realmPath(realm, `/identity-provider/instances/${encodeURIComponent(alias)}/mappers`)),
        };
    }));
    return sanitizeBaseline({
        schemaVersion: 1,
        realm: realmRepresentation,
        serverVersion: typeof serverInfo.systemVersion === "string" ? serverInfo.systemVersion : serverInfo.version,
        clients: clientDetails.map(({ client: currentClient }) => currentClient),
        roles: {
            realm: realmRoles,
            clients: clientDetails.map(({ client: currentClient, roles }) => ({ clientId: currentClient.clientId, roles })),
        },
        flows,
        scopes: scopeDetails,
        mappers: {
            clients: clientDetails.map(({ client: currentClient, mappers }) => ({ clientId: currentClient.clientId, mappers })),
            clientScopes: scopeDetails,
            identityProviders: identityProviderDetails.map(({ provider, mappers }) => ({ alias: provider.alias, mappers })),
        },
        identityProviders: identityProviderDetails,
        ldap: ldapProviders,
    });
}
function validateBaselineSnapshot(baseline, realm) {
    if (baseline.schemaVersion !== 1)
        throw new Error("baseline.schemaVersion must be 1.");
    const snapshotRealm = isRecord(baseline.realm) ? baseline.realm.realm : undefined;
    if (snapshotRealm !== realm)
        throw new Error(`The baseline belongs to realm '${String(snapshotRealm)}', not '${realm}'.`);
}
function sanitizeBaseline(value) {
    const sanitized = redactSensitive(value, { redactInternalUrls: true, redactPii: true });
    return (typeof sanitized === "object" && sanitized !== null && !Array.isArray(sanitized) ? sanitized : {});
}
function diffValues(before, after) {
    const added = [];
    const removed = [];
    const changed = [];
    compareValues(normalizeForDiff(before), normalizeForDiff(after), "", added, removed, changed);
    return { added, removed, changed };
}
function compareValues(before, after, path, added, removed, changed) {
    if (stableJson(before) === stableJson(after))
        return;
    if (isRecord(before) && isRecord(after)) {
        const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
        for (const key of [...keys].sort()) {
            const childPath = `${path}/${escapePath(key)}`;
            if (!(key in before))
                added.push({ path: childPath, value: after[key] });
            else if (!(key in after))
                removed.push({ path: childPath, value: before[key] });
            else
                compareValues(before[key], after[key], childPath, added, removed, changed);
        }
        return;
    }
    if (Array.isArray(before) && Array.isArray(after)) {
        const max = Math.max(before.length, after.length);
        for (let index = 0; index < max; index += 1) {
            const childPath = `${path}/${index}`;
            if (index >= before.length)
                added.push({ path: childPath, value: after[index] });
            else if (index >= after.length)
                removed.push({ path: childPath, value: before[index] });
            else
                compareValues(before[index], after[index], childPath, added, removed, changed);
        }
        return;
    }
    changed.push({ path: path || "/", before, after });
}
function normalizeForDiff(value) {
    if (Array.isArray(value)) {
        const normalized = value.map(normalizeForDiff);
        return normalized.sort((left, right) => stableJson(arraySortKey(left)).localeCompare(stableJson(arraySortKey(right))));
    }
    if (!isRecord(value))
        return value;
    return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, normalizeForDiff(item)]));
}
function arraySortKey(value) {
    if (!isRecord(value))
        return value;
    for (const key of ["id", "clientId", "alias", "name", "flowAlias", "providerId"]) {
        if (value[key] !== undefined)
            return { [key]: value[key] };
    }
    return value;
}
function validateTokenContract(token) {
    const decoded = decodeJwt(token);
    const payload = decoded.payload;
    const missingClaims = REQUIRED_TOKEN_CLAIMS.filter((claim) => !isNonEmptyString(payload[claim]));
    const invalidClaims = [
        ...(payload.organization !== undefined && !isRecord(payload.organization) ? ["organization"] : []),
    ];
    const forbiddenClaims = findForbiddenClaims(payload);
    const unexpectedApplicationClaims = Object.keys(payload)
        .filter((claim) => !STRUCTURAL_TOKEN_CLAIMS.has(claim) && !FORBIDDEN_TOKEN_CLAIMS.has(normalizeClaim(claim)));
    const contractValid = missingClaims.length === 0 && invalidClaims.length === 0 && forbiddenClaims.length === 0 && unexpectedApplicationClaims.length === 0;
    return {
        valid: contractValid,
        contractValid,
        authenticated: false,
        signatureValidated: false,
        trust: "semantic contract inspection only; issuer, audience, expiry, and signature require the consuming API's OIDC validator",
        requiredClaims: Object.fromEntries(REQUIRED_TOKEN_CLAIMS.map((claim) => [claim, isNonEmptyString(payload[claim])])),
        optionalClaims: Object.fromEntries(OPTIONAL_TOKEN_CLAIMS.map((claim) => [claim, payload[claim] !== undefined])),
        missingClaims,
        invalidClaims,
        forbiddenClaims,
        unexpectedApplicationClaims,
        claimNames: Object.keys(payload).sort(),
        prohibitedClaimPolicy: ["permission", "relationship", "active tenant", "delegated capability"],
    };
}
function findForbiddenClaims(value, path = "") {
    if (Array.isArray(value))
        return value.flatMap((item, index) => findForbiddenClaims(item, `${path}/${index}`));
    if (!isRecord(value))
        return [];
    const matches = [];
    for (const [key, item] of Object.entries(value)) {
        const childPath = `${path}/${key}`;
        if (FORBIDDEN_TOKEN_CLAIMS.has(normalizeClaim(key)))
            matches.push(childPath);
        matches.push(...findForbiddenClaims(item, childPath));
    }
    return [...new Set(matches)];
}
function normalizeClaim(value) {
    return value.replace(/[._-]/g, "").toLowerCase();
}
function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function escapePath(value) {
    return value.replace(/~/g, "~0").replace(/\//g, "~1");
}
//# sourceMappingURL=baseline.js.map
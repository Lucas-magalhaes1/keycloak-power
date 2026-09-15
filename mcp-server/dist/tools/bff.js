import { spawn } from "node:child_process";
import { KeycloakApiError, expectConfirmation, expectString, objectSchema, optionalBoolean, optionalStringArray, redactSensitive, schema, stableJson, } from "../client.js";
const bffManagedFields = [
    "protocol",
    "publicClient",
    "standardFlowEnabled",
    "implicitFlowEnabled",
    "directAccessGrantsEnabled",
    "serviceAccountsEnabled",
    "clientAuthenticatorType",
    "redirectUris",
    "webOrigins",
    "attributes.pkce.code.challenge.method",
    "attributes.post.logout.redirect.uris",
];
export function bffTools(client) {
    return [
        {
            name: "plan_bff_client",
            description: "Plan a secure confidential OIDC BFF client without mutating Keycloak or exposing a client secret.",
            inputSchema: bffSchema(false),
            handler: async (input) => {
                const target = readBffTarget(input);
                return planBffClient(client, target);
            },
        },
        {
            name: "create_bff_client",
            description: "Create or reconcile a confidential Authorization Code + PKCE S256 BFF client. Requires target-bound confirmation; client secrets are delivered only to the configured vault sink, never returned to chat.",
            inputSchema: objectSchema({
                ...bffSchema(true).properties,
                confirmation: schema.string("Must equal CREATE BFF CLIENT <realm>/<clientId> after human approval."),
                secretRef: schema.string("Vault reference where the generated secret must be stored."),
                rotateSecret: schema.boolean("Rotate the secret after reconciliation; defaults to false."),
            }, ["realm", "clientId", "redirectUris", "postLogoutRedirectUris", "confirmation", "secretRef"]),
            handler: async (input) => {
                const target = readBffTarget(input);
                expectConfirmation(input, `CREATE BFF CLIENT ${target.realm}/${target.clientId}`);
                const secretRef = expectString(input, "secretRef");
                const rotateSecret = optionalBoolean(input, "rotateSecret") ?? false;
                const current = await findClient(client, target);
                const desired = desiredClient(target);
                const plan = buildPlan(target, current, desired);
                if (!isConfiguredEnvironment("KEYCLOAK_SECRET_SINK_COMMAND")) {
                    throw new KeycloakApiError(412, "A secret sink is required before creating or rotating a BFF client. Configure KEYCLOAK_SECRET_SINK_COMMAND and retry; no secret is returned to chat.");
                }
                let clientUuid;
                let status = "unchanged";
                if (!current) {
                    await client.post(client.realmPath(target.realm, "/clients"), desired);
                    clientUuid = await client.resolveClientUUID(target.realm, target.clientId);
                    status = "created";
                }
                else {
                    clientUuid = requireId(current, "Existing BFF client");
                    if (plan.status === "update") {
                        const path = client.realmPath(target.realm, `/clients/${encodeURIComponent(clientUuid)}`);
                        const currentAttributes = asObject(current.attributes);
                        await client.put(path, {
                            ...current,
                            ...desired,
                            id: clientUuid,
                            attributes: { ...currentAttributes, ...asObject(desired.attributes) },
                        });
                        status = "updated";
                    }
                }
                const secretWasDelivered = true;
                if (secretWasDelivered) {
                    const secretPath = client.realmPath(target.realm, `/clients/${encodeURIComponent(clientUuid)}/client-secret`);
                    const credential = rotateSecret
                        ? await client.post(secretPath)
                        : await client.get(secretPath);
                    const secret = extractSecret(credential);
                    await deliverSecretToVault({ secretRef, secret, realm: target.realm, clientId: target.clientId });
                }
                const effective = await client.get(client.realmPath(target.realm, `/clients/${encodeURIComponent(clientUuid)}`));
                return {
                    status,
                    realm: target.realm,
                    clientId: target.clientId,
                    client: redactSensitive(effective),
                    changedFields: plan.changedFields,
                    secret: {
                        deliveredToVault: secretWasDelivered,
                        secretRef: secretWasDelivered ? secretRef : null,
                        value: null,
                    },
                };
            },
        },
        {
            name: "validate_bff_client",
            description: "Compare an existing client against the secure BFF baseline without mutating Keycloak or retrieving a secret.",
            inputSchema: bffSchema(false),
            handler: async (input) => {
                const target = readBffTarget(input);
                const current = await findClient(client, target);
                const desired = desiredClient(target);
                const plan = buildPlan(target, current, desired);
                return {
                    valid: plan.status === "unchanged",
                    status: plan.status,
                    realm: target.realm,
                    clientId: target.clientId,
                    changedFields: plan.changedFields,
                    current: current ? redactSensitive(current) : null,
                    expected: redactSensitive(desired),
                };
            },
        },
    ];
}
function bffSchema(includeOrigins) {
    return objectSchema({
        realm: schema.string("Target realm name."),
        clientId: schema.string("Stable confidential BFF client ID."),
        redirectUris: schema.strings("Exact HTTPS callback URIs; wildcards are not accepted."),
        postLogoutRedirectUris: schema.strings("Exact HTTPS post-logout redirect URIs; wildcards are not accepted."),
        ...(includeOrigins ? { webOrigins: schema.strings("Exact browser origins allowed for the BFF client; '*' is not accepted.") } : { webOrigins: schema.strings("Optional exact browser origins; '*' is not accepted.") }),
    }, ["realm", "clientId", "redirectUris", "postLogoutRedirectUris"]);
}
function readBffTarget(input) {
    const realm = expectString(input, "realm");
    const clientId = expectString(input, "clientId");
    const redirectUris = requiredUriArray(input, "redirectUris", "redirect URI");
    const postLogoutRedirectUris = requiredUriArray(input, "postLogoutRedirectUris", "post-logout redirect URI");
    const webOrigins = (optionalStringArray(input, "webOrigins") ?? []).map((origin) => {
        if (origin !== origin.trim() || origin.includes("*") || origin.endsWith("/"))
            throw new KeycloakApiError(400, "webOrigins must contain exact origins without whitespace, wildcards, or paths.");
        let parsed;
        try {
            parsed = new URL(origin);
        }
        catch {
            throw new KeycloakApiError(400, `Invalid web origin '${origin}'.`);
        }
        if (parsed.pathname !== "/" || parsed.search || parsed.hash || parsed.username || parsed.password || (parsed.protocol !== "https:" && !isLocalhost(parsed.hostname))) {
            throw new KeycloakApiError(400, `webOrigin '${origin}' must be an exact HTTPS origin without credentials.`);
        }
        return origin;
    });
    return { realm, clientId, redirectUris, postLogoutRedirectUris, webOrigins };
}
function requiredUriArray(input, key, label) {
    const values = optionalStringArray(input, key);
    if (!values || values.length === 0)
        throw new KeycloakApiError(400, `'${key}' must contain at least one exact ${label}.`);
    const unique = new Set();
    return values.map((value) => {
        if (!value.trim() || value !== value.trim() || value.includes("*") || unique.has(value))
            throw new KeycloakApiError(400, `'${key}' must contain unique exact URIs without whitespace or wildcards.`);
        unique.add(value);
        let parsed;
        try {
            parsed = new URL(value);
        }
        catch {
            throw new KeycloakApiError(400, `Invalid ${label} '${value}'.`);
        }
        if (parsed.hash || parsed.username || parsed.password || (parsed.protocol !== "https:" && !isLocalhost(parsed.hostname))) {
            throw new KeycloakApiError(400, `${label} '${value}' must use HTTPS without fragments or embedded credentials outside localhost.`);
        }
        return value;
    });
}
function desiredClient(target) {
    return {
        clientId: target.clientId,
        protocol: "openid-connect",
        publicClient: false,
        clientAuthenticatorType: "client-secret",
        standardFlowEnabled: true,
        implicitFlowEnabled: false,
        directAccessGrantsEnabled: false,
        serviceAccountsEnabled: false,
        redirectUris: target.redirectUris,
        webOrigins: target.webOrigins,
        attributes: {
            "pkce.code.challenge.method": "S256",
            "post.logout.redirect.uris": target.postLogoutRedirectUris.join("##"),
        },
    };
}
async function planBffClient(client, target) {
    const current = await findClient(client, target);
    const desired = desiredClient(target);
    const plan = buildPlan(target, current, desired);
    return {
        status: plan.status,
        realm: target.realm,
        clientId: target.clientId,
        changedFields: plan.changedFields,
        current: current ? redactSensitive(current) : null,
        expected: redactSensitive(desired),
        secret: { requiredOnCreate: true, storedExternally: true, value: null },
    };
}
function buildPlan(target, current, desired) {
    if (!current)
        return { status: "create", changedFields: [...bffManagedFields] };
    const currentAttributes = asObject(current.attributes);
    const desiredAttributes = asObject(desired.attributes);
    const values = {
        protocol: [current.protocol, desired.protocol],
        publicClient: [current.publicClient, desired.publicClient],
        standardFlowEnabled: [current.standardFlowEnabled, desired.standardFlowEnabled],
        implicitFlowEnabled: [current.implicitFlowEnabled, desired.implicitFlowEnabled],
        directAccessGrantsEnabled: [current.directAccessGrantsEnabled, desired.directAccessGrantsEnabled],
        serviceAccountsEnabled: [current.serviceAccountsEnabled, desired.serviceAccountsEnabled],
        clientAuthenticatorType: [current.clientAuthenticatorType, desired.clientAuthenticatorType],
        redirectUris: [sortedStrings(current.redirectUris), sortedStrings(desired.redirectUris)],
        webOrigins: [sortedStrings(current.webOrigins), sortedStrings(desired.webOrigins)],
        "attributes.pkce.code.challenge.method": [currentAttributes["pkce.code.challenge.method"], desiredAttributes["pkce.code.challenge.method"]],
        "attributes.post.logout.redirect.uris": [postLogoutUris(currentAttributes["post.logout.redirect.uris"]), postLogoutUris(desiredAttributes["post.logout.redirect.uris"])],
    };
    const changedFields = Object.entries(values).filter(([, [actual, expected]]) => stableJson(actual) !== stableJson(expected)).map(([field]) => field);
    return { status: changedFields.length === 0 ? "unchanged" : "update", changedFields };
}
async function findClient(client, target) {
    const clients = await client.get(client.realmPath(target.realm, "/clients"), { clientId: target.clientId, search: false });
    return clients.find((candidate) => candidate.clientId === target.clientId);
}
function requireId(value, label) {
    if (typeof value.id !== "string" || !value.id)
        throw new KeycloakApiError(502, `${label} response did not contain an internal client UUID.`);
    return value.id;
}
function extractSecret(credential) {
    for (const key of ["value", "secret"]) {
        if (typeof credential[key] === "string" && credential[key])
            return credential[key];
    }
    throw new KeycloakApiError(502, "Keycloak did not return a client secret to the configured vault sink.");
}
async function deliverSecretToVault(payload) {
    const command = process.env.KEYCLOAK_SECRET_SINK_COMMAND;
    if (!command || isPlaceholder(command))
        throw new KeycloakApiError(412, "KEYCLOAK_SECRET_SINK_COMMAND is required to deliver the client secret to a vault.");
    const args = parseSinkArgs(process.env.KEYCLOAK_SECRET_SINK_ARGS);
    await new Promise((resolve, reject) => {
        const child = spawn(command, args, { stdio: ["pipe", "ignore", "ignore"] });
        child.once("error", () => reject(new KeycloakApiError(502, "The configured secret vault sink could not be started.")));
        child.once("close", (code) => code === 0
            ? resolve()
            : reject(new KeycloakApiError(502, "The configured secret vault sink rejected the client secret.")));
        child.stdin.end(JSON.stringify({ type: "keycloak-client-secret", ...payload }));
    });
}
function parseSinkArgs(value) {
    if (!value || isPlaceholder(value))
        return [];
    try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string"))
            throw new Error("not an array of strings");
        return parsed;
    }
    catch {
        throw new KeycloakApiError(500, "KEYCLOAK_SECRET_SINK_ARGS must be a JSON array of strings.");
    }
}
function isConfiguredEnvironment(key) {
    const value = process.env[key];
    return Boolean(value && !isPlaceholder(value));
}
function isPlaceholder(value) {
    return /^\$\{[^}]+\}$/.test(value.trim());
}
function asObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}
function sortedStrings(value) {
    return Array.isArray(value) ? value.filter((item) => typeof item === "string").slice().sort() : [];
}
function postLogoutUris(value) {
    if (Array.isArray(value))
        return sortedStrings(value);
    if (typeof value !== "string")
        return [];
    return value.split("##").map((item) => item.trim()).filter(Boolean).sort();
}
function isLocalhost(hostname) {
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}
//# sourceMappingURL=bff.js.map
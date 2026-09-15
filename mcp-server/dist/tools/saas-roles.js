import { KeycloakApiError, expectConfirmation, expectString, objectSchema, schema, } from "../client.js";
const DEFAULT_ROLES = [
    { name: "tenant-master", description: "Coarse-grained SaaS tenant owner signal; resource authorization remains in the SaaS API." },
    { name: "tenant-admin", description: "Coarse-grained SaaS tenant administration signal; resource authorization remains in the SaaS API." },
    { name: "manager", description: "Coarse-grained SaaS management signal." },
    { name: "operator", description: "Coarse-grained SaaS operations signal." },
    { name: "viewer", description: "Coarse-grained SaaS read-only signal." },
];
const DEFAULT_ROLE_NAMES = new Set(DEFAULT_ROLES.map((role) => role.name));
export function saasRolesTools(client) {
    return [
        {
            name: "plan_saas_default_roles",
            description: "Plan the five fixed SaaS client roles without creating realm roles or mutating Keycloak.",
            inputSchema: roleTargetSchema(),
            handler: async (input) => {
                const target = readTarget(input);
                const clientUuid = await client.resolveClientUUID(target.realm, target.clientId);
                const roles = await listClientRoles(client, target.realm, clientUuid);
                return rolePlan(target, clientUuid, roles);
            },
        },
        {
            name: "provision_saas_default_roles",
            description: "Provision only tenant-master, tenant-admin, manager, operator, and viewer as idempotent client roles. Requires confirmation bound to the realm and SaaS client.",
            inputSchema: objectSchema({
                ...roleTargetSchema().properties,
                confirmation: schema.string("Must equal PROVISION SAAS DEFAULT ROLES <realm>/<clientId> after human approval."),
            }, ["realm", "clientId", "confirmation"]),
            handler: async (input) => {
                const target = readTarget(input);
                expectConfirmation(input, `PROVISION SAAS DEFAULT ROLES ${target.realm}/${target.clientId}`);
                const clientUuid = await client.resolveClientUUID(target.realm, target.clientId);
                let roles = await listClientRoles(client, target.realm, clientUuid);
                const changes = [];
                for (const desired of DEFAULT_ROLES) {
                    let existing = roles.find((role) => role.name === desired.name);
                    if (existing && existing.description !== desired.description) {
                        const rolePath = client.realmPath(target.realm, `/clients/${encodeURIComponent(clientUuid)}/roles/${encodeURIComponent(desired.name)}`);
                        await client.put(rolePath, { ...existing, ...desired, name: desired.name });
                        roles = await listClientRoles(client, target.realm, clientUuid);
                        existing = roles.find((role) => role.name === desired.name);
                        changes.push({ name: desired.name, status: "updated", role: existing ?? null });
                        continue;
                    }
                    if (existing) {
                        changes.push({ name: desired.name, status: "existing", role: existing });
                        continue;
                    }
                    try {
                        await client.post(client.realmPath(target.realm, `/clients/${encodeURIComponent(clientUuid)}/roles`), desired);
                    }
                    catch (error) {
                        if (!(error instanceof KeycloakApiError) || error.status !== 409)
                            throw error;
                    }
                    roles = await listClientRoles(client, target.realm, clientUuid);
                    const created = roles.find((role) => role.name === desired.name);
                    changes.push({ name: desired.name, status: created ? "created" : "not_confirmed_by_server", role: created ?? null });
                }
                const unexpectedClientRoles = roles.filter((role) => typeof role.name === "string" && !DEFAULT_ROLE_NAMES.has(role.name)).map((role) => role.name);
                return {
                    status: unexpectedClientRoles.length > 0 ? "applied_with_existing_custom_roles" : "applied",
                    realm: target.realm,
                    clientId: target.clientId,
                    clientUuid,
                    roles: changes,
                    unexpectedClientRoles,
                    note: "Custom customer roles are not created or deleted here; model them in the Control Tower membership and role_permissions domain.",
                };
            },
        },
        {
            name: "assign_saas_client_role",
            description: "Assign one of the five fixed SaaS client roles to a user. Requires realm, user, client, role, and target-bound confirmation.",
            inputSchema: roleAssignmentSchema(),
            handler: async (input) => {
                const target = readAssignment(input, "ASSIGN SAAS CLIENT ROLE");
                expectConfirmation(input, target.expectedConfirmation);
                const userUuid = await client.resolveUser(target.realm, target.userId);
                const clientUuid = await client.resolveClientUUID(target.realm, target.clientId);
                const role = await getClientRole(client, target.realm, clientUuid, target.roleName);
                const mappingPath = client.realmPath(target.realm, `/users/${encodeURIComponent(userUuid)}/role-mappings/clients/${encodeURIComponent(clientUuid)}`);
                const mappings = await client.get(mappingPath);
                if (mappings.some((mapping) => mapping.name === target.roleName)) {
                    return { status: "existing", assigned: true, realm: target.realm, userId: userUuid, clientId: target.clientId, role: role };
                }
                await client.post(mappingPath, [role]);
                return { status: "assigned", assigned: true, realm: target.realm, userId: userUuid, clientId: target.clientId, role: role };
            },
        },
        {
            name: "remove_saas_client_role",
            description: "Remove one of the five fixed SaaS client roles from a user. Requires realm, user, client, role, and target-bound confirmation.",
            inputSchema: roleAssignmentSchema(),
            handler: async (input) => {
                const target = readAssignment(input, "REMOVE SAAS CLIENT ROLE");
                expectConfirmation(input, target.expectedConfirmation);
                const userUuid = await client.resolveUser(target.realm, target.userId);
                const clientUuid = await client.resolveClientUUID(target.realm, target.clientId);
                const role = await getClientRole(client, target.realm, clientUuid, target.roleName);
                const mappingPath = client.realmPath(target.realm, `/users/${encodeURIComponent(userUuid)}/role-mappings/clients/${encodeURIComponent(clientUuid)}`);
                const mappings = await client.get(mappingPath);
                if (!mappings.some((mapping) => mapping.name === target.roleName)) {
                    return { status: "absent", removed: false, realm: target.realm, userId: userUuid, clientId: target.clientId, role: role };
                }
                await client.delete(mappingPath, undefined, [role]);
                return { status: "removed", removed: true, realm: target.realm, userId: userUuid, clientId: target.clientId, role: role };
            },
        },
    ];
}
function roleTargetSchema() {
    return objectSchema({
        realm: schema.string("Target realm name."),
        clientId: schema.string("SaaS client ID; roles are always client roles on this client."),
    }, ["realm", "clientId"]);
}
function roleAssignmentSchema() {
    return objectSchema({
        realm: schema.string("Target realm name."),
        userId: schema.string("User UUID or exact username."),
        clientId: schema.string("SaaS client ID."),
        roleName: schema.string("One of tenant-master, tenant-admin, manager, operator, viewer."),
        confirmation: schema.string("Target-bound confirmation for the exact assignment or removal."),
    }, ["realm", "userId", "clientId", "roleName", "confirmation"]);
}
function readTarget(input) {
    return { realm: expectString(input, "realm"), clientId: expectString(input, "clientId") };
}
function readAssignment(input, operation) {
    const realm = expectString(input, "realm");
    const userId = expectString(input, "userId");
    const clientId = expectString(input, "clientId");
    const roleName = expectString(input, "roleName");
    if (!DEFAULT_ROLE_NAMES.has(roleName)) {
        throw new KeycloakApiError(400, `roleName '${roleName}' is not a fixed SaaS default role. Custom customer roles belong in Control Tower membership and role_permissions, not Keycloak client roles.`);
    }
    return { realm, userId, clientId, roleName, expectedConfirmation: `${operation} ${realm}/${userId}/${clientId}/${roleName}` };
}
async function listClientRoles(client, realm, clientUuid) {
    return client.get(client.realmPath(realm, `/clients/${encodeURIComponent(clientUuid)}/roles`));
}
async function getClientRole(client, realm, clientUuid, roleName) {
    const role = await client.get(client.realmPath(realm, `/clients/${encodeURIComponent(clientUuid)}/roles/${encodeURIComponent(roleName)}`));
    return role;
}
function rolePlan(target, clientUuid, roles) {
    const missing = DEFAULT_ROLES.some((desired) => !roles.some((role) => role.name === desired.name));
    const drifted = DEFAULT_ROLES.some((desired) => roles.some((role) => role.name === desired.name && role.description !== desired.description));
    const unexpectedClientRoles = roles.filter((role) => typeof role.name === "string" && !DEFAULT_ROLE_NAMES.has(role.name)).map((role) => role.name);
    return {
        status: missing ? "create" : drifted || unexpectedClientRoles.length > 0 ? "drift" : "unchanged",
        realm: target.realm,
        clientId: target.clientId,
        clientUuid,
        roles: DEFAULT_ROLES.map((desired) => {
            const existing = roles.find((role) => role.name === desired.name);
            return { name: desired.name, status: existing ? (existing.description === desired.description ? "existing" : "drifted") : "missing", role: existing ?? null };
        }),
        unexpectedClientRoles,
        note: "This plan never creates realm roles and never creates or deletes custom customer roles.",
    };
}
//# sourceMappingURL=saas-roles.js.map
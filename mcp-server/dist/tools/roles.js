import { expectString, objectSchema, optionalString, schema, } from "../client.js";
export function rolesTools(client) {
    return [
        {
            name: "list_roles",
            description: "List realm roles or roles belonging to a client selected by clientId.",
            inputSchema: objectSchema({ realm: schema.string("Target realm name."), clientId: schema.string("Optional client ID; omit for realm roles.") }, ["realm"]),
            handler: async (input) => {
                const realm = expectString(input, "realm");
                const clientId = optionalString(input, "clientId");
                if (!clientId)
                    return client.get(client.realmPath(realm, "/roles"));
                const clientUuid = await client.resolveClientUUID(realm, clientId);
                return client.get(client.realmPath(realm, `/clients/${encodeURIComponent(clientUuid)}/roles`));
            },
        },
        {
            name: "create_role",
            description: "Create a realm role or client role with an optional description.",
            inputSchema: objectSchema({
                realm: schema.string("Target realm name."), name: schema.string("New role name."),
                description: schema.string("Optional role description."), clientId: schema.string("Optional client ID; omit for a realm role."),
            }, ["realm", "name"]),
            handler: async (input) => {
                const realm = expectString(input, "realm");
                const name = expectString(input, "name");
                const description = optionalString(input, "description");
                const clientId = optionalString(input, "clientId");
                if (!clientId) {
                    await client.post(client.realmPath(realm, "/roles"), { name, ...(description === undefined ? {} : { description }) });
                    return { created: true, role: await client.get(client.realmPath(realm, `/roles/${encodeURIComponent(name)}`)) };
                }
                const clientUuid = await client.resolveClientUUID(realm, clientId);
                const path = client.realmPath(realm, `/clients/${encodeURIComponent(clientUuid)}/roles`);
                await client.post(path, { name, ...(description === undefined ? {} : { description }) });
                return { created: true, role: await client.get(`${path}/${encodeURIComponent(name)}`) };
            },
        },
        {
            name: "get_role",
            description: "Get a realm role or client role by name.",
            inputSchema: objectSchema({ realm: schema.string("Target realm name."), name: schema.string("Role name."), clientId: schema.string("Optional client ID; omit for a realm role.") }, ["realm", "name"]),
            handler: async (input) => {
                const realm = expectString(input, "realm");
                const name = expectString(input, "name");
                const clientId = optionalString(input, "clientId");
                if (!clientId)
                    return client.get(client.realmPath(realm, `/roles/${encodeURIComponent(name)}`));
                const clientUuid = await client.resolveClientUUID(realm, clientId);
                return client.get(client.realmPath(realm, `/clients/${encodeURIComponent(clientUuid)}/roles/${encodeURIComponent(name)}`));
            },
        },
    ];
}
//# sourceMappingURL=roles.js.map
import { expectString, objectSchema, optionalBoolean, optionalNumber, optionalObject, optionalString, schema, } from "../client.js";
export function usersTools(client) {
    return [
        {
            name: "list_users",
            description: "List users in a realm with optional search and pagination.",
            inputSchema: objectSchema({
                realm: schema.string("Target realm name."),
                search: schema.string("Optional username, name, or email search."),
                max: schema.number("Maximum results; Keycloak applies server limits."),
                first: schema.number("Zero-based offset."),
            }, ["realm"]),
            handler: async (input) => client.get(client.realmPath(expectString(input, "realm"), "/users"), {
                search: optionalString(input, "search"), max: optionalNumber(input, "max"), first: optionalNumber(input, "first"),
            }),
        },
        {
            name: "get_user",
            description: "Get a user by UUID or exact username.",
            inputSchema: objectSchema({
                realm: schema.string("Target realm name."),
                userId: schema.string("User UUID or exact username."),
            }, ["realm", "userId"]),
            handler: async (input) => {
                const realm = expectString(input, "realm");
                const userUuid = await client.resolveUser(realm, expectString(input, "userId"));
                return client.get(client.realmPath(realm, `/users/${encodeURIComponent(userUuid)}`));
            },
        },
        {
            name: "create_user",
            description: "Create a user. Passwords are deliberately not accepted; use a credential workflow or required action separately.",
            inputSchema: objectSchema({
                realm: schema.string("Target realm name."), username: schema.string("Unique username."),
                email: schema.string("Optional email address."), firstName: schema.string("Optional given name."),
                lastName: schema.string("Optional family name."), enabled: schema.boolean("Whether the user is enabled; defaults to true."),
                attributes: schema.object("Custom user attributes; values should be string arrays for Keycloak."),
            }, ["realm", "username"]),
            handler: async (input) => {
                const realm = expectString(input, "realm");
                const username = expectString(input, "username");
                const response = await client.post(client.realmPath(realm, "/users"), {
                    username,
                    enabled: optionalBoolean(input, "enabled") ?? true,
                    ...(optionalString(input, "email") === undefined ? {} : { email: optionalString(input, "email") }),
                    ...(optionalString(input, "firstName") === undefined ? {} : { firstName: optionalString(input, "firstName") }),
                    ...(optionalString(input, "lastName") === undefined ? {} : { lastName: optionalString(input, "lastName") }),
                    ...(optionalObject(input, "attributes") === undefined ? {} : { attributes: optionalObject(input, "attributes") }),
                });
                const location = response.location;
                const userUuid = typeof location === "string" ? location.split("/").at(-1) : await client.resolveUser(realm, username);
                return { created: true, user: await client.get(client.realmPath(realm, `/users/${encodeURIComponent(userUuid ?? username)}`)) };
            },
        },
        {
            name: "update_user",
            description: "Merge UserRepresentation fields for a UUID or username and preserve omitted values.",
            inputSchema: objectSchema({
                realm: schema.string("Target realm name."), userId: schema.string("User UUID or exact username."),
                config: schema.object("UserRepresentation fields to update."),
            }, ["realm", "userId", "config"]),
            handler: async (input) => {
                const realm = expectString(input, "realm");
                const config = optionalObject(input, "config");
                if (!config)
                    throw new Error("config is required.");
                const userUuid = await client.resolveUser(realm, expectString(input, "userId"));
                const path = client.realmPath(realm, `/users/${encodeURIComponent(userUuid)}`);
                const current = await client.get(path);
                await client.put(path, { ...current, ...config, id: userUuid });
                return { updated: true, user: await client.get(path) };
            },
        },
        {
            name: "assign_role_to_user",
            description: "Assign a realm role or client role to a user. Client roles resolve the clientId to its internal UUID.",
            inputSchema: objectSchema({
                realm: schema.string("Target realm name."), userId: schema.string("User UUID or exact username."),
                roleName: schema.string("Role name."), clientId: schema.string("Optional client ID; omit for a realm role."),
            }, ["realm", "userId", "roleName"]),
            handler: async (input) => {
                const realm = expectString(input, "realm");
                const userUuid = await client.resolveUser(realm, expectString(input, "userId"));
                const roleName = expectString(input, "roleName");
                const clientId = optionalString(input, "clientId");
                if (!clientId) {
                    const role = await client.get(client.realmPath(realm, `/roles/${encodeURIComponent(roleName)}`));
                    await client.post(client.realmPath(realm, `/users/${encodeURIComponent(userUuid)}/role-mappings/realm`), [role]);
                }
                else {
                    const clientUuid = await client.resolveClientUUID(realm, clientId);
                    const role = await client.get(client.realmPath(realm, `/clients/${encodeURIComponent(clientUuid)}/roles/${encodeURIComponent(roleName)}`));
                    await client.post(client.realmPath(realm, `/users/${encodeURIComponent(userUuid)}/role-mappings/clients/${encodeURIComponent(clientUuid)}`), [role]);
                }
                return { assigned: true, userId: userUuid, roleName, clientId: clientId ?? null };
            },
        },
        {
            name: "get_user_roles",
            description: "Get complete realm and client role mappings for a user UUID or username.",
            inputSchema: objectSchema({ realm: schema.string("Target realm name."), userId: schema.string("User UUID or exact username.") }, ["realm", "userId"]),
            handler: async (input) => {
                const realm = expectString(input, "realm");
                const userUuid = await client.resolveUser(realm, expectString(input, "userId"));
                return client.get(client.realmPath(realm, `/users/${encodeURIComponent(userUuid)}/role-mappings`));
            },
        },
    ];
}
//# sourceMappingURL=users.js.map
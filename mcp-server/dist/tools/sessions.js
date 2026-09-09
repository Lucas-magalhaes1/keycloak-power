import { expectString, objectSchema, optionalString, schema, } from "../client.js";
export function sessionsTools(client) {
    return [
        {
            name: "get_user_sessions",
            description: "Get active user sessions for a user UUID or exact username.",
            inputSchema: objectSchema({ realm: schema.string("Target realm name."), userId: schema.string("User UUID or exact username.") }, ["realm", "userId"]),
            handler: async (input) => {
                const realm = expectString(input, "realm");
                const userUuid = await client.resolveUser(realm, expectString(input, "userId"));
                return client.get(client.realmPath(realm, `/users/${encodeURIComponent(userUuid)}/sessions`));
            },
        },
        {
            name: "get_server_info",
            description: "Get Keycloak server version, installed providers, themes, profile, and system information.",
            inputSchema: objectSchema({}),
            handler: async () => client.get("/admin/serverinfo"),
        },
        {
            name: "get_realm_events",
            description: "Get realm authentication and administration events with optional event type, user, and date filters.",
            inputSchema: objectSchema({
                realm: schema.string("Target realm name."), type: schema.string("Optional Keycloak event type, such as LOGIN or LOGIN_ERROR."),
                user: schema.string("Optional user UUID or exact username."), dateFrom: schema.string("Optional lower date/time bound accepted by Keycloak, for example 2025-01-01."),
            }, ["realm"]),
            handler: async (input) => {
                const realm = expectString(input, "realm");
                const user = optionalString(input, "user");
                const userUuid = user ? await client.resolveUser(realm, user) : undefined;
                return client.get(client.realmPath(realm, "/events"), {
                    type: optionalString(input, "type"), user: userUuid, dateFrom: optionalString(input, "dateFrom"),
                });
            },
        },
    ];
}
//# sourceMappingURL=sessions.js.map
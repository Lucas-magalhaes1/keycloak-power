import { expectString, objectSchema, optionalBoolean, optionalObject, optionalString, schema, } from "../client.js";
export function realmsTools(client) {
    return [
        {
            name: "list_realms",
            description: "List every realm visible to the service account.",
            inputSchema: objectSchema({}),
            handler: async () => client.get("/admin/realms"),
        },
        {
            name: "get_realm",
            description: "Get detailed configuration for a realm. Realm names are case-sensitive.",
            inputSchema: objectSchema({ realm: schema.string("Target realm name.") }, ["realm"]),
            handler: async (input) => client.get(client.realmPath(expectString(input, "realm"))),
        },
        {
            name: "create_realm",
            description: "Create a realm with an explicit security baseline. Brute-force protection defaults to enabled.",
            inputSchema: objectSchema({
                realm: schema.string("New, unique realm name."),
                displayName: schema.string("Optional display name."),
                enabled: schema.boolean("Whether the realm is enabled; defaults to true."),
                sslRequired: schema.string("SSL requirement, for example external or all."),
                config: schema.object("Additional RealmRepresentation fields. bruteForceProtected defaults to true unless explicitly set to false."),
            }, ["realm"]),
            handler: async (input) => {
                const realm = expectString(input, "realm");
                const config = optionalObject(input, "config") ?? {};
                const displayName = optionalString(input, "displayName");
                const enabled = optionalBoolean(input, "enabled") ?? true;
                const sslRequired = optionalString(input, "sslRequired");
                const bruteForceProtected = config.bruteForceProtected ?? true;
                if (typeof bruteForceProtected !== "boolean") {
                    throw new Error("config.bruteForceProtected must be a boolean when provided.");
                }
                await client.post("/admin/realms", {
                    ...config,
                    realm,
                    enabled,
                    bruteForceProtected,
                    ...(displayName === undefined ? {} : { displayName }),
                    ...(sslRequired === undefined ? {} : { sslRequired }),
                });
                return { created: true, realm: await client.get(client.realmPath(realm)) };
            },
        },
        {
            name: "delete_realm",
            description: "Irreversibly delete a non-master realm and all of its users, clients, keys, sessions, and configuration. Requires explicit target-bound human confirmation.",
            inputSchema: objectSchema({
                realm: schema.string("Exact, case-sensitive realm name to delete."),
                confirmation: schema.string("Must exactly equal `DELETE <realm>` after explicit human approval."),
            }, ["realm", "confirmation"]),
            handler: async (input) => {
                const realm = expectString(input, "realm");
                if (realm === "master") {
                    throw new Error("The master realm cannot be deleted by this Power.");
                }
                const confirmation = expectString(input, "confirmation");
                const expectedConfirmation = `DELETE ${realm}`;
                if (confirmation !== expectedConfirmation) {
                    throw new Error(`Deletion requires confirmation exactly equal to '${expectedConfirmation}'.`);
                }
                const path = client.realmPath(realm);
                await client.get(path);
                await client.delete(path);
                return { deleted: true, realm };
            },
        },
        {
            name: "update_realm",
            description: "Merge configuration into an existing realm and preserve omitted settings.",
            inputSchema: objectSchema({
                realm: schema.string("Target realm name."),
                config: schema.object("RealmRepresentation fields to update."),
            }, ["realm", "config"]),
            handler: async (input) => {
                const realm = expectString(input, "realm");
                const config = optionalObject(input, "config");
                if (!config)
                    throw new Error("config is required.");
                const path = client.realmPath(realm);
                const current = await client.get(path);
                await client.put(path, { ...current, ...config, realm });
                return { updated: true, realm: await client.get(path) };
            },
        },
    ];
}
//# sourceMappingURL=realms.js.map
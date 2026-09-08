import {
  KeycloakClient,
  type JsonObject,
  type ToolDefinition,
  expectString,
  objectSchema,
  optionalObject,
  optionalString,
  schema,
} from "../client.js";

export function identityProvidersTools(client: KeycloakClient): ToolDefinition[] {
  return [
    {
      name: "list_identity_providers",
      description: "List identity provider instances configured in a realm.",
      inputSchema: objectSchema({ realm: schema.string("Target realm name.") }, ["realm"]),
      handler: async (input) => client.get(client.realmPath(expectString(input, "realm"), "/identity-provider/instances")),
    },
    {
      name: "get_identity_provider",
      description: "Get an identity provider instance by alias.",
      inputSchema: objectSchema({ realm: schema.string("Target realm name."), alias: schema.string("IdP alias.") }, ["realm", "alias"]),
      handler: async (input) => client.get(client.realmPath(expectString(input, "realm"), `/identity-provider/instances/${encodeURIComponent(expectString(input, "alias"))}`)),
    },
    {
      name: "create_identity_provider",
      description: "Create a Google, Microsoft, OIDC, SAML, or keycloak-oidc identity provider instance.",
      inputSchema: objectSchema({
        realm: schema.string("Target realm name."), alias: schema.string("Unique IdP alias."),
        providerId: schema.string("google, microsoft, oidc, saml, or keycloak-oidc."),
        displayName: schema.string("Optional IdP display name."), config: schema.object("Provider-specific Keycloak configuration, including client credentials and endpoints."),
      }, ["realm", "alias", "providerId", "config"]),
      handler: async (input) => {
        const realm = expectString(input, "realm");
        const alias = expectString(input, "alias");
        const providerId = expectString(input, "providerId");
        const allowed = new Set(["google", "microsoft", "oidc", "saml", "keycloak-oidc"]);
        if (!allowed.has(providerId)) {
          throw new Error(`providerId '${providerId}' is not one of: ${[...allowed].join(", ")}.`);
        }
        const config = optionalObject(input, "config");
        if (!config) throw new Error("config is required.");
        const displayName = optionalString(input, "displayName");
        await client.post(client.realmPath(realm, "/identity-provider/instances"), {
          alias, providerId, enabled: true, config,
          ...(displayName === undefined ? {} : { displayName }),
        });
        return { created: true, identityProvider: await client.get(client.realmPath(realm, `/identity-provider/instances/${encodeURIComponent(alias)}`)) };
      },
    },
    {
      name: "update_identity_provider",
      description: "Merge an identity provider instance configuration by alias.",
      inputSchema: objectSchema({
        realm: schema.string("Target realm name."), alias: schema.string("IdP alias."), config: schema.object("IdentityProviderRepresentation fields to update."),
      }, ["realm", "alias", "config"]),
      handler: async (input) => {
        const realm = expectString(input, "realm");
        const alias = expectString(input, "alias");
        const config = optionalObject(input, "config");
        if (!config) throw new Error("config is required.");
        const path = client.realmPath(realm, `/identity-provider/instances/${encodeURIComponent(alias)}`);
        const current = await client.get<JsonObject>(path);
        await client.put(path, { ...current, ...config, alias });
        return { updated: true, identityProvider: await client.get(path) };
      },
    },
    {
      name: "delete_identity_provider",
      description: "Delete an identity provider instance by alias. This is irreversible unless it is recreated.",
      inputSchema: objectSchema({ realm: schema.string("Target realm name."), alias: schema.string("IdP alias to delete.") }, ["realm", "alias"]),
      handler: async (input) => {
        const realm = expectString(input, "realm");
        const alias = expectString(input, "alias");
        await client.delete(client.realmPath(realm, `/identity-provider/instances/${encodeURIComponent(alias)}`));
        return { deleted: true, alias };
      },
    },
  ];
}

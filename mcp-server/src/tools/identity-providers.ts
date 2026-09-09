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
    {
      name: "get_identity_provider_mapper_types",
      description: "Get the broker mapper types this specific identity provider instance supports, each with its exact identityProviderMapper ID and config properties. Call this before creating a mapper instead of guessing a mapper ID.",
      inputSchema: objectSchema({ realm: schema.string("Target realm name."), alias: schema.string("IdP alias.") }, ["realm", "alias"]),
      handler: async (input) =>
        client.get(client.realmPath(expectString(input, "realm"), `/identity-provider/instances/${encodeURIComponent(expectString(input, "alias"))}/mapper-types`)),
    },
    {
      name: "list_identity_provider_mappers",
      description: "List broker mappers (attribute importers, username template, role/group mappers) attached to an identity provider instance.",
      inputSchema: objectSchema({ realm: schema.string("Target realm name."), alias: schema.string("IdP alias.") }, ["realm", "alias"]),
      handler: async (input) =>
        client.get(client.realmPath(expectString(input, "realm"), `/identity-provider/instances/${encodeURIComponent(expectString(input, "alias"))}/mappers`)),
    },
    {
      name: "get_identity_provider_mapper",
      description: "Get a single broker mapper of an identity provider instance by its internal mapper ID.",
      inputSchema: objectSchema({
        realm: schema.string("Target realm name."), alias: schema.string("IdP alias."), mapperId: schema.string("Internal mapper ID returned by list_identity_provider_mappers."),
      }, ["realm", "alias", "mapperId"]),
      handler: async (input) => {
        const realm = expectString(input, "realm");
        const alias = expectString(input, "alias");
        const mapperId = expectString(input, "mapperId");
        return client.get(client.realmPath(realm, `/identity-provider/instances/${encodeURIComponent(alias)}/mappers/${encodeURIComponent(mapperId)}`));
      },
    },
    {
      name: "create_identity_provider_mapper",
      description: "Create a broker mapper on an identity provider instance to import a claim/attribute/JSON field into a Keycloak user attribute, username, role, or group during first login and subsequent syncs. Use get_identity_provider_mapper_types first to obtain the exact identityProviderMapper ID and config keys this IdP instance supports.",
      inputSchema: objectSchema({
        realm: schema.string("Target realm name."), alias: schema.string("IdP alias."),
        name: schema.string("Display name for the mapper, unique within this IdP instance."),
        identityProviderMapper: schema.string("Exact mapper provider ID from get_identity_provider_mapper_types, e.g. oidc-user-attribute-idp-mapper, microsoft-user-attribute-mapper, or oidc-username-idp-mapper."),
        config: schema.object("Mapper configuration keyed by the property names from get_identity_provider_mapper_types, e.g. claim/jsonField, user.attribute/userAttribute, template, syncMode."),
      }, ["realm", "alias", "name", "identityProviderMapper", "config"]),
      handler: async (input) => {
        const realm = expectString(input, "realm");
        const alias = expectString(input, "alias");
        const name = expectString(input, "name");
        const identityProviderMapper = expectString(input, "identityProviderMapper");
        const config = optionalObject(input, "config");
        if (!config) throw new Error("config is required.");
        const mappersPath = client.realmPath(realm, `/identity-provider/instances/${encodeURIComponent(alias)}/mappers`);
        await client.post(mappersPath, { name, identityProviderAlias: alias, identityProviderMapper, config });
        const mappers = await client.get<JsonObject[]>(mappersPath);
        const created = mappers.find((mapper) => mapper.name === name);
        return { created: true, mapper: created ?? { name, identityProviderAlias: alias, identityProviderMapper, config } };
      },
    },
    {
      name: "update_identity_provider_mapper",
      description: "Merge configuration into an existing identity provider broker mapper by its internal mapper ID.",
      inputSchema: objectSchema({
        realm: schema.string("Target realm name."), alias: schema.string("IdP alias."),
        mapperId: schema.string("Internal mapper ID returned by list_identity_provider_mappers."),
        config: schema.object("Mapper configuration fields to update."),
      }, ["realm", "alias", "mapperId", "config"]),
      handler: async (input) => {
        const realm = expectString(input, "realm");
        const alias = expectString(input, "alias");
        const mapperId = expectString(input, "mapperId");
        const config = optionalObject(input, "config");
        if (!config) throw new Error("config is required.");
        const path = client.realmPath(realm, `/identity-provider/instances/${encodeURIComponent(alias)}/mappers/${encodeURIComponent(mapperId)}`);
        const current = await client.get<JsonObject>(path);
        const currentConfig = (current.config as JsonObject | undefined) ?? {};
        await client.put(path, { ...current, config: { ...currentConfig, ...config } });
        return { updated: true, mapper: await client.get(path) };
      },
    },
    {
      name: "delete_identity_provider_mapper",
      description: "Delete a single broker mapper from an identity provider instance by its internal mapper ID. This is reversible by recreating the mapper.",
      inputSchema: objectSchema({
        realm: schema.string("Target realm name."), alias: schema.string("IdP alias."),
        mapperId: schema.string("Internal mapper ID returned by list_identity_provider_mappers."),
      }, ["realm", "alias", "mapperId"]),
      handler: async (input) => {
        const realm = expectString(input, "realm");
        const alias = expectString(input, "alias");
        const mapperId = expectString(input, "mapperId");
        await client.delete(client.realmPath(realm, `/identity-provider/instances/${encodeURIComponent(alias)}/mappers/${encodeURIComponent(mapperId)}`));
        return { deleted: true, mapperId };
      },
    },
  ];
}

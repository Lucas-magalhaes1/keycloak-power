import {
  KeycloakClient,
  type ToolDefinition,
  expectString,
  objectSchema,
  optionalObject,
  schema,
} from "../client.js";

export function protocolMappersTools(client: KeycloakClient): ToolDefinition[] {
  return [
    {
      name: "list_protocol_mappers",
      description: "List protocol mappers attached directly to a client selected by clientId.",
      inputSchema: objectSchema({ realm: schema.string("Target realm name."), clientId: schema.string("Client ID, not internal UUID.") }, ["realm", "clientId"]),
      handler: async (input) => {
        const realm = expectString(input, "realm");
        const clientUuid = await client.resolveClientUUID(realm, expectString(input, "clientId"));
        return client.get(client.realmPath(realm, `/clients/${encodeURIComponent(clientUuid)}/protocol-mappers/models`));
      },
    },
    {
      name: "create_protocol_mapper",
      description: "Create a client protocol mapper for claims, audiences, roles, groups, or user attributes.",
      inputSchema: objectSchema({
        realm: schema.string("Target realm name."), clientId: schema.string("Client ID, not internal UUID."),
        name: schema.string("Display name for the mapper."), protocol: schema.string("openid-connect or saml."),
        protocolMapper: schema.string("Keycloak mapper provider ID, e.g. oidc-usermodel-attribute-mapper."),
        config: schema.object("Mapper configuration, including claim.name, user.attribute, and token inclusion flags."),
      }, ["realm", "clientId", "name", "protocol", "protocolMapper", "config"]),
      handler: async (input) => {
        const realm = expectString(input, "realm");
        const clientUuid = await client.resolveClientUUID(realm, expectString(input, "clientId"));
        const config = optionalObject(input, "config");
        if (!config) throw new Error("config is required.");
        const path = client.realmPath(realm, `/clients/${encodeURIComponent(clientUuid)}/protocol-mappers/models`);
        const representation = {
          name: expectString(input, "name"), protocol: expectString(input, "protocol"),
          protocolMapper: expectString(input, "protocolMapper"), config,
        };
        await client.post(path, representation);
        return { created: true, mapper: representation };
      },
    },
    {
      name: "get_default_client_scopes",
      description: "List default and optional client scopes for a realm.",
      inputSchema: objectSchema({ realm: schema.string("Target realm name.") }, ["realm"]),
      handler: async (input) => {
        const realm = expectString(input, "realm");
        const [defaultClientScopes, optionalClientScopes] = await Promise.all([
          client.get(client.realmPath(realm, "/default-default-client-scopes")),
          client.get(client.realmPath(realm, "/default-optional-client-scopes")),
        ]);
        return { defaultClientScopes, optionalClientScopes };
      },
    },
  ];
}

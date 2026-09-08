import {
  KeycloakClient,
  type JsonObject,
  type ToolDefinition,
  expectString,
  objectSchema,
  optionalBoolean,
  optionalObject,
  optionalString,
  optionalStringArray,
  schema,
} from "../client.js";

export function clientsTools(client: KeycloakClient): ToolDefinition[] {
  return [
    {
      name: "list_clients",
      description: "List clients in a realm; use get_client for a stable clientId lookup.",
      inputSchema: objectSchema({ realm: schema.string("Target realm name.") }, ["realm"]),
      handler: async (input) => client.get(client.realmPath(expectString(input, "realm"), "/clients")),
    },
    {
      name: "get_client",
      description: "Get a client by its human-facing clientId, never by Keycloak's internal UUID.",
      inputSchema: objectSchema({
        realm: schema.string("Target realm name."),
        clientId: schema.string("Client ID, not internal UUID."),
      }, ["realm", "clientId"]),
      handler: async (input) => {
        const realm = expectString(input, "realm");
        const clientUuid = await client.resolveClientUUID(realm, expectString(input, "clientId"));
        return client.get(client.realmPath(realm, `/clients/${encodeURIComponent(clientUuid)}`));
      },
    },
    {
      name: "create_client",
      description: "Create an OIDC or SAML client with explicit redirect URIs, web origins, and optional ClientRepresentation fields.",
      inputSchema: objectSchema({
        realm: schema.string("Target realm name."),
        clientId: schema.string("Stable client ID to create."),
        protocol: schema.string("openid-connect or saml."),
        publicClient: schema.boolean("Whether the client has no secret."),
        redirectUris: schema.strings("Approved redirect URI patterns."),
        webOrigins: schema.strings("Approved browser origins."),
        config: schema.object("Additional ClientRepresentation fields, e.g. standardFlowEnabled and attributes."),
      }, ["realm", "clientId", "protocol"]),
      handler: async (input) => {
        const realm = expectString(input, "realm");
        const clientId = expectString(input, "clientId");
        const config = optionalObject(input, "config") ?? {};
        const protocol = expectString(input, "protocol");
        const publicClient = optionalBoolean(input, "publicClient");
        const redirectUris = optionalStringArray(input, "redirectUris");
        const webOrigins = optionalStringArray(input, "webOrigins");
        await client.post(client.realmPath(realm, "/clients"), {
          ...config,
          clientId,
          protocol,
          ...(publicClient === undefined ? {} : { publicClient }),
          ...(redirectUris === undefined ? {} : { redirectUris }),
          ...(webOrigins === undefined ? {} : { webOrigins }),
        });
        return { created: true, client: await getClient(client, realm, clientId) };
      },
    },
    {
      name: "get_client_secret",
      description: "Get the active secret of a confidential client. Treat the returned value as sensitive.",
      inputSchema: objectSchema({
        realm: schema.string("Target realm name."),
        clientId: schema.string("Client ID, not internal UUID."),
      }, ["realm", "clientId"]),
      handler: async (input) => {
        const realm = expectString(input, "realm");
        const clientUuid = await client.resolveClientUUID(realm, expectString(input, "clientId"));
        return client.get(client.realmPath(realm, `/clients/${encodeURIComponent(clientUuid)}/client-secret`));
      },
    },
    {
      name: "update_client",
      description: "Merge ClientRepresentation configuration by clientId and preserve omitted existing fields.",
      inputSchema: objectSchema({
        realm: schema.string("Target realm name."),
        clientId: schema.string("Client ID, not internal UUID."),
        config: schema.object("ClientRepresentation fields to update."),
      }, ["realm", "clientId", "config"]),
      handler: async (input) => {
        const realm = expectString(input, "realm");
        const clientId = expectString(input, "clientId");
        const config = optionalObject(input, "config");
        if (!config) throw new Error("config is required.");
        const clientUuid = await client.resolveClientUUID(realm, clientId);
        const path = client.realmPath(realm, `/clients/${encodeURIComponent(clientUuid)}`);
        const current = await client.get<JsonObject>(path);
        await client.put(path, { ...current, ...config, id: clientUuid });
        return { updated: true, client: await client.get(path) };
      },
    },
  ];
}

async function getClient(client: KeycloakClient, realm: string, clientId: string): Promise<unknown> {
  const clientUuid = await client.resolveClientUUID(realm, clientId);
  return client.get(client.realmPath(realm, `/clients/${encodeURIComponent(clientUuid)}`));
}

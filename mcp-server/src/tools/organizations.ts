import {
  KeycloakClient,
  type ToolDefinition,
  expectString,
  objectSchema,
  optionalObject,
  optionalStringArray,
  schema,
} from "../client.js";

/** Keycloak Organizations endpoints require Keycloak 26+ and the Organizations feature. */
export function organizationsTools(client: KeycloakClient): ToolDefinition[] {
  return [
    {
      name: "list_organizations",
      description: "List Organizations in a Keycloak 26+ realm.",
      inputSchema: objectSchema({ realm: schema.string("Target realm name.") }, ["realm"]),
      handler: async (input) => client.get(client.realmPath(expectString(input, "realm"), "/organizations")),
    },
    {
      name: "get_organization",
      description: "Get an Organization by Keycloak organization ID.",
      inputSchema: objectSchema({ realm: schema.string("Target realm name."), orgId: schema.string("Organization UUID or identifier from list_organizations.") }, ["realm", "orgId"]),
      handler: async (input) => client.get(client.realmPath(expectString(input, "realm"), `/organizations/${encodeURIComponent(expectString(input, "orgId"))}`)),
    },
    {
      name: "create_organization",
      description: "Create an Organization with alias, optional verified-domain candidates, and attributes.",
      inputSchema: objectSchema({
        realm: schema.string("Target realm name."), name: schema.string("Organization display name."), alias: schema.string("Stable URL-safe organization alias."),
        domains: schema.strings("Optional organization domains, e.g. acme.example."), attributes: schema.object("Optional organization attributes."),
      }, ["realm", "name", "alias"]),
      handler: async (input) => {
        const realm = expectString(input, "realm");
        const domains = optionalStringArray(input, "domains") ?? [];
        const attributes = optionalObject(input, "attributes");
        await client.post(client.realmPath(realm, "/organizations"), {
          name: expectString(input, "name"), alias: expectString(input, "alias"),
          domains: domains.map((name) => ({ name })),
          ...(attributes === undefined ? {} : { attributes }),
        });
        return { created: true, name: expectString(input, "name"), alias: expectString(input, "alias") };
      },
    },
    {
      name: "add_member_to_organization",
      description: "Add a UUID or username-resolved user as a member of a Keycloak 26+ Organization.",
      inputSchema: objectSchema({
        realm: schema.string("Target realm name."), orgId: schema.string("Organization ID."), userId: schema.string("User UUID or exact username."),
      }, ["realm", "orgId", "userId"]),
      handler: async (input) => {
        const realm = expectString(input, "realm");
        const orgId = expectString(input, "orgId");
        const userUuid = await client.resolveUser(realm, expectString(input, "userId"));
        // Keycloak's organization member endpoint consumes a JSON string user ID, not an object representation.
        await client.post(client.realmPath(realm, `/organizations/${encodeURIComponent(orgId)}/members`), userUuid);
        return { added: true, orgId, userId: userUuid };
      },
    },
    {
      name: "list_organization_members",
      description: "List members of a Keycloak 26+ Organization.",
      inputSchema: objectSchema({ realm: schema.string("Target realm name."), orgId: schema.string("Organization ID.") }, ["realm", "orgId"]),
      handler: async (input) => client.get(client.realmPath(expectString(input, "realm"), `/organizations/${encodeURIComponent(expectString(input, "orgId"))}/members`)),
    },
    {
      name: "add_idp_to_organization",
      description: "Associate an existing identity-provider alias with a Keycloak 26+ Organization.",
      inputSchema: objectSchema({
        realm: schema.string("Target realm name."), orgId: schema.string("Organization ID."), idpAlias: schema.string("Existing identity provider alias."),
      }, ["realm", "orgId", "idpAlias"]),
      handler: async (input) => {
        const realm = expectString(input, "realm");
        const orgId = expectString(input, "orgId");
        const idpAlias = expectString(input, "idpAlias");
        // The Organizations API consumes the IdP alias as a JSON string.
        await client.post(client.realmPath(realm, `/organizations/${encodeURIComponent(orgId)}/identity-providers`), idpAlias);
        return { added: true, orgId, idpAlias };
      },
    },
  ];
}

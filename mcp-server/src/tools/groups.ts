import {
  KeycloakClient,
  type ToolDefinition,
  expectString,
  objectSchema,
  optionalString,
  schema,
} from "../client.js";

export function groupsTools(client: KeycloakClient): ToolDefinition[] {
  return [
    {
      name: "list_groups",
      description: "List top-level groups and their configured subgroups in a realm.",
      inputSchema: objectSchema({ realm: schema.string("Target realm name.") }, ["realm"]),
      handler: async (input) => client.get(client.realmPath(expectString(input, "realm"), "/groups")),
    },
    {
      name: "create_group",
      description: "Create a top-level group or a subgroup below parentGroupId.",
      inputSchema: objectSchema({
        realm: schema.string("Target realm name."), name: schema.string("New group name."),
        parentGroupId: schema.string("Optional parent group UUID."),
      }, ["realm", "name"]),
      handler: async (input) => {
        const realm = expectString(input, "realm");
        const name = expectString(input, "name");
        const parentGroupId = optionalString(input, "parentGroupId");
        const path = parentGroupId
          ? client.realmPath(realm, `/groups/${encodeURIComponent(parentGroupId)}/children`)
          : client.realmPath(realm, "/groups");
        await client.post(path, { name });
        return { created: true, name, parentGroupId: parentGroupId ?? null };
      },
    },
    {
      name: "add_user_to_group",
      description: "Add a user resolved by UUID or username to a group UUID.",
      inputSchema: objectSchema({
        realm: schema.string("Target realm name."), userId: schema.string("User UUID or exact username."),
        groupId: schema.string("Target group UUID."),
      }, ["realm", "userId", "groupId"]),
      handler: async (input) => {
        const realm = expectString(input, "realm");
        const userUuid = await client.resolveUser(realm, expectString(input, "userId"));
        const groupId = expectString(input, "groupId");
        await client.put(client.realmPath(realm, `/users/${encodeURIComponent(userUuid)}/groups/${encodeURIComponent(groupId)}`));
        return { added: true, userId: userUuid, groupId };
      },
    },
    {
      name: "get_group_members",
      description: "List the user members of a group UUID.",
      inputSchema: objectSchema({ realm: schema.string("Target realm name."), groupId: schema.string("Group UUID.") }, ["realm", "groupId"]),
      handler: async (input) => {
        const realm = expectString(input, "realm");
        return client.get(client.realmPath(realm, `/groups/${encodeURIComponent(expectString(input, "groupId"))}/members`));
      },
    },
  ];
}

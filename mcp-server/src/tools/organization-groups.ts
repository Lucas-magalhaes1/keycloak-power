import {
  KeycloakApiError,
  KeycloakClient,
  type JsonObject,
  type ToolDefinition,
  expectConfirmation,
  expectString,
  extractServerVersion,
  objectSchema,
  optionalString,
  redactSensitive,
  schema,
  versionAtLeast,
} from "../client.js";

const MINIMUM_VERSION = "26.6.0";

export function organizationGroupsTools(client: KeycloakClient): ToolDefinition[] {
  return [
    {
      name: "get_organization_groups_capability",
      description: "Check Organization Groups support using get_server_info. Requires Keycloak 26.6.0 or later and never falls back to realm groups.",
      inputSchema: objectSchema({}),
      handler: async () => organizationGroupsCapability(client),
    },
    {
      name: "list_organization_groups",
      description: "List groups belonging to one Organization after the 26.6+ capability guard and target-bound confirmation; realm groups are never used as a fallback.",
      inputSchema: objectSchema({
        ...orgGroupTargetSchema().properties as JsonObject,
        confirmation: schema.string("Must equal LIST ORGANIZATION GROUPS <realm>/<orgId> after human approval."),
      }, ["realm", "orgId", "confirmation"]),
      handler: async (input) => {
        const target = readTarget(input);
        expectConfirmation(input, `LIST ORGANIZATION GROUPS ${target.realm}/${target.orgId}`);
        const capability = await organizationGroupsCapability(client);
        if (capability.status !== "supported") return capability;
        const groups = await client.get<JsonObject[]>(groupsPath(client, target), { populateHierarchy: true });
        return { status: "supported", realm: target.realm, orgId: target.orgId, groups: groups.map((group) => redactSensitive(group)) };
      },
    },
    {
      name: "create_organization_group",
      description: "Create a top-level or child Organization Group after the 26.6+ guard and target-bound confirmation.",
      inputSchema: objectSchema({
        ...orgGroupTargetSchema().properties as JsonObject,
        name: schema.string("New organization group name."),
        parentGroupId: schema.string("Optional parent Organization Group UUID."),
        confirmation: schema.string("Must equal CREATE ORGANIZATION GROUP <realm>/<orgId>/<name> parent=<parentId|ROOT> after human approval."),
      }, ["realm", "orgId", "name", "confirmation"]),
      handler: async (input) => {
        const target = readTarget(input);
        const name = expectString(input, "name");
        const parentGroupId = optionalString(input, "parentGroupId");
        expectConfirmation(input, `CREATE ORGANIZATION GROUP ${target.realm}/${target.orgId}/${name} parent=${parentGroupId ?? "ROOT"}`);
        const capability = await organizationGroupsCapability(client);
        if (capability.status !== "supported") return capability;
        const path = parentGroupId ? `${groupsPath(client, target)}/${encodeURIComponent(parentGroupId)}/children` : groupsPath(client, target);
        await client.post(path, { name });
        return { status: "created", realm: target.realm, orgId: target.orgId, name, parentGroupId: parentGroupId ?? null };
      },
    },
    {
      name: "move_organization_group",
      description: "Move an Organization Group to another Organization Group or to the top level after the 26.6+ guard and target-bound confirmation.",
      inputSchema: objectSchema({
        ...orgGroupTargetSchema().properties as JsonObject,
        groupId: schema.string("Organization Group UUID to move."),
        parentGroupId: schema.string("Destination parent UUID; omit to move to the top level."),
        confirmation: schema.string("Must equal MOVE ORGANIZATION GROUP <realm>/<orgId>/<groupId>-><parentId|ROOT> after human approval."),
      }, ["realm", "orgId", "groupId", "confirmation"]),
      handler: async (input) => {
        const target = readTarget(input);
        const groupId = expectString(input, "groupId");
        const parentGroupId = optionalString(input, "parentGroupId");
        expectConfirmation(input, `MOVE ORGANIZATION GROUP ${target.realm}/${target.orgId}/${groupId}->${parentGroupId ?? "ROOT"}`);
        const capability = await organizationGroupsCapability(client);
        if (capability.status !== "supported") return capability;
        const path = parentGroupId ? `${groupsPath(client, target)}/${encodeURIComponent(parentGroupId)}/children` : groupsPath(client, target);
        await client.post(path, { id: groupId });
        return { status: "moved", realm: target.realm, orgId: target.orgId, groupId, parentGroupId: parentGroupId ?? null };
      },
    },
    {
      name: "delete_organization_group",
      description: "Delete an Organization Group and its subgroups after the 26.6+ guard and target-bound confirmation.",
      inputSchema: objectSchema({
        ...orgGroupTargetSchema().properties as JsonObject,
        groupId: schema.string("Organization Group UUID to delete."),
        confirmation: schema.string("Must equal DELETE ORGANIZATION GROUP <realm>/<orgId>/<groupId> after human approval."),
      }, ["realm", "orgId", "groupId", "confirmation"]),
      handler: async (input) => {
        const target = readTarget(input);
        const groupId = expectString(input, "groupId");
        expectConfirmation(input, `DELETE ORGANIZATION GROUP ${target.realm}/${target.orgId}/${groupId}`);
        const capability = await organizationGroupsCapability(client);
        if (capability.status !== "supported") return capability;
        await client.delete(`${groupsPath(client, target)}/${encodeURIComponent(groupId)}`);
        return { status: "deleted", realm: target.realm, orgId: target.orgId, groupId };
      },
    },
    {
      name: "assign_organization_group_member",
      description: "Assign an existing Organization member to an Organization Group after the 26.6+ guard and target-bound confirmation.",
      inputSchema: objectSchema({
        ...orgGroupTargetSchema().properties as JsonObject,
        groupId: schema.string("Organization Group UUID."),
        userId: schema.string("User UUID or exact username; the user must already be an Organization member."),
        confirmation: schema.string("Must equal ASSIGN ORGANIZATION GROUP MEMBER <realm>/<orgId>/<groupId>/<userId> after human approval."),
      }, ["realm", "orgId", "groupId", "userId", "confirmation"]),
      handler: async (input) => {
        const target = readTarget(input);
        const groupId = expectString(input, "groupId");
        const userId = expectString(input, "userId");
        expectConfirmation(input, `ASSIGN ORGANIZATION GROUP MEMBER ${target.realm}/${target.orgId}/${groupId}/${userId}`);
        const capability = await organizationGroupsCapability(client);
        if (capability.status !== "supported") return capability;
        const userUuid = await client.resolveUser(target.realm, userId);
        await client.get(client.realmPath(target.realm, `/organizations/${encodeURIComponent(target.orgId)}/members/${encodeURIComponent(userUuid)}`));
        const path = `${groupsPath(client, target)}/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userUuid)}`;
        try {
          await client.put(path);
          return { status: "assigned", realm: target.realm, orgId: target.orgId, groupId, userId: userUuid };
        } catch (error) {
          if (error instanceof KeycloakApiError && error.status === 409) {
            return { status: "existing", realm: target.realm, orgId: target.orgId, groupId, userId: userUuid };
          }
          throw error;
        }
      },
    },
  ];
}

function orgGroupTargetSchema(): JsonObject {
  return objectSchema({
    realm: schema.string("Target realm name."),
    orgId: schema.string("Keycloak Organization ID."),
  }, ["realm", "orgId"]);
}

function readTarget(input: JsonObject): { realm: string; orgId: string } {
  return { realm: expectString(input, "realm"), orgId: expectString(input, "orgId") };
}

async function organizationGroupsCapability(client: KeycloakClient): Promise<JsonObject> {
  const info = await client.get<JsonObject>("/admin/serverinfo");
  const detectedVersion = extractServerVersion(info) ?? null;
  if (!detectedVersion || !versionAtLeast(detectedVersion, MINIMUM_VERSION)) {
    return {
      status: "unsupported_feature",
      feature: "organization-groups",
      detectedVersion,
      minimumVersion: MINIMUM_VERSION,
      upgradeRequired: `Upgrade Keycloak to ${MINIMUM_VERSION} or later and enable Organizations.`,
      fallback: "none",
    };
  }
  return { status: "supported", feature: "organization-groups", detectedVersion, minimumVersion: MINIMUM_VERSION };
}

function groupsPath(client: KeycloakClient, target: { realm: string; orgId: string }): string {
  return client.realmPath(target.realm, `/organizations/${encodeURIComponent(target.orgId)}/groups`);
}

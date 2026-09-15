import {
  KeycloakApiError,
  KeycloakClient,
  type JsonObject,
  type ToolDefinition,
  expectConfirmation,
  expectString,
  extractServerVersion,
  objectSchema,
  redactSensitive,
  schema,
} from "../client.js";

const USER_STORAGE_PROVIDER_TYPE = "org.keycloak.storage.UserStorageProvider";
const forbiddenInputKeys = new Set(["bindpassword", "bindcredential", "password", "credential", "secret"]);

export function userFederationTools(client: KeycloakClient): ToolDefinition[] {
  return [
    {
      name: "list_user_federation_providers",
      description: "List LDAP/AD user-federation components with bind credentials, base DNs, private URLs, and sensitive attributes redacted. Requires a version-matched integration confirmation.",
      inputSchema: objectSchema({ realm: schema.string("Target realm name.") }, ["realm"]),
      handler: async (input) => {
        const realm = expectString(input, "realm");
        await requireFederationIntegration(client);
        const providers = await client.get<JsonObject[]>(client.realmPath(realm, "/components"), { type: USER_STORAGE_PROVIDER_TYPE });
        return providers.map(redactFederation);
      },
    },
    {
      name: "get_user_federation_provider",
      description: "Get one LDAP/AD user-federation component by internal provider ID with bind DN, credential, private URLs, and sensitive attributes redacted.",
      inputSchema: objectSchema({ realm: schema.string("Target realm name."), providerId: schema.string("User-federation component UUID.") }, ["realm", "providerId"]),
      handler: async (input) => {
        const realm = expectString(input, "realm");
        const providerId = expectString(input, "providerId");
        await requireFederationIntegration(client);
        const provider = await client.get<JsonObject>(client.realmPath(realm, `/components/${encodeURIComponent(providerId)}`));
        assertUserStorageProvider(provider);
        return redactFederation(provider);
      },
    },
    {
      name: "list_user_federation_mappers",
      description: "List LDAP/AD user-federation mapper components for a provider, with sensitive configuration redacted. This never uses realm groups as a fallback.",
      inputSchema: objectSchema({ realm: schema.string("Target realm name."), providerId: schema.string("User-federation component UUID.") }, ["realm", "providerId"]),
      handler: async (input) => {
        const realm = expectString(input, "realm");
        const providerId = expectString(input, "providerId");
        await requireFederationIntegration(client);
        const provider = await client.get<JsonObject>(client.realmPath(realm, `/components/${encodeURIComponent(providerId)}`));
        assertUserStorageProvider(provider);
        const mappers = await client.get<JsonObject[]>(client.realmPath(realm, "/components"), { parent: providerId });
        return mappers.map(redactFederation);
      },
    },
    {
      name: "test_user_federation_connection",
      description: "Test an existing LDAP/AD provider only after version-matched integration validation and explicit confirmation of realm, provider, base DN, and impact. Bind passwords are never accepted as input.",
      inputSchema: objectSchema({
        realm: schema.string("Target realm name."),
        providerId: schema.string("User-federation component UUID."),
        baseDn: schema.string("Base DN confirmed for this provider; it must match the configured usersDn/baseDn."),
        impact: schema.string("Human-readable impact statement, including the pilot scope and expected directory load."),
        confirmation: schema.string("Must equal TEST USER FEDERATION <realm>/<providerId> baseDn=<baseDn> impact=<impact> after human approval."),
      }, ["realm", "providerId", "baseDn", "impact", "confirmation"]),
      handler: async (input) => {
        rejectCredentialInput(input);
        const realm = expectString(input, "realm");
        const providerId = expectString(input, "providerId");
        const baseDn = expectString(input, "baseDn");
        const impact = expectString(input, "impact");
        expectConfirmation(input, `TEST USER FEDERATION ${realm}/${providerId} baseDn=${baseDn} impact=${impact}`);
        const testedVersion = await requireFederationIntegration(client);
        const provider = await client.get<JsonObject>(client.realmPath(realm, `/components/${encodeURIComponent(providerId)}`));
        assertUserStorageProvider(provider);
        const config = asObject(provider.config);
        const configuredBaseDn = firstString(config.usersDn, config.baseDn);
        if (!configuredBaseDn || configuredBaseDn !== baseDn) {
          throw new KeycloakApiError(400, "The confirmed baseDn does not exactly match the provider's configured usersDn/baseDn.");
        }
        const bindCredential = firstString(config.bindCredential, config.bindPassword);
        const connectionUrl = firstString(config.connectionUrl);
        const bindDn = firstString(config.bindDn);
        if (!connectionUrl || !bindDn || !bindCredential) {
          throw new KeycloakApiError(412, "The provider does not expose enough configuration for a safe connection test. Configure the provider through Keycloak/Admin Console; bind credentials are never accepted by this tool.");
        }

        const configuredPath = process.env.KEYCLOAK_USER_FEDERATION_TEST_PATH;
        if (!configuredPath) {
          throw new KeycloakApiError(412, "No LDAP connection-test endpoint is configured. Set KEYCLOAK_USER_FEDERATION_TEST_PATH only after integration testing the exact endpoint against the connected Keycloak version.");
        }
        if (!configuredPath.startsWith("/") || configuredPath.includes("..") || /[?#%$]/.test(configuredPath) || configuredPath !== configuredPath.trim()) {
          throw new KeycloakApiError(500, "KEYCLOAK_USER_FEDERATION_TEST_PATH must be a safe realm-relative Admin REST suffix without query strings or encoded traversal.");
        }
        await client.post(client.realmPath(realm, configuredPath), {
          action: "testConnection",
          connectionUrl,
          bindDn,
          bindCredential,
          ...(firstString(config.useTruststoreSpi) === undefined ? {} : { useTruststoreSpi: firstString(config.useTruststoreSpi) }),
          ...(firstString(config.connectionTimeout) === undefined ? {} : { connectionTimeout: firstString(config.connectionTimeout) }),
          ...(firstString(config.connectionPooling) === undefined ? {} : { connectionPooling: firstString(config.connectionPooling) }),
        });
        return {
          status: "passed",
          realm,
          providerId,
          testedVersion,
          baseDn: "[REDACTED]",
          impact,
          credentialAcceptedFrom: "existing provider configuration only",
        };
      },
    },
  ];
}

async function requireFederationIntegration(client: KeycloakClient): Promise<string> {
  const info = await client.get<JsonObject>("/admin/serverinfo");
  const actual = extractServerVersion(info);
  const tested = process.env.KEYCLOAK_USER_FEDERATION_TESTED_VERSION;
  if (!actual) throw new KeycloakApiError(412, "Keycloak server version could not be determined; user-federation REST adapters remain disabled.");
  if (!tested) {
    throw new KeycloakApiError(412, `User-federation REST adapters are disabled until integration testing is completed for Keycloak ${actual}. Set KEYCLOAK_USER_FEDERATION_TESTED_VERSION to the exact tested version.`);
  }
  if (!sameVersion(actual, tested)) {
    throw new KeycloakApiError(412, `User-federation integration was tested for ${tested}, but the connected Keycloak is ${actual}. Refuse to guess across versions.`);
  }
  return actual;
}

function assertUserStorageProvider(provider: JsonObject): void {
  if (provider.providerType !== USER_STORAGE_PROVIDER_TYPE) {
    throw new KeycloakApiError(400, "The selected component is not a user-federation provider.");
  }
}

function redactFederation(provider: JsonObject): unknown {
  return redactSensitive(provider, { redactInternalUrls: true, redactPii: true });
}

function rejectCredentialInput(input: JsonObject): void {
  const supplied = Object.keys(input).map((key) => key.replace(/[._-]/g, "").toLowerCase()).filter((key) => forbiddenInputKeys.has(key));
  if (supplied.length > 0) throw new KeycloakApiError(400, "Bind passwords and credentials are never accepted by test_user_federation_connection.");
}

function asObject(value: unknown): JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as JsonObject : {};
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
    if (Array.isArray(value)) {
      const nested = firstString(...value);
      if (nested) return nested;
    }
  }
  return undefined;
}

function sameVersion(left: string, right: string): boolean {
  const versionPattern = /^(\d+)\.(\d+)\.(\d+)$/;
  const leftMatch = left.trim().match(versionPattern);
  const rightMatch = right.trim().match(versionPattern);
  return Boolean(leftMatch && rightMatch && leftMatch[1] === rightMatch[1] && leftMatch[2] === rightMatch[2] && leftMatch[3] === rightMatch[3]);
}

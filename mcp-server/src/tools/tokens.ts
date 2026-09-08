import {
  KeycloakClient,
  decodeJwt,
  type JsonObject,
  type ToolDefinition,
  expectString,
  objectSchema,
  schema,
} from "../client.js";

export function tokensTools(client: KeycloakClient): ToolDefinition[] {
  return [
    {
      name: "decode_token",
      description: "Decode a JWT locally into header, payload, signature presence, human-readable dates, and claim inventory. It does not verify the signature.",
      inputSchema: objectSchema({ token: schema.string("Compact JWT. Keep sensitive tokens out of logs and screenshots.") }, ["token"]),
      handler: async (input) => {
        const decoded = decodeJwt(expectString(input, "token"));
        const payload = decoded.payload as JsonObject;
        return {
          ...decoded,
          dates: {
            issuedAt: dateFromSeconds(payload.iat),
            notBefore: dateFromSeconds(payload.nbf),
            expiresAt: dateFromSeconds(payload.exp),
          },
          claimNames: Object.keys(payload).sort(),
        };
      },
    },
    {
      name: "get_token_endpoint_info",
      description: "Get the public OpenID Connect discovery document for a realm, including token, authorization, JWKS, logout, and userinfo endpoints.",
      inputSchema: objectSchema({ realm: schema.string("Realm to inspect.") }, ["realm"]),
      handler: async (input) => client.get(`/realms/${encodeURIComponent(expectString(input, "realm"))}/.well-known/openid-configuration`),
    },
  ];
}

function dateFromSeconds(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return new Date(value * 1_000).toISOString();
}

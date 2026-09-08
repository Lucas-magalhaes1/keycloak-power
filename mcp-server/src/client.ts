export type JsonObject = Record<string, unknown>;
export type QueryParameters = Record<string, string | number | boolean | undefined>;

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: JsonObject;
  handler: (input: JsonObject) => Promise<unknown>;
}

export class KeycloakApiError extends Error {
  public constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(`Keycloak API ${status}: ${message}`);
    this.name = "KeycloakApiError";
  }
}

interface AccessToken {
  value: string;
  expiresAt: number;
}

interface KeycloakClientOptions {
  baseUrl?: string;
  authenticationRealm?: string;
  clientId?: string;
  clientSecret?: string;
}

/**
 * Minimal Keycloak Admin REST client. Authentication is intentionally limited
 * to a confidential client service account using Client Credentials Grant.
 */
export class KeycloakClient {
  private readonly baseUrl: string;
  private readonly authenticationRealm: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private token?: AccessToken;

  public constructor(options: KeycloakClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? process.env.KEYCLOAK_URL ?? "").replace(/\/$/, "");
    this.authenticationRealm = options.authenticationRealm ?? process.env.KEYCLOAK_REALM ?? "";
    this.clientId = options.clientId ?? process.env.KEYCLOAK_CLIENT_ID ?? "";
    this.clientSecret = options.clientSecret ?? process.env.KEYCLOAK_CLIENT_SECRET ?? "";
  }

  public async get<T = unknown>(path: string, query?: QueryParameters): Promise<T> {
    return this.request<T>("GET", path, undefined, query);
  }

  public async post<T = unknown>(path: string, body?: unknown, query?: QueryParameters): Promise<T> {
    return this.request<T>("POST", path, body, query);
  }

  public async put<T = unknown>(path: string, body?: unknown, query?: QueryParameters): Promise<T> {
    return this.request<T>("PUT", path, body, query);
  }

  public async delete<T = unknown>(path: string, query?: QueryParameters): Promise<T> {
    return this.request<T>("DELETE", path, undefined, query);
  }

  public async resolveClientUUID(realm: string, clientId: string): Promise<string> {
    const clients = await this.get<JsonObject[]>(this.realmPath(realm, "/clients"), { clientId });
    const match = clients.find((client) => client.clientId === clientId);
    if (!match || typeof match.id !== "string") {
      throw new KeycloakApiError(404, `Client '${clientId}' was not found in realm '${realm}'.`);
    }
    return match.id;
  }

  /** Resolves a Keycloak UUID directly or looks up an exact username. */
  public async resolveUser(realm: string, userIdOrUsername: string): Promise<string> {
    if (isUuid(userIdOrUsername)) {
      return userIdOrUsername;
    }

    const users = await this.get<JsonObject[]>(this.realmPath(realm, "/users"), {
      username: userIdOrUsername,
      exact: true,
      max: 2,
    });
    const matches = users.filter((user) => user.username === userIdOrUsername && typeof user.id === "string");
    if (matches.length !== 1) {
      throw new KeycloakApiError(404, `User '${userIdOrUsername}' was not found uniquely in realm '${realm}'.`);
    }
    return matches[0].id as string;
  }

  public realmPath(realm: string, suffix = ""): string {
    return `/admin/realms/${encodeURIComponent(realm)}${suffix}`;
  }

  private async request<T>(method: string, path: string, body?: unknown, query?: QueryParameters): Promise<T> {
    const token = await this.getAccessToken();
    const response = await fetch(this.createUrl(path, query), {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return this.parseResponse<T>(response);
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.token && this.token.expiresAt - now > 30_000) {
      return this.token.value;
    }

    this.assertConfiguration();
    const form = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });
    let response: Response;
    try {
      response = await fetch(this.createUrl(`/realms/${encodeURIComponent(this.authenticationRealm)}/protocol/openid-connect/token`), {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: form,
      });
    } catch (error) {
      throw new KeycloakApiError(0, `Unable to contact Keycloak at ${this.baseUrl}: ${messageFrom(error)}`);
    }

    const payload = await this.parseResponse<JsonObject>(response);
    const accessToken = payload.access_token;
    if (typeof accessToken !== "string" || accessToken.length === 0) {
      throw new KeycloakApiError(502, "Keycloak token response did not contain access_token.", payload);
    }
    const expiresIn = typeof payload.expires_in === "number" ? payload.expires_in : 60;
    this.token = { value: accessToken, expiresAt: Date.now() + expiresIn * 1_000 };
    return accessToken;
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const text = await response.text();
    const payload = parseJson(text);
    if (!response.ok) {
      throw new KeycloakApiError(response.status, keycloakMessage(payload, text, response.statusText), payload ?? text);
    }
    if (response.status === 204 || text.length === 0) {
      return { status: response.status } as T;
    }
    return (payload ?? text) as T;
  }

  private createUrl(path: string, query?: QueryParameters): string {
    if (!this.baseUrl) {
      throw new KeycloakApiError(500, "KEYCLOAK_URL is required.");
    }
    const url = new URL(`${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  private assertConfiguration(): void {
    const missing = [
      ["KEYCLOAK_URL", this.baseUrl],
      ["KEYCLOAK_REALM", this.authenticationRealm],
      ["KEYCLOAK_CLIENT_ID", this.clientId],
      ["KEYCLOAK_CLIENT_SECRET", this.clientSecret],
    ].filter(([, value]) => !value).map(([name]) => name);
    if (missing.length > 0) {
      throw new KeycloakApiError(500, `Missing required MCP environment variable(s): ${missing.join(", ")}.`);
    }
  }
}

/** Decodes a JWT locally; it does not cryptographically validate the signature. */
export function decodeJwt(token: string): JsonObject {
  const segments = token.split(".");
  if (segments.length !== 3) {
    throw new KeycloakApiError(400, "A compact JWT must contain exactly three dot-separated segments.");
  }
  const [headerSegment, payloadSegment, signature] = segments;
  return {
    header: decodeBase64UrlJson(headerSegment, "header"),
    payload: decodeBase64UrlJson(payloadSegment, "payload"),
    signaturePresent: signature.length > 0,
    signatureValidated: false,
  };
}

export function expectString(input: JsonObject, key: string): string {
  const value = input[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new KeycloakApiError(400, `'${key}' is required and must be a non-empty string.`);
  }
  return value.trim();
}

export function optionalString(input: JsonObject, key: string): string | undefined {
  const value = input[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new KeycloakApiError(400, `'${key}' must be a string.`);
  return value;
}

export function optionalBoolean(input: JsonObject, key: string): boolean | undefined {
  const value = input[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "boolean") throw new KeycloakApiError(400, `'${key}' must be a boolean.`);
  return value;
}

export function optionalNumber(input: JsonObject, key: string): number | undefined {
  const value = input[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) throw new KeycloakApiError(400, `'${key}' must be a finite number.`);
  return value;
}

export function optionalStringArray(input: JsonObject, key: string): string[] | undefined {
  const value = input[key];
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new KeycloakApiError(400, `'${key}' must be an array of strings.`);
  }
  return value;
}

export function optionalObject(input: JsonObject, key: string): JsonObject | undefined {
  const value = input[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "object" || Array.isArray(value)) throw new KeycloakApiError(400, `'${key}' must be an object.`);
  return value as JsonObject;
}

export function objectSchema(properties: JsonObject, required: string[] = []): JsonObject {
  return { type: "object", properties, required, additionalProperties: false };
}

export const schema = {
  string: (description: string): JsonObject => ({ type: "string", description }),
  boolean: (description: string): JsonObject => ({ type: "boolean", description }),
  number: (description: string): JsonObject => ({ type: "number", description }),
  strings: (description: string): JsonObject => ({ type: "array", items: { type: "string" }, description }),
  object: (description: string): JsonObject => ({ type: "object", additionalProperties: true, description }),
};

export function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function decodeBase64UrlJson(segment: string, label: string): JsonObject {
  try {
    const value = JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new Error("JSON value is not an object");
    }
    return value as JsonObject;
  } catch (error) {
    throw new KeycloakApiError(400, `JWT ${label} is not valid base64url-encoded JSON: ${messageFrom(error)}`);
  }
}

function parseJson(text: string): unknown | undefined {
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function keycloakMessage(payload: unknown, fallback: string, statusText: string): string {
  if (typeof payload === "object" && payload !== null && !Array.isArray(payload)) {
    const details = payload as JsonObject;
    for (const key of ["errorMessage", "error_description", "message", "error"]) {
      if (typeof details[key] === "string" && details[key].trim()) return details[key] as string;
    }
  }
  return fallback || statusText || "Keycloak returned an error without a response body.";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

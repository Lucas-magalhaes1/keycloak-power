export class KeycloakApiError extends Error {
    status;
    details;
    constructor(status, message, details) {
        super(`Keycloak API ${status}: ${message}`);
        this.status = status;
        this.details = details;
        this.name = "KeycloakApiError";
    }
}
/**
 * Minimal Keycloak Admin REST client. Authentication is intentionally limited
 * to a confidential client service account using Client Credentials Grant.
 */
export class KeycloakClient {
    baseUrl;
    authenticationRealm;
    clientId;
    clientSecret;
    token;
    constructor(options = {}) {
        this.baseUrl = (options.baseUrl ?? process.env.KEYCLOAK_URL ?? "").replace(/\/$/, "");
        this.authenticationRealm = options.authenticationRealm ?? process.env.KEYCLOAK_REALM ?? "";
        this.clientId = options.clientId ?? process.env.KEYCLOAK_CLIENT_ID ?? "";
        this.clientSecret = options.clientSecret ?? process.env.KEYCLOAK_CLIENT_SECRET ?? "";
    }
    async get(path, query) {
        return this.request("GET", path, undefined, query);
    }
    async post(path, body, query) {
        return this.request("POST", path, body, query);
    }
    async put(path, body, query) {
        return this.request("PUT", path, body, query);
    }
    async delete(path, query, body) {
        return this.request("DELETE", path, body, query);
    }
    async resolveClientUUID(realm, clientId) {
        const clients = await this.get(this.realmPath(realm, "/clients"), { clientId });
        const match = clients.find((client) => client.clientId === clientId);
        if (!match || typeof match.id !== "string") {
            throw new KeycloakApiError(404, `Client '${clientId}' was not found in realm '${realm}'.`);
        }
        return match.id;
    }
    /** Resolves a Keycloak UUID directly or looks up an exact username. */
    async resolveUser(realm, userIdOrUsername) {
        if (isUuid(userIdOrUsername)) {
            return userIdOrUsername;
        }
        const users = await this.get(this.realmPath(realm, "/users"), {
            username: userIdOrUsername,
            exact: true,
            max: 2,
        });
        const matches = users.filter((user) => user.username === userIdOrUsername && typeof user.id === "string");
        if (matches.length !== 1) {
            throw new KeycloakApiError(404, `User '${userIdOrUsername}' was not found uniquely in realm '${realm}'.`);
        }
        return matches[0].id;
    }
    realmPath(realm, suffix = "") {
        return `/admin/realms/${encodeURIComponent(realm)}${suffix}`;
    }
    async request(method, path, body, query) {
        const token = await this.getAccessToken();
        const response = await fetch(this.createUrl(path, query), {
            method,
            headers: {
                authorization: `Bearer ${token}`,
                ...(body === undefined ? {} : { "content-type": "application/json" }),
            },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        return this.parseResponse(response);
    }
    async getAccessToken() {
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
        let response;
        try {
            response = await fetch(this.createUrl(`/realms/${encodeURIComponent(this.authenticationRealm)}/protocol/openid-connect/token`), {
                method: "POST",
                headers: { "content-type": "application/x-www-form-urlencoded" },
                body: form,
            });
        }
        catch (error) {
            throw new KeycloakApiError(0, `Unable to contact Keycloak at ${this.baseUrl}: ${messageFrom(error)}`);
        }
        const payload = await this.parseResponse(response);
        const accessToken = payload.access_token;
        if (typeof accessToken !== "string" || accessToken.length === 0) {
            throw new KeycloakApiError(502, "Keycloak token response did not contain access_token.", payload);
        }
        const expiresIn = typeof payload.expires_in === "number" ? payload.expires_in : 60;
        this.token = { value: accessToken, expiresAt: Date.now() + expiresIn * 1_000 };
        return accessToken;
    }
    async parseResponse(response) {
        const text = await response.text();
        const payload = parseJson(text);
        if (!response.ok) {
            throw new KeycloakApiError(response.status, keycloakMessage(payload, text, response.statusText), payload ?? text);
        }
        if (response.status === 204 || text.length === 0) {
            return { status: response.status };
        }
        return (payload ?? text);
    }
    createUrl(path, query) {
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
    assertConfiguration() {
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
export function decodeJwt(token) {
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
export function expectString(input, key) {
    const value = input[key];
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new KeycloakApiError(400, `'${key}' is required and must be a non-empty string.`);
    }
    return value.trim();
}
export function optionalString(input, key) {
    const value = input[key];
    if (value === undefined || value === null)
        return undefined;
    if (typeof value !== "string")
        throw new KeycloakApiError(400, `'${key}' must be a string.`);
    return value;
}
export function optionalBoolean(input, key) {
    const value = input[key];
    if (value === undefined || value === null)
        return undefined;
    if (typeof value !== "boolean")
        throw new KeycloakApiError(400, `'${key}' must be a boolean.`);
    return value;
}
export function optionalNumber(input, key) {
    const value = input[key];
    if (value === undefined || value === null)
        return undefined;
    if (typeof value !== "number" || !Number.isFinite(value))
        throw new KeycloakApiError(400, `'${key}' must be a finite number.`);
    return value;
}
export function optionalStringArray(input, key) {
    const value = input[key];
    if (value === undefined || value === null)
        return undefined;
    if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
        throw new KeycloakApiError(400, `'${key}' must be an array of strings.`);
    }
    return value;
}
export function optionalObject(input, key) {
    const value = input[key];
    if (value === undefined || value === null)
        return undefined;
    if (typeof value !== "object" || Array.isArray(value))
        throw new KeycloakApiError(400, `'${key}' must be an object.`);
    return value;
}
export function objectSchema(properties, required = []) {
    return { type: "object", properties, required, additionalProperties: false };
}
export const schema = {
    string: (description) => ({ type: "string", description }),
    boolean: (description) => ({ type: "boolean", description }),
    number: (description) => ({ type: "number", description }),
    strings: (description) => ({ type: "array", items: { type: "string" }, description }),
    object: (description) => ({ type: "object", additionalProperties: true, description }),
};
export function messageFrom(error) {
    return error instanceof Error ? error.message : String(error);
}
export function expectConfirmation(input, expected) {
    const confirmation = expectString(input, "confirmation");
    if (confirmation !== expected) {
        throw new KeycloakApiError(400, `This operation requires target-bound confirmation exactly equal to '${expected}'.`);
    }
}
/** Redacts secrets and optionally private URLs/PII before a value reaches MCP output. */
export function redactSensitive(value, options = {}) {
    if (typeof value === "string" && options.redactInternalUrls && isInternalUrl(value))
        return "[REDACTED_INTERNAL_URL]";
    if (Array.isArray(value))
        return value.map((item) => redactSensitive(item, options));
    if (!isRecord(value))
        return value;
    const result = {};
    for (const [key, item] of Object.entries(value)) {
        const normalizedKey = normalizeKey(key);
        if (isSensitiveKey(normalizedKey)) {
            result[key] = "[REDACTED]";
            continue;
        }
        if (options.redactPii && isPiiKey(normalizedKey)) {
            result[key] = "[REDACTED_PII]";
            continue;
        }
        if (options.redactInternalUrls && typeof item === "string" && isInternalUrl(item)) {
            result[key] = "[REDACTED_INTERNAL_URL]";
            continue;
        }
        result[key] = redactSensitive(item, options);
    }
    return result;
}
export function stableJson(value) {
    return JSON.stringify(sortJson(value));
}
export function extractServerVersion(serverInfo) {
    if (!isRecord(serverInfo))
        return undefined;
    for (const key of ["systemVersion", "version", "serverVersion"]) {
        if (typeof serverInfo[key] === "string" && serverInfo[key].trim())
            return serverInfo[key].trim();
    }
    return undefined;
}
export function parseSemanticVersion(value) {
    if (typeof value !== "string")
        return undefined;
    const match = value.trim().match(/^(\d+)\.(\d+)(?:\.(\d+))?/);
    if (!match)
        return undefined;
    return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3] ?? 0), raw: value.trim() };
}
export function versionAtLeast(actual, minimum) {
    const current = parseSemanticVersion(actual);
    const required = parseSemanticVersion(minimum);
    if (!current || !required)
        return false;
    if (current.major !== required.major)
        return current.major > required.major;
    if (current.minor !== required.minor)
        return current.minor > required.minor;
    return current.patch >= required.patch;
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function normalizeKey(key) {
    return key.replace(/[._-]/g, "").toLowerCase();
}
function isSensitiveKey(key) {
    return key.includes("password") || key.includes("credential") || key.includes("secret") || key.includes("privatekey")
        || key.includes("truststorepassword") || key.includes("keystorepassword") || key === "binddn"
        || key === "bindcredential" || key === "usersdn" || key === "basedn" || key.includes("accesstoken")
        || key.includes("refreshtoken");
}
function isPiiKey(key) {
    return key === "email" || key === "username" || key === "firstname" || key === "lastname"
        || key === "givenname" || key === "familyname" || key === "phone" || key === "address"
        || key === "ssn" || key === "socialsecuritynumber";
}
function isInternalUrl(value) {
    try {
        const url = new URL(value);
        const host = url.hostname.toLowerCase();
        if (host === "localhost" || host === "::1" || host.endsWith(".local") || host.endsWith(".internal"))
            return true;
        if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host))
            return true;
        const private172 = host.match(/^172\.(\d+)\./);
        return private172 ? Number(private172[1]) >= 16 && Number(private172[1]) <= 31 : !host.includes(".");
    }
    catch {
        return false;
    }
}
function sortJson(value) {
    if (Array.isArray(value))
        return value.map(sortJson);
    if (!isRecord(value))
        return value;
    return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, sortJson(item)]));
}
function decodeBase64UrlJson(segment, label) {
    try {
        const value = JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));
        if (typeof value !== "object" || value === null || Array.isArray(value)) {
            throw new Error("JSON value is not an object");
        }
        return value;
    }
    catch (error) {
        throw new KeycloakApiError(400, `JWT ${label} is not valid base64url-encoded JSON: ${messageFrom(error)}`);
    }
}
function parseJson(text) {
    if (!text)
        return undefined;
    try {
        return JSON.parse(text);
    }
    catch {
        return undefined;
    }
}
function keycloakMessage(payload, fallback, statusText) {
    if (typeof payload === "object" && payload !== null && !Array.isArray(payload)) {
        const details = payload;
        for (const key of ["errorMessage", "error_description", "message", "error"]) {
            if (typeof details[key] === "string" && details[key].trim())
                return details[key];
        }
    }
    return fallback || statusText || "Keycloak returned an error without a response body.";
}
function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
//# sourceMappingURL=client.js.map
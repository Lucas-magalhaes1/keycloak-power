export type JsonObject = Record<string, unknown>;
export type QueryParameters = Record<string, string | number | boolean | undefined>;
export interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: JsonObject;
    handler: (input: JsonObject) => Promise<unknown>;
}
export declare class KeycloakApiError extends Error {
    readonly status: number;
    readonly details?: unknown | undefined;
    constructor(status: number, message: string, details?: unknown | undefined);
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
export declare class KeycloakClient {
    private readonly baseUrl;
    private readonly authenticationRealm;
    private readonly clientId;
    private readonly clientSecret;
    private token?;
    constructor(options?: KeycloakClientOptions);
    get<T = unknown>(path: string, query?: QueryParameters): Promise<T>;
    post<T = unknown>(path: string, body?: unknown, query?: QueryParameters): Promise<T>;
    put<T = unknown>(path: string, body?: unknown, query?: QueryParameters): Promise<T>;
    delete<T = unknown>(path: string, query?: QueryParameters): Promise<T>;
    resolveClientUUID(realm: string, clientId: string): Promise<string>;
    /** Resolves a Keycloak UUID directly or looks up an exact username. */
    resolveUser(realm: string, userIdOrUsername: string): Promise<string>;
    realmPath(realm: string, suffix?: string): string;
    private request;
    private getAccessToken;
    private parseResponse;
    private createUrl;
    private assertConfiguration;
}
/** Decodes a JWT locally; it does not cryptographically validate the signature. */
export declare function decodeJwt(token: string): JsonObject;
export declare function expectString(input: JsonObject, key: string): string;
export declare function optionalString(input: JsonObject, key: string): string | undefined;
export declare function optionalBoolean(input: JsonObject, key: string): boolean | undefined;
export declare function optionalNumber(input: JsonObject, key: string): number | undefined;
export declare function optionalStringArray(input: JsonObject, key: string): string[] | undefined;
export declare function optionalObject(input: JsonObject, key: string): JsonObject | undefined;
export declare function objectSchema(properties: JsonObject, required?: string[]): JsonObject;
export declare const schema: {
    string: (description: string) => JsonObject;
    boolean: (description: string) => JsonObject;
    number: (description: string) => JsonObject;
    strings: (description: string) => JsonObject;
    object: (description: string) => JsonObject;
};
export declare function messageFrom(error: unknown): string;
export {};
//# sourceMappingURL=client.d.ts.map
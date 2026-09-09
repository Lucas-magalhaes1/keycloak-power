import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListResourcesRequestSchema, ListToolsRequestSchema, ReadResourceRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { KeycloakApiError, KeycloakClient, messageFrom } from "./client.js";
import { authFlowsTools } from "./tools/auth-flows.js";
import { clientsTools } from "./tools/clients.js";
import { groupsTools } from "./tools/groups.js";
import { identityProvidersTools } from "./tools/identity-providers.js";
import { organizationsTools } from "./tools/organizations.js";
import { protocolMappersTools } from "./tools/protocol-mappers.js";
import { realmsTools } from "./tools/realms.js";
import { rolesTools } from "./tools/roles.js";
import { sessionsTools } from "./tools/sessions.js";
import { tokensTools } from "./tools/tokens.js";
import { usersTools } from "./tools/users.js";
const client = new KeycloakClient();
const tools = [
    ...realmsTools(client), ...clientsTools(client), ...usersTools(client), ...rolesTools(client),
    ...groupsTools(client), ...identityProvidersTools(client), ...organizationsTools(client),
    ...authFlowsTools(client), ...sessionsTools(client), ...tokensTools(client), ...protocolMappersTools(client),
];
const toolByName = new Map(tools.map((tool) => [tool.name, tool]));
const server = new Server({ name: "keycloak-admin", version: "1.0.0" }, { capabilities: { tools: {}, resources: {} }, instructions: "Keycloak Admin REST API tools. Mutations require a least-privilege service account." });
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
}));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = toolByName.get(request.params.name);
    if (!tool)
        return toolError(`Unknown Keycloak tool '${request.params.name}'.`);
    const input = request.params.arguments ?? {};
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
        return toolError("Tool arguments must be a JSON object.");
    }
    try {
        const result = await tool.handler(input);
        return toolResult(result);
    }
    catch (error) {
        return toolError(formatError(error));
    }
});
const resources = [
    {
        uri: "keycloak://server-info",
        name: "server-info",
        description: "Live Keycloak server information. Reading it performs an authenticated Admin REST API request.",
        mimeType: "application/json",
    },
    {
        uri: "keycloak://api-docs",
        name: "api-docs",
        description: "Concise map of the Keycloak Admin REST API tool domains exposed by this MCP server.",
        mimeType: "application/json",
    },
];
server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources }));
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    if (request.params.uri === "keycloak://server-info") {
        try {
            const info = await client.get("/admin/serverinfo");
            return { contents: [{ uri: request.params.uri, mimeType: "application/json", text: JSON.stringify(info, null, 2) }] };
        }
        catch (error) {
            return { contents: [{ uri: request.params.uri, mimeType: "application/json", text: JSON.stringify({ error: formatError(error) }, null, 2) }] };
        }
    }
    if (request.params.uri === "keycloak://api-docs") {
        return { contents: [{ uri: request.params.uri, mimeType: "application/json", text: JSON.stringify(apiDocumentation(), null, 2) }] };
    }
    throw new KeycloakApiError(404, `Unknown resource '${request.params.uri}'.`);
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
function toolResult(value) {
    return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}
function toolError(message) {
    return { content: [{ type: "text", text: message }], isError: true };
}
function formatError(error) {
    if (error instanceof KeycloakApiError)
        return error.message;
    return `Keycloak tool failed: ${messageFrom(error)}`;
}
function apiDocumentation() {
    return {
        authentication: "Client Credentials Grant with a Keycloak service account. Password Grant is not implemented.",
        resourceBase: "/admin/realms/{realm}",
        domains: Object.fromEntries(groupToolsByDomain(tools)),
        resources: resources.map(({ uri, name, description }) => ({ uri, name, description })),
    };
}
function groupToolsByDomain(allTools) {
    const domains = {
        realms: [], clients: [], users: [], roles: [], groups: [], identityProviders: [], organizations: [],
        authentication: [], sessionsAndEvents: [], tokens: [], protocolMappers: [],
    };
    for (const tool of allTools) {
        const domain = tool.name.includes("realm") ? "realms"
            : tool.name.includes("client") && !tool.name.includes("scope") ? "clients"
                : tool.name.includes("user") ? "users"
                    : tool.name.includes("role") ? "roles"
                        : tool.name.includes("group") ? "groups"
                            : tool.name.includes("identity_provider") || tool.name.includes("idp") ? "identityProviders"
                                : tool.name.includes("organization") ? "organizations"
                                    : tool.name.includes("auth_flow") || tool.name.includes("required_action") ? "authentication"
                                        : tool.name.includes("session") || tool.name.includes("server_info") || tool.name.includes("event") ? "sessionsAndEvents"
                                            : tool.name.includes("token") ? "tokens"
                                                : "protocolMappers";
        domains[domain].push(tool.name);
    }
    return Object.entries(domains);
}
main().catch((error) => {
    process.stderr.write(`Keycloak MCP server failed to start: ${formatError(error)}\n`);
    process.exitCode = 1;
});
//# sourceMappingURL=index.js.map
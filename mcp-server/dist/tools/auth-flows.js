import { expectString, objectSchema, schema, } from "../client.js";
export function authFlowsTools(client) {
    return [
        {
            name: "list_auth_flows",
            description: "List built-in and custom authentication flows in a realm.",
            inputSchema: objectSchema({ realm: schema.string("Target realm name.") }, ["realm"]),
            handler: async (input) => client.get(client.realmPath(expectString(input, "realm"), "/authentication/flows")),
        },
        {
            name: "get_auth_flow",
            description: "Get a flow representation and its ordered executions by flow alias.",
            inputSchema: objectSchema({ realm: schema.string("Target realm name."), flowAlias: schema.string("Authentication flow alias.") }, ["realm", "flowAlias"]),
            handler: async (input) => {
                const realm = expectString(input, "realm");
                const flowAlias = expectString(input, "flowAlias");
                const flows = await client.get(client.realmPath(realm, "/authentication/flows"));
                const flow = flows.find((candidate) => candidate.alias === flowAlias);
                if (!flow)
                    throw new Error(`Authentication flow '${flowAlias}' was not found.`);
                const executions = await client.get(client.realmPath(realm, `/authentication/flows/${encodeURIComponent(flowAlias)}/executions`));
                return { flow, executions };
            },
        },
        {
            name: "get_required_actions",
            description: "List required actions, including configured OTP, WebAuthn, and update-profile actions.",
            inputSchema: objectSchema({ realm: schema.string("Target realm name.") }, ["realm"]),
            handler: async (input) => client.get(client.realmPath(expectString(input, "realm"), "/authentication/required-actions")),
        },
    ];
}
//# sourceMappingURL=auth-flows.js.map
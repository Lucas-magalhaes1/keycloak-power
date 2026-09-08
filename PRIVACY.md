# Privacy Policy

This Kiro Power runs a local Model Context Protocol (MCP) server (`mcp-server/`) that talks directly to the Keycloak Admin REST API instance you configure. It does not introduce any third-party data collection.

## Data handling

- **No telemetry.** The MCP server does not send usage data, analytics, or diagnostics to the power author or any third party.
- **No secondary storage.** The server does not persist realms, users, tokens, or any Keycloak data outside the single request/response cycle. Nothing is written to disk by the server itself.
- **Local-only credentials.** `KEYCLOAK_CLIENT_SECRET` and other configuration values are read from environment variables you control and are sent only to the Keycloak server you configure, using Client Credentials Grant over HTTPS.
- **Local-only token decoding.** The `decode_token` tool decodes JWTs entirely in the local Node.js process. It never sends a token to Kiro, to the power author, or to any external service.
- **Traffic destination.** The only network calls this Power makes are to the `KEYCLOAK_URL` you provide. No other endpoint is contacted.

## Your Keycloak deployment

This Power is a client of your own Keycloak server. Any data processed by Keycloak itself (users, sessions, events) is governed by your organization's own privacy practices and Keycloak's own documentation, not by this Power.

## Source and license

The full source code is available in this repository for inspection. The project is licensed under [Apache-2.0](LICENSE).

## Contact

For privacy questions about this Power specifically, open an issue in the repository: https://github.com/Lucas-magalhaes1/keycloak-power/issues

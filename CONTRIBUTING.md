# Contributing to Keycloak Power

Thank you for improving the Keycloak Power. Contributions should improve real Keycloak administration workflows without embedding organization-specific policies or credentials.

## Development setup

1. Fork and clone the repository.
2. Use Node.js 22 or later.
3. Install exact dependencies and compile:
   ```powershell
   Set-Location .\mcp-server
   npm ci
   npm run build
   ```
4. Import the `keycloak-power` folder into Kiro as a custom Power for manual smoke testing.

## Contribution rules

- Keep `plugin.json` and `mcp.json` compliant with Agent Plugins v1.0.0. Do not add undocumented manifest fields.
- Keep every skill directory self-contained and include a non-empty `SKILL.md` whose frontmatter name equals its directory name.
- Add real operator guidance, decision criteria, and validation steps; do not add placeholder text or unverified endpoint claims.
- Maintain the least-privilege, Client Credentials-only stance. Never add Password Grant authentication, token logging, or a place for plaintext credentials in the repository.
- Use stable `clientId` inputs in tools and resolve them to Keycloak internal UUIDs in the client wrapper.
- Preserve JSON response structures rather than silently reshaping data that administrators may need for diagnosis.
- When adding a mutating endpoint, document the Keycloak version and permissions it requires in the related skill/reference, present the intended change before execution, and require explicit human confirmation for destructive operations.

## MCP implementation guidelines

- Put transport and MCP protocol wiring in `mcp-server/src/index.ts`.
- Put authentication, token reuse, request serialization, errors, and ID resolution in `client.ts`.
- Put one cohesive API domain per `src/tools/*.ts` module, exporting its `ToolDefinition[]` collection.
- Return content through MCP tool results; do not use `console.log`, because stdout is the MCP transport.
- Keep JWT decoding local and never validate or claim to validate a signature without JWKS-based cryptographic verification.

## Documentation guidelines

Skills are operational instructions, not a copy of vendor manuals. Every `SKILL.md` needs a frontmatter description that starts with a verb and includes “Use when”. Reference files should state prerequisites, secure configuration choices, a verification method, and the expected failure mode when relevant.

For Keycloak 26+ Organizations, describe the single-realm SaaS pattern and state clearly that application-domain authorization remains in the SaaS API.

## Before opening a pull request

1. Run `npm run build` under `mcp-server`.
2. Check JSON parsing and schema conformance of `plugin.json`.
3. Verify each `skills/*/SKILL.md` exists and its `name` matches its directory.
4. Test a read-only call against a disposable Keycloak environment, if the change touches a REST endpoint.
5. Test expected error output for an expired credential or missing role.
6. Update README tables and the related skill/reference whenever a tool or workflow changes.

## Security reporting

Do not report credential leaks, authorization bypasses, SSRF concerns, or unsafe endpoint handling in a public issue. Contact the repository owner privately with reproduction details, affected versions, and recommended mitigation. Redact access tokens, client secrets, user data, and internal Keycloak URLs from all reports.

## License

By contributing, you agree that your contributions are licensed under Apache-2.0.

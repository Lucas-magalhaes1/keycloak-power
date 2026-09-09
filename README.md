# Keycloak Power

[![Keycloak](https://img.shields.io/badge/Keycloak-21%2B-4D4D4D?logo=keycloak)](https://www.keycloak.org/)
[![Kiro Power](https://img.shields.io/badge/Kiro-Power-5B5CE2)](https://kiro.dev/docs/powers/)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

**The first comprehensive Keycloak Power for Kiro IDE.** Manage Keycloak through its Admin REST API and give Kiro grounded workflows for identity architecture, SSO federation, JWT claims, Organizations, and SaaS authorization.

## Features

- Administer realms, clients, users, roles, groups, sessions, events, and client scopes.
- Configure OIDC, SAML, Google, Microsoft Entra ID, Okta, generic external IdPs, and LDAP/AD guidance.
- Create and operate Keycloak Organizations for Keycloak 26+ multi-tenant B2B/B2B2C deployments.
- Inspect JWT structure and claims locally without sending tokens to any service.
- Design authentication flows, MFA, protocol mappers, and authorization middleware contracts.
- Use focused skills that distinguish Keycloak authentication from SaaS-domain authorization.

## Requirements

- Kiro IDE with custom Powers enabled.
- Keycloak 21+ for core Admin REST API operations; Keycloak 26+ and Organizations enabled for organization tools.
- A confidential client with **Service Accounts Enabled** and a client secret.
- A service account granted the least-privilege `realm-management` roles required by the operations you intend to perform. The server uses only Client Credentials Grant; it never uses Resource Owner Password Credentials.
- Node.js 22+ to run the bundled MCP server.

## Quick start

1. Build the server:
   ```powershell
   Set-Location .\mcp-server
   npm ci
   npm run build
   ```
2. In Kiro, open **Powers**, select **Add Custom Power**, select **Import from folder**, and choose the `keycloak-power` directory.
3. Make these values available to the MCP process:
   ```text
   KEYCLOAK_URL=https://keycloak.example.com
   KEYCLOAK_REALM=master
   KEYCLOAK_CLIENT_ID=kiro-keycloak-admin
   KEYCLOAK_CLIENT_SECRET=<service-account-secret>
   ```
4. Start a new Kiro chat and ask, for example, “Liste os realms do Keycloak” or “Configure Organizations para um SaaS B2B”.

`KEYCLOAK_URL` may include a reverse-proxy context path, for example `https://sso.example.com/auth`; trailing slashes are normalized. `KEYCLOAK_REALM` is the realm where the admin client exists (commonly `master`), not necessarily the realm being managed.

## Configure the Keycloak service account

1. In the admin console, create a confidential OpenID Connect client, such as `kiro-keycloak-admin`, in the administration realm.
2. Turn on **Client authentication** and **Service accounts roles**; do not enable Direct Access Grants for this Power.
3. On **Credentials**, generate and save the client secret in a secret manager. Do not commit it to the repository or `mcp.json`.
4. On **Service account roles**, select client `realm-management` and assign only necessary permissions. Typical read-only discovery needs `query-realms`, `query-clients`, `query-users`, and `view-realm`; realm mutation also needs roles such as `manage-realm`, `manage-clients`, `manage-users`, or `manage-identity-providers`.
5. Verify connectivity by asking Kiro to call `get_server_info`.

## Environment configuration

| Variable | Required | Meaning |
|---|---:|---|
| `KEYCLOAK_URL` | Yes | Base URL of the Keycloak server. |
| `KEYCLOAK_REALM` | Yes | Realm that authenticates the service account. |
| `KEYCLOAK_CLIENT_ID` | Yes | Confidential client ID for the service account. |
| `KEYCLOAK_CLIENT_SECRET` | Yes | Secret for Client Credentials Grant. |

The Power manifest contains no secret. Use Kiro's environment/secrets configuration or your operating system's environment to provide the values at runtime.

## Skills

| Skill | Use it for |
|---|---|
| `admin-api` | Safe, ordered Keycloak Admin REST API administration. |
| `setup-realm` | Realm bootstrap and security baseline. |
| `setup-client` | OIDC/SAML client design and redirect safety. |
| `identity-providers` | Google, Entra ID, OIDC, SAML, and Okta federation. |
| `organizations` | Keycloak 26+ Organizations and B2B multi-tenancy. |
| `authentication-flows` | Browser flows, required actions, OTP, and WebAuthn. |
| `token-debug` | Local JWT decoding and claim diagnosis. |
| `user-federation` | LDAP and Active Directory federation planning. |
| `protocol-mappers` | Claims, audiences, group membership, tenant, and organization mappings. |
| `saas-authorization` | Multi-tenant API authorization architecture. |
| `troubleshooting` | Events, sessions, client, token, and IdP diagnosis. |

## MCP tools

| Domain | Tools |
|---|---|
| Realms | `list_realms`, `get_realm`, `create_realm`, `update_realm`, `delete_realm` (requires `confirmation: "DELETE <realm>"`; `master` is blocked) |
| Clients | `list_clients`, `get_client`, `create_client`, `get_client_secret`, `update_client` |
| Users | `list_users`, `get_user`, `create_user`, `update_user`, `assign_role_to_user`, `get_user_roles` |
| Roles | `list_roles`, `create_role`, `get_role` |
| Groups | `list_groups`, `create_group`, `add_user_to_group`, `get_group_members` |
| Identity providers | `list_identity_providers`, `get_identity_provider`, `create_identity_provider`, `update_identity_provider`, `delete_identity_provider`, `get_identity_provider_mapper_types`, `list_identity_provider_mappers`, `get_identity_provider_mapper`, `create_identity_provider_mapper`, `update_identity_provider_mapper`, `delete_identity_provider_mapper` |
| Organizations | `list_organizations`, `get_organization`, `create_organization`, `add_member_to_organization`, `list_organization_members`, `add_idp_to_organization` |
| Authentication | `list_auth_flows`, `get_auth_flow`, `get_required_actions` |
| Sessions and events | `get_user_sessions`, `get_server_info`, `get_realm_events` |
| Tokens | `decode_token`, `get_token_endpoint_info` |
| Protocol mappers | `list_protocol_mappers`, `create_protocol_mapper`, `get_default_client_scopes` |

Tool inputs are validated for required strings and JSON-shaped configuration values. Every REST request surfaces Keycloak's HTTP status and message to make permissions, malformed request bodies, and unsupported server features diagnosable.

## Example Kiro conversations

```text
List the clients in the saas realm and show the redirect URIs for portal-web.
```

```text
Create the acme organization with alias acme, domain acme.example, and add alice as a member.
```

```text
Decode this JWT and explain why the API isn't receiving the tenant_id claim.
```

```text
I need a client for an SPA. Use Authorization Code with PKCE, safe origins, and a groups mapper.
```

## Development

```powershell
Set-Location .\mcp-server
npm ci
npm run build
```

The server speaks MCP over standard input/output. Do not write log messages to stdout; diagnostics belong on stderr. See [CONTRIBUTING.md](CONTRIBUTING.md) for development, security, and pull-request rules.

## Privacy and support

- Privacy policy: [PRIVACY.md](PRIVACY.md). This Power does not collect telemetry and only communicates with the `KEYCLOAK_URL` you configure.
- Support and bug reports: open an issue at [github.com/Lucas-magalhaes1/keycloak-power/issues](https://github.com/Lucas-magalhaes1/keycloak-power/issues).

## Documentation sources

The implementation follows the [Keycloak documentation](https://www.keycloak.org/documentation) and [Admin API reference](https://www.keycloak.org/docs-api/latest/rest-api/). Organization guidance follows Keycloak's [Organizations announcement](https://www.keycloak.org/2024/06/announcement-keycloak-organizations). Content was rephrased for compliance with licensing restrictions.

## License

Copyright 2026 Lucas Magalhães. Licensed under [Apache-2.0](LICENSE).

---
name: "troubleshooting"
description: "Diagnose Keycloak, session, token, client, and identity provider errors. Use when login, authorization, CORS, or federation is failing."
license: "Apache-2.0"
compatibility: "Keycloak 21+ and the keycloak-admin MCP server"
metadata:
  author: "Lucas Magalhães"
  version: "1.0.0"
---

# Troubleshooting Keycloak

## Overview
Efficient diagnosis separates connectivity/administration, authentication, token issuance, browser/CORS, and API authorization. Collect minimal signals, preserve tokens/PII, and test one hypothesis at a time.

## Prerequisites checklist
- [ ] Realm, client, user, and time of the incident have been identified.
- [ ] Tokens and logs will be redacted before being shared.
- [ ] The service account has read-only permissions for the needed diagnosis.

## Step-by-step guide

### Step 1 — Check the server
Call `get_server_info`. If it fails, validate URL, reverse proxy, DNS, certificate, and service account credentials before inspecting the realm. Distinguish 401 (authentication) from 403 (administrative authorization).

### Step 2 — Check sessions
Use `get_user_sessions` with a UUID or username. A missing session after login suggests a browser flow, cookie, redirect URI, IdP broker, or logout failure; a present session with the API denying access suggests a token/audience/authorization issue.

### Step 3 — Check events
Use `get_realm_events` with date, type, or user. Look for `LOGIN_ERROR`, `CODE_TO_TOKEN_ERROR`, `INVALID_SIGNATURE`, a redirect error, or an IdP error. Correlate the UTC timestamp with proxy and application logs.

### Step 4 — Decode the token
Use `decode_token`, compare `iss`, `aud`, `azp`, `exp`, `realm_access`, and `resource_access`. Confirm with `get_token_endpoint_info` that the expected issuer/JWKS matches the API configuration.

### Step 5 — Check the client
Use `get_client` to check clientId, protocol, standard flow, public/confidential, redirect URIs, web origins, and mappers. Use `list_protocol_mappers` for missing claims and `get_default_client_scopes` for inheritance.

### Step 6 — Check the IdP
Use `get_identity_provider`, confirm alias, issuer/metadata, client ID, endpoints, and mappers. For an error on first login, review the linking policy and the attributes returned by the provider.

## References
See [common-errors.md](references/common-errors.md) for 401/403, expiration, redirect, and CORS causes; see [log-analysis.md](references/log-analysis.md) for safe log reading and correlation.

## Important rules
- **A diagnosis does not authorize an automatic fix.** Before changing a client, realm, IdP, mapper, or flow, present the plan, target resource, affected fields, and impact, and wait for explicit human confirmation.
- Do not disable signature validation, HTTPS, PKCE, or redirect URI checks to "make it work."
- Do not share tokens, secrets, passwords, SAML assertions, or personal details in a public issue.
- Fix the cause in the client/realm/IdP, not only the symptom in the frontend.
- Separate a Keycloak token rejection from a SaaS API authorization decision.

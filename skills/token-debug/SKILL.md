---
name: "token-debug"
description: "Debug JWTs issued by Keycloak without sending credentials to external services. Use when an API does not recognize the expected issuer, audience, roles, or claims."
license: "Apache-2.0"
compatibility: "Keycloak 21+ and the keycloak-admin MCP server"
metadata:
  author: "Lucas Magalhães"
  version: "1.0.0"
---

# JWT debugging

## Overview
A JWT is a bearer credential: decoding it reveals content but does not prove the signature. The `decode_token` tool operates locally in the MCP process and never sends the token to an external site; still, treat the token as a secret and redact it in tickets.

## Prerequisites checklist
- [ ] The token was obtained in the right environment and will not be persisted in logs.
- [ ] The expected issuer and the expected client/audience are known.
- [ ] The server and API clocks are synchronized via NTP.

## Step-by-step guide

### Step 1 — Get the right token
Determine whether the issue involves an access token, ID token, or client credentials token. Capture the token from the same grant, realm, client, and user that are failing. Do not use an admin console token as a substitute for an application token.

### Step 2 — Decode locally
Use `decode_token`. The response contains header, payload, ISO dates for `iat`, `nbf`, and `exp`, a claim list, and an indication that the signature has **not** been validated. Use `skills/token-debug/scripts/decode-token.sh` only for a quick local shell inspection.

### Step 3 — Check structural claims
Compare `iss` against the discovery document from `get_token_endpoint_info`; check `sub`, `azp`, `aud`, `exp`, `iat`, `realm_access`, and `resource_access`. For SaaS, confirm claims like `tenant_id` or `org_id` only when your model supports their meaning.

### Step 4 — Check expiration and clock skew
A token is invalid after `exp`; `nbf` delays validity. If the API rejects a freshly issued token, compare the clocks of Keycloak, gateway, and API. Do not fix clock skew by excessively extending access token lifetime.

### Step 5 — Compare expected versus actual
Use `get_client` and `list_protocol_mappers` to check client scopes, audiences, and mappers. Update the configuration carefully, obtain a new token, and repeat `decode_token`; an old token does not retroactively gain claims.

## Important rules
- **Debugging a token does not authorize changing Keycloak.** Before changing a mapper, role, client scope, or client to fix the diagnosis, present the change and its impact and wait for explicit human confirmation.
- A decoded JWT is not the same as a validated JWT; the API must validate signature via JWKS, issuer, audience, exp, and nbf.
- Never forward a real access token to external tools, and never include it in a commit.
- Keycloak roles are identity signals; multi-tenant resource permissions must be decided by the SaaS API.
- Always generate a new token after changing mappers, roles, or client scopes.

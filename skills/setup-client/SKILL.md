---
name: "setup-client"
description: "Configure Keycloak OIDC and SAML clients with secure grants and URIs. Use when you are integrating an SPA, backend, mobile app, or service-to-service workload."
license: "Apache-2.0"
compatibility: "Keycloak 21+ and the keycloak-admin MCP server"
metadata:
  author: "Lucas Magalhães"
  version: "1.0.0"
---

# Configure an OIDC or SAML client

## Overview
Clients represent applications that delegate authentication to Keycloak. The choice of protocol, grant, and public/confidential type determines where the token is issued and which secrets can safely exist.

## Prerequisites checklist
- [ ] Production, staging, and development URLs are inventoried.
- [ ] The application type and its ability to keep a secret have been identified.
- [ ] Redirect URIs and web origins have been approved without broad wildcards.

## Step-by-step guide

### Step 1 — Identify the application type
SPAs and mobile apps are public clients: they do not keep a client secret. Web backends and machine-to-machine services are confidential clients. For legacy enterprise SSO, identify whether the service provider requires SAML and obtain metadata/ACS URL before creating the client.

### Step 2 — Choose the grant type
For browsers, choose Authorization Code with PKCE. For service-to-service communication, enable Client Credentials and use service accounts. Device Authorization serves devices without a full browser. Do not use Implicit in new integrations; it exposes tokens to the front channel. See [oidc-patterns.md](references/oidc-patterns.md).

### Step 3 — Create the client
Before creating or changing a client, present realm, clientId, protocol, grants, public/confidential type, redirect URIs, origins, and claims; wait for explicit human confirmation. Then use `create_client` with `protocol: "openid-connect"` or `"saml"`, `publicClient`, `redirectUris`, `webOrigins`, and `config`. For an OIDC SPA, configure `standardFlowEnabled: true`, PKCE `S256` in attributes, exact redirect URIs, and explicit origins. For a backend, keep `publicClient: false` and create/route the secret to a vault.

### Step 4 — Configure redirect URIs and origins
A redirect URI must contain the expected scheme, host, port, and path. Add each real callback, such as `https://portal.example.com/auth/callback`, and avoid `https://*.example.com/*`. For an SPA, `webOrigins` must contain only origins that will perform CORS; do not use `+` or `*` as a security shortcut.

### Step 5 — Add required claims
Use `list_protocol_mappers` to inspect what already reaches the token and `create_protocol_mapper` for additional attributes, groups, audience, or roles. After obtaining a test token, validate it with `decode_token`. For SAML, see [saml-patterns.md](references/saml-patterns.md).

## Verification
Use `get_client` to check the effective representation. Test Authorization Code in the browser with an allowed URI and a denied URI. For confidential clients, use the token endpoint only from a server environment and confirm tokens contain the correct `aud`.

## Important rules
- **Before creating or changing a client, present realm, clientId, protocol, grants, public/confidential type, redirect URIs, origins, and claims; wait for explicit human confirmation.** A prior, generic confirmation, or one given for another target, does not authorize the change.
- SPAs and mobile apps must never receive or store `KEYCLOAK_CLIENT_SECRET`.
- Authorization Code + PKCE is the default for modern interactive apps.
- Client Credentials identifies an application/service account, not a human user.
- Mappers determine the claim surface; add only necessary data and avoid unnecessary personal data.

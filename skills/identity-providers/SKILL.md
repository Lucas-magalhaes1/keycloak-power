---
name: "identity-providers"
description: "Integrate external identity providers into Keycloak with OIDC or SAML. Use when you need to federate Google, Entra ID, Okta, or a corporate IdP."
license: "Apache-2.0"
compatibility: "Keycloak 21+ and the keycloak-admin MCP server"
metadata:
  author: "Lucas Magalhães"
  version: "1.0.0"
---

# Configure external identity providers

## Overview
An Identity Provider (IdP) makes Keycloak trust login from an external provider and issue its own tokens to local clients. The realm remains the owner of the claim contract and session policy regardless of the upstream provider.

## Prerequisites checklist
- [ ] The external IdP has been registered with the Keycloak broker's redirect URI.
- [ ] Client ID, client secret, issuer/metadata, and scopes are stored in a vault.
- [ ] The IdP alias, identity mapping, and first-login behavior have been defined.

## Step-by-step guide

### Step 1 — Obtain credentials at the IdP
Register Keycloak as a relying party/client at the provider and copy only the necessary values: issuer or metadata URL, client ID, secret/certificate, and redirect URI. The callback is normally `https://<keycloak>/realms/<realm>/broker/<alias>/endpoint`; check the URL Keycloak displays for the final alias.

### Step 2 — Create the IdP in Keycloak
Use `create_identity_provider` with alias, `providerId`, displayName, and config. The provider IDs supported by the Power are `google`, `microsoft`, `oidc`, `saml`, and `keycloak-oidc`. Before saving, check that the endpoints/metadata belong to the correct tenant and that signature validation has not been disabled.

### Step 3 — Configure claim mappers
Map stable identifiers and minimal attributes. Email is only a trustworthy identifier if it is verified and immutable under the provider's policy; prefer the external `sub`/subject for account linking. Configure the first-login flow to require confirmation or linking when needed.

### Step 4 — Test authentication
Use a test account, complete login at the IdP, and validate the user and session with `get_user`, `get_user_sessions`, and `get_realm_events`. Decode the local token issued by Keycloak with `decode_token`; the application should trust Keycloak's issuer, not the upstream token.

### Step 5 — Link to an Organization when applicable
For B2B, create the Organization with `create_organization`, then use `add_idp_to_organization` to associate the existing alias. Test domain discovery and the broker flow with a user from that customer.

## Provider references
- [Google](references/google-setup.md)
- [Microsoft Entra ID](references/microsoft-entra-id-setup.md)
- [Generic OIDC](references/oidc-generic-setup.md)
- [Generic SAML](references/saml-generic-setup.md)
- [Okta](references/okta-setup.md)

## Important rules
- **Before creating, updating, linking, or removing an IdP, present realm, alias, issuer/metadata, changed fields, and login impact; wait for explicit human confirmation.** A prior, generic confirmation, or one given for another target, does not authorize the change.
- Never paste secrets, private keys, SAML assertions, or tokens into chat.
- Validate issuer, discovery/metadata URL, signature, and audience; do not accept endpoints discovered from user input.
- Use a stable alias; changing it breaks broker URLs and Organization associations.
- The IdP authenticates users; product roles and permissions must be assigned and evaluated according to realm and application policies.

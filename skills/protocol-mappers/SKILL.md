---
name: "protocol-mappers"
description: "Design Keycloak protocol mappers for useful and minimal JWT and SAML claims. Use when an application needs to receive attributes, groups, audiences, or tenant context."
license: "Apache-2.0"
compatibility: "Keycloak 21+ and the keycloak-admin MCP server"
metadata:
  author: "Lucas Magalhães"
  version: "1.0.0"
---

# Protocol mappers and claims

## Overview
Protocol mappers transform Keycloak identity into claims that clients consume. They are the bridge between authentication and a SaaS API, so they should be versioned as a contract: stable claim, explicit type, correct audience, and minimal data exposure.

## Prerequisites checklist
- [ ] The API has documented claims, types, and consumers.
- [ ] The target client or client scope has been identified.
- [ ] It has been decided whether the mapper appears in the access token, ID token, and/or userinfo.

## Step-by-step guide

### Step 1 — Inspect current mappers
Use `list_protocol_mappers` with realm and clientId. Identify duplicate mappers, claims with the same name, and mappers inherited from client scopes. Use `get_default_client_scopes` to discover what is applied globally.

### Step 2 — Choose the mapper type
Use User Attribute for a controlled attribute, Group Membership for cohorts, User Realm Role/Client Role for roles, Audience for `aud`, and hardcoded claim only for non-sensitive metadata. See [built-in-mappers.md](references/built-in-mappers.md).

### Step 3 — Create a custom mapper
Before creating or changing a mapper, present realm, client, claim, provider, affected tokens, and impact on the API contract; wait for explicit human confirmation. Then use `create_protocol_mapper` with `protocol: "openid-connect"`, the correct provider ID, and `config`. For `tenant_id` stored in a user attribute, an `oidc-usermodel-attribute-mapper` should set `user.attribute`, `claim.name`, `jsonType.label`, and inclusion flags. For Organization data, prefer application-context data when a user can belong to multiple tenants.

### Step 4 — Verify with a new token
Obtain a new token and use `decode_token`. Confirm JSON type, name, audience, and presence only in the intended token. Mapper changes do not alter previously issued tokens.

## References
Read [custom-mappers.md](references/custom-mappers.md) for practical configurations and [multi-tenant-claims.md](references/multi-tenant-claims.md) for `tenant_id`, `org_id`, and `membership_type`.

## Important rules
- **Before creating or changing a mapper, present realm, client, claim, provider, affected tokens, and impact on the API contract; wait for explicit human confirmation.** A prior, generic confirmation, or one given for another target, does not authorize the change.
- **Mappers are the bridge between Keycloak and the SaaS API**; changes break authorization contracts.
- Do not put full ACLs, large resource lists, or sensitive data in the JWT.
- A single `tenant_id` is unsafe when the user has multiple memberships without an explicit active tenant.
- Every API must still validate issuer, signature, audience, and exp before trusting claims.

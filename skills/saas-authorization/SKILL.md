---
name: "saas-authorization"
description: "Design multi-tenant SaaS authorization separate from Keycloak authentication. Use when users, tenants, partners, and customers need resource-scoped delegated permissions."
license: "Apache-2.0"
compatibility: "Any SaaS API with Keycloak-issued JWTs; Keycloak 26+ Organizations is optional"
metadata:
  author: "Lucas Magalhães"
  version: "1.0.0"
---

# Multi-tenant SaaS authorization

## Overview
Keycloak proves identity and issues a JWT; the SaaS API makes the access decision about tenants, relationships, resources, and delegations. This separation preserves customer ownership and lets a partner have limited access without becoming the data owner.

## Prerequisites checklist
- [ ] The JWT was cryptographically validated by the API.
- [ ] The Tenant, Membership, and Relationship model exists in the SaaS database/policy engine.
- [ ] The active tenant context is explicit in the route, subdomain, or validated header.

## Step-by-step guide

### Step 1 — Configure claims in Keycloak
Before creating or changing a mapper, present the change and its impact and get explicit human confirmation. Then use `list_protocol_mappers`, `create_protocol_mapper`, and `decode_token` to issue a stable identity (`sub`), email/username when needed, realm/client roles, and minimal context. Do not try to serialize every resource permission into the token.

### Step 2 — Define Tenant/Account
Model a Tenant/Account with types `INTERNAL`, `PARTNER`, and `CUSTOMER`, an immutable ID, and an owner. A user can have several Memberships (`user_id`, `tenant_id`, `role`). See [tenant-model.md](references/tenant-model.md).

### Step 3 — Implement relationships
Model a partner-to-customer `TenantRelationship` with type `RESELLER`, `MANAGED_SECURITY`, or `SUPPORT`; relate permissions such as `alerts.read`, `events.read`, and `equipment.read`. Control scope with `RelationshipAssignment` for a team/user and specific customer. See [relationship-model.md](references/relationship-model.md).

### Step 4 — Map external roles carefully
Use `ExternalRoleMapping` to translate a Keycloak claim into a SaaS role only after validating issuer/audience. The mapping should add internal capabilities, not let an arbitrary token string bypass memberships and relationships.

### Step 5 — Build the decision pipeline
Implement the sequence **IDENTITY → TENANT ROLE → TENANT RELATIONSHIP → RESOURCE ACCESS → ALLOW/DENY**. Extract validated identity, resolve membership in the target tenant, evaluate active delegation, scope the query to that tenant's resources, and finally allow/deny. See [authorization-pipeline.md](references/authorization-pipeline.md).

### Step 6 — Validate with real data
Use `decode_token` to inspect claims and `get_user` to confirm the Keycloak identity. Test owner, regular member, delegated partner, user without assignment, and a user with cross-tenant access correctly denied. See [jwt-claims-mapping.md](references/jwt-claims-mapping.md).

## Important rules
- **Diagnosis and authorization design do not authorize automatic changes to Keycloak.** Before creating or changing a mapper, role, client scope, or claim, present the change and its impact and wait for explicit human confirmation.
- Keycloak handles **authentication only**; the SaaS API handles authorization.
- Use a single realm for SaaS, not a realm per customer.
- An intermediary receives delegated access, not ownership; ownership stays with the final customer.
- A user can participate in multiple tenants; the tenant of a request must be explicit and authorized.
- Never accept a `tenant_id` or role from unverified input as a final access decision.

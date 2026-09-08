# Tenant / Account model

## Core entities

```text
Tenant
  id: UUID
  type: INTERNAL | PARTNER | CUSTOMER
  name: string
  status: ACTIVE | SUSPENDED
  ownerTenantId: UUID?  // only if the business model needs a hierarchy

Membership
  userId: Keycloak subject UUID/string
  tenantId: UUID
  role: OWNER | ADMIN | ANALYST | VIEWER
  status: ACTIVE | INVITED | REVOKED
```

`Tenant` is the application account/ownership boundary, not a Keycloak realm. `Membership` is application data and may be created through a validated onboarding process after a Keycloak user authenticates.

## Tenant types

- **INTERNAL:** platform operator/support tenant. It must not silently bypass customer authorization; privileged access should be time-bound and audited.
- **PARTNER:** reseller, managed service provider or integrator. It can receive delegated access to customer tenants.
- **CUSTOMER:** final owner of assets/data. Ownership remains here even when a partner administers it.

## Constraints

- A user can hold memberships in multiple tenants.
- At most one active membership for `(userId, tenantId)` unless a separate scoped-role model is deliberate.
- Every domain resource includes `ownerTenantId` and queries are scoped by it.
- Tenant type is not sufficient permission; role and relationship are evaluated too.

## Onboarding

Resolve the Keycloak `sub` only after JWT validation. Create/invite membership in a transaction with tenant creation and audit event. Do not create a customer tenant simply because an email domain matches an Organization; require a business onboarding decision.

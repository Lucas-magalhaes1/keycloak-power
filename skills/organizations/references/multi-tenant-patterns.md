# Multi-tenant pattern: one `saas` realm

## Recommended topology

Use a single Keycloak realm named `saas`; create distinct clients for web, mobile, API/BFF and machine workloads. Create a Keycloak Organization for each customer company when Organization capabilities are needed. Keep tenant accounts, memberships, billing, resource ownership and partner delegations in the SaaS database.

```text
Keycloak realm: saas
  ├─ client: portal-web
  ├─ client: public-api
  ├─ organization: acme
  └─ organization: globex

SaaS database
  ├─ Tenant(acme), Tenant(globex)
  ├─ Membership(user, tenant, tenant_role)
  ├─ Resource(owner_tenant)
  └─ TenantRelationship(partner, customer, scope)
```

## Why not realm per customer

Realm-per-customer fragments users, SSO sessions, IdPs, policies and client registration. It complicates cross-customer partners, common platform staff and migrations. Use it only for actual isolation mandates that justify independent keys, administration and lifecycle.

## Request handling

Resolve identity from a validated Keycloak token. Derive target tenant from a trusted route/subdomain/request context. Query SaaS memberships and relationships, then scope all resource queries to the authorized tenant IDs. An Organization membership may inform onboarding but should not alone grant all resource permissions.

## Broker onboarding

Associate a customer's enterprise IdP with the Keycloak Organization and verify domain/identity linking. After broker login, map the user to SaaS membership through a controlled onboarding transaction; do not blindly assign owner permissions based on email domain.

Source: [Keycloak Organizations documentation](https://www.keycloak.org/2024/06/announcement-keycloak-organizations). Content was rephrased for compliance with licensing restrictions.

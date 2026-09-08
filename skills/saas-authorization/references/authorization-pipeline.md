# Authorization pipeline

## Pipeline

```text
IDENTITY → TENANT ROLE → TENANT RELATIONSHIP → RESOURCE ACCESS → ALLOW / DENY
```

1. **IDENTITY:** verify JWT signature against trusted JWKS; require expected issuer/audience and valid time claims. Extract immutable `sub`.
2. **TENANT ROLE:** resolve active Membership for the explicit request tenant or resource owner tenant.
3. **TENANT RELATIONSHIP:** if caller is external, resolve active delegation from caller tenant to owner tenant.
4. **RESOURCE ACCESS:** require action permission and scope database query by authorized tenant/resource IDs.
5. **ALLOW/DENY:** return generic denial to callers, but audit decision reason internally.

## TypeScript-shaped middleware example

```ts
type Identity = { sub: string; audience: string[] };

async function authorize(identity: Identity, action: string, resourceId: string) {
  const resource = await resources.get(resourceId);
  if (!resource) return { allowed: false, reason: "not-found" };

  const direct = await memberships.can(identity.sub, resource.ownerTenantId, action);
  if (direct) return { allowed: true, via: "membership" };

  const delegated = await relationships.canDelegated(
    identity.sub,
    resource.ownerTenantId,
    action,
    resource.scopeId,
  );
  return delegated ? { allowed: true, via: "relationship" } : { allowed: false, reason: "forbidden" };
}
```

The repository methods must apply the same scope restrictions. Middleware alone is insufficient if a later data query fetches a resource by unscoped ID.

## Denial cases to test

Test missing membership, suspended tenant, expired relationship, permission absent, assignment absent, resource owned by another tenant and a forged request tenant. Each must deny regardless of a broad Keycloak role.

# JWT claims mapping to SaaS authorization

## Trusted identity contract

| Keycloak claim | SaaS use | Validation |
|---|---|---|
| `iss` | tenant-independent issuer trust | exact issuer allow-list |
| `sub` | external user key | immutable subject, map to local user |
| `aud` | target API identity | require public API audience |
| `azp` | calling client context | optional, validate when relevant |
| `realm_access` / `resource_access` | coarse product capability | validate only after JWT validation |
| `tenant_id` | selected tenant hint | reauthorize with Membership |
| `org_id` | onboarding/audit context | do not infer resource ownership |
| `membership_type` | customer/partner signal | reauthorize via relationship tables |

## ExternalRoleMapping

Model mapping as application configuration:

```text
ExternalRoleMapping
  issuer
  clientId/audience
  externalRole
  internalCapability
  enabled
```

An external role can unlock a candidate internal capability, but must not bypass TenantRelationship or resource scope. Scope mappings by issuer/client to avoid accepting identically named roles from an unrelated client.

## Anti-patterns

- Trusting decoded-but-unverified JWT payloads.
- Accepting a user-provided `X-Tenant-Id` without checking Membership.
- Mapping `admin` to global database access.
- Encoding thousands of per-resource permissions into access tokens.
- Treating IdP group claim as permanent local entitlement without sync/revocation strategy.

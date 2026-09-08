# Multi-tenant claim patterns

## Minimal claims

A safe baseline normally includes stable `sub`, issuer, audience, token times and coarse client/realm roles. Add `tenant_id`, `org_id` or `membership_type` only when their meaning is unambiguous for the request context.

## `tenant_id`

Emit a single `tenant_id` only when the token is deliberately minted for one active tenant and the API validates that the caller can act in it. For users with multiple memberships, prefer explicit tenant selection in a trusted request context plus database lookup; a single global user attribute cannot express all memberships safely.

## `org_id`

Organization ID can assist onboarding/audit, but do not treat it as direct ownership of every resource. If the user has memberships in multiple organizations, represent a selected organization only with a clear issuance/context process.

## `membership_type`

A claim such as `employee`, `partner` or `customer` is useful as a coarse signal. The API must still resolve exact TenantRelationship and RelationshipAssignment, because a partner may have access to only selected customers and permissions.

## Recommended API checks

1. Validate JWT signature with issuer JWKS.
2. Check exact `iss`, accepted `aud`, `exp`, `nbf` and authorized party.
3. Resolve user and memberships from application data.
4. Check requested tenant/resource ownership and relationship scope.
5. Record allow/deny decision with a non-sensitive correlation ID.

Do not place customer lists, relationship ACLs or high-cardinality resource IDs in a JWT.

# Relationship model

## Entities

```text
TenantRelationship
  id
  sourceTenantId       // e.g. PARTNER
  targetTenantId       // CUSTOMER
  type: RESELLER | MANAGED_SECURITY | SUPPORT
  status: ACTIVE | SUSPENDED | EXPIRED
  startsAt, endsAt

RelationshipPermission
  relationshipId
  permission           // alerts.read, events.read, equipment.read

RelationshipAssignment
  relationshipId
  userId or teamId
  scope                // optional site/resource scope
  status
```

A relationship is delegation, not transfer of ownership. The target/customer continues to own resources. A partner may be allowed to operate a subset of customer resources only while relationship, permission and assignment are active.

## Evaluation rules

1. Resolve the requested resource's `ownerTenantId`.
2. If caller has active membership in owner tenant with needed role, allow by tenant policy.
3. Otherwise find active relationship from caller's tenant to owner tenant.
4. Require matching `RelationshipPermission` for action.
5. Require a matching `RelationshipAssignment` when delegation is user/team-specific.
6. Apply scope restrictions before loading/mutating resource.

## Data integrity

Use unique constraints where appropriate, validate source/target types, prevent self-relationship unless defined, and atomically revoke dependent assignments when relationship ends. Audit grants, removals and access denials that involve privileged partner/support paths.

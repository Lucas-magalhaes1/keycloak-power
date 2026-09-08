# Built-in protocol mapper types

## User Attribute

Provider commonly named `oidc-usermodel-attribute-mapper`. It copies a user attribute into a claim. Configure `user.attribute`, `claim.name`, `jsonType.label`, and flags for access token, ID token and userinfo. Attribute values are often arrays in Keycloak; confirm whether the claim must be multivalued.

## Group Membership

Provider commonly named `oidc-group-membership-mapper`. It emits group paths or names. Use a prefix/format consistently and avoid exposing sensitive organizational structure. Large memberships create large tokens and headers.

## Realm and client role mappers

Emit realm roles under `realm_access.roles` and client roles under `resource_access.{client}.roles` by default. They are suitable for coarse application capabilities, not per-record entitlement.

## Audience

An audience mapper adds a resource server to `aud`. APIs should require their own audience rather than accepting any Keycloak-issued token for the realm.

## Hardcoded claim and hardcoded role

Use for static client metadata or narrowly scoped integration flags. Do not use hardcoded roles as a substitute for a controlled authorization policy when many tenants or users are involved.

## User session note

Changes to mappers generally affect newly issued tokens. Force reauthentication or wait for token renewal during validation; `decode_token` confirms what is actually emitted.

Source: [Keycloak Server Administration Guide](https://www.keycloak.org/documentation). Content was rephrased for compliance with licensing restrictions.

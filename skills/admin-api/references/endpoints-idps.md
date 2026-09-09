# Admin API: identity providers

Base: `/admin/realms/{realm}/identity-provider/instances`. An IdP instance has a local alias and a provider implementation ID; the alias is used in broker URLs and Organization associations.

| Operation | Method and path | Main inputs | Success response |
|---|---|---|---|
| List instances | `GET .../identity-provider/instances` | none | `200` IdentityProviderRepresentation[] |
| Create instance | `POST .../identity-provider/instances` | alias, providerId, config, enabled | `201` |
| Get instance | `GET .../identity-provider/instances/{alias}` | alias | `200` IdentityProviderRepresentation |
| Update instance | `PUT .../identity-provider/instances/{alias}` | IdentityProviderRepresentation | `204` |
| Delete instance | `DELETE .../identity-provider/instances/{alias}` | alias | `204` |
| Get mapper types | `GET .../identity-provider/instances/{alias}/mapper-types` | alias | `200` map of IdentityProviderMapperTypeRepresentation, keyed by mapper ID |
| List mappers | `GET .../identity-provider/instances/{alias}/mappers` | alias | `200` IdentityProviderMapperRepresentation[] |
| Get mapper | `GET .../identity-provider/instances/{alias}/mappers/{mapper-id}` | alias, mapper ID | `200` IdentityProviderMapperRepresentation |
| Create mapper | `POST .../identity-provider/instances/{alias}/mappers` | IdentityProviderMapperRepresentation | `201` |
| Update mapper | `PUT .../identity-provider/instances/{alias}/mappers/{mapper-id}` | IdentityProviderMapperRepresentation | `204` |
| Delete mapper | `DELETE .../identity-provider/instances/{alias}/mappers/{mapper-id}` | alias, mapper ID | `204` |

## Configuration cautions

`providerId` selects an installed provider implementation. This Power supports creation for `google`, `microsoft`, `oidc`, `saml`, and `keycloak-oidc`; available provider IDs can differ by Keycloak distribution. Configure issuer/discovery URL or SAML metadata from an approved source, enforce signature validation, and use exact redirect URIs.

Deleting an IdP breaks its broker URL and should be preceded by checking user linking and Organization associations.

## Broker mapper cautions

An `IdentityProviderMapperRepresentation` has `name`, `identityProviderAlias`, `identityProviderMapper` (the exact provider ID), and `config` (a flat string map). The valid `identityProviderMapper` values and their `config` keys are provider-specific and are exposed per instance by the mapper-types endpoint; do not hardcode a mapper ID without checking it for the target alias. For example, a `microsoft` IdP typically supports `microsoft-user-attribute-mapper` (`jsonField`, `userAttribute`) because it reads the Microsoft Graph profile, while a generic `oidc` IdP supports `oidc-user-attribute-idp-mapper` (`claim`, `user.attribute`). `oidc-username-idp-mapper` (Username Template Importer) is shared across OIDC/social providers and uses `template` plus an optional `target` (`LOCAL`, `BROKER_ID`, or `BROKER_USERNAME`). A broker mapper affects local user import, not the claims a client receives in its own token.

Source: [Keycloak Admin REST API](https://www.keycloak.org/docs-api/latest/rest-api/). Content was rephrased for compliance with licensing restrictions.

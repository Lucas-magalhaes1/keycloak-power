# Admin API: identity providers

Base: `/admin/realms/{realm}/identity-provider/instances`. An IdP instance has a local alias and a provider implementation ID; the alias is used in broker URLs and Organization associations.

| Operation | Method and path | Main inputs | Success response |
|---|---|---|---|
| List instances | `GET .../identity-provider/instances` | none | `200` IdentityProviderRepresentation[] |
| Create instance | `POST .../identity-provider/instances` | alias, providerId, config, enabled | `201` |
| Get instance | `GET .../identity-provider/instances/{alias}` | alias | `200` IdentityProviderRepresentation |
| Update instance | `PUT .../identity-provider/instances/{alias}` | IdentityProviderRepresentation | `204` |
| Delete instance | `DELETE .../identity-provider/instances/{alias}` | alias | `204` |
| List mappers | `GET .../identity-provider/instances/{alias}/mappers` | alias | `200` IdentityProviderMapperRepresentation[] |
| Create mapper | `POST .../identity-provider/instances/{alias}/mappers` | mapper representation | `201` |

## Configuration cautions

`providerId` selects an installed provider implementation. This Power supports creation for `google`, `microsoft`, `oidc`, `saml`, and `keycloak-oidc`; available provider IDs can differ by Keycloak distribution. Configure issuer/discovery URL or SAML metadata from an approved source, enforce signature validation, and use exact redirect URIs.

Deleting an IdP breaks its broker URL and should be preceded by checking user linking and Organization associations.

Source: [Keycloak Admin REST API](https://www.keycloak.org/docs-api/latest/rest-api/). Content was rephrased for compliance with licensing restrictions.

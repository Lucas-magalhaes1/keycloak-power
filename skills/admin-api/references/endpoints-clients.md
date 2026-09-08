# Admin API: clients

Base: `/admin/realms/{realm}/clients`. Keycloak exposes an internal client UUID (`id`) and an application-facing `clientId`. The Power accepts `clientId` and resolves the UUID before calls that require it.

| Operation | Method and path | Main inputs | Success response |
|---|---|---|---|
| List/search clients | `GET .../clients` | `clientId`, `first`, `max`, `search` | `200` ClientRepresentation[] |
| Create client | `POST .../clients` | ClientRepresentation | `201` |
| Get client | `GET .../clients/{client-uuid}` | internal UUID | `200` ClientRepresentation |
| Update client | `PUT .../clients/{client-uuid}` | ClientRepresentation | `204` |
| Delete client | `DELETE .../clients/{client-uuid}` | internal UUID | `204` |
| Read secret | `GET .../clients/{client-uuid}/client-secret` | internal UUID | `200` CredentialRepresentation |
| Read mappers | `GET .../clients/{client-uuid}/protocol-mappers/models` | internal UUID | `200` ProtocolMapperRepresentation[] |
| Create mapper | `POST .../clients/{client-uuid}/protocol-mappers/models` | ProtocolMapperRepresentation | `201` |

## Critical fields

For OIDC, examine `protocol`, `publicClient`, `standardFlowEnabled`, `directAccessGrantsEnabled`, `serviceAccountsEnabled`, `redirectUris`, `webOrigins`, `attributes`, and `defaultClientScopes`. For SAML, inspect assertion consumer service URLs, signing/encryption requirements, name ID format, and mappers.

Secrets are valid only for confidential clients. A browser SPA cannot protect one. Do not enable Direct Access Grants to make a migration easier; use Authorization Code + PKCE for interactive users and Client Credentials for services.

Source: [Keycloak Admin REST API](https://www.keycloak.org/docs-api/latest/rest-api/). Content was rephrased for compliance with licensing restrictions.

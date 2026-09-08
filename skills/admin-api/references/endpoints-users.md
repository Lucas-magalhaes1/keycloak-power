# Admin API: users

Base: `/admin/realms/{realm}/users`. User IDs are UUIDs, but the Power resolves an exact username when a tool accepts `userId`.

| Operation | Method and path | Main inputs | Success response |
|---|---|---|---|
| Search/list | `GET .../users` | `search`, `username`, `email`, `first`, `max`, `exact` | `200` UserRepresentation[] |
| Get user | `GET .../users/{user-id}` | user UUID | `200` UserRepresentation |
| Create user | `POST .../users` | username, enabled, email, names, attributes | `201` |
| Update user | `PUT .../users/{user-id}` | UserRepresentation | `204` |
| Delete user | `DELETE .../users/{user-id}` | user UUID | `204` |
| Sessions | `GET .../users/{user-id}/sessions` | user UUID | `200` UserSessionRepresentation[] |
| Realm mappings | `GET .../users/{user-id}/role-mappings` | user UUID | `200` MappingsRepresentation |
| Add realm role | `POST .../users/{user-id}/role-mappings/realm` | RoleRepresentation[] | `204` |
| Add client role | `POST .../users/{user-id}/role-mappings/clients/{client-uuid}` | RoleRepresentation[] | `204` |

## Attributes and lifecycle

`attributes` is generally a map whose values are arrays of strings. Preserve types at the application boundary; Keycloak attributes do not give database-like schema enforcement. A create operation does not set a password in this Power by design. Prefer required actions or established account onboarding flows instead of placing passwords in operational automation.

## Search behavior

Use `username` plus `exact=true` to resolve an identifier safely. General `search` is fuzzy and can return multiple users. Paginate production inventories with `first` and `max`; a realm may contain hundreds of thousands of users.

Source: [Keycloak Admin REST API](https://www.keycloak.org/docs-api/latest/rest-api/). Content was rephrased for compliance with licensing restrictions.

# Admin API: roles and groups

## Roles

| Operation | Method and path | Main inputs | Success response |
|---|---|---|---|
| List realm roles | `GET /admin/realms/{realm}/roles` | paging/search varies by version | `200` RoleRepresentation[] |
| Create realm role | `POST .../roles` | name, description, composite | `201` |
| Get realm role | `GET .../roles/{role-name}` | encoded role name | `200` RoleRepresentation |
| List client roles | `GET .../clients/{client-uuid}/roles` | client UUID | `200` RoleRepresentation[] |
| Create client role | `POST .../clients/{client-uuid}/roles` | RoleRepresentation | `201` |
| Get client role | `GET .../clients/{client-uuid}/roles/{role-name}` | UUID, role name | `200` RoleRepresentation |

Role mappings are assigned to users using an array of complete role representations. Realm roles are realm-wide; client roles are interpreted only by the relevant resource server/client.

## Groups

| Operation | Method and path | Main inputs | Success response |
|---|---|---|---|
| List groups | `GET /admin/realms/{realm}/groups` | `first`, `max`, `search`, `briefRepresentation` | `200` GroupRepresentation[] |
| Create root group | `POST .../groups` | name, attributes | `201` |
| Create child group | `POST .../groups/{group-id}/children` | GroupRepresentation | `201` |
| Add membership | `PUT .../users/{user-id}/groups/{group-id}` | no body | `204` |
| Remove membership | `DELETE .../users/{user-id}/groups/{group-id}` | no body | `204` |
| List members | `GET .../groups/{group-id}/members` | paging/search | `200` UserRepresentation[] |

Groups can represent organizational cohorts and map to roles, but they should not become an unbounded per-resource permission list.

Source: [Keycloak Admin REST API](https://www.keycloak.org/docs-api/latest/rest-api/). Content was rephrased for compliance with licensing restrictions.

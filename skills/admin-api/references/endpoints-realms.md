# Admin API: realms

Base: `/admin/realms`. Realm names are case-sensitive URL path segments. All requests require an admin access token whose service account has appropriate `realm-management` roles.

| Operation | Method and path | Main inputs | Success response |
|---|---|---|---|
| List visible realms | `GET /admin/realms` | optional paging varies by version | `200` array of RealmRepresentation |
| Get realm | `GET /admin/realms/{realm}` | realm name | `200` RealmRepresentation |
| Create realm | `POST /admin/realms` | RealmRepresentation; `realm` required | `201` with no body/location depending server |
| Update realm | `PUT /admin/realms/{realm}` | full/merged RealmRepresentation | `204` |
| Delete realm | `DELETE /admin/realms/{realm}` | realm name plus Power confirmation exactly `DELETE <realm>` | `204` |
| Realm events | `GET /admin/realms/{realm}/events` | `type`, `user`, `dateFrom`, `dateTo`, paging | `200` EventRepresentation[] |

## Representation fields that deserve explicit decisions

- `realm`: immutable operational identifier; use lowercase and avoid tenant names for SaaS.
- `enabled`: disable only as a controlled maintenance action.
- `sslRequired`: prefer `external` when TLS terminates at a trusted proxy, or `all` for strict TLS.
- `registrationAllowed`, `registrationEmailAsUsername`, `loginWithEmailAllowed`, `verifyEmail`, `resetPasswordAllowed`: define the account lifecycle, not cosmetic behavior.
- `bruteForceProtected`, `permanentLockout`, `failureFactor`, and waiting periods: tune to support and threat model.
- `ssoSessionIdleTimeout` and `accessTokenLifespan`: balance revocation, usability, and client behavior.

## Safe update pattern

1. Read with `get_realm`.
2. Change only the agreed fields in `update_realm`.
3. Read again and compare critical values.
4. Test an end-user login in a non-administrative browser profile.

Do not delete a realm as a cleanup shortcut: it removes its users, clients, keys, and configuration.

Source: [Keycloak Admin REST API](https://www.keycloak.org/docs-api/latest/rest-api/). Content was rephrased for compliance with licensing restrictions.

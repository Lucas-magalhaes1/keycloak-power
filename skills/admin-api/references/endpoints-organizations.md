# Admin API: Organizations (Keycloak 26+)

Base: `/admin/realms/{realm}/organizations`. Organizations are available only on Keycloak versions and profiles that expose the feature. A 404 can mean feature disabled as well as an invalid resource.

| Operation | Method and path | Main inputs | Success response |
|---|---|---|---|
| List organizations | `GET .../organizations` | paging/search varies by version | `200` OrganizationRepresentation[] |
| Create organization | `POST .../organizations` | name, alias, domains, attributes | `201` |
| Get organization | `GET .../organizations/{org-id}` | organization ID | `200` OrganizationRepresentation |
| Add member | `POST .../organizations/{org-id}/members` | JSON string containing user UUID | `204`/`201` by version |
| List members | `GET .../organizations/{org-id}/members` | search/exact/type/paging | `200` MemberRepresentation[] |
| Add IdP | `POST .../organizations/{org-id}/identity-providers` | JSON string containing IdP alias | `204`/`201` by version |
| List IdPs | `GET .../organizations/{org-id}/identity-providers` | none | `200` IdentityProviderRepresentation[] |

## Domain representation

Organization creation accepts domain representations, commonly `{ "name": "acme.example" }`. A configured domain is not automatically sufficient evidence for any application authorization decision. Define verification and change-management around domains, because email domains can be shared, sold, or delegated.

## Operational model

Use a single `saas` realm and create organizations for customer companies. Associate members/IdPs for login and onboarding, then make per-resource authorization in the SaaS API based on the current tenant, memberships, and delegated relationships.

Source: [Keycloak Organizations documentation](https://www.keycloak.org/2024/06/announcement-keycloak-organizations) and [Admin API](https://www.keycloak.org/docs-api/latest/rest-api/). Content was rephrased for compliance with licensing restrictions.

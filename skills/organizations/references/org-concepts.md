# Organization concepts in Keycloak 26+

Organizations are Keycloak resources for representing customer/business entities in CIAM scenarios. They combine organization identity, domain metadata, member relationships and associations with identity providers. This supports B2B onboarding and enterprise federation inside a realm.

## Core concepts

- **Organization:** name, immutable/stable alias, ID, optional attributes and domains.
- **Member:** a Keycloak user associated with an organization. The member remains a realm user and can be associated with more than one organization where the model permits.
- **Domain:** an organization email-domain representation useful for discovery/onboarding. It needs business verification processes.
- **Organization IdP:** an IdP instance associated with the organization to guide enterprise login.
- **Organization group:** a group/cohort used in Keycloak identity management; not a full SaaS access-control graph.

## What Organizations solve

They help avoid realm-per-customer, centralize broker association and make customer membership visible to identity workflows. They are particularly useful for B2B or B2B2C products that need customer-specific IdPs and member lifecycle.

## What they do not solve

Organizations do not decide whether a user may read a specific alert, manage a specific device, or act for a related customer. Those are application authorization decisions involving tenant context, ownership, delegation, relationship status and resource scope.

## Version behavior

Use `get_server_info` and `list_organizations` to verify availability. Organizations endpoints and representation details can evolve across 26.x releases; handle feature-disabled/unsupported errors explicitly.

Source: [Keycloak Organizations announcement](https://www.keycloak.org/2024/06/announcement-keycloak-organizations). Content was rephrased for compliance with licensing restrictions.

---
name: "organizations"
description: "Implement B2B multi-tenancy with Keycloak 26+ Organizations. Use when a SaaS product needs to group members, domains, and IdPs of customer companies."
license: "Apache-2.0"
compatibility: "Keycloak 26+ with Organizations enabled and the keycloak-admin MCP server"
metadata:
  author: "Lucas Magalhães"
  version: "1.0.0"
---

# Multi-tenancy with Organizations

## Overview
Organizations model customer companies and their memberships inside a single realm. They help drive B2B onboarding, login discovery by domain, and identity provider association, but they do not replace the SaaS resource authorization model.

## Prerequisites checklist
- [ ] `get_server_info` confirms Keycloak 26+.
- [ ] Organizations is enabled in the server's profile/configuration.
- [ ] The SaaS realm and the stable alias of each organization have been defined.
- [ ] The application has its own tenant, membership, and authorization model.

## Step-by-step guide

### Step 1 — Enable and confirm Organizations
Enable the feature according to the Keycloak distribution used and restart/redeploy when required. Then call `list_organizations`; if you get a 404, check version, feature profile, base URL, and administrative permissions.

### Step 2 — Create the Organization
Before creating, present realm, organization name/alias, and impact; wait for explicit human confirmation. Then use `create_organization` with `name`, alias, domains, and attributes. The alias must be stable and URL-safe; the name can change. Domains are discovery candidates and need policy/verification before being treated as proof of ownership.

### Step 3 — Configure domains
Include only corporate domains that belong to the tenant. Do not determine tenant solely by email suffix in the API: aliases, invited users, and shared domains require an additional business decision. See [org-concepts.md](references/org-concepts.md).

### Step 4 — Add members
Create or find people with `create_user`/`get_user`, then call `add_member_to_organization` after presenting the target and getting confirmation. Confirm the association with `list_organization_members`. Keycloak membership should not be automatically interpreted as permission for all of the customer's resources.

### Step 5 — Link an IdP to the Organization
Create the IdP with `create_identity_provider`, verify it with `get_identity_provider`, and associate the alias via `add_idp_to_organization` after confirmation. Test the broker with an account from the IdP before enabling automatic discovery for real users.

### Step 6 — Configure Organization Groups
Use Keycloak groups for identity cohorts when needed, for example `org/acme/admins`, but keep resource assignment and complex delegations in the SaaS database/policy. See [multi-tenant-patterns.md](references/multi-tenant-patterns.md).

## Important rules
- **Before creating an Organization or changing domains, memberships, or linked IdPs, present realm, organization/alias, target resource, and impact; wait for explicit human confirmation.** A prior, generic confirmation, or one given for another target, does not authorize the change.
- Use a **single `saas` realm**, not a realm per customer, for the standard SaaS pattern.
- Organizations are a CIAM/onboarding resource; they are not an application resource ACL database.
- A user may participate in multiple organizations/tenants; do not assume a single `tenant_id` without session context or explicit selection.
- Verify domain and IdP before using their association as a signal of corporate membership.

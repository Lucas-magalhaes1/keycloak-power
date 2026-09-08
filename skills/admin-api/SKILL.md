---
name: "admin-api"
description: "Administer the Keycloak Admin REST API with safe, auditable operations. Use when you need to inspect or change realms, clients, users, roles, groups, IdPs, Organizations, or flows."
license: "Apache-2.0"
compatibility: "Kiro with the bundled keycloak-admin MCP server and a Keycloak service account"
metadata:
  author: "Lucas Magalhães"
  version: "1.0.0"
---

# Keycloak Admin REST API

## Overview
This skill operates the Admin REST API through the Power's MCP tools. The server authenticates exclusively with Client Credentials Grant; the identity is the service account of the configured client, so permissions and auditing must be planned before any mutation.

## Prerequisites checklist
- [ ] `KEYCLOAK_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID`, and `KEYCLOAK_CLIENT_SECRET` are available to the MCP process.
- [ ] The service account has only the necessary `realm-management` roles.
- [ ] The operator confirmed realm, environment, and impact of the changes.
- [ ] For every mutation, the plan with target resource, changed fields, and impact was shown and received explicit human confirmation.

## Step-by-step guide

### Step 1 — Verify connectivity and version
Call `get_server_info` before administering an instance. Confirm the version, installed providers, and whether the instance has the Organizations feature when it is needed. A 401 usually indicates an incorrect client/secret/authentication realm; 403 indicates insufficient administrative role.

### Step 2 — Identify the target realm
Use `list_realms`, then look up the desired realm with `get_realm`. Treat the returned name as canonical: realm names are case-sensitive. `KEYCLOAK_REALM` identifies where the service account authenticates; the `realm` parameter on each tool identifies the resource being administered.

### Step 3 — Run operations through the right domain
After presenting the proposed change and getting human confirmation, use `create_realm` and `update_realm` for realm settings; `create_client` for clients; `create_user`, `assign_role_to_user`, and `add_user_to_group` for identities; and `create_identity_provider` for federation. For detailed endpoints, see [realms](references/endpoints-realms.md), [users](references/endpoints-users.md), [clients](references/endpoints-clients.md), [roles and groups](references/endpoints-roles-groups.md), [IdPs](references/endpoints-idps.md), [Organizations](references/endpoints-organizations.md), and [flows](references/endpoints-auth-flows.md).

### Step 4 — Confirm the result
After a mutation, run the corresponding read tool: `get_realm`, `get_client`, `get_user`, `get_role`, `get_identity_provider`, or `get_organization`. For changes that affect login, review events with `get_realm_events` and test with a non-administrative account.

### Step 5 — Delete a realm in a controlled way
Never treat a realm as an automatic cleanup resource. Read it with `get_realm`, present to the operator that users, clients, keys, sessions, and configuration will be removed, and wait for the nominal human confirmation `DELETE <realm>`. Only then call `delete_realm` with the same `realm` and `confirmation`. The Power blocks deletion of `master`; any change of target requires a new confirmation.

### Step 6 — Interpret IDs correctly
Pass the human `clientId` to client tools; the Power resolves the internal UUID automatically. `get_user`, `update_user`, and `assign_role_to_user` accept a UUID or an exact username. Group and Organization IDs are internal identifiers returned by listings and must be preserved without guessing.

## Common workflows

### Inventory read-only
Use, in order, `get_server_info`, `list_realms`, `list_clients`, `list_users`, and `list_identity_providers`. Avoid fetching every user of large realms without `search`, `max`, and `first`.

### Controlled change
Before changing anything, record the output of `get_*`, present a single proposed change and its impact, wait for human confirmation, apply the operation, read again, and follow up on events. Do not combine a redirect URI change, roles, and an IdP in a single session without validating between steps. A prior, generic confirmation, or one given for another target/payload, does not authorize a new mutation.

## Important rules
- **Before any mutation, present environment, exact realm/resource, operation, fields that will change, and impact; wait for explicit human confirmation.** Silence, a generic request, or approval for another target/payload do not authorize the call.
- For `delete_realm`, the confirmation must be exactly `DELETE <realm>` and must be collected immediately before the deletion.
- Use only Client Credentials Grant; Password Grant is not supported and must not be introduced.
- Never expose `KEYCLOAK_CLIENT_SECRET`, access tokens, refresh tokens, or client secrets in chat, commits, or logs.
- Realm names are case-sensitive; `clientId` is not a UUID.
- Treat delete operations and login/redirect URI changes as impactful in any environment.
- The Keycloak API authenticates and issues claims; SaaS-domain authorization remains the application's responsibility.

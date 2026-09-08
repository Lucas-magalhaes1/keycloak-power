---
name: "user-federation"
description: "Plan LDAP and Active Directory user federation in Keycloak. Use when corporate identities need to authenticate without an immediate credential migration."
license: "Apache-2.0"
compatibility: "Keycloak 21+; provider configuration is performed in the Keycloak Admin Console"
metadata:
  author: "Lucas Magalhães"
  version: "1.0.0"
---

# AD and LDAP integration

## Overview
User Federation delegates identity lookup/validation to LDAP/AD, with import and synchronization controlled by Keycloak. Before configuring, define the authoritative source, unique identifier, offboarding lifecycle, and group/role model.

## Prerequisites checklist
- [ ] DNS, TLS/LDAPS, firewall, and a least-privilege bind account have been validated.
- [ ] Base DN, user DN, group DN, and user filter are known.
- [ ] The immutable identifier and sync policy have been approved with the directory team.

## Step-by-step guide

### Step 1 — Configure the connection string
In the Admin Console, add LDAP User Federation and provide the URL `ldaps://...` preferably, a read-only bind DN, and a vault-stored credential. Validate the CA certificate and use an account with no write permission. Never use plain LDAP over an untrusted network.

### Step 2 — Map attributes
Map username to `sAMAccountName` (AD) or `uid` (LDAP), first name to `givenName`, last name to `sn`, email to `mail`, and a stable identifier to `objectGUID`/`entryUUID`. Preserve the binary/immutable identifier with the correct mapper; email and CN can change.

### Step 3 — Configure sync modes
Use `READ_ONLY` if LDAP/AD is the source of truth; use `UNSYNCED` only when divergence is intentional and audited. Configure periodic full/changed-users sync according to volume and SLA. On import, define what happens to a user removed/disabled in the directory.

### Step 4 — Test sync and authentication
Test connection, authentication of a test account, import, and attribute updates. Use `get_user` to inspect the Keycloak representation, `get_user_sessions` after login, and `get_realm_events` for bind/credential errors. See [ldap-ad-integration.md](references/ldap-ad-integration.md).

## Important rules
- **Before creating, changing, testing, or syncing an LDAP/AD provider, present realm, provider, OU/base DN, sync mode, and impact on users; wait for explicit human confirmation.** A prior, generic confirmation, or one given for another target, does not authorize the change.
- AD/LDAP is an identity source, not an automatic substitute for product authorization.
- Use LDAPS/StartTLS with a validated CA and a least-privilege bind account.
- Do not use `cn` as an immutable username; it can be renamed.
- Test in a pilot OU before pointing the provider to the whole forest/domain.

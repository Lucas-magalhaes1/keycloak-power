# LDAP and Active Directory integration

## Connection and security

Use `ldaps://directory.example:636` or LDAP with StartTLS and validate the directory CA. Configure a dedicated bind account with read-only rights over the scoped OU. Set connection pooling/timeouts with directory capacity in mind and restrict firewall rules to Keycloak nodes.

## Attribute mapping patterns

| Keycloak field | Active Directory | Generic LDAP | Notes |
|---|---|---|---|
| username | `sAMAccountName` or `userPrincipalName` | `uid` | Choose stable login convention. |
| firstName | `givenName` | `givenName` | May be writable only in master system. |
| lastName | `sn` | `sn` | Required by some Keycloak profiles. |
| email | `mail` | `mail` | Do not assume globally unique without policy. |
| immutable ID | `objectGUID` | `entryUUID` | Best identity-link anchor. |
| group | `memberOf` | `memberOf` / group search | Normalize DN/group handling. |

Do not use `cn` as the immutable identifier; renames and duplicate names are common. Treat `objectGUID` carefully because AD may expose it in binary representation depending on mapper configuration.

## Synchronization modes

- **READ_ONLY:** directory is authoritative; safest normal choice.
- **UNSYNCED:** Keycloak can hold divergent local values; use only deliberately.
- **WRITABLE:** Keycloak attempts writes to LDAP; requires strict governance, ACL review and conflict handling.

Schedule changed-users sync for normal updates and full sync for reconciliation. Define a process for disabled, moved or deleted directory accounts; deletion in LDAP should not silently leave access in the SaaS application.

## Filters and scope

Set users DN to a limited OU, set a user object-class filter, and exclude service accounts. Test nested groups and referral behavior before production. Monitor lookup latency; broad subtree searches on a large AD forest can affect login availability.

## Validation runbook

1. Test TLS and bind credentials from Keycloak host.
2. Test a known pilot account and a rejected account.
3. Run sync in a test realm/OU.
4. Verify username, immutable ID, email and groups in `get_user`.
5. Test login and account disable propagation.

Source: [Keycloak LDAP federation guide](https://www.keycloak.org/documentation). Content was rephrased for compliance with licensing restrictions.

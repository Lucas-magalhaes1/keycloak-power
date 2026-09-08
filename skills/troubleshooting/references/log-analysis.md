# Keycloak log analysis

## Correlation method

1. Record incident time in UTC, realm, clientId, user subject (redacted if needed) and browser/request correlation ID.
2. Query `get_realm_events` around the time with event type/user filter.
3. Correlate Keycloak, reverse proxy and application logs using timestamp and request/session identifiers.
4. Decode only a redacted/test JWT locally to compare issuer/audience/expiry.
5. Preserve immutable evidence before changing configuration.

## Useful signals

- `LOGIN` / `LOGIN_ERROR`: credential, required action, broker or flow failures.
- `CODE_TO_TOKEN` errors: redirect URI, authorization code, PKCE or client authentication problems.
- Admin events: identify configuration change and actor before incident.
- Broker exceptions: issuer/metadata, signature, mapper or first-login linking problems.
- Session count/change: distinguish login failure from later token/API authorization failure.

## Redaction rules

Never copy client secrets, authorization codes, access/refresh tokens, SAML assertions, cookies, passwords, full email addresses or raw claims into public logs. Keep only token hash/fingerprint, last few subject characters if policy allows, realm/client, timestamp and error code.

## Logging posture

Use appropriate server log levels temporarily and revert verbose identity logs after incident. Ensure reverse proxies do not log `Authorization` headers or query-string tokens. Events are useful audit records but are not a substitute for application authorization audit logs.

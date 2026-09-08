# Realm best practices

## Boundary decision
Create a realm for a durable identity and policy boundary: separate workforce and customer identity, separate legal/compliance jurisdiction, or separately operated security domains. Do not create a realm per application, environment suffix, or SaaS customer by default. Every extra realm duplicates keys, themes, clients, user lifecycle and SSO state.

## Baseline checklist

1. Use a stable lowercase realm name such as `saas` or `workforce`.
2. Set `sslRequired` to `external` behind a trusted TLS-terminating proxy or `all` for full TLS.
3. Enable brute-force protection and tune failure thresholds with support operations.
4. Require email verification when email is used for recovery or communication.
5. Define registration behavior; public self-registration needs abuse controls and an onboarding policy.
6. Set short access tokens, appropriate SSO idle/max sessions, and a documented logout/revocation strategy.
7. Assign realm-management roles to automation through confidential service accounts, never through personal admin accounts.
8. Configure SMTP, audit/event retention, and backup/disaster recovery before production onboarding.

## SaaS baseline

Use one realm `saas`. Create a client per application/integration and Organizations for customer companies. Store product tenants, memberships, resource ownership and partner delegations in the SaaS domain model. Map only the minimal identity/role claims to tokens; do not attempt to encode the full authorization graph as groups or realm proliferation.

## Change control

Export/read current configuration before update, change one concern at a time, test with a non-admin account and retain a recovery path for browser-flow changes. Realm deletion is destructive.

Source: [Keycloak Server Administration Guide](https://www.keycloak.org/documentation). Content was rephrased for compliance with licensing restrictions.

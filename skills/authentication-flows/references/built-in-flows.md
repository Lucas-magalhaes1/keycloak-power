# Built-in authentication flows

## Browser flow

The browser flow handles interactive login sessions, cookie SSO, username/password, identity-provider redirect and optional authenticators. Copy it before custom changes. A broken browser binding can prevent every user from logging in.

## Direct grant flow

Direct grant supports token requests with user credentials when enabled. It is not recommended for new user-facing apps; modern applications should use Authorization Code + PKCE. Do not confuse a direct grant flow with the Power's service-account authentication, which always uses Client Credentials.

## Registration flow

Controls public registration and associated required actions. Activate only after email verification, anti-abuse and downstream account provisioning are designed.

## Reset credentials flow

Controls forgot-password/recovery. Ensure it does not leak user enumeration information and that required actions send users through verified channels.

## First broker login and post broker login

Run after a user authenticates at external IdP for the first time. They decide account creation, profile review and account linking. Carefully handle existing local accounts to prevent account takeover via weak email matching.

## Client authentication flow

Validates confidential clients at token endpoints. Do not weaken secret/private-key verification to ease a migration; rotate credentials and update consumers instead.

Source: [Keycloak Server Administration Guide](https://www.keycloak.org/documentation). Content was rephrased for compliance with licensing restrictions.

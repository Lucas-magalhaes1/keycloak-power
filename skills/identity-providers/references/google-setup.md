# Google identity provider setup

## Prerequisites

You need a Google Cloud project, OAuth consent screen configuration, an approved redirect URI and an OAuth client of type Web application. Decide whether consumer Google accounts are allowed or whether Workspace domain restrictions are required by policy.

## Configure Google Cloud

1. Configure the OAuth consent screen, publisher/contact data and scopes. Request only `openid`, `email` and `profile` unless more is justified.
2. Create an OAuth 2.0 Web application client.
3. Add Keycloak's broker callback exactly: `https://<keycloak-host>/realms/<realm>/broker/google/endpoint` when alias is `google`.
4. Store client ID and secret in a secret manager. Do not place them in source control.

## Configure Keycloak

Call `create_identity_provider` with `providerId: "google"`, a stable alias, and config values for `clientId` and `clientSecret`. Keycloak's Google provider supplies known endpoints; still verify the redirect URI shown after creation. Enable it only after first-login behavior is decided.

## Mappers and first login

Map stable Google subject to an external identity link. Map email/name only as attributes for display/onboarding. Email is useful but should not be sole proof of account ownership unless verified and policy-approved. Configure review/profile update or account linking based on whether accounts can preexist locally.

## Test

Use an incognito browser, select the provider from Keycloak login, complete consent, then inspect `get_user`, `get_realm_events`, and a Keycloak-issued token via `decode_token`. Test a denied consent and an account whose email conflicts with an existing local identity.

Source: [Google Identity OAuth 2.0 documentation](https://developers.google.com/identity/protocols/oauth2) and [Keycloak documentation](https://www.keycloak.org/documentation). Content was rephrased for compliance with licensing restrictions.

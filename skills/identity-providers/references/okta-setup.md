# Okta identity provider setup

## Prerequisites

Choose Okta OIDC versus SAML based on the enterprise contract. Obtain the Okta domain, authorization server/issuer, client credentials, scopes, and application assignment policy. Ensure the Keycloak URL is public and HTTPS so Okta can redirect to the broker endpoint.

## Configure Okta for OIDC

1. Create an OIDC Web Application integration.
2. Add `https://<keycloak-host>/realms/<realm>/broker/<alias>/endpoint` as sign-in redirect URI.
3. Assign test users/groups and define access policy at the correct authorization server.
4. Record issuer/discovery URL, client ID, client secret and required scopes.

## Configure Keycloak

Use `create_identity_provider` with `providerId: "oidc"`, not an undocumented vendor alias, unless the installed Keycloak distribution exposes a verified Okta provider. Set `clientId`, `clientSecret` and issuer/discovery endpoints. For SAML, use `providerId: "saml"` and signed Okta metadata. Confirm signature and issuer validation remain enabled.

## Mappers

Use Okta `sub` as durable linkage. Map `email`, `given_name`, `family_name` and groups only when defined in the Okta authorization server. Avoid relying on `login` if users can be renamed and do not use a group claim as a replacement for resource-level authorization.

## Test

Test an assigned user, unassigned user, deactivated user, group assignment changes and credential/certificate rotation. Validate Keycloak events and its issued JWT after the broker flow.

Source: [Okta OIDC documentation](https://developer.okta.com/docs/concepts/oauth-openid/) and [Keycloak documentation](https://www.keycloak.org/documentation). Content was rephrased for compliance with licensing restrictions.

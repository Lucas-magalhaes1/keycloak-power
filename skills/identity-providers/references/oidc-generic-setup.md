# Generic OIDC identity provider setup

## Prerequisites

Obtain the provider's well-known discovery URL, issuer, client ID, client secret or client authentication method, supported scopes, and callback registration process. Confirm the provider is an OpenID Connect issuer, not merely OAuth 2.0; a valid OIDC discovery document exposes identity metadata and JWKS.

## Configure the provider

1. Register Keycloak as an OIDC relying party/client.
2. Add exact callback `https://<keycloak-host>/realms/<realm>/broker/<alias>/endpoint`.
3. Restrict allowed grants to Authorization Code; enable PKCE if the provider/keycloak integration supports it.
4. Request minimal scopes: normally `openid`, then `profile`/`email` only if required.
5. Pin or allow-list issuer according to the provider's multi-tenant model.

## Configure Keycloak

Call `create_identity_provider` with `providerId: "oidc"`, alias, displayName and config including `clientId`, `clientSecret`, `issuer` or explicit authorization/token/userinfo/JWKS endpoints as provider format requires. Prefer discovery-driven endpoint configuration. Enable signature verification and validate issuer/audience behavior.

## Mappers

Map `sub` as the stable federated identity key. Map email only after verifying the provider's email assurance semantics. Do not link on display name or unverified email. Configure first login flow to handle collisions and account linking deliberately.

## Test

Test normal login, callback with bad state, user whose email changes, provider key rotation and access from an unexpected issuer/tenant. Inspect Keycloak events and Keycloak-issued JWT, not only the provider's response.

Source: [OpenID Connect Discovery](https://openid.net/specs/openid-connect-discovery-1_0.html) and [Keycloak documentation](https://www.keycloak.org/documentation). Content was rephrased for compliance with licensing restrictions.

# Microsoft Entra ID identity provider setup

## Prerequisites

Obtain the Entra tenant ID, decide single-tenant versus multi-tenant access, and establish who may consent. Have an Entra app registration administrator create an application for Keycloak broker authentication.

## Configure Entra ID

1. Register an application in the target Entra tenant.
2. Add a Web redirect URI: `https://<keycloak-host>/realms/<realm>/broker/<alias>/endpoint`.
3. Create a client secret or use a certificate according to organizational policy; record expiry/rotation ownership.
4. Under API permissions, use OpenID Connect scopes such as `openid`, `profile`, `email` and `User.Read` only when needed; grant tenant admin consent when required.
5. Record the v2 issuer/discovery URL for the selected tenant. Do not use `common` unless multi-tenant issuer validation is explicitly designed.

## Configure Keycloak

Call `create_identity_provider` with `providerId: "microsoft"`, alias, `clientId`, `clientSecret`, and tenant/discovery configuration recognized by the Keycloak provider. Validate the generated callback URI and issuer before enabling. Enforce a tenant-specific issuer for single-tenant B2B.

## Mappers

Link the external principal using Entra `sub`/object ID semantics, not mutable display name. Map `preferred_username`, email and display name only as needed. If group claims are used, handle overage behavior rather than assuming every group is present in an ID token.

## Test

Test with a standard user, guest user if allowed, unassigned user and account from an unauthorized tenant. Inspect broker errors with `get_realm_events` and inspect Keycloak-issued claims using `decode_token`.

Source: [Microsoft identity platform documentation](https://learn.microsoft.com/entra/identity-platform/) and [Keycloak documentation](https://www.keycloak.org/documentation). Content was rephrased for compliance with licensing restrictions.

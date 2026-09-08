# Generic SAML identity provider setup

## Prerequisites

Collect signed IdP metadata from a trusted channel, including entity ID, SSO URL, SLO URL if used, signing certificate, supported bindings and NameID/attribute contract. Determine whether Keycloak will send signed AuthnRequests and whether assertions/responses must be signed or encrypted.

## Configure the provider

1. Register Keycloak as a SAML Service Provider using metadata or the exact broker callback displayed by Keycloak for `alias`.
2. Configure entity ID and ACS/recipient values exactly.
3. Exchange certificates through a versioned, trusted change process and set renewal dates.
4. Decide NameID format and requested attributes before users onboard.

## Configure Keycloak

Call `create_identity_provider` with `providerId: "saml"`, alias and `config` for metadata URL/XML or explicit endpoints/certificates. Keep signature validation enabled. If importing metadata, validate its origin and monitor the URL/certificate lifecycle; do not fetch arbitrary user-supplied metadata during administration.

## Mappers

Use an immutable NameID or attribute as linkage key. Map email, first/last name, department and groups only if the issuer's semantics and authorization policy are known. Guard against multi-valued/group claims becoming large or spoofable.

## Test

Run SP-initiated login, signed/unsigned response negative tests, clock skew test, certificate rollover and logout if configured. Use `get_realm_events` for broker parsing/signature errors.

Source: [OASIS SAML technical overview](https://www.oasis-open.org/standards/saml/) and [Keycloak documentation](https://www.keycloak.org/documentation). Content was rephrased for compliance with licensing restrictions.

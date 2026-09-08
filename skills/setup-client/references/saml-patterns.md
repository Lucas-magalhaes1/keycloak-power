# SAML patterns

## Establish roles

Keycloak is normally the Identity Provider (IdP) and the application is the Service Provider (SP). Obtain the SP entity ID, Assertion Consumer Service (ACS) URL, logout endpoint, requested bindings, NameID format, signing certificate and encryption expectations before creation.

## Client configuration

Create with `create_client` and `protocol: "saml"`. In client configuration, bind exact ACS URLs, select a stable NameID strategy, set signing/encryption requirements, and configure certificate rotation. Never accept arbitrary ACS URLs or disable signature validation to resolve an integration issue.

## Claims and roles

Use protocol mappers to produce agreed attributes. Preserve clear attribute names and values; group/role expansion can create large assertions. Only include attributes the SP requires, especially when assertions pass through browsers or logs.

## Common compatibility decisions

- Prefer HTTP-POST binding for assertion delivery unless the SP requires another binding.
- Sign assertions/responses according to the SP contract; validate inbound logout messages where supported.
- Coordinate metadata refresh and certificate rollover before expiry.
- Use exact entity ID comparison; trailing slashes and case changes can cause mismatch.

## Test sequence

1. Import/share metadata through an authenticated change process.
2. Perform SP-initiated login.
3. Validate recipient, audience, issue instant, NameID and required attributes at the SP.
4. Test IdP-initiated behavior only if explicitly supported.
5. Test logout and certificate rotation in a non-production environment.

Source: [Keycloak Server Administration Guide](https://www.keycloak.org/documentation). Content was rephrased for compliance with licensing restrictions.

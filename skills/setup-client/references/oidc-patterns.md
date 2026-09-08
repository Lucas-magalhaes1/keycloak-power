# OIDC patterns

## Authorization Code with PKCE — browser and mobile default

Use a public client with `standardFlowEnabled: true`, exact redirect URIs and PKCE method `S256`. The application generates a high-entropy verifier, derives the challenge, sends it with authorization request, and redeems the code using the verifier. This prevents intercepted codes from being redeemed by another party.

**Use for:** SPA, native mobile, desktop, BFF front-channel start.

**Do not:** store a client secret in the SPA, use wildcard callback hosts, or keep tokens in unsafe browser storage without a threat model.

## Authorization Code — confidential web backend

Use a confidential client when a server can protect the secret. The backend handles the callback and maintains a secure, HTTP-only application session or securely managed tokens. Add PKCE as defense in depth where supported.

**Use for:** server-rendered web app, BFF, backend callback handler.

## Client Credentials — workload identity

Enable service accounts on a confidential client and request a token from a backend/CI workload. The `sub` represents the service account, not an end user. Assign narrowly scoped client/realm roles to that account.

**Use for:** scheduled job, internal service, provisioning automation, this Power.

## Device Authorization

Use Device Authorization for CLIs, TV devices or constrained devices. The device displays a code/verification URI; user completes login in separate browser. Design polling, expiry and cancellation correctly.

## Implicit flow

Avoid for new systems. Modern Authorization Code + PKCE provides a safer replacement and avoids returning tokens in front-channel fragments.

## Verification

After `create_client`, call `get_client`, complete a real authorization request, decode the new access token with `decode_token`, and ensure API validates issuer, JWKS signature, audience and times.

Source: [Keycloak Securing Applications guide](https://www.keycloak.org/guides#securing-apps). Content was rephrased for compliance with licensing restrictions.

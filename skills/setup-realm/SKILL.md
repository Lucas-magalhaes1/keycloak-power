---
name: "setup-realm"
description: "Configure a secure Keycloak realm for internal or SaaS applications. Use when you need to create the identity boundary for a new platform."
license: "Apache-2.0"
compatibility: "Keycloak 21+ and the keycloak-admin MCP server"
metadata:
  author: "Lucas Magalhães"
  version: "1.0.0"
---

# Create and configure a realm

## Overview
A realm is an identity, login, user, client, and policy boundary. Choose it by trust domain and lifecycle, not by commercial customer. For B2B/B2B2C SaaS, a single realm makes SSO, user governance, and multi-tenant relationships easier.

## Prerequisites checklist
- [ ] A stable, short, lowercase name has been defined.
- [ ] It was decided whether the case is internal or SaaS.
- [ ] There is a service account with `manage-realm` in the administrative realm.
- [ ] The realm, environment, initial configuration, and impact were presented; creation received explicit human confirmation.

## Step-by-step guide

### Step 1 — Define name and type
For an internal platform, consider a realm like `workforce`; for a SaaS product, use a realm like `saas`. Define separation by regulatory requirements, trust boundaries, or independently operated environments, not by the buying company.

### Step 2 — Create the realm
Before calling `create_realm`, present realm, displayName, environment, `enabled`, `sslRequired`, and any field in `config`, then wait for explicit human confirmation. For production, use `sslRequired: "external"` behind a correctly configured TLS-terminating proxy, or `"all"` when all access must be HTTPS. `create_realm` enables `bruteForceProtected: true` by default; setting `config.bruteForceProtected: false` is a risk exception and requires justification and a specific confirmation. Include `registrationAllowed`, `loginWithEmailAllowed`, and themes only when there is an explicit decision.

### Step 3 — Configure login settings
Use `get_realm`, then present the proposed change and get a new confirmation before using `update_realm` to decide self-registration, password recovery, login by email, email verification, brute-force detection, SSO session, and required actions. Avoid enabling public self-registration without email verification, abuse limits, and an onboarding flow.

### Step 4 — Configure SSL and security
Keep end-to-end TLS or correctly configure proxy headers on the Keycloak server. Set access token lifetime according to risk, enable brute-force protection, and restrict redirect URIs at the client level. Do not use broad wildcards like `*` in redirect URIs or web origins.

### Step 5 — Create the first managed client
Continue with `setup-client`: before creating clients or roles, show the proposed values and get a specific human confirmation. A realm without a client can be administered but does not serve applications.

## Verification
Use `get_realm` and check `enabled`, `sslRequired`, `bruteForceProtected: true`, login settings, and attributes. Then use `get_token_endpoint_info` to check the issuer and endpoints the application will consume. See the full checklist in [realm-best-practices.md](references/realm-best-practices.md).

## Important rules
- **Before any mutation, present environment, exact realm/resource, operation, fields that will change, and impact; wait for explicit human confirmation.** A prior, generic confirmation, or one given for another target/payload, does not authorize the call.
- **Do not create a realm per SaaS customer.** Use a `saas` realm and Organizations, groups, or domain data for segmentation.
- Use realm-per-customer only when there is a real trust, administration, compliance, or data-residency boundary that requires full isolation.
- Never disable SSL to work around incorrect proxy configuration.
- Do not test browser flow changes directly in the administrative flow without a recovery route.

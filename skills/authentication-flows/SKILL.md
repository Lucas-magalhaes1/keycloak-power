---
name: "authentication-flows"
description: "Configure authentication flows, required actions, and MFA in Keycloak. Use when you need to review login, OTP, WebAuthn, or custom flows."
license: "Apache-2.0"
compatibility: "Keycloak 21+ and the keycloak-admin MCP server"
metadata:
  author: "Lucas Magalhães"
  version: "1.0.0"
---

# Authentication flows and MFA

## Overview
Authentication flows determine how Keycloak authenticates, challenges, and recovers users. They have high operational impact: an incorrect `REQUIRED` execution can lock out every login, including administrators.

## Prerequisites checklist
- [ ] A test user and an administrative recovery route are available.
- [ ] The target flow and its binding (browser, direct grant, registration, reset credentials) have been identified.
- [ ] The MFA policy defines who must use OTP or WebAuthn and how recovery works.

## Step-by-step guide

### Step 1 — List flows
Call `list_auth_flows` and record alias, description, and built-in status. Built-in flows should not be edited directly; create a copy in the Admin Console/API before customizing, and only then bind the new flow.

### Step 2 — Understand the selected flow
Use `get_auth_flow` with the alias. Examine the order of executions and their requirements (`REQUIRED`, `ALTERNATIVE`, `CONDITIONAL`, `DISABLED`). An `ALTERNATIVE` execution only participates when the other alternatives were not satisfied; do not confuse it with a guaranteed fallback.

### Step 3 — Configure MFA
Use required actions returned by `get_required_actions` to check `CONFIGURE_TOTP` and WebAuthn actions. Enable an OTP/WebAuthn policy, communicate the enrollment process, and define recovery (backup codes, verified help desk, or alternative credential). Do not enforce MFA before validating the recovery path.

### Step 4 — Create custom flows
Copy a built-in flow, rename it with a clear purpose and environment, add conditionals and authenticators one at a time, and test with a test account. Bind it only after success in login, logout, reset password, and first broker login when affected.

## References
See [built-in-flows.md](references/built-in-flows.md) for the purpose and cautions of the provided flows, and [custom-flows-mfa.md](references/custom-flows-mfa.md) for a safe customization/MFA plan.

## Important rules
- **Before creating, copying, configuring, or binding a flow, present the realm, flow, execution/binding, impact, and recovery plan; wait for explicit human confirmation.** A prior, generic confirmation, or one given for another target, does not authorize the change.
- Do not modify a built-in flow in production; copy it and keep a rollback route.
- Never disable or make optional credential validation just to debug an integration.
- MFA needs secure recovery; without it, manual support becomes an account-takeover vector.
- Use events (`get_realm_events`) and sessions (`get_user_sessions`) to investigate failures after the change.

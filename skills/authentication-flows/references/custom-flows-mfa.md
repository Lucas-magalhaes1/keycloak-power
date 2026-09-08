# Custom flows and MFA

## Safe customization sequence

1. Export or record the current flow and bindings.
2. Copy the relevant built-in flow to a versioned alias, for example `browser-mfa-v1`.
3. Add one authenticator or conditional subflow at a time.
4. Test with a non-admin test user, plus a recovery scenario.
5. Bind the custom flow in a change window with console/recovery access retained.
6. Monitor login events and have rollback steps ready.

## OTP

Time-based OTP requires enrollment and recovery. Configure issuer/algorithm/digits/period under realm OTP policy; avoid changing them after users enroll unless a migration plan exists. Use a required action for enrollment and an authenticator execution to require a configured OTP where policy demands it.

## WebAuthn

WebAuthn uses phishing-resistant credentials. Set RP ID to the public login host, maintain HTTPS and stable origins, and decide user verification/resident key policy. Test every supported browser/device and maintain account recovery for lost security keys.

## Conditional MFA

Use conditional subflows to challenge based on risk, role, network or existing credential only when the condition is deterministic and testable. Be cautious with role-derived conditions: an administrator role assignment can change login requirements unexpectedly.

## Recovery

Recovery must require equivalent assurance. Avoid help-desk reset procedures based only on easily discovered personal data. Log recovery and alert on high-risk account changes.

Source: [Keycloak Server Administration Guide](https://www.keycloak.org/documentation). Content was rephrased for compliance with licensing restrictions.

# Admin API: authentication flows

Base: `/admin/realms/{realm}/authentication`. Flow configuration is powerful and can lock out users; make changes from copies and retain recovery access.

| Operation | Method and path | Main inputs | Success response |
|---|---|---|---|
| List flows | `GET .../authentication/flows` | none | `200` AuthenticationFlowRepresentation[] |
| Flow executions | `GET .../authentication/flows/{flow-alias}/executions` | encoded flow alias | `200` AuthenticationExecutionInfoRepresentation[] |
| Create flow | `POST .../authentication/flows` | alias, description, providerId, topLevel | `201` |
| Copy flow | `POST .../authentication/flows/{flow-alias}/copy` | new alias query/body by version | `201`/`204` |
| Add execution | `POST .../authentication/flows/{flow-alias}/executions/execution` | provider identifier | `201` |
| Configure execution | `POST .../authentication/flows/{flow-alias}/executions/{execution-id}/config` | AuthenticatorConfigRepresentation | `201` |
| List required actions | `GET .../authentication/required-actions` | none | `200` RequiredActionProviderRepresentation[] |

## Built-in flow practice

Inspect with `list_auth_flows` and `get_auth_flow`, but copy before adding/removing executions. Test browser, password reset, registration and broker first-login flows independently, because a change can affect a path you did not intend to change.

## MFA practice

OTP and WebAuthn may be activated by required actions and/or authenticators in a flow. Enforce only after enrollment, recovery and administrator access have been tested. Treat WebAuthn origin/RP ID configuration as production security configuration.

Source: [Keycloak Admin REST API](https://www.keycloak.org/docs-api/latest/rest-api/). Content was rephrased for compliance with licensing restrictions.

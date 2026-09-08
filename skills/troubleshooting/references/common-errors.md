# Common Keycloak errors

| Symptom | Likely cause | Diagnostic and fix |
|---|---|---|
| `401 invalid_client` | wrong secret, client not confidential, wrong auth realm | verify `KEYCLOAK_REALM`, client authentication and rotated secret; use Client Credentials. |
| `403 Forbidden` on Admin API | service account lacks `realm-management` role | grant only needed `view-*`, `query-*` or `manage-*` role; retry read first. |
| `401 token expired` in API | expired token or clock skew | inspect `exp` with `decode_token`, synchronize clocks, refresh/re-authenticate. |
| `invalid_redirect_uri` | callback does not exactly match client config | use `get_client`; add exact legitimate callback, never broad wildcard. |
| Browser CORS failure | origin absent from `webOrigins` or proxy issue | add exact origin, check OPTIONS/proxy headers; do not set `*` for credentialed flow. |
| `Invalid parameter: redirect_uri` at IdP | broker callback not registered | register exact `/realms/{realm}/broker/{alias}/endpoint` at provider. |
| JWT audience failure | API missing from `aud` | configure client audience mapper/scopes and validate new token. |
| Claim absent | mapper on wrong client/scope or old token | inspect `list_protocol_mappers`, scopes, then obtain new token. |
| Organization 404 | Keycloak <26, feature disabled, wrong realm | call `get_server_info`, enable supported feature and retry. |
| SAML signature error | wrong/expired certificate, metadata mismatch, clock | verify trusted metadata/certificate, recipient/audience and time. |

Never respond to these by disabling TLS, signature checking, PKCE, issuer validation or redirect restrictions. That changes the security model rather than solving configuration.

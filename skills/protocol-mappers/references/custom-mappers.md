# Custom mapper configurations

## OIDC user attribute claim

Use `create_protocol_mapper` with values similar to:

```json
{
  "name": "department",
  "protocol": "openid-connect",
  "protocolMapper": "oidc-usermodel-attribute-mapper",
  "config": {
    "user.attribute": "department",
    "claim.name": "department",
    "jsonType.label": "String",
    "access.token.claim": "true",
    "id.token.claim": "false",
    "userinfo.token.claim": "true",
    "multivalued": "false"
  }
}
```

The exact provider configuration keys depend on Keycloak version/provider. Read the current mapper representation with `list_protocol_mappers` and preserve values that your server expects.

## Group claim

For a group claim, use the group membership provider and choose whether full paths are needed. A claim `groups: ["/org/acme/admins"]` is less ambiguous than bare `admins`, but it couples the API to group hierarchy.

## Client scope versus direct mapper

Place a mapper in a client scope when multiple clients need an identical claim contract; place it directly on a client when it is integration-specific. Changes to a default scope have large blast radius, so inspect `get_default_client_scopes` first.

## Validation

Create one mapper, obtain a fresh token, call `decode_token`, and test the target API's schema/type expectations. Version a claim rather than reusing a claim name with incompatible semantics.

Source: [Keycloak Server Administration Guide](https://www.keycloak.org/documentation). Content was rephrased for compliance with licensing restrictions.

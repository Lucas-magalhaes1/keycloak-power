---
name: "protocol-mappers"
description: "Projete protocol mappers do Keycloak para claims JWT e SAML úteis e mínimos. Use when uma aplicação precisa receber atributos, groups, audiences ou contexto de tenant."
license: "Apache-2.0"
compatibility: "Keycloak 21+ and the keycloak-admin MCP server"
metadata:
  author: "Lucas Magalhães"
  version: "1.0.0"
---

# Protocol mappers e claims

## Overview
Protocol mappers transformam identidade Keycloak em claims que clients consomem. Eles são a ponte entre autenticação e uma API SaaS, portanto devem ser versionados como contrato: claim estável, tipo explícito, audiência correta e mínima exposição de dados.

## Prerequisites checklist
- [ ] A API documentou claims, tipos e consumidores.
- [ ] O client ou client scope alvo foi identificado.
- [ ] Foi decidido se o mapper aparece em access token, ID token e/ou userinfo.

## Step-by-step guide

### Step 1 — Inspecionar mappers atuais
Use `list_protocol_mappers` com realm e clientId. Identifique mappers duplicados, claims com mesmo nome e mappers herdados de client scopes. Use `get_default_client_scopes` para descobrir o que é aplicado globalmente.

### Step 2 — Escolher tipo de mapper
Use User Attribute para atributo controlado, Group Membership para coortes, User Realm Role/Client Role para roles, Audience para `aud`, e hardcoded claim apenas para metadado não sensível. Veja [built-in-mappers.md](references/built-in-mappers.md).

### Step 3 — Criar mapper customizado
Use `create_protocol_mapper` com `protocol: "openid-connect"`, provider ID correto e `config`. Para `tenant_id` armazenado em atributo de usuário, um `oidc-usermodel-attribute-mapper` deve definir `user.attribute`, `claim.name`, `jsonType.label`, e flags de inclusão. Para Organization, prefira dados de contexto da aplicação quando um usuário pode participar de múltiplos tenants.

### Step 4 — Verificar token novo
Obtenha novo token e use `decode_token`. Confirme tipo do JSON, nome, audience e presença somente no token desejado. Mudanças em mapper não alteram tokens emitidos anteriormente.

## References
Leia [custom-mappers.md](references/custom-mappers.md) para configurações práticas e [multi-tenant-claims.md](references/multi-tenant-claims.md) para `tenant_id`, `org_id` e `membership_type`.

## Important rules
- **Antes de criar ou alterar um mapper, apresente realm, client, claim, provider, tokens afetados e impacto no contrato da API; aguarde confirmação humana explícita.** Uma aprovação anterior, genérica ou para outro alvo não autoriza a alteração.
- **Mappers são a ponte entre Keycloak e a API SaaS**; mudanças quebram contratos de autorização.
- Não coloque ACLs completas, listas grandes de recursos ou dados sensíveis no JWT.
- `tenant_id` único é inseguro quando o usuário tem múltiplas memberships sem tenant ativo explícito.
- Toda API ainda deve validar issuer, signature, audience e exp antes de confiar em claims.

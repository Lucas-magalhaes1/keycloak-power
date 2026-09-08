---
name: "troubleshooting"
description: "Diagnostique erros de Keycloak, sessões, tokens, clients e identity providers. Use when login, autorização, CORS ou federação falham."
license: "Apache-2.0"
compatibility: "Keycloak 21+ and the keycloak-admin MCP server"
metadata:
  author: "Lucas Magalhães"
  version: "1.0.0"
---

# Troubleshooting Keycloak

## Overview
Diagnóstico eficiente separa conectividade/administração, autenticação, emissão de token, browser/CORS e autorização da API. Colete sinais mínimos, preserve tokens/PII e teste uma hipótese por vez.

## Prerequisites checklist
- [ ] Realm, client, usuário e horário do incidente foram identificados.
- [ ] Tokens e logs serão redigidos antes de serem compartilhados.
- [ ] A service account tem permissões read-only para o diagnóstico necessário.

## Step-by-step guide

### Step 1 — Verificar servidor
Chame `get_server_info`. Se falhar, valide URL, reverse proxy, DNS, certificado e credenciais de service account antes de inspecionar o realm. Diferencie 401 (autenticação) de 403 (autorização administrativa).

### Step 2 — Verificar sessões
Use `get_user_sessions` com UUID ou username. Sessão ausente após login sugere falha de browser flow, cookie, redirect URI, IdP broker ou logout; sessão presente com API negando sugere token/audience/authorization.

### Step 3 — Verificar eventos
Use `get_realm_events` com data, tipo ou usuário. Procure `LOGIN_ERROR`, `CODE_TO_TOKEN_ERROR`, `INVALID_SIGNATURE`, erro de redirect ou erro de IdP. Correlacione timestamp UTC com logs de proxy e aplicação.

### Step 4 — Decodificar token
Use `decode_token`, compare `iss`, `aud`, `azp`, `exp`, `realm_access` e `resource_access`. Confirme com `get_token_endpoint_info` que issuer/JWKS esperado coincide com a configuração da API.

### Step 5 — Verificar client
Use `get_client` para conferir clientId, protocolo, standard flow, public/confidential, redirect URIs, web origins e mappers. Use `list_protocol_mappers` para claims ausentes e `get_default_client_scopes` para herança.

### Step 6 — Verificar IdP
Use `get_identity_provider`, confirme alias, issuer/metadata, client ID, endpoints e mappers. Para error no primeiro login, revise linking policy e attributes retornados pelo provider.

## References
Consulte [common-errors.md](references/common-errors.md) para causas de 401/403, expiração, redirect e CORS; consulte [log-analysis.md](references/log-analysis.md) para leitura segura de logs e correlação.

## Important rules
- **Um diagnóstico não autoriza uma correção automática.** Antes de alterar client, realm, IdP, mapper ou flow, apresente o plano, recurso alvo, campos afetados e impacto e aguarde confirmação humana explícita.
- Não desabilite validação de assinatura, HTTPS, PKCE ou checks de redirect URI para “fazer funcionar”.
- Não compartilhe token, secret, password, SAML assertion ou detalhes pessoais em issue pública.
- Corrija a causa no client/realm/IdP, não somente o sintoma no frontend.
- Separe rejeição de token do Keycloak de uma decisão de autorização da API SaaS.

---
name: "token-debug"
description: "Depure tokens JWT emitidos pelo Keycloak sem enviar credenciais a serviços externos. Use when uma API não reconhece issuer, audience, roles ou claims esperados."
license: "Apache-2.0"
compatibility: "Keycloak 21+ and the keycloak-admin MCP server"
metadata:
  author: "Lucas Magalhães"
  version: "1.0.0"
---

# Debug de JWT

## Overview
Um JWT é uma credencial portadora: decodificá-lo revela conteúdo, mas não prova assinatura. A tool `decode_token` opera localmente no processo MCP e nunca envia o token a um site externo; ainda assim, trate o token como segredo e redija-o em tickets.

## Prerequisites checklist
- [ ] O token foi obtido em ambiente apropriado e não será persistido em logs.
- [ ] O issuer esperado e o client/audience esperado são conhecidos.
- [ ] A hora do servidor e da API estão sincronizadas por NTP.

## Step-by-step guide

### Step 1 — Obter o token correto
Determine se o problema envolve access token, ID token ou token de client credentials. Capture o token da mesma grant, realm, client e usuário que falham. Não use token de console administrativo como substituto de token da aplicação.

### Step 2 — Decodificar localmente
Use `decode_token`. A resposta contém header, payload, datas ISO de `iat`, `nbf` e `exp`, lista de claims e indicação de que a assinatura **não** foi validada. Use `skills/token-debug/scripts/decode-token.sh` somente para inspeção local rápida em shell.

### Step 3 — Verificar claims estruturais
Compare `iss` com o discovery obtido em `get_token_endpoint_info`; confira `sub`, `azp`, `aud`, `exp`, `iat`, `realm_access` e `resource_access`. Para SaaS, confirme claims como `tenant_id` ou `org_id` somente quando seu modelo suporta sua semântica.

### Step 4 — Verificar expiração e clock skew
Um token é inválido após `exp`; `nbf` adia a validade. Se a API rejeita token recém-emitido, compare relógio do Keycloak, gateway e API. Não corrija clock skew aumentando exageradamente a vida do access token.

### Step 5 — Comparar esperado versus real
Use `get_client` e `list_protocol_mappers` para verificar client scopes, audiences e mappers. Atualize a configuração com cuidado, gere token novo e repita `decode_token`; token antigo não ganha claims retroativamente.

## Important rules
- **Depurar um token não autoriza alterar o Keycloak.** Antes de mudar mapper, role, client scope ou client para corrigir o diagnóstico, apresente a alteração e seu impacto e aguarde confirmação humana explícita.
- JWT decodificado não equivale a JWT validado; a API deve validar assinatura via JWKS, issuer, audience, exp e nbf.
- Nunca encaminhe um access token real para ferramentas externas, e nunca o inclua em commit.
- Roles Keycloak são sinais de identidade; permissões de recursos multi-tenant devem ser decididas pela API do SaaS.
- Sempre gere um token novo após mudar mappers, roles ou client scopes.

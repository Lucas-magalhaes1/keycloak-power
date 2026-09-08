---
name: "setup-client"
description: "Configure clients OIDC e SAML do Keycloak com grants e URIs seguros. Use when você está integrando SPA, backend, mobile ou service-to-service."
license: "Apache-2.0"
compatibility: "Keycloak 21+ and the keycloak-admin MCP server"
metadata:
  author: "Lucas Magalhães"
  version: "1.0.0"
---

# Configurar um client OIDC ou SAML

## Overview
Clients representam aplicações que delegam autenticação ao Keycloak. A seleção de protocolo, grant e tipo público/confidencial determina onde o token é emitido e quais segredos podem existir com segurança.

## Prerequisites checklist
- [ ] URLs de produção, homologação e desenvolvimento estão inventariadas.
- [ ] O tipo de aplicação e a capacidade de guardar segredo foram identificados.
- [ ] Redirect URIs e web origins foram aprovados sem curingas amplos.

## Step-by-step guide

### Step 1 — Identificar o tipo de aplicação
SPA e mobile são public clients: não mantêm client secret. Backend web e serviços machine-to-machine são confidential clients. Para SSO corporativo legado, identifique se o service provider exige SAML e obtenha metadata/ACS URL antes de criar o client.

### Step 2 — Escolher o grant type
Para browsers, escolha Authorization Code com PKCE. Para comunicação serviço a serviço, habilite Client Credentials e use service accounts. Device Authorization serve dispositivos sem browser completo. Não use Implicit em novas integrações; ele expõe tokens ao front channel. Veja [oidc-patterns.md](references/oidc-patterns.md).

### Step 3 — Criar o client
Use `create_client` com `protocol: "openid-connect"` ou `"saml"`, `publicClient`, `redirectUris`, `webOrigins` e `config`. Para SPA OIDC, configure `standardFlowEnabled: true`, PKCE `S256` nos atributos, redirect URIs exatas e origins explícitas. Para backend, mantenha `publicClient: false` e crie/roteie o secret para um cofre.

### Step 4 — Configurar redirect URIs e origins
Uma redirect URI deve conter esquema, host, porta e path esperados. Adicione cada callback real, como `https://portal.example.com/auth/callback`, e evite `https://*.example.com/*`. Em SPA, `webOrigins` deve conter somente origins que farão CORS; não use `+` ou `*` como atalho de segurança.

### Step 5 — Adicionar claims necessários
Use `list_protocol_mappers` para inspecionar o que já chega ao token e `create_protocol_mapper` para atributos, groups, audience ou roles adicionais. Após obter um token de teste, valide com `decode_token`. Para SAML, consulte [saml-patterns.md](references/saml-patterns.md).

## Verification
Use `get_client` para conferir a representação efetiva. Teste Authorization Code no navegador com uma URI permitida e uma URI negada. Para confidential clients, use o token endpoint apenas a partir de ambiente servidor e confirme que tokens contêm `aud` adequado.

## Important rules
- **Antes de criar ou alterar um client, apresente realm, clientId, protocolo, grants, tipo público/confidencial, redirect URIs, origins e claims; aguarde confirmação humana explícita.** Uma aprovação anterior, genérica ou para outro alvo não autoriza a alteração.
- SPA e aplicativos mobile nunca devem receber nem armazenar `KEYCLOAK_CLIENT_SECRET`.
- Authorization Code + PKCE é o padrão para apps interativos modernos.
- Client Credentials identifica uma aplicação/service account, não um usuário humano.
- Mappers determinam a superfície de claims; adicione somente dados necessários e evite dados pessoais desnecessários.

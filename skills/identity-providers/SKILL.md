---
name: "identity-providers"
description: "Integre provedores externos de identidade ao Keycloak com OIDC ou SAML. Use when você precisa federar Google, Entra ID, Okta ou um IdP corporativo."
license: "Apache-2.0"
compatibility: "Keycloak 21+ and the keycloak-admin MCP server"
metadata:
  author: "Lucas Magalhães"
  version: "1.0.0"
---

# Configurar identity providers externos

## Overview
Um Identity Provider (IdP) faz o Keycloak confiar no login de um provedor externo e emitir seus próprios tokens para os clients locais. O realm continua dono do contrato de claims e da política de sessão, independentemente do provedor upstream.

## Prerequisites checklist
- [ ] O IdP externo foi registrado com redirect URI do broker Keycloak.
- [ ] Client ID, client secret, issuer/metadata e escopos foram armazenados em cofre.
- [ ] O alias do IdP, mapeamento de identidade e comportamento de primeiro login foram definidos.

## Step-by-step guide

### Step 1 — Obter credenciais no IdP
Registre Keycloak como relying party/client no provider e copie somente os valores necessários: issuer ou metadata URL, client ID, secret/certificado e redirect URI. A callback normalmente é `https://<keycloak>/realms/<realm>/broker/<alias>/endpoint`; confira a URL exibida pelo Keycloak para o alias final.

### Step 2 — Criar o IdP no Keycloak
Use `create_identity_provider` com alias, `providerId`, displayName e config. Os provider IDs suportados pelo Power são `google`, `microsoft`, `oidc`, `saml` e `keycloak-oidc`. Antes de gravar, confira que os endpoints/metadata pertencem ao tenant correto e que a validação de assinatura não foi desabilitada.

### Step 3 — Configurar mappers de claims
Mapeie identificadores estáveis e atributos mínimos. O email só é identificador confiável se for verificado e imutável segundo a política do provider; prefira `sub`/subject externo para ligação de conta. Configure first login flow para exigir confirmação ou vinculação quando necessário.

### Step 4 — Testar autenticação
Use uma conta de teste, complete o login no IdP e valide usuário e sessão com `get_user`, `get_user_sessions` e `get_realm_events`. Decodifique o token local emitido pelo Keycloak com `decode_token`; a aplicação deve confiar no issuer do Keycloak, não no token upstream.

### Step 5 — Vincular a uma Organization quando aplicável
Em B2B, crie a Organization com `create_organization`, então use `add_idp_to_organization` para associar o alias já existente. Teste a descoberta por domínio e o fluxo de broker com usuário daquele cliente.

## Provider references
- [Google](references/google-setup.md)
- [Microsoft Entra ID](references/microsoft-entra-id-setup.md)
- [OIDC genérico](references/oidc-generic-setup.md)
- [SAML genérico](references/saml-generic-setup.md)
- [Okta](references/okta-setup.md)

## Important rules
- **Antes de criar, atualizar, vincular ou remover um IdP, apresente realm, alias, issuer/metadata, campos alterados e impacto no login; aguarde confirmação humana explícita.** Uma aprovação anterior, genérica ou para outro alvo não autoriza a alteração.
- Nunca cole segredos, private keys, SAML assertions ou tokens no chat.
- Valide issuer, discovery/metadata URL, assinatura e audience; não aceite endpoints descobertos a partir de input do usuário.
- Use alias estável; trocá-lo quebra URLs de broker e associações de Organization.
- O IdP autentica usuários; as roles e permissões do produto devem ser atribuídas e avaliadas segundo políticas do realm e da aplicação.

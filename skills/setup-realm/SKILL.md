---
name: "setup-realm"
description: "Configure um realm Keycloak seguro para aplicações internas ou SaaS. Use when você precisa criar o limite de identidade de uma nova plataforma."
license: "Apache-2.0"
compatibility: "Keycloak 21+ and the keycloak-admin MCP server"
metadata:
  author: "Lucas Magalhães"
  version: "1.0.0"
---

# Criar e configurar um realm

## Overview
Um realm é um limite de identidade, login, usuários, clients e políticas. Escolha-o por domínio de confiança e ciclo de vida, não por cliente comercial. Para SaaS B2B/B2B2C, um realm único facilita SSO, governança de usuários e relações multi-tenant.

## Prerequisites checklist
- [ ] Nome estável, curto e em minúsculas foi definido.
- [ ] Foi decidido se o caso é internal ou saas.
- [ ] Existe uma service account com `manage-realm` no realm administrativo.
- [ ] O realm, ambiente, configuração inicial e impacto foram apresentados; a criação recebeu confirmação humana explícita.

## Step-by-step guide

### Step 1 — Definir nome e tipo
Para plataforma interna, considere um realm como `workforce`; para produto SaaS, use um realm como `saas`. Defina separação por requisitos regulatórios, boundaries de confiança ou operações independentes, não por empresa compradora.

### Step 2 — Criar o realm
Antes de chamar `create_realm`, apresente realm, displayName, ambiente, `enabled`, `sslRequired` e qualquer campo em `config`, então aguarde confirmação humana explícita. Para produção, use `sslRequired: "external"` atrás de proxy TLS corretamente configurado ou `"all"` quando todo acesso deve ser HTTPS. `create_realm` habilita `bruteForceProtected: true` por padrão; definir `config.bruteForceProtected: false` é uma exceção de risco e requer justificativa e confirmação específica. Inclua `registrationAllowed`, `loginWithEmailAllowed` e temas apenas quando houver uma decisão explícita.

### Step 3 — Configurar login settings
Use `get_realm`, depois apresente a alteração proposta e obtenha nova confirmação antes de usar `update_realm` para decidir auto-registro, recuperação de senha, login por email, verificação de email, brute-force detection, sessão SSO e required actions. Evite ativar auto-registro público sem verificação de email, limites de abuso e fluxo de onboarding.

### Step 4 — Configurar SSL e segurança
Mantenha TLS fim a fim ou configure corretamente headers de proxy no servidor Keycloak. Defina duração de access token de acordo com o risco, habilite proteção contra força bruta e limite redirect URIs no nível de client. Não use curingas amplos como `*` em redirect URIs ou web origins.

### Step 5 — Criar o primeiro client administrado
Prossiga com `setup-client`: antes de criar clients ou roles, mostre os valores propostos e obtenha confirmação humana específica. Um realm sem client pode ser administrado, mas não atende aplicações.

## Verification
Use `get_realm` e confira `enabled`, `sslRequired`, `bruteForceProtected: true`, configurações de login e atributos. Em seguida use `get_token_endpoint_info` para conferir o issuer e os endpoints que a aplicação consumirá. Veja o checklist completo em [realm-best-practices.md](references/realm-best-practices.md).

## Important rules
- **Antes de qualquer mutação, apresente ambiente, realm/recurso exato, operação, campos que mudarão e impacto; aguarde confirmação humana explícita.** Uma confirmação anterior, genérica ou para outro alvo/payload não autoriza a chamada.
- **Não crie um realm por cliente SaaS.** Use um realm `saas` e Organizations, groups ou dados de domínio para segmentação.
- Use realm por cliente apenas quando houver boundary real de confiança, administração, compliance ou residência de dados que exija isolamento completo.
- Nunca desabilite SSL para compensar configuração de proxy incorreta.
- Não teste mudanças de browser flow diretamente no fluxo administrativo sem uma rota de recuperação.

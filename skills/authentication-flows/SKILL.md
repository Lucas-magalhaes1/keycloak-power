---
name: "authentication-flows"
description: "Configure authentication flows, ações obrigatórias e MFA no Keycloak. Use when você precisa revisar login, OTP, WebAuthn ou fluxos customizados."
license: "Apache-2.0"
compatibility: "Keycloak 21+ and the keycloak-admin MCP server"
metadata:
  author: "Lucas Magalhães"
  version: "1.0.0"
---

# Authentication flows e MFA

## Overview
Authentication flows determinam como o Keycloak autentica, desafia e recupera usuários. Eles têm alto impacto operacional: uma execução `REQUIRED` incorreta pode bloquear todo login, inclusive o de administradores.

## Prerequisites checklist
- [ ] Um usuário de teste e uma rota de administração de recuperação estão disponíveis.
- [ ] O flow alvo e sua associação (browser, direct grant, registration, reset credentials) foram identificados.
- [ ] A política de MFA define quem deve usar OTP ou WebAuthn e como ocorre recovery.

## Step-by-step guide

### Step 1 — Listar flows
Chame `list_auth_flows` e registre alias, descrição e built-in. Flows built-in não devem ser editados diretamente; crie uma cópia no Admin Console/API antes de personalizar e só então faça o binding do novo flow.

### Step 2 — Entender o flow selecionado
Use `get_auth_flow` com o alias. Examine a ordem das executions e seus requisitos (`REQUIRED`, `ALTERNATIVE`, `CONDITIONAL`, `DISABLED`). Uma execution `ALTERNATIVE` só participa quando as demais alternativas não foram satisfeitas; não a confunda com fallback garantido.

### Step 3 — Configurar MFA
Use required actions retornadas por `get_required_actions` para verificar `CONFIGURE_TOTP` e ações WebAuthn. Habilite uma política de OTP/WebAuthn, comunique o processo de enrolment e defina recovery (backup codes, help desk verificado ou credencial alternativa). Não obrigue MFA antes de validar o percurso de recuperação.

### Step 4 — Criar flows customizados
Copie um flow built-in, renomeie com propósito e ambiente claros, adicione conditionals e authenticators um por vez, e teste com conta de teste. Faça o binding somente após sucesso em login, logout, reset password e first login broker quando afetados.

## References
Consulte [built-in-flows.md](references/built-in-flows.md) para finalidade e cautelas dos flows fornecidos e [custom-flows-mfa.md](references/custom-flows-mfa.md) para um plano seguro de customização/MFA.

## Important rules
- **Antes de criar, copiar, configurar ou associar um flow, apresente o realm, flow, execução/binding, impacto e plano de recuperação; aguarde confirmação humana explícita.** Uma aprovação anterior, genérica ou para outro alvo não autoriza a alteração.
- Não altere um flow built-in em produção; copie e mantenha uma rota de rollback.
- Nunca desabilite ou torne opcional a validação de credenciais apenas para depurar uma integração.
- MFA precisa de recuperação segura; sem ela, suporte manual vira um vetor de account takeover.
- Use eventos (`get_realm_events`) e sessões (`get_user_sessions`) para investigar falhas depois da alteração.

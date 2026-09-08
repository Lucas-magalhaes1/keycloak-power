---
name: "organizations"
description: "Implemente multi-tenancy B2B com Keycloak Organizations 26+. Use when um SaaS precisa agrupar membros, domínios e IdPs de empresas clientes."
license: "Apache-2.0"
compatibility: "Keycloak 26+ with Organizations enabled and the keycloak-admin MCP server"
metadata:
  author: "Lucas Magalhães"
  version: "1.0.0"
---

# Multi-tenancy com Organizations

## Overview
Organizations modelam organizações clientes e suas memberships dentro de um único realm. Elas ajudam a conduzir onboarding B2B, descoberta de login por domínio e associação de identity providers, mas não substituem o modelo de autorização de recursos do SaaS.

## Prerequisites checklist
- [ ] `get_server_info` confirma Keycloak 26+.
- [ ] Organizations está habilitado no profile/configuração do servidor.
- [ ] O realm SaaS e o alias estável de cada organização foram definidos.
- [ ] A aplicação possui modelo próprio de tenant, membership e autorização de dados.

## Step-by-step guide

### Step 1 — Habilitar e confirmar Organizations
Ative a feature no servidor conforme a distribuição Keycloak usada e reinicie/implante quando requerido. Depois chame `list_organizations`; se receber 404, confirme versão, feature profile, URL base e permissões administrativas.

### Step 2 — Criar a Organization
Use `create_organization` com `name`, alias, domains e attributes. O alias deve ser estável e seguro para URLs; o nome pode mudar. Domínios são candidatos de descoberta e precisam de política/verificação antes de serem tratados como prova de posse.

### Step 3 — Configurar domains
Inclua somente domínios corporativos que pertencem ao tenant. Não determine tenant apenas pelo sufixo de email na API: aliases, usuários convidados e domínios compartilhados exigem uma decisão de negócio adicional. Consulte [org-concepts.md](references/org-concepts.md).

### Step 4 — Adicionar membros
Crie ou localize pessoas com `create_user`/`get_user`, então chame `add_member_to_organization`. Confirme a associação com `list_organization_members`. A membership Keycloak não deve ser interpretada automaticamente como permissão para todos os recursos do cliente.

### Step 5 — Vincular IdP à Organization
Crie o IdP com `create_identity_provider`, verifique com `get_identity_provider` e associe o alias via `add_idp_to_organization`. Teste o broker com uma conta do IdP antes de ativar descoberta automática para usuários reais.

### Step 6 — Configurar Organization Groups
Use groups do Keycloak para coortes de identidade quando necessário, por exemplo `org/acme/admins`, mas mantenha atribuição de recursos e delegações complexas no banco/política do SaaS. Consulte [multi-tenant-patterns.md](references/multi-tenant-patterns.md).

## Important rules
- **Antes de criar uma Organization ou alterar domínios, memberships ou IdPs vinculados, apresente realm, organização/alias, recurso alvo e impacto; aguarde confirmação humana explícita.** Uma aprovação anterior, genérica ou para outro alvo não autoriza a alteração.
- Use **um realm único `saas`**, não um realm por cliente, para o padrão SaaS normal.
- Organizations são recurso de CIAM/onboarding; elas não são um banco de ACLs de recursos da aplicação.
- Um usuário pode participar de múltiplas organizações/tenants; não assuma um único `tenant_id` sem contexto de sessão ou seleção explícita.
- Verifique domínio e IdP antes de usar sua associação como sinal de pertencimento corporativo.

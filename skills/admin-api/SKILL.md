---
name: "admin-api"
description: "Administre a Keycloak Admin REST API com operações seguras e rastreáveis. Use when você precisa consultar ou alterar realms, clients, usuários, roles, grupos, IdPs, Organizations ou fluxos."
license: "Apache-2.0"
compatibility: "Kiro with the bundled keycloak-admin MCP server and a Keycloak service account"
metadata:
  author: "Lucas Magalhães"
  version: "1.0.0"
---

# Keycloak Admin REST API

## Overview
Esta skill opera a Admin REST API por meio das tools MCP do Power. O servidor autentica exclusivamente com Client Credentials Grant; a identidade é a service account do client configurado, portanto permissões e auditoria devem ser planejadas antes de qualquer mutação.

## Prerequisites checklist
- [ ] `KEYCLOAK_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID` e `KEYCLOAK_CLIENT_SECRET` estão disponíveis ao processo MCP.
- [ ] A service account tem apenas roles `realm-management` necessárias.
- [ ] O operador confirmou realm, ambiente e impacto das alterações.
- [ ] Para cada mutação, o plano com recurso alvo, campos alterados e impacto foi mostrado e recebeu confirmação humana explícita.

## Step-by-step guide

### Step 1 — Verificar a conexão e versão
Chame `get_server_info` antes de administrar uma instância. Confirme a versão, providers instalados e se a instância possui o recurso Organizations quando ele for necessário. Um erro 401 normalmente indica client/secret/realm de autenticação incorreto; 403 indica role administrativa insuficiente.

### Step 2 — Identificar o realm alvo
Use `list_realms`, então consulte o realm desejado com `get_realm`. Trate o nome retornado como canônico: nomes de realm são case-sensitive. `KEYCLOAK_REALM` identifica onde a service account autentica; o parâmetro `realm` de cada tool identifica o recurso que será administrado.

### Step 3 — Executar operações pelo domínio correto
Depois de apresentar a mudança proposta e obter confirmação humana, use `create_realm` e `update_realm` para configurações de realm; `create_client` para clients; `create_user`, `assign_role_to_user` e `add_user_to_group` para identidades; e `create_identity_provider` para federação. Para endpoints detalhados consulte [realms](references/endpoints-realms.md), [users](references/endpoints-users.md), [clients](references/endpoints-clients.md), [roles e groups](references/endpoints-roles-groups.md), [IdPs](references/endpoints-idps.md), [Organizations](references/endpoints-organizations.md) e [flows](references/endpoints-auth-flows.md).

### Step 4 — Confirmar o resultado
Após uma mutação, execute a tool de leitura correspondente: `get_realm`, `get_client`, `get_user`, `get_role`, `get_identity_provider` ou `get_organization`. Para alterações que afetam login, avalie eventos com `get_realm_events` e teste com uma conta não administrativa.

### Step 5 — Excluir um realm de forma controlada
Nunca trate um realm como recurso de limpeza automática. Leia-o com `get_realm`, apresente ao operador que serão removidos usuários, clients, chaves, sessões e configurações, e aguarde a confirmação humana nominal `DELETE <realm>`. Só então chame `delete_realm` com o mesmo `realm` e `confirmation`. O Power bloqueia a exclusão de `master`; qualquer alteração de alvo exige uma nova confirmação.

### Step 6 — Interpretar IDs corretamente
Passe `clientId` humano para tools de client; o Power resolve o UUID interno automaticamente. `get_user`, `update_user` e `assign_role_to_user` aceitam UUID ou username exato. Group e Organization IDs são identificadores internos retornados nas listagens e devem ser preservados sem tentativa de inferência.

## Common workflows

### Inventory read-only
Use, em ordem, `get_server_info`, `list_realms`, `list_clients`, `list_users` e `list_identity_providers`. Evite buscar todos os usuários de grandes realms sem `search`, `max` e `first`.

### Controlled change
Antes de alterar, registre a saída de `get_*`, apresente uma única mudança proposta e seu impacto, aguarde confirmação humana, aplique a operação, consulte novamente e acompanhe os eventos. Não combine uma alteração de redirect URI, roles e IdP em uma única sessão sem validação entre etapas. Uma confirmação anterior, genérica ou dada para outro alvo/payload não autoriza uma nova mutação.

## Important rules
- **Antes de qualquer mutação, apresente ambiente, realm/recurso exato, operação, campos que mudarão e impacto; aguarde confirmação humana explícita.** Silêncio, pedido genérico ou aprovação para outro alvo/payload não autorizam a chamada.
- Para `delete_realm`, a confirmação precisa ser exatamente `DELETE <realm>` e deve ser coletada imediatamente antes da exclusão.
- Use somente Client Credentials Grant; Password Grant não é suportado nem deve ser introduzido.
- Nunca exponha `KEYCLOAK_CLIENT_SECRET`, access tokens, refresh tokens ou secrets de clients em chat, commits ou logs.
- Realm names são case-sensitive; `clientId` não é UUID.
- Trate operações de delete e mudanças de login/redirect URI como impactantes em qualquer ambiente.
- A API Keycloak autentica e emite claims; autorização de domínio SaaS continua sendo responsabilidade da aplicação.

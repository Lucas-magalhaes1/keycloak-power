---
name: "saas-authorization"
description: "Projete autorização multi-tenant SaaS separada da autenticação Keycloak. Use when usuários, tenants, parceiros e clientes precisam de permissões delegadas por recurso."
license: "Apache-2.0"
compatibility: "Any SaaS API with Keycloak-issued JWTs; Keycloak 26+ Organizations is optional"
metadata:
  author: "Lucas Magalhães"
  version: "1.0.0"
---

# Autorização multi-tenant SaaS

## Overview
Keycloak prova identidade e emite um JWT; a API SaaS toma a decisão de acesso sobre tenants, relacionamentos, recursos e delegações. Essa separação preserva ownership do cliente e permite que um parceiro tenha acesso limitado sem se tornar proprietário dos dados.

## Prerequisites checklist
- [ ] O JWT foi validado criptograficamente pela API.
- [ ] O modelo de Tenant, Membership e Relationship existe em banco/policy engine do SaaS.
- [ ] O contexto de tenant ativo é explícito na rota, subdomínio ou header validado.

## Step-by-step guide

### Step 1 — Configurar claims no Keycloak
Use `list_protocol_mappers`, `create_protocol_mapper` e `decode_token` para emitir identidade estável (`sub`), email/username quando necessário, realm/client roles e um contexto mínimo. Não tente serializar todas as permissions de recursos no token.

### Step 2 — Definir Tenant/Account
Modele um Tenant/Account com tipos `INTERNAL`, `PARTNER` e `CUSTOMER`, ID imutável e owner. Um usuário pode ter várias Memberships (`user_id`, `tenant_id`, `role`). Consulte [tenant-model.md](references/tenant-model.md).

### Step 3 — Implementar relacionamentos
Modele `TenantRelationship` do parceiro para cliente com tipo `RESELLER`, `MANAGED_SECURITY` ou `SUPPORT`; relacione permissões como `alerts.read`, `events.read` e `equipment.read`. Controle escopo com `RelationshipAssignment` para equipe/usuário e cliente específico. Veja [relationship-model.md](references/relationship-model.md).

### Step 4 — Mapear roles externas com cuidado
Use `ExternalRoleMapping` para traduzir claim Keycloak para role SaaS somente após validar issuer/audience. O mapeamento deve acrescentar capacidades internas, não permitir que uma string arbitrária do token contorne memberships e relationships.

### Step 5 — Construir pipeline de decisão
Implemente a sequência **IDENTITY → TENANT ROLE → TENANT RELATIONSHIP → RESOURCE ACCESS → ALLOW/DENY**. Extraia identidade validada, resolva membership no tenant alvo, avalie delegação ativa, confine a query aos recursos daquele tenant e finalmente permita/negue. Veja [authorization-pipeline.md](references/authorization-pipeline.md).

### Step 6 — Validar com dados reais
Use `decode_token` para inspecionar claims e `get_user` para confirmar a identidade Keycloak. Teste owner, membro normal, parceiro delegado, usuário sem assignment e usuário com access cross-tenant negado. Veja [jwt-claims-mapping.md](references/jwt-claims-mapping.md).

## Important rules
- **O diagnóstico e o desenho de autorização não autorizam mudanças automáticas no Keycloak.** Antes de criar ou alterar mapper, role, client scope ou claim, apresente a mudança e seu impacto e aguarde confirmação humana explícita.
- Keycloak cuida **apenas da autenticação**; a API SaaS cuida da autorização.
- Use realm único para SaaS, sem realm por cliente.
- Intermediário recebe delegação de acesso, não ownership; ownership permanece com o cliente final.
- Um usuário pode participar de múltiplos tenants; o tenant de uma requisição deve ser explícito e autorizado.
- Nunca aceite `tenant_id` ou role de input não verificado como decisão final de acesso.

---
name: "user-federation"
description: "Planeje federação de usuários LDAP e Active Directory no Keycloak. Use when identidades corporativas precisam autenticar sem uma migração imediata de credenciais."
license: "Apache-2.0"
compatibility: "Keycloak 21+; provider configuration is performed in the Keycloak Admin Console"
metadata:
  author: "Lucas Magalhães"
  version: "1.0.0"
---

# Integração AD e LDAP

## Overview
User Federation delega busca/validação de identidades a LDAP/AD, com importação e sincronização controladas pelo Keycloak. Antes de configurar, defina authoritative source, unique identifier, lifecycle de desligamento e modelo de groups/roles.

## Prerequisites checklist
- [ ] DNS, TLS/LDAPS, firewall e conta de bind de menor privilégio foram validados.
- [ ] Base DN, user DN, group DN e filtro de usuários são conhecidos.
- [ ] O identificador imutável e a política de sync foram aprovados com a equipe de diretório.

## Step-by-step guide

### Step 1 — Configurar connection string
No Admin Console, adicione LDAP User Federation e informe URL `ldaps://...` preferencialmente, bind DN de leitura e credencial do cofre. Valide certificado CA e use uma conta sem permissão de escrita. Nunca use LDAP simples em rede não confiável.

### Step 2 — Mapear atributos
Mapeie username para `sAMAccountName` (AD) ou `uid` (LDAP), primeiro nome para `givenName`, último nome para `sn`, email para `mail` e identificador estável para `objectGUID`/`entryUUID`. Preserve o identificador binário/imutável com mapper adequado; email e CN podem mudar.

### Step 3 — Configurar sync modes
Use `READ_ONLY` se LDAP/AD for a fonte mestre; use `UNSYNCED` somente quando a divergência for desejada e auditada. Configure periodic full/changed-users sync conforme volume e SLA. Ao importar, defina o que acontece com usuário removido/desabilitado no diretório.

### Step 4 — Testar sync e autenticação
Teste conexão, autenticação de uma conta de teste, importação e atualização de atributos. Use `get_user` para inspecionar a representação Keycloak, `get_user_sessions` após login e `get_realm_events` para erros de bind/credencial. Consulte [ldap-ad-integration.md](references/ldap-ad-integration.md).

## Important rules
- **Antes de criar, alterar, testar ou sincronizar um provider LDAP/AD, apresente realm, provider, OU/base DN, modo de sync e impacto em usuários; aguarde confirmação humana explícita.** Uma aprovação anterior, genérica ou para outro alvo não autoriza a alteração.
- AD/LDAP é fonte de identidade, não um substituto automático de autorização de produto.
- Use LDAPS/StartTLS com CA validada e bind account de menor privilégio.
- Não use `cn` como username imutável; ele pode ser renomeado.
- Teste em OU de piloto antes de apontar o provider para toda a floresta/domínio.

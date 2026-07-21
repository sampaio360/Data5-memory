# 👕 Cabide Digital (Lovable & Supabase)

O **Cabide Digital** é uma aplicação inteligente desenvolvida na plataforma **Lovable** e integrada ao **Supabase**. O objetivo principal do projeto é servir como um organizador/dashboard digital de links e ferramentas, permitindo classificar atalhos por palavras-chave (tags) e protegê-los com uma camada de segurança por PIN de acesso rápido.

---

## 🔑 Credenciais e Endpoints (Lovable Cloud)

Estas são as credenciais públicas do backend integradas para controle e conexões externas:

* **URL do Projeto:** `https://xynvoeqfwexzqjdtxwly.supabase.co`
* **Chave Pública (anon key):**
  ```text
  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5bnZvZXFmd2V4enFqZHR4d2x5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNTY3ODQsImV4cCI6MjA4MDkzMjc4NH0._R7TOoHPznJVeIRnuzy-P3lVzyUNumV79gqG5CIx2ZY
  ```

### Endpoints Principais:
* **REST API:** `https://xynvoeqfwexzqjdtxwly.supabase.co/rest/v1/`
* **Auth API:** `https://xynvoeqfwexzqjdtxwly.supabase.co/auth/v1/`
* **Storage API:** `https://xynvoeqfwexzqjdtxwly.supabase.co/storage/v1/`
* **Realtime API:** `wss://xynvoeqfwexzqjdtxwly.supabase.co/realtime/v1/`

---

## 📡 Exemplo de Uso (REST API)

Para testar o acesso externo direto e listar todas as ferramentas cadastradas:

```bash
curl 'https://xynvoeqfwexzqjdtxwly.supabase.co/rest/v1/tools?select=*' \
  -H "apikey: EY_ANON_KEY" \
  -H "Authorization: Bearer EY_ANON_KEY"
```

*(Substitua `EY_ANON_KEY` pela Chave Pública informada acima).*

---

## 📂 Estrutura do Banco de Dados (Supabase)

A modelagem de dados no Supabase é composta por 6 tabelas principais:

1. **`tools`**: Armazena as ferramentas/links cadastrados.
   * `id` (UUID, PK)
   * `created_at` (Timestamp)
   * `name` (Texto)
   * `url` (Texto)
   * `icon` (Texto - nome de ícone do Lucide)
   * `description` (Texto - armazena tags concatenadas por vírgula)
   * `user_id` (UUID, FK para auth)
2. **`tool_clicks`**: Histórico de cliques do usuário para gerar a seção de "Mais Usados".
   * `id` (UUID, PK)
   * `clicked_at` (Timestamp)
   * `tool_id` (UUID, FK para `tools`)
   * `user_id` (UUID)
3. **`profiles`**: Perfil de usuário contendo a segurança por PIN de 4 dígitos.
   * `id` (UUID, PK)
   * `user_id` (UUID)
   * `display_name` (Texto)
   * `avatar_url` (Texto)
   * `pin_hash` (Texto - hash SHA-256 do PIN para a tela de bloqueio local)
4. **`categories`**: Grupos organizacionais de ferramentas.
   * `id` (UUID, PK)
   * `name` (Texto)
   * `icon` (Texto)
   * `user_id` (UUID)
5. **`tool_categories`**: Tabela de associação (N para N) entre ferramentas e categorias.
   * `id` (UUID, PK)
   * `tool_id` (UUID, FK)
   * `category_id` (UUID, FK)
6. **`shared_tools`**: Compartilhamento direto de links entre contas de e-mail.
   * `id` (UUID, PK)
   * `tool_id` (UUID, FK)
   * `shared_by` (UUID)
   * `shared_with_email` (Texto)
   * `shared_with_user_id` (UUID, FK)

---

## ⚙️ Arquitetura e Tech Stack Local

* **Caminho Local do Projeto:** [cabidedigital](file:///C:/Users/Nailton/dyad-apps/cabidedigital)
* **Frontend**: React 18 (TypeScript), Vite, Tailwind CSS v3, shadcn/ui.
* **Estado e Requisições**: React Hook Form + Zod (formulários), TanStack Query v5 (cache de API), Sonner (notificações).
* **Fluxo de Proteção por PIN**: Implementado em [usePin.ts](file:///C:/Users/Nailton/dyad-apps/cabidedigital/src/hooks/usePin.ts). O código realiza a criptografia leve do PIN digitado com o sal `cabide-salt` (`SHA-256`) e valida contra o `pin_hash` do banco de dados na inicialização do app.

---
*Nota criada pelo Antigravity em 13/07/2026.*

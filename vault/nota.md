# CodeBuddy360

O **CodeBuddy360** (ou simplesmente **CodeBuddy**) é uma plataforma web inteligente desenvolvida com a plataforma **Lovable** e integrada ao **Supabase**. O principal objetivo do projeto é ajudar desenvolvedores e gerentes de produto a transformarem ideias simples em **Product Requirement Documents (PRDs)** completos, consistentes e profissionais, além de gerar tarefas e templates de prompts específicos para desenvolvimento.

---

## 🚀 Arquitetura e Tech Stack

A aplicação segue uma arquitetura moderna e reativa:

- **Frontend**: React 18 com TypeScript, utilizando **Vite** como build tool.
- **Estilização**: Tailwind CSS com **shadcn/ui** e Radix UI para componentes visuais reutilizáveis e acessíveis.
- **Roteamento**: React Router DOM (definido centralizadamente em `src/App.tsx`).
- **Gerenciamento de Estado & Cache**: React Query (TanStack Query) para gerenciar o estado assíncrono do servidor e cache das requisições Supabase.
- **Formulários**: React Hook Form integrado com validação de esquemas via **Zod**.
- **Banco de Dados & Autenticação**: **Supabase** (utilizando `@supabase/supabase-js` para persistência, RLS, storage e funções serverless).
- **Processamento de IA**: Executado via Edge Functions do Supabase (`/functions/v1/chat` e `/functions/v1/extract-text`), integrando-se com provedores como Google Gemini, OpenRouter, Claude, Ollama, etc.

---

## ⚔️ Funcionalidade Principal: O Debate de IAs

O CodeBuddy se destaca pelo mecanismo de **Debate entre IAs**, onde duas instâncias de IA trabalham colaborativamente para refinar a especificação do usuário:

1. **IA Principal**: Gera a especificação inicial com base nas descrições do chat, documentos e regras de negócio.
2. **IA Revisora**: Analisa criticamente o rascunho em busca de lacunas, contradições lógicas, problemas de UI ou viabilidade técnica, retornando um feedback estruturado.
3. **Loop de Correção**: O sistema executa rodadas de ajuste automático (até 2 rodadas) com base no feedback até obter aprovação ou atingir o limite.

### Fases do Debate:
- **Debates de Análise (Específicos)**: Relatórios detalhados focados em áreas críticas:
  - *Consistência Lógica* (contradições/ambiguidades).
  - *Viabilidade Técnica* (stack, riscos, arquitetura).
  - *Lacunas de Requisitos* (recursos ausentes).
  - *Regras de Negócio* (conformidade com regras pré-definidas).
  - *UI / Visual Frontend* (design system, UX, telas).
- **Consolidação Geral**: Consome as análises aprovadas pelo usuário (que atua como Juiz Orquestrador) para gerar o PRD final, as tarefas (backlog) e os templates de prompt.

---

## 📂 Estrutura do Banco de Dados (Supabase)

Principais tabelas utilizadas no backend:

- `projects`: Armazena dados dos projetos, integrações GitHub e o conteúdo final do PRD.
- `project_debates`: Histórico de debates gerados, resultados de steps e vereditos.
- `project_documents`: Arquivos anexados aos projetos, com textos extraídos via Edge Function.
- `project_memories`: Memória automática de lições aprendidas e decisões tomadas no debate.
- `project_business_rules`: Regras de negócio restritivas específicas de cada projeto.
- `project_tasks`: Lista de tarefas (backlog) gerada pós-debate geral.
- `project_prompts`: Templates de prompts sugeridos para acelerar o desenvolvimento.
- `global_skills` & `project_skills`: Instruções contextuais reutilizáveis associadas aos projetos.
- `user_llm_settings` & `api_key_stock`: Configurações de chaves e modelos de IA do usuário.

---

## 📁 Estrutura de Código (React UI)

As views e componentes estão distribuídos da seguinte forma:

- `src/pages/`:
  - `Index.tsx`: Landing page institucional destacando os benefícios do debate de IAs.
  - `AuthPage.tsx`: Login e criação de contas via Supabase.
  - `DashboardPage.tsx`: Listagem, criação e acompanhamento de projetos.
  - `ProjectPage.tsx`: Espaço de trabalho do projeto com as abas de *Chat, PRD, Tarefas, Prompts, Config, Skills, Debate e Timeline*.
  - `SkillsPage.tsx`: Painel de gerenciamento de skills globais do usuário.
  - `GuidePage.tsx`: Central de ajuda e guias de uso.
- `src/lib/`:
  - `build-project-context.ts`: Constrói o payload de contexto unificado (leitura de documentos, regras, skills, código GitHub e memórias) enviado para os pipelines de IA.
  - `generate-steps.ts`: Orquestrador dos steps de chamada às Edge Functions para execução e correção do debate.

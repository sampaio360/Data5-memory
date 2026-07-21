# 🧠 data5-skill-mestre

**Tipo:** Núcleo / Governança (Prioridade 1 - Ativa)  
**Conexões:** Roteia para todas as outras skills, incluindo `[[data5-agent-helper]]` e `[[gcp-data-pipelines]]`.

---

## 📌 Descrição
O **Data5-Skill-Mestre** é o roteador e controlador central de contexto. Ele intercepta as requisições e faz a triagem das demais skills recomendadas pelo sistema para evitar carregamentos redundantes de arquivos `.md` na memória do Antigravity.

---

## 🎯 Gatilhos de Ativação
* Ativado sempre que mais de uma skill for sugerida na conversa, ou quando o prompt do sistema indicar regras complexas de desenvolvimento.

---

## 🛠️ Regras de Triagem e Conexão
* **Categoria A (Segurança):** Sempre lê `[[accidental-data-loss-prevention]]` e `[[gcloud-auth-verification]]` sem filtro prévio.
* **Categoria B (Tecnologias):** Só lê skills específicas (como `[[dbt-bigquery]]` ou `[[dataform-bigquery]]`) se houver arquivos correspondentes no workspace ativo do projeto.
* **Categoria C (Metodologia):** Permite ler apenas uma skill de fluxo (como `writing-plans` ou `diagnosing-bugs`) por vez.

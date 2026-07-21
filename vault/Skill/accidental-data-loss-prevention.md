# 🛑 accidental-data-loss-prevention

**Tipo:** Segurança & Conformidade (Prioridade 1 - Ativa)  
**Conexões:** Roteada e prioritária. Chamada imediatamente pelo `[[data5-skill-mestre]]` em caso de risco.

---

## 📌 Descrição
Habilidade de segurança mandatória projetada para evitar perda de dados irreversível ou destruição de recursos cloud/locais causados por ações automáticas do agente de IA.

---

## 🎯 Gatilhos de Ativação
* Qualquer comando SQL contendo `DROP`, `TRUNCATE`, ou `DELETE` sem cláusula `WHERE`.
* Comandos CLI de remoção de dados em nuvem (ex: `gsutil rm` ou `gcloud storage rm` em baldes críticos).
* Comandos de deleção de projetos GCP ou destruição de chaves KMS.

---

## 🛠️ Procedimento Mandatório
1. **Pausar Execução:** A IA nunca executará o comando deletório diretamente.
2. **Pedir Consentimento Explícito:** Apresentar de forma clara o impacto da deleção ao usuário e aguardar a confirmação de texto "Sim/Aprovado".

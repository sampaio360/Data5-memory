# 🤖 data5-agent-helper

**Tipo:** Orquestração Local (Prioridade 1 - Ativa)  
**Conexões:** Acionada após triagem do `[[data5-skill-mestre]]`. Salva e lê status em `[[Data5-Memory]]`.

---

## 📌 Descrição
Esta skill integra o Antigravity com os subagentes autônomos locais da equipe **Data5-Agent** (CEO, Comandante, Programador, Sentinela, Escriba) que rodam localmente na porta `3002`.

---

## 🎯 Gatilhos de Ativação
* "use o Data5-agent"
* "delegue para o Data5-agent"
* "orquestre os subagentes"

---

## 🛠️ Conexão e Execução
Dispara a orquestração utilizando o interpretador Node no arquivo global de integração:
```bash
node "C:\Users\Nailton\.gemini\config\skills\data5-agent-helper\scripts\run-data5-mission.js" "<Workspace>" "<Missão>"
```
O Antigravity atua como **Arquiteto Chefe** (definindo o escopo antes da execução) e **Revisor Sênior / QA** (analisando os commits gerados após a execução).

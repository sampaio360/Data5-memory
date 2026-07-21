# 📦 managing-python-dependencies

**Tipo:** Utilidades (Prioridade 1 - Ativa)  
**Conexões:** Conectada a `[[notebook-guidance]]` e `[[gcp-spark]]`.

---

## 📌 Descrição
Habilidade para assegurar o gerenciamento correto de dependências Python. Ela proíbe a execução de comandos `pip install` globais e obriga a criação e uso de ambientes virtuais (`.venv`) específicos em cada pasta de projeto para não danificar o sistema do PC local.

---

## 🎯 Gatilhos de Ativação
* Qualquer comando que use `pip` ou script Python executado no terminal.
* Edição de arquivos `requirements.txt` ou `pyproject.toml`.

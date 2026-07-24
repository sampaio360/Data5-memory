# Projeto Flask Simples

Este é um servidor web Flask simples com três rotas que retornam JSON.

## Rotas

- `/`: Retorna uma mensagem de boas-vindas.
- `/status`: Retorna o status do serviço.
- `/health`: Retorna a saúde da aplicação.

## Como executar

1. Clone este repositório (ou crie os arquivos manualmente).
2. Navegue até o diretório do projeto:
   ```bash
   cd flask_app
   ```
3. Crie e ative um ambiente virtual (opcional, mas recomendado):
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
4. Instale as dependências:
   ```bash
   pip install -r requirements.txt
   ```
5. Execute a aplicação Flask:
   ```bash
   python3 app.py
   ```

A aplicação estará disponível em `http://127.0.0.1:5000` (ou `http://localhost:5000`).
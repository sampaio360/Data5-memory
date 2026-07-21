@echo off
title Obsidian Clone Runner
echo ==========================================
echo   Iniciando o Obsidian Clone + MCP Server
echo ==========================================

:: Garante que estamos na pasta correta
cd /d "%~dp0"

echo.
echo [1/3] Iniciando o Servidor Backend (API + MCP)...
:: Usando /k para manter a janela aberta caso ocorra algum erro e voce possa ler o log
start "Obsidian Backend" cmd /k "npm run server"

echo [2/3] Iniciando o Frontend (Vite)...
start "Obsidian Frontend" cmd /k "npm run dev"

echo [3/3] Aguardando servidores iniciarem...
timeout /t 3 /nobreak > nul

echo Abrindo o navegador em http://localhost:5175...
start http://localhost:5175

echo.
echo ==========================================
echo   Obsidian Clone executando!
echo   (As janelas do prompt de comando devem continuar abertas)
echo ==========================================
pause

@echo off
title Parando Servidores Obsidian
echo ==========================================
echo   Parando Servidores Obsidian (Portas 3001 e 5175)
echo ==========================================
echo.

:: Para o backend na porta 3001
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING') do (
    echo [OK] Parando processo PID %%a na porta 3001...
    taskkill /f /pid %%a >nul 2>&1
)

:: Para o frontend na porta 5175
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5175 ^| findstr LISTENING') do (
    echo [OK] Parando processo PID %%a na porta 5175...
    taskkill /f /pid %%a >nul 2>&1
)

echo.
echo ==========================================
echo   Servidores finalizados com sucesso!
echo ==========================================
timeout /t 3 > nul

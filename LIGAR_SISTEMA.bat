@echo off
title TRADING SYSTEM - MOTOR E DASHBOARD
setlocal enabledelayedexpansion

echo ======================================================
echo    INICIALIZANDO TRADING SYSTEM B3
echo ======================================================

:: Verifica se a pasta node_modules existe na raiz
if not exist "node_modules\" (
    echo [!] Dependencias raiz nao encontradas. Instalando...
    call npm install
)

:: Verifica backend
if not exist "backend\node_modules\" (
    echo [!] Dependencias do Backend nao encontradas. Instalando...
    cd backend && call npm install && cd ..
)

:: Verifica frontend
if not exist "front end\node_modules\" (
    echo [!] Dependencias do Frontend nao encontradas. Instalando...
    cd "front end" && call npm install && cd ..
)

echo.
echo [OK] Dependencias verificadas.
echo [>] Iniciando Backend e Frontend simultaneamente...
echo.

:: Executa o comando start definido no package.json usando npx para garantir concurrently
call npx concurrently "npm run backend" "npm run frontend"

if %errorlevel% neq 0 (
    echo.
    echo [X] Erro ao iniciar o sistema. Verifique os logs acima.
)

pause

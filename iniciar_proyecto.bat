@echo off
chcp 65001 > nul
title Hotel Cortez - Sistema de Mantenimiento (desarrollo)
echo ========================================================
echo   HOTEL CORTEZ - MODO DESARROLLO
echo ========================================================
if exist "F:\node\node.exe" set PATH=F:\node;%PATH%
where node > nul 2>&1 || (echo [ERROR] No se encontro Node.js. Instala Node 20 o superior. & pause & exit /b 1)

cd /d "%~dp0backend"
if not exist node_modules (echo Instalando dependencias del backend... & call npm install)
if not exist .env (copy .env.example .env > nul & echo [AVISO] Se creo backend\.env: completa DB_PASSWORD y vuelve a ejecutar. & notepad .env & pause & exit /b 1)
echo [1/3] Verificando base de datos y migraciones...
call npm run semilla || (echo [ERROR] No se pudo preparar MySQL. Revisa que el servicio MySQL80 este iniciado y backend\.env. & pause & exit /b 1)

cd /d "%~dp0frontend"
if not exist node_modules (echo Instalando dependencias del frontend... & call npm install)

echo [2/3] Iniciando API (puerto 3000)...
start "Hotel Cortez - API" cmd /k "cd /d %~dp0backend && npm run dev"
timeout /t 2 /nobreak > nul
echo [3/3] Iniciando interfaz (puerto 5173)...
start "Hotel Cortez - Interfaz" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo   PC:      http://localhost:5173
echo   Celular: http://IP_DE_ESTA_PC:5173   (misma red Wi-Fi; ver IP con ipconfig)
echo   Credenciales de prueba: docs\ACCESO.md
pause

@echo off
chcp 65001 > nul
title Hotel Cortez - Sistema de Mantenimiento
if exist "F:\node\node.exe" set PATH=F:\node;%PATH%
where node > nul 2>&1 || (echo [ERROR] No se encontro Node.js. & pause & exit /b 1)

echo [1/4] Compilando interfaz...
cd /d "%~dp0frontend"
call npm install --no-audit --no-fund
call npm run build || (echo [ERROR] Fallo la compilacion del frontend & pause & exit /b 1)

echo [2/4] Compilando API...
cd /d "%~dp0backend"
call npm install --no-audit --no-fund
call npm run build || (echo [ERROR] Fallo la compilacion del backend & pause & exit /b 1)

echo [3/4] Respaldo y migraciones...
call npm run respaldo
call npm run migrar || (echo [ERROR] No se pudo migrar la base. & pause & exit /b 1)

echo [4/4] Sistema en http://localhost:3000  (celular: http://IP_DE_ESTA_PC:3000)
set NODE_ENV=production
node dist/server.js
pause

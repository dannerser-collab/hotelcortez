@echo off
title Hotel Cortez - Sistema de Mantenimiento
echo ========================================================
echo   HOTEL CORTEZ - INICIANDO SISTEMA DE MANTENIMIENTO
echo ========================================================
echo.
set PATH=F:\node;%PATH%

echo [1/2] Iniciando Servidor Backend (Puerto 3000)...
start "Hotel Cortez - Backend API" cmd /k "cd /d f:\hotelcortez\backend && npx tsx src/server.ts"

timeout /t 2 /nobreak > nul

echo [2/2] Iniciando Frontend Web y Movil (Puerto 5173)...
start "Hotel Cortez - Frontend" cmd /k "cd /d f:\hotelcortez\frontend && npx vite --port 5173 --host"

timeout /t 2 /nobreak > nul

echo.
echo ========================================================
echo   SISTEMA ACTIVO CON EXITO!
echo   Abre tu navegador en: http://localhost:5173
echo ========================================================
pause


@echo off
title LYNX BarOS - prueba local
cd /d "%~dp0"
echo Iniciando LYNX BarOS en modo desarrollo (Vite + Electron)...
echo Cerra esta ventana para detener la app.
call npm run electron:dev
pause

@echo off
echo Abriendo landing page en http://localhost:8080
echo Presiona Ctrl+C para detener el servidor
cd /d "%~dp0"
npx serve -l 8080 .

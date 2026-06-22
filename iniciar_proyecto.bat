@echo off
echo Iniciando Laboratorio Virtual de Electronica...

echo Iniciando Backend...
start cmd /k "cd /d "%~dp0lab-electronica\backend" && python run.py"

echo Iniciando Frontend...
start cmd /k "cd /d "%~dp0app" && npm run dev -- --host --open"

echo Servidores iniciados en ventanas separadas.

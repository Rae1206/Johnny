@echo off
REM ============================================================
REM  Taskless - Arranque de un solo clic (idempotente)
REM  Solo inicia lo que NO este ya corriendo. Podes ejecutarlo
REM  las veces que quieras: no crea instancias duplicadas.
REM ============================================================

REM --- MySQL (puerto 3306) ---
netstat -ano | findstr "LISTENING" | findstr ":3306" >nul
if errorlevel 1 (
  echo Iniciando MySQL...
  start "Taskless - MySQL" cmd /k mysqld --console
  echo Esperando a que MySQL levante...
  timeout /t 5 /nobreak >nul
) else (
  echo MySQL ya esta corriendo. OK.
)

REM --- Backend (puerto 4000) ---
netstat -ano | findstr "LISTENING" | findstr ":4000" >nul
if errorlevel 1 (
  echo Iniciando backend...
  start "Taskless - Backend" cmd /k "cd /d %~dp0backend && npm start"
) else (
  echo Backend ya esta corriendo. OK.
)

REM --- Frontend (puerto 5173) ---
netstat -ano | findstr "LISTENING" | findstr ":5173" >nul
if errorlevel 1 (
  echo Iniciando frontend...
  start "Taskless - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
  echo Esperando a que el frontend compile...
  timeout /t 7 /nobreak >nul
) else (
  echo Frontend ya esta corriendo. OK.
)

start http://localhost:5173
echo.
echo Listo. Abri http://localhost:5173 y entra con demo@taskless.com / Demo1234

@echo off
setlocal EnableExtensions
REM ============================================================
REM  Taskless - Arranque de un solo clic (idempotente)
REM  Solo inicia lo que NO este ya corriendo. Podes ejecutarlo
REM  las veces que quieras: no crea instancias duplicadas.
REM ============================================================

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "FRONTEND_DIR=%ROOT_DIR%frontend"

if defined TASKLESS_SKIP_STARTUP (
  echo [OK] TASKLESS_SKIP_STARTUP activo. No se ejecuto el arranque.
  exit /b 0
)

REM --- Prerequisitos del sistema (no se pueden instalar desde el .bat) ---
where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo [X] Node.js no esta instalado o no esta en el PATH.
  echo     Instala Node.js LTS desde https://nodejs.org y vuelve a ejecutar este archivo.
  pause
  exit /b 1
)

where mysqld >nul 2>&1
if errorlevel 1 (
  where mysql >nul 2>&1
  if errorlevel 1 (
    echo.
    echo [!] No encontre MySQL en el PATH. Si usas una base local, instala MySQL
    echo     y asegurate de que mysqld este en el PATH. Continuo de todas formas...
  )
)

REM --- Dependencias npm (solo instala si faltan: idempotente) ---
if not exist "%BACKEND_DIR%\node_modules" (
  echo Instalando dependencias del backend por primera vez...
  call npm install --prefix "%BACKEND_DIR%"
  if errorlevel 1 (
    echo.
    echo [X] Fallo la instalacion de dependencias del backend.
    pause
    exit /b 1
  )
) else (
  echo Dependencias del backend ya instaladas. OK.
)

if not exist "%FRONTEND_DIR%\node_modules" (
  echo Instalando dependencias del frontend por primera vez...
  call npm install --prefix "%FRONTEND_DIR%"
  if errorlevel 1 (
    echo.
    echo [X] Fallo la instalacion de dependencias del frontend.
    pause
    exit /b 1
  )
) else (
  echo Dependencias del frontend ya instaladas. OK.
)

REM --- .env local: JWT_SECRET per installation ---
echo Verificando backend/.env...
node "%BACKEND_DIR%\scripts\ensure-local-env.js"
if errorlevel 1 (
  echo.
  echo No se pudo preparar backend/.env.
  exit /b 1
)

REM --- Configuracion efectiva (misma fuente que runtime) ---
echo Cargando configuracion efectiva...
for /f "usebackq tokens=1,* delims==" %%A in (`node "%BACKEND_DIR%\scripts\export-runtime-env.js"`) do set "%%A=%%B"
if not defined DB_NAME (
  echo.
  echo No se pudo leer la configuracion efectiva de backend/config/env.js.
  exit /b 1
)

REM --- MySQL (puerto configurado, no hardcodeado) ---
if /I "%DB_HOST%"=="127.0.0.1" (
  set "TASKLESS_LOCAL_MYSQL=1"
) else if /I "%DB_HOST%"=="localhost" (
  set "TASKLESS_LOCAL_MYSQL=1"
) else (
  set "TASKLESS_LOCAL_MYSQL=0"
)

if "%TASKLESS_LOCAL_MYSQL%"=="1" (
  netstat -ano | findstr "LISTENING" | findstr ":%DB_PORT%" >nul
  if errorlevel 1 (
    echo Iniciando MySQL en puerto %DB_PORT%...
    start "Taskless - MySQL" cmd /k mysqld --console --port=%DB_PORT%
    call :wait_mysql
  ) else (
    echo MySQL ya esta corriendo en %DB_HOST%:%DB_PORT%. OK.
  )
) else (
  echo MySQL configurado en %DB_HOST%:%DB_PORT%. No se inicia un servidor local.
)

REM --- Base local (solo crea/importa si la base configurada no existe) ---
echo Verificando base local %DB_NAME%...
node "%BACKEND_DIR%\scripts\init-local-db.js"
if errorlevel 1 (
  echo.
  echo No se pudo preparar la base local.
  exit /b 1
)

if defined TASKLESS_SKIP_LAUNCH (
  echo.
  echo Preflight completado. Launch saltado por TASKLESS_SKIP_LAUNCH.
  exit /b 0
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

start "" "http://localhost:5173"
echo.
echo Listo. Abri http://localhost:5173 y entra con demo@taskless.com / Demo1234
exit /b 0

REM ============================================================
REM  Subrutina: esperar a que MySQL este listo para conexiones.
REM  Un arranque en frio tras un apagado forzado hace crash
REM  recovery de InnoDB y puede tardar ~1 min. En vez de un
REM  timeout fijo, sondeamos con mysqladmin ping hasta ~90s.
REM ============================================================
:wait_mysql
setlocal EnableDelayedExpansion
echo Esperando a que MySQL levante (hasta ~90s en el primer arranque tras un apagado forzado)...
for /l %%i in (1,1,45) do (
  mysqladmin --host=%DB_HOST% --port=%DB_PORT% --user=%DB_USER% --password=%DB_PASSWORD% ping >nul 2>&1
  if not errorlevel 1 (
    echo.
    echo MySQL respondio. OK.
    endlocal
    goto :eof
  )
  <nul set /p "=."
  timeout /t 2 /nobreak >nul
)
echo.
echo [!] MySQL no respondio tras el tiempo de espera. Continuo e intento igual...
endlocal
goto :eof

@echo off
REM ============================================================
REM  Taskless - Apagar todo (backend, frontend y MySQL)
REM  Util si quedaron procesos colgados o queres reiniciar limpio.
REM ============================================================

echo Deteniendo backend (puerto 4000)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":4000" ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

echo Deteniendo frontend (puerto 5173)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173" ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

echo Deteniendo MySQL (apagado limpio)...
mysqladmin -u root -padmin shutdown >nul 2>&1
REM Por si quedaron procesos mysqld colgados que no responden a shutdown:
taskkill /F /IM mysqld.exe >nul 2>&1

echo Cerrando ventanas de consola...
taskkill /F /FI "WINDOWTITLE eq Taskless -*" >nul 2>&1

echo.
echo Todo detenido y ventanas cerradas. Podes volver a arrancar con INICIAR.bat


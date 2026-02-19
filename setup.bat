@echo off
chcp 65001 >nul
echo   ticket bot kurulum sihirbazı - başlat

echo [1/4] installing dependencies (npm install)...
call npm install
if %errorlevel% neq 0 (
    echo [error] npm install failed. please ensure node.js is installed.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/4] checking environment configuration...
if not exist ".env" (
    if exist ".env.example" (
        echo [.env] creating .env from .env.example...
        copy /Y ".env.example" ".env" >nul
    ) else (
        echo [warning] .env file not found!
        echo please create a .env file with necessary configuration before running the bot.
        echo you can use .env.example as a template if it exists in the source.
        pause
        exit /b 1
    )
) else (
    echo [.env] configuration file found.
)

echo.
echo [3/4] pushing database schema...
call npm run db:push
if %errorlevel% neq 0 (
    echo [error] database setup failed. check your .env file and database connection.
    pause
    exit /b %errorlevel%
)

echo.
echo [4/4] building project...
call npm run build
if %errorlevel% neq 0 (
    echo [error] build failed.
    pause
    exit /b %errorlevel%
)

echo.
echo [info] registering commands (clearing old commands)...
call npm run register
if %errorlevel% neq 0 (
    echo [warning] command registration failed. you may need to run 'npm run register' manually.
)

echo.
echo [info] setup complete. starting rafford...
call npm start

pause

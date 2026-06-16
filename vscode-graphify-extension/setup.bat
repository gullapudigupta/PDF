@echo off
REM VS Code Graphify Extension Setup Script

echo Setting up Graphify VS Code Extension...

REM Navigate to extension directory
cd vscode-graphify-extension
if errorlevel 1 exit /b 1

REM Install dependencies
echo Installing dependencies...
call npm install

REM Compile TypeScript
echo Compiling TypeScript...
call npm run compile

REM Package the extension
echo Packaging extension...
call npx vsce package

echo.
echo Extension setup complete!
echo.
echo Next steps:
echo 1. Install the extension manually through VS Code:
echo    - Open VS Code
echo    - Go to Extensions (Ctrl+Shift+X)
echo    - Click 'Install from VSIX'
echo    - Select the generated .vsix file
echo.
echo 2. Or install it via command line:
echo    code --install-extension vscode-graphify-*.vsix
echo.
echo 3. Reload VS Code to activate the extension

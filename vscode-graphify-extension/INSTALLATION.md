# Graphify VS Code Extension - Installation Guide

## Prerequisites

1. **VS Code** - Version 1.85.0 or later
2. **Node.js** - Version 16 or later (for building the extension)
3. **Graphify** - Already installed via `uv tool install graphifyy`

## Installation Steps

### Option 1: Development Installation (Recommended)

1. **Navigate to the extension directory:**
   ```bash
   cd vscode-graphify-extension
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Compile the TypeScript:**
   ```bash
   npm run compile
   ```

4. **Open in VS Code for development:**
   ```bash
   code .
   ```

5. **Press F5 to launch the extension in debug mode** or:
   - Open the Run and Debug view (Ctrl+Shift+D)
   - Select "Run Extension" from the dropdown
   - Click the play button

### Option 2: Package and Install

1. **Navigate to the extension directory:**
   ```bash
   cd vscode-graphify-extension
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Install the vsce package tool:**
   ```bash
   npm install -g @vscode/vsce
   ```

4. **Compile and package:**
   ```bash
   npm run compile
   vsce package
   ```

5. **Install the generated .vsix file:**
   ```bash
   code --install-extension vscode-graphify-*.vsix
   ```

6. **Reload VS Code** or restart the application

### Option 3: Use the Setup Script

**On Windows:**
```powershell
.\setup.bat
```

**On macOS/Linux:**
```bash
./setup.sh
```

## Verify Installation

After installation, you should see:

1. A new "Graphify" icon in the Activity Bar (left sidebar)
2. New commands in the Command Palette (Ctrl+Shift+P):
   - Graphify: Analyze Current File
   - Graphify: Analyze Workspace
   - Graphify: Generate Graph Visualization
   - Graphify: Open Results Panel
   - Graphify: Clear Results

3. New keybindings available (shown in Keyboard Shortcuts)

## Testing the Extension

1. **Analyze a file:**
   - Open any code file in VS Code
   - Press `Ctrl+Shift+G F` (Windows/Linux) or `Cmd+Shift+G F` (macOS)
   - Or go to Command Palette and run "Graphify: Analyze Current File"

2. **Check the Results Panel:**
   - Click the Graphify icon in the Activity Bar
   - Or use `Ctrl+Shift+G P` to open the Results Panel

3. **Analyze your workspace:**
   - Press `Ctrl+Shift+G W` (Windows/Linux) or `Cmd+Shift+G W` (macOS)
   - Or right-click on a folder in Explorer and select "Graphify: Analyze Workspace"

## Troubleshooting

### "Graphify is not installed or not in PATH"

**Solution:** Make sure graphify is properly installed:

```bash
# Check if graphify is installed
uv tool list

# If not installed, install it:
uv tool install graphifyy

# Add to PATH if needed:
# On Windows (in PowerShell):
$env:PATH = "C:\Users\<username>\.local\bin;$env:PATH"
```

### "Extension not showing up in VS Code"

**Solution:** Try these steps:

1. Close VS Code completely
2. Clear the extension cache:
   - Windows: `%APPDATA%\Code\extensions`
   - macOS: `~/.vscode/extensions`
   - Linux: `~/.vscode/extensions`
3. Reinstall the extension using one of the methods above

### "npm install fails"

**Solution:** Make sure you have Node.js and npm installed:

```bash
node --version  # Should be v16 or later
npm --version   # Should be v8 or later
```

Update npm if needed:
```bash
npm install -g npm@latest
```

## Development

### Project Structure

```
vscode-graphify-extension/
├── src/
│   └── extension.ts          # Main extension code
├── media/
│   └── graphify.svg          # Extension icon
├── package.json              # Extension manifest
├── tsconfig.json             # TypeScript config
├── README.md                 # User README
└── INSTALLATION.md           # This file
```

### Building for Production

To build a production version:

```bash
npm run compile
npm run lint
vsce package --baseContentUrl https://github.com/your-repo/tree/main/vscode-graphify-extension --baseImagesUrl https://github.com/your-repo/raw/main/vscode-graphify-extension
```

## Support & Issues

For issues with the extension itself, check:
- The VS Code Output panel (View > Output)
- The extension logs in View > Extensions (right-click the extension)

For issues with graphify, refer to the graphify documentation:
- GitHub: https://github.com/user/graphify
- Documentation: [graphify docs]

## Next Steps

1. Explore the keybindings: View > Keyboard Shortcuts (search for "graphify")
2. Customize keybindings in your settings
3. Check the Results Panel to see analysis output
4. Integrate with your development workflow

Happy analyzing!

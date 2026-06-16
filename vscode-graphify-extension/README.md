# Graphify VS Code Extension

A powerful VS Code extension that integrates graphify for code analysis and visualization.

## Features

- **Analyze Current File** - Quickly analyze the file you're currently editing
- **Analyze Workspace** - Analyze your entire project for comprehensive insights
- **Generate Graph Visualizations** - Create visual representations of code structures
- **Keybindings** - Quick access with custom keyboard shortcuts
- **Results Panel** - View analysis results in a dedicated side panel
- **Command Palette** - Execute commands through VS Code's command palette

## Keyboard Shortcuts

- `Ctrl+Shift+G F` (Windows/Linux) or `Cmd+Shift+G F` (macOS) - Analyze current file
- `Ctrl+Shift+G W` (Windows/Linux) or `Cmd+Shift+G W` (macOS) - Analyze workspace
- `Ctrl+Shift+G G` (Windows/Linux) or `Cmd+Shift+G G` (macOS) - Generate graph
- `Ctrl+Shift+G P` (Windows/Linux) or `Cmd+Shift+G P` (macOS) - Open results panel

## Commands

- `Graphify: Analyze Current File` - Analyze the file in the active editor
- `Graphify: Analyze Workspace` - Analyze the entire workspace
- `Graphify: Generate Graph Visualization` - Generate a graph from current results
- `Graphify: Open Results Panel` - Open the graphify results panel
- `Graphify: Clear Results` - Clear cached analysis results

## Requirements

- Graphify must be installed: `uv tool install graphifyy`
- The graphify executable should be available in your PATH

## Installation

1. Place this extension in your VS Code extensions directory
2. Reload VS Code
3. The extension will be automatically activated

## Usage

1. Open a file or workspace you want to analyze
2. Press `Ctrl+Shift+G F` to analyze the current file or use the command palette
3. Results will appear in the Graphify panel on the side
4. Click "Generate Graph" to create visualizations

## Configuration

The extension works with your installed graphify tool. Make sure graphify is properly installed and accessible from your command line.

## Support

For issues with graphify itself, visit: https://github.com/user/graphify

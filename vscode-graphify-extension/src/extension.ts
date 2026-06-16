import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

let graphifyPanel: vscode.WebviewPanel | undefined;
let analysisResults: any = {};

export function activate(context: vscode.ExtensionContext) {
	console.log('Graphify extension is now active!');

	// Register all commands
	context.subscriptions.push(
		vscode.commands.registerCommand('graphify.analyzeFile', () => analyzeFile(context)),
		vscode.commands.registerCommand('graphify.analyzeWorkspace', () => analyzeWorkspace(context)),
		vscode.commands.registerCommand('graphify.generateGraph', () => generateGraph(context)),
		vscode.commands.registerCommand('graphify.openPanel', () => openResultsPanel(context)),
		vscode.commands.registerCommand('graphify.clearResults', () => clearResults())
	);

	// Create results view provider
	const resultsProvider = new GraphifyResultsProvider();
	context.subscriptions.push(
		vscode.window.registerTreeDataProvider('graphify-results', resultsProvider)
	);

	vscode.window.showInformationMessage('Graphify extension activated!');
}

async function analyzeFile(context: vscode.ExtensionContext) {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		vscode.window.showWarningMessage('No file is currently open');
		return;
	}

	const filePath = editor.document.uri.fsPath;
	const fileName = path.basename(filePath);

	vscode.window.showInformationMessage(`Analyzing ${fileName}...`);

	try {
		// Run graphify command
		const result = await runGraphify(['--file', filePath, '--output', 'json']);
		
		analysisResults = {
			file: fileName,
			timestamp: new Date().toISOString(),
			data: result
		};

		vscode.window.showInformationMessage(`Analysis complete for ${fileName}`);
		openResultsPanel(context);
	} catch (error: any) {
		vscode.window.showErrorMessage(`Error analyzing file: ${error.message}`);
	}
}

async function analyzeWorkspace(context: vscode.ExtensionContext) {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders || workspaceFolders.length === 0) {
		vscode.window.showWarningMessage('No workspace folder is open');
		return;
	}

	const workspacePath = workspaceFolders[0].uri.fsPath;
	vscode.window.showInformationMessage('Analyzing workspace...');

	try {
		const result = await runGraphify(['--path', workspacePath, '--output', 'json']);
		
		analysisResults = {
			workspace: workspacePath,
			timestamp: new Date().toISOString(),
			data: result
		};

		vscode.window.showInformationMessage('Workspace analysis complete');
		openResultsPanel(context);
	} catch (error: any) {
		vscode.window.showErrorMessage(`Error analyzing workspace: ${error.message}`);
	}
}

async function generateGraph(context: vscode.ExtensionContext) {
	if (Object.keys(analysisResults).length === 0) {
		vscode.window.showWarningMessage('No analysis results available. Please run an analysis first.');
		return;
	}

	vscode.window.showInformationMessage('Generating graph visualization...');

	try {
		// This would call graphify with graph generation parameters
		openResultsPanel(context);
		vscode.window.showInformationMessage('Graph visualization generated');
	} catch (error: any) {
		vscode.window.showErrorMessage(`Error generating graph: ${error.message}`);
	}
}

function openResultsPanel(context: vscode.ExtensionContext) {
	if (graphifyPanel) {
		graphifyPanel.reveal(vscode.ViewColumn.Beside);
	} else {
		graphifyPanel = vscode.window.createWebviewPanel(
			'graphifyResults',
			'Graphify Results',
			vscode.ViewColumn.Beside,
			{
				enableScripts: true,
				localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'media'))]
			}
		);

		graphifyPanel.webview.html = getWebviewContent(context);

		graphifyPanel.onDidDispose(() => {
			graphifyPanel = undefined;
		});

		// Send results to webview
		if (Object.keys(analysisResults).length > 0) {
			graphifyPanel.webview.postMessage({
				command: 'updateResults',
				results: analysisResults
			});
		}
	}
}

function getWebviewContent(context: vscode.ExtensionContext): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Graphify Results</title>
	<style>
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
			padding: 20px;
			background-color: var(--vscode-editor-background);
			color: var(--vscode-editor-foreground);
		}
		.header {
			margin-bottom: 20px;
			border-bottom: 1px solid var(--vscode-border);
			padding-bottom: 10px;
		}
		.section {
			margin: 15px 0;
			padding: 10px;
			background-color: var(--vscode-textBlockQuote-background);
			border-left: 3px solid var(--vscode-terminal-ansiBlue);
		}
		.result-item {
			margin: 10px 0;
			padding: 8px;
			background-color: var(--vscode-input-background);
			border-radius: 4px;
		}
		pre {
			background-color: var(--vscode-editor-background);
			padding: 10px;
			border-radius: 4px;
			overflow-x: auto;
		}
		button {
			background-color: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			border: none;
			padding: 8px 16px;
			border-radius: 4px;
			cursor: pointer;
			margin-top: 10px;
		}
		button:hover {
			background-color: var(--vscode-button-hoverBackground);
		}
	</style>
</head>
<body>
	<div class="header">
		<h1>Graphify Analysis Results</h1>
		<p id="timestamp"></p>
	</div>
	<div id="results"></div>
	<button onclick="exportResults()">Export Results</button>
	<script>
		const vscode = acquireVsCodeApi();
		let currentResults = {};

		window.addEventListener('message', event => {
			const message = event.data;
			if (message.command === 'updateResults') {
				currentResults = message.results;
				displayResults(currentResults);
			}
		});

		function displayResults(results) {
			const resultsDiv = document.getElementById('results');
			const timestamp = document.getElementById('timestamp');
			
			if (results.timestamp) {
				timestamp.textContent = 'Analyzed: ' + new Date(results.timestamp).toLocaleString();
			}

			let html = '';
			
			if (results.file) {
				html += '<div class="section"><h2>File: ' + escapeHtml(results.file) + '</h2>';
			} else if (results.workspace) {
				html += '<div class="section"><h2>Workspace: ' + escapeHtml(results.workspace) + '</h2>';
			}

			if (results.data) {
				html += '<pre>' + escapeHtml(JSON.stringify(results.data, null, 2)) + '</pre>';
			}

			html += '</div>';
			resultsDiv.innerHTML = html;
		}

		function exportResults() {
			vscode.postMessage({
				command: 'export',
				results: currentResults
			});
		}

		function escapeHtml(text) {
			const map = {
				'&': '&amp;',
				'<': '&lt;',
				'>': '&gt;',
				'"': '&quot;',
				"'": '&#039;'
			};
			return text.replace(/[&<>"']/g, m => map[m as keyof typeof map]);
		}
	</script>
</body>
</html>`;
}

function clearResults() {
	analysisResults = {};
	vscode.window.showInformationMessage('Results cleared');
}

async function runGraphify(args: string[]): Promise<any> {
	return new Promise((resolve, reject) => {
		const graphifyCmd = process.platform === 'win32' ? 'graphify.exe' : 'graphify';
		
		// Try to find graphify in the PATH or in the local Python environment
		cp.exec(`${graphifyCmd} ${args.join(' ')}`, (error, stdout, stderr) => {
			if (error) {
				// If graphify not found in PATH, try from python environment
				if (error.message.includes('not recognized') || error.message.includes('not found')) {
					reject(new Error('Graphify is not installed or not in PATH. Please install it first.'));
					return;
				}
				reject(new Error(`Graphify error: ${stderr || error.message}`));
				return;
			}

			try {
				// Try to parse JSON output if available
				if (args.includes('--output') && args.includes('json')) {
					const result = JSON.parse(stdout);
					resolve(result);
				} else {
					resolve({ output: stdout });
				}
			} catch (parseError) {
				resolve({ output: stdout });
			}
		});
	});
}

class GraphifyResultsProvider implements vscode.TreeDataProvider<GraphifyResultItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<GraphifyResultItem | undefined | null | void> = new vscode.EventEmitter<GraphifyResultItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<GraphifyResultItem | undefined | null | void> = this._onDidChangeTreeData.event;

	getTreeItem(element: GraphifyResultItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: GraphifyResultItem): Thenable<GraphifyResultItem[]> {
		if (!element) {
			if (Object.keys(analysisResults).length === 0) {
				return Promise.resolve([
					new GraphifyResultItem('No results', vscode.TreeItemCollapsibleState.None)
				]);
			}

			const items: GraphifyResultItem[] = [];
			if (analysisResults.file) {
				items.push(new GraphifyResultItem(`File: ${analysisResults.file}`, vscode.TreeItemCollapsibleState.Collapsed));
			}
			if (analysisResults.workspace) {
				items.push(new GraphifyResultItem(`Workspace: ${analysisResults.workspace}`, vscode.TreeItemCollapsibleState.Collapsed));
			}
			return Promise.resolve(items);
		}

		return Promise.resolve([]);
	}
}

class GraphifyResultItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState
	) {
		super(label, collapsibleState);
	}
}

export function deactivate() {
	console.log('Graphify extension is now deactivated');
}

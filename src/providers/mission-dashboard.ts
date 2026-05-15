import * as vscode from 'vscode';
import { missionManager } from '../mission/manager';

export class MissionDashboardProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'pivot':
                    vscode.window.showInformationMessage(`Pivot requested: ${data.value}`);
                    // Here we would send a message to the active chat agent
                    break;
                case 'approve':
                    if (missionManager.controller) {
                        const result = await missionManager.controller.approveBlueprint();
                        this.updateDashboard();
                        vscode.window.showInformationMessage(result);
                    }
                    break;
                case 'checkpoint':
                    if (missionManager.controller) {
                        const result = await missionManager.controller.checkpointTask(data.taskId, data.status);
                        this.updateDashboard();
                        vscode.window.showInformationMessage(result);
                    }
                    break;
            }
        });

        this.updateDashboard();
    }

    public updateDashboard() {
        if (!this._view) return;
        
        const state = missionManager.controller?.state;
        this._view.webview.postMessage({
            type: 'updateState',
            state: state
        });
    }

    public logActivity(agent: string, text: string) {
        if (!this._view) return;
        this._view.webview.postMessage({
            type: 'log',
            agent: agent,
            text: text
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    color: var(--vscode-foreground);
                    padding: 0;
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                    background-color: var(--vscode-sideBar-background);
                }
                .header {
                    padding: 12px;
                    background-color: var(--vscode-sideBar-border);
                    border-bottom: 1px solid var(--vscode-sideBar-border);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .status-badge {
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 0.75rem;
                    font-weight: bold;
                    text-transform: uppercase;
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                }
                .main {
                    display: flex;
                    flex: 1;
                    overflow: hidden;
                    flex-direction: column;
                }
                .dashboard-top {
                    display: flex;
                    flex: 1;
                    overflow: hidden;
                }
                .roadmap {
                    width: 40%;
                    border-right: 1px solid var(--vscode-sideBar-border);
                    overflow-y: auto;
                    padding: 12px;
                }
                .blueprint {
                    width: 60%;
                    overflow-y: auto;
                    padding: 12px;
                    background-color: var(--vscode-editor-background);
                }
                .agent-log {
                    height: 200px;
                    border-top: 1px solid var(--vscode-sideBar-border);
                    background-color: var(--vscode-editor-background);
                    overflow-y: auto;
                    padding: 8px;
                    font-family: var(--vscode-editor-font-family);
                    font-size: 0.8rem;
                }
                .log-entry {
                    margin-bottom: 4px;
                    display: flex;
                    gap: 8px;
                }
                .log-timestamp {
                    opacity: 0.5;
                    min-width: 60px;
                }
                .log-agent {
                    font-weight: bold;
                    color: var(--vscode-button-foreground);
                }
                .task-item {
                    display: flex;
                    align-items: center;
                    padding: 8px;
                    margin-bottom: 4px;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                .task-item:hover {
                    background-color: var(--vscode-list-hoverBackground);
                }
                .task-item.active {
                    background-color: var(--vscode-list-activeSelectionBackground);
                }
                .task-checkbox {
                    margin-right: 8px;
                    cursor: pointer;
                }
                .task-text {
                    flex: 1;
                    font-size: 0.9rem;
                }
                .task-text.completed {
                    text-decoration: line-through;
                    opacity: 0.6;
                }
                .action-btn {
                    padding: 4px 12px;
                    cursor: pointer;
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    border-radius: 2px;
                    font-size: 0.8rem;
                }
                .action-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                pre {
                    font-family: var(--vscode-editor-font-family);
                    font-size: 0.85rem;
                    white-space: pre-wrap;
                    margin: 0;
                }
                .empty-state {
                    text-align: center;
                    margin-top: 40px;
                    opacity: 0.5;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div id="status" class="status-badge">IDLE</div>
                <button id="approveBtn" class="action-btn" disabled>Approve</button>
            </div>
            <div class="main">
                <div class="dashboard-top">
                    <div class="roadmap" id="roadmap">
                        <div class="empty-state">No active mission. Use @pi-manager to start one.</div>
                    </div>
                    <div class="blueprint" id="blueprint">
                        <div class="empty-state">Select a task to view its blueprint.</div>
                    </div>
                </div>
                <div class="agent-log" id="agentLog">
                    <div class="empty-state">Waiting for agent activity...</div>
                </div>
            </div>
            <script>
                const vscode = acquireVsCodeApi();
                let currentState = null;
                let selectedTaskId = null;

                window.addEventListener('message', event => {
                    const message = event.data;
                    if (message.type === 'updateState') {
                        currentState = message.state;
                        render();
                    } else if (message.type === 'log') {
                        addLogEntry(message.agent, message.text);
                    }
                });

                function addLogEntry(agent, text) {
                    const logEl = document.getElementById('agentLog');
                    if (logEl.querySelector('.empty-state')) {
                        logEl.innerHTML = '';
                    }
                    const entry = document.createElement('div');
                    entry.className = 'log-entry';
                    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    entry.innerHTML = \`
                        <span class="log-timestamp">\${now}</span>
                        <span class="log-agent">\${agent}:</span>
                        <span class="log-text">\${text}</span>
                    \`;
                    logEl.appendChild(entry);
                    logEl.scrollTop = logEl.scrollHeight;
                }

                function render() {
                    const statusEl = document.getElementById('status');
                    const approveBtn = document.getElementById('approveBtn');
                    const roadmapEl = document.getElementById('roadmap');
                    const blueprintEl = document.getElementById('blueprint');

                    if (!currentState || currentState.status === 'IDLE') {
                        statusEl.innerText = 'IDLE';
                        approveBtn.disabled = true;
                        roadmapEl.innerHTML = '<div class="empty-state">No active mission. Use @pi-manager to start one.</div>';
                        blueprintEl.innerHTML = '<div class="empty-state">Select a task to view its blueprint.</div>';
                        return;
                    }

                    statusEl.innerText = currentState.status;
                    approveBtn.disabled = currentState.status !== 'REVIEWING';

                    // Render Roadmap
                    roadmapEl.innerHTML = '<strong>Roadmap</strong><br><br>';
                    currentState.tasks.forEach(task => {
                        const div = document.createElement('div');
                        div.className = 'task-item' + (selectedTaskId === task.id ? ' active' : '');
                        div.innerHTML = \`
                            <input type="checkbox" class="task-checkbox" \${task.completed ? 'checked' : ''} />
                            <span class="task-text \${task.completed ? 'completed' : ''}">\${task.id}: \${task.text}</span>
                        \`;
                        div.onclick = () => selectTask(task.id);
                        div.querySelector('.task-checkbox').onclick = (e) => {
                            e.stopPropagation();
                            vscode.postMessage({ type: 'checkpoint', taskId: task.id, status: task.completed ? 'blocked' : 'completed' });
                        };
                        roadmapEl.appendChild(div);
                    });

                    // Render Blueprint
                    if (selectedTaskId) {
                        const task = currentState.tasks.find(t => t.id === selectedTaskId);
                        if (task) {
                            blueprintEl.innerHTML = \`<strong>Blueprint: \${task.id}</strong><br><br><pre>\${task.blueprint || 'No blueprint defined yet.'}</pre>\`;
                        }
                    } else {
                        blueprintEl.innerHTML = '<div class="empty-state">Select a task to view its blueprint.</div>';
                    }
                }

                function selectTask(id) {
                    selectedTaskId = id;
                    render();
                }

                approveBtn.onclick = () => vscode.postMessage({ type: 'approve' });
            </script>
        </body>
        </html>
        `;
    }
}

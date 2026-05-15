import * as vscode from 'vscode';
import { PiSessionManager } from './pi/session';
import { SidebarProvider } from './providers/sidebar';
import { StatusBarManager } from './providers/status-bar';
import { SettingsPanel } from './providers/settings-panel';

import { DiffManager, DiffContentProvider } from './providers/diff';
import { CheckpointManager } from './providers/checkpoint';
import { missionManager } from './mission/manager';
import { PiChatParticipants } from './providers/chat-participants';
import { MissionDashboardProvider } from './providers/mission-dashboard';
import { MissionGatekeeper } from './mission/gatekeeper';

let piSession: PiSessionManager | undefined;

export async function activate(context: vscode.ExtensionContext) {
    const outputChannel = vscode.window.createOutputChannel('Pi Agent');
    outputChannel.appendLine('Pi Agent extension activating...');

    try {
        piSession = new PiSessionManager(outputChannel);
        await piSession.initialize();

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
        missionManager.initialize(workspaceFolder);

        const diffContentProvider = new DiffContentProvider();
        const checkpointManager = new CheckpointManager();
        const statusBar = new StatusBarManager(piSession);

        const diffManager = new DiffManager(piSession, checkpointManager);
        const sidebarProvider = new SidebarProvider(
            context.extensionUri, piSession, diffManager, checkpointManager, outputChannel,
        );

        const chatParticipants = new PiChatParticipants(piSession);
        await chatParticipants.register(context);

        const dashboardProvider = new MissionDashboardProvider(context.extensionUri);

        // Setup global log dispatcher to connect Agents to the Dashboard
        (global as any).piMissionLog = (agent: string, text: string) => {
            dashboardProvider.logActivity(agent, text);
        };

        // Install the Mission Gatekeeper
        piSession.setToolApprovalHandler(async (toolCallId, toolName, args) => {
            const status = missionManager.controller?.state.status || 'IDLE';
            const { allowed, reason } = MissionGatekeeper.shouldAllowTool(toolName, status);
            
            if (!allowed) {
                vscode.window.showErrorMessage(`🚫 Tool Blocked: ${reason}`);
                return false;
            }
            return true;
        });

        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider('pi-mission-control.chat', sidebarProvider),
            vscode.window.registerWebviewViewProvider('pi-mission-control.dashboard', dashboardProvider),
            vscode.workspace.registerTextDocumentContentProvider('pi-diff', diffContentProvider),
            statusBar,

            diffManager,
            checkpointManager,
            outputChannel,

            vscode.commands.registerCommand('pi-mission-control.newChat', async () => {
                await piSession?.newSession();
                sidebarProvider.sendStateSync();
                dashboardProvider.updateDashboard();
            }),

            vscode.commands.registerCommand('pi-mission-control.abort', async () => {
                await piSession?.abort();
            }),

            vscode.commands.registerCommand('pi-mission-control.selectModel', async () => {
                await piSession?.showModelPicker();
                sidebarProvider.sendStateSync();
                dashboardProvider.updateDashboard();
            }),

            vscode.commands.registerCommand('pi-mission-control.toggleThinking', async () => {
                const level = piSession?.cycleThinkingLevel();
                if (level) {
                    vscode.window.showInformationMessage(`Thinking level: ${level}`);
                }
                sidebarProvider.sendStateSync();
                dashboardProvider.updateDashboard();
            }),

            vscode.commands.registerCommand('pi-mission-control.focusChat', () => {
                vscode.commands.executeCommand('pi-mission-control.chat.focus');
            }),

            vscode.commands.registerCommand('pi-mission-control.openSettings', () => {
                SettingsPanel.show(context.extensionUri, context.secrets);
            }),
        );

        outputChannel.appendLine('Pi Agent extension activated.');
    } catch (err: any) {
        outputChannel.appendLine(`Failed to activate: ${err.message}`);
        vscode.window.showErrorMessage(`Pi Agent failed to activate: ${err.message}`);
    }
}

export async function deactivate() {
    await piSession?.dispose();
    await PiSessionManager.disposeGlobal();
}

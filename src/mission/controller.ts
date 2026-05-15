/**
 * Mission Control state management based on Antigravity workflow.
 * This handles the state machine and synchronizes the MISSION_BLUEPRINT.md file.
 */

import * as vscode from 'vscode';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export type MissionStatus = 'IDLE' | 'PLANNING' | 'REVIEWING' | 'EXECUTING' | 'VERIFYING' | 'DONE';

export interface MissionTask {
  id: string;
  text: string;
  completed: boolean;
  blueprint?: string;
}

export interface MissionState {
  status: MissionStatus;
  goal: string;
  tasks: MissionTask[];
  lastUpdated?: number;
}

const BLUEPRINT_FILE = "MISSION_BLUEPRINT.md";

export class MissionController {
    private _state: MissionState = { status: 'IDLE', goal: '', tasks: [] };
    private _workspaceFolder: string;

    constructor(workspaceFolder: string) {
        this._workspaceFolder = workspaceFolder;
        this.loadState();
    }

    get state(): MissionState {
        return this._state;
    }

    setState(state: Partial<MissionState>) {
        this._state = { ...this._state, ...state, lastUpdated: Date.now() };
        this.syncBlueprintFile();
        // In a real MCP implementation, we would notify subscribers here.
    }

    private loadState() {
        try {
            const path = join(this._workspaceFolder, '.pi', 'mission-state.json');
            if (existsSync(path)) {
                const data = JSON.parse(readFileSync(path, 'utf8'));
                this._state = data;
            }
        } catch (e) {
            console.error('Failed to load mission state:', e);
        }
    }

    private saveState() {
        try {
            const path = join(this._workspaceFolder, '.pi', 'mission-state.json');
            writeFileSync(path, JSON.stringify(this._state, null, 2));
        } catch (e) {
            console.error('Failed to save mission state:', e);
        }
    }

    private syncBlueprintFile() {
        if (this._state.status === 'IDLE') return;

        let md = `# Mission Blueprint: ${this._state.goal}\n\n**Status**: ${this._state.status}\n\n`;
        md += `## Tasks\n` + this._state.tasks.map(t => `${t.completed ? '[x]' : '[ ]'} ${t.id}: ${t.text}`).join('\n') + `\n\n`;
        md += `## Details\n` + this._state.tasks.map(t => `### ${t.id}\n${t.blueprint || 'Pending...'}`).join('\n\n');
        
        try {
            writeFileSync(join(this._workspaceFolder, BLUEPRINT_FILE), md);
            this.saveState();
        } catch (e) {
            console.error('Failed to sync blueprint file:', e);
        }
    }

    // MCP Tool implementations
    async startMission(goal: string, tasks: string[]): Promise<string> {
        this.setState({
            status: 'PLANNING',
            goal,
            tasks: tasks.map((t, i) => ({ id: `T${i + 1}`, text: t, completed: false }))
        });
        return `Mission started: ${goal}. Current phase: PLANNING.`;
    }

    async expandTask(taskId: string, details: string): Promise<string> {
        const task = this._state.tasks.find(t => t.id === taskId);
        if (!task) return `Error: Task ${taskId} not found.`;
        
        task.blueprint = details;
        this.setState({ status: 'REVIEWING' });
        return `Blueprint added for ${taskId}. Mission moved to REVIEWING phase.`;
    }

    async approveBlueprint(): Promise<string> {
        if (this._state.status !== 'REVIEWING') {
            return `Error: Mission must be in REVIEWING phase to approve. Current: ${this._state.status}`;
        }
        this.setState({ status: 'EXECUTING' });
        return `Blueprint approved. Mission moved to EXECUTING phase.`;
    }

    async checkpointTask(taskId: string, status: 'completed' | 'blocked', notes?: string): Promise<string> {
        const task = this._state.tasks.find(t => t.id === taskId);
        if (!task) return `Error: Task ${taskId} not found.`;

        task.completed = status === 'completed';
        this.setState({ status: 'VERIFYING' });
        return `Task ${taskId} marked as ${status}. Mission moved to VERIFYING phase for this task.`;
    }

    async finalizeMission(): Promise<string> {
        this.setState({ status: 'DONE' });
        return `Mission finalized successfully.`;
    }

    async pivotPlan(update: string, taskId?: string, newBlueprint?: string): Promise<string> {
        if (taskId && newBlueprint) {
            const task = this._state.tasks.find(t => t.id === taskId);
            if (task) task.blueprint = newBlueprint;
        }
        this.setState({ status: 'REVIEWING' });
        return `Plan pivoted: ${update}. Mission returned to REVIEWING phase.`;
    }
}

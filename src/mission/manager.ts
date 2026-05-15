import { MissionController } from './controller';
import * as vscode from 'vscode';

export class MissionManager {
    private _controller: MissionController | undefined;

    get controller(): MissionController | undefined {
        return this._controller;
    }

    initialize(workspaceFolder: string) {
        this._controller = new MissionController(workspaceFolder);
    }

    dispose() {
        this._controller = undefined;
    }
}

export const missionManager = new MissionManager();

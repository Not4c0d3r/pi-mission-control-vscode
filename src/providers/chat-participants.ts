import * as vscode from 'vscode';
import { PiSessionManager } from '../pi/session';
import { missionManager } from '../mission/manager';

const PERSONA_MODELS: Record<string, { provider: string, modelId: string }> = {
    'manager': { provider: 'anthropic', modelId: 'claude-3-5-sonnet-20240620' },
    'worker': { provider: 'deepseek', modelId: 'deepseek-coder' },
    'verifier': { provider: 'openai', modelId: 'gpt-4o' },
};

export class PiChatParticipants {
    constructor(private piSession: PiSessionManager) {}

    private async switchModel(persona: string) {
        const model = PERSONA_MODELS[persona];
        if (model && this.piSession) {
            try {
                await this.piSession.setModel(model.provider, model.modelId);
            } catch (e) {
                console.error(`Failed to switch to model for ${persona}:`, e);
            }
        }
    }

    async register(context: vscode.ExtensionContext) {
        // Manager Agent: Handles Planning and Coordination
        const managerAgent = vscode.chat.createChatParticipant('pi-mission-control.manager', {
            name: 'Pi Manager',
            description: 'The Mission Commander: Handles planning, blueprints, and orchestration.'
        });

        managerAgent.handleRequest(async (request, context, response, token) => {
            await this.switchModel('manager');
            this.logActivity('Pi Manager', `Processing request: ${request.prompt.substring(0, 50)}...`);
            const prompt = `[PERSONA: MISSION COMMANDER] You are the Manager agent. Your goal is to coordinate the mission using the Antigravity workflow. 
            Use the mc_... tools to manage the blueprint and state. 
            Always start by establishing a clear goal and breaking it into a roadmap.
            
            User Request: ${request.prompt}`;
            
            await this.piSession.prompt(prompt);
            response.markdown(`The Manager is processing your request...`);
        });

        // Worker Agent: Handles Execution
        const workerAgent = vscode.chat.createChatParticipant('pi-mission-control.worker', {
            name: 'Pi Worker',
            description: 'The Execution Specialist: Implements tasks defined in the blueprint.'
        });

        workerAgent.handleRequest(async (request, context, response, token) => {
            await this.switchModel('worker');
            this.logActivity('Pi Worker', `Executing task...`);
            const state = missionManager.controller?.state;
            const prompt = `[PERSONA: WORKER] You are the Worker agent. 
            Current Mission Status: ${state?.status}
            Active Goal: ${state?.goal}
            Tasks: ${JSON.stringify(state?.tasks)}
            
            Focus only on executing the current task. Do not change the plan.
            User Request: ${request.prompt}`;
            
            await this.piSession.prompt(prompt);
            response.markdown(`The Worker is executing the task...`);
        });

        // Verifier Agent: Handles QA and Validation
        const verifierAgent = vscode.chat.createChatParticipant('pi-mission-control.verifier', {
            name: 'Pi Verifier',
            description: 'The Quality Assurance Agent: Validates that tasks are correctly completed.'
        });

        verifierAgent.handleRequest(async (request, context, response, token) => {
            await this.switchModel('verifier');
            this.logActivity('Pi Verifier', `Verifying work...`);
            const prompt = `[PERSONA: VERIFIER] You are the Verifier agent. 
            Your job is to be a professional skeptic. 
            Review the work done by the Worker and find any flaws, edge cases, or bugs.
            Do not mark a task as complete unless you are 100% sure.
            
            User Request: ${request.prompt}`;
            
            await this.piSession.prompt(prompt);
            response.markdown(`The Verifier is analyzing the results...`);
        });

        context.subscriptions.push(managerAgent, workerAgent, verifierAgent);
    }

    private logActivity(agent: string, text: string) {
        (global as any).piMissionLog?.(agent, text);
    }
}

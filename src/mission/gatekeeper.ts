import { MissionStatus } from '../mission/controller';

export enum ToolCategory {
    READ = 'READ',
    WRITE = 'WRITE',
    EXECUTE = 'EXECUTE',
    MISSION = 'MISSION',
    OTHER = 'OTHER'
}

const TOOL_CATEGORY_MAP: Record<string, ToolCategory> = {
    'read_file': ToolCategory.READ,
    'list_files': ToolCategory.READ,
    'grep_search': ToolCategory.READ,
    'write_file': ToolCategory.WRITE,
    'edit_file': ToolCategory.WRITE,
    'delete_file': ToolCategory.WRITE,
    'execute_command': ToolCategory.EXECUTE,
    'mc_start_mission': ToolCategory.MISSION,
    'mc_expand_to_blueprint': ToolCategory.MISSION,
    'mc_approve_blueprint': ToolCategory.MISSION,
    'mc_checkpoint': ToolCategory.MISSION,
    'mc_pivot_plan': ToolCategory.MISSION,
    'mc_finalize_mission': ToolCategory.MISSION,
};

export function getToolCategory(toolName: string): ToolCategory {
    return TOOL_CATEGORY_MAP[toolName] || ToolCategory.OTHER;
}

export class MissionGatekeeper {
    static shouldAllowTool(toolName: string, status: MissionStatus): { allowed: boolean, reason?: string } {
        const category = getToolCategory(toolName);

        // Mission tools are always allowed as they are the only way to change state
        if (category === ToolCategory.MISSION) {
            return { allowed: true };
        }

        // Read-only tools are generally always allowed
        if (category === ToolCategory.READ) {
            return { allowed: true };
        }

        switch (status) {
            case 'IDLE':
            case 'PLANNING':
                return { 
                    allowed: false, 
                    reason: `Execution tools are disabled during ${status} phase. Please complete the plan first.` 
                };
            
            case 'REVIEWING':
                return { 
                    allowed: false, 
                    reason: `The mission is currently in REVIEWING phase. You must approve the blueprint before writing code.` 
                };
            
            case 'EXECUTING':
                return { allowed: true };
            
            case 'VERIFYING':
                // In verifying phase, we allow reads and executes (to run tests), but maybe block writes?
                if (category === ToolCategory.WRITE) {
                    return { 
                        allowed: false, 
                        reason: `The mission is in VERIFYING phase. Please fix the issues identified by the verifier before writing more code.` 
                    };
                }
                return { allowed: true };
            
            case 'DONE':
                return { 
                    allowed: false, 
                    reason: `The mission is marked as DONE. Please start a new mission to make more changes.` 
                };
            
            default:
                return { allowed: true };
        }
    }
}

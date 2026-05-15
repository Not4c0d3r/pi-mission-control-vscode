# 🚀 Pi Mission Control User Guide

Welcome to **Pi Mission Control**, a professional AI orchestration environment for VS Code. This extension implements the **Antigravity workflow**, transforming the AI coding experience from a "Chat-and-Hope" loop into a disciplined, phase-gated engineering process.

---

## 🛠️ Core Concepts

Pi Mission Control introduces a **Manager-Worker-Verifier** triad to ensure maximum reliability and transparency.

### 1. The Personas
Instead of one general agent, you have access to three specialized participants in the chat:

*   **`@pi-manager`**: The Mission Commander. He handles the high-level goal, breaks it down into a roadmap, and manages the mission state. **He is the only agent who should be updating the Blueprint.**
*   **`@pi-worker`**: The Execution Specialist. He implements the tasks defined in the blueprint. He is restricted by "Phase Gates"—he cannot write code unless the Manager's plan is approved.
*   **`@pi-verifier`**: The Professional Skeptic. He reviews the Worker's output, runs tests, and searches for edge cases. He must "sign off" on a task before it can be marked as complete.

### 2. The Antigravity Workflow (The Phases)
The mission moves through strict phases to prevent hallucinations and unplanned deviations:

1.  **PLANNING**: The Manager establishes the goal and the task list.
2.  **REVIEWING**: The Manager expands tasks into detailed blueprints. The user reviews these blueprints. **Execution is blocked during this phase.**
3.  **EXECUTING**: Once the user clicks **Approve**, the Worker begins implementing the tasks.
4.  **VERIFYING**: After a task is "finished," the Verifier checks the work. **Writes are blocked** to ensure the Verifier isn't just "fixing" things as it goes.
5.  **DONE**: The mission is finalized.

---

## 🚀 Getting Started

### Installation
1. Install the `.vsix` file via **Extensions > ... > Install from VSIX...**.
2. Configure your API keys in the **Pi Settings** panel.

### Your First Mission
1.  **Start the Mission**: Open the chat and type:
    `@pi-manager start a mission to implement a new auth system for my API`
2.  **Build the Blueprint**: Ask the manager to expand the tasks:
    `@pi-manager expand task T1 with a detailed implementation plan`
3.  **Approve**: Open the **Pi Mission Control Dashboard** from the Activity Bar and click the **Approve** button.
4.  **Execute**: Tell the worker to start:
    `@pi-worker implement task T1`
5.  **Verify**: Once the worker is done, bring in the verifier:
    `@pi-verifier validate the implementation of T1`

---

## 🖥️ The Dashboard

The Dashboard is your "Flight Deck." It provides:
- **Roadmap**: A visual checklist of the mission. Check/uncheck tasks to move them between `EXECUTING` and `VERIFYING`.
- **Blueprint Viewer**: Click any task to see its approved specification.
- **Phase Indicator**: See exactly which phase the mission is in (e.g., `REVIEWING`).
- **Agent Log**: A real-time audit trail showing which agent is currently active and what they are doing.

---

## ⚠️ The Gatekeeper (Tool Blocking)

You will occasionally see a message: `🚫 Tool Blocked: The mission is currently in REVIEWING phase...`

**This is a feature, not a bug.** The Gatekeeper prevents the AI from acting impulsively. If the agent is blocked, it means the mission state needs to change (e.g., you need to approve the plan) before the agent can proceed.

---

## 🛠️ Advanced: Self-Evolution

Pi can still extend itself. If `@pi-worker` realizes it needs a new tool, it can write a new `.ts` file to your `~/.pi/agent/extensions` folder. You will see this activity in the **Agent Log** on the dashboard.

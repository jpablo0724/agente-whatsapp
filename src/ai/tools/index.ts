import type Anthropic from "@anthropic-ai/sdk";
import { clientifyToolDefinitions, runClientifyTool } from "./clientify.js";
import { memoryToolDefinitions, runMemoryTool } from "./memory.js";

export const allToolDefinitions: Anthropic.Tool[] = [...clientifyToolDefinitions, ...memoryToolDefinitions];

const memoryToolNames = new Set(memoryToolDefinitions.map((t) => t.name));

export function runTool(name: string, input: Record<string, unknown>, conversationId: number): Promise<string> {
	if (memoryToolNames.has(name)) return runMemoryTool(name, input, conversationId);
	return runClientifyTool(name, input);
}

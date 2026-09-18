import type Anthropic from "@anthropic-ai/sdk";
import { saveMemory } from "../../db/schema.js";
import { notifyOwnerForConfirmation } from "../../admin/owner.js";

export const memoryToolDefinitions: Anthropic.Tool[] = [
	{
		name: "guardar_aprendizaje",
		description: `Guarda algo que aprendiste en esta conversación para usarlo en futuras conversaciones
(un precio que se confirmó, una pregunta nueva que te explicaron, una política del negocio, una
corrección que te hicieron, etc.). Usala cada vez que aprendas algo útil y duradero — no hace
falta que te lo pidan.

Marcá "importante" = true cuando el dato, si estuviera mal, se repetiría a MUCHOS clientes y
podría costar caro (precios, políticas, promesas del negocio). En ese caso el dato NO se usa
todavía: se le avisa al dueño y se activa recién cuando lo confirma.

Marcá "importante" = false para datos de bajo riesgo (preferencias de un cliente puntual, una
aclaración menor) — esos se usan de inmediato, sin esperar confirmación.`,
		input_schema: {
			type: "object",
			properties: {
				dato: { type: "string", description: "El hecho a recordar, en una o dos frases, sin ambigüedad." },
				importante: { type: "boolean" },
			},
			required: ["dato", "importante"],
		},
	},
];

export async function runMemoryTool(
	name: string,
	input: Record<string, unknown>,
	conversationId: number,
): Promise<string> {
	if (name !== "guardar_aprendizaje") throw new Error(`Tool desconocida: ${name}`);

	const content = String(input.dato);
	const importante = Boolean(input.importante);

	if (!importante) {
		saveMemory(content, "confirmed", conversationId);
		return "Guardado y disponible desde ya.";
	}

	const memoryId = saveMemory(content, "pending", conversationId);
	await notifyOwnerForConfirmation(memoryId, content);
	return "Guardado, pendiente de confirmación del dueño antes de usarse.";
}

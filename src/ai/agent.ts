import Anthropic from "@anthropic-ai/sdk";
import { env } from "../config/env.js";
import { loadKnowledgeBase } from "../knowledge/store.js";
import { allToolDefinitions, runTool } from "./tools/index.js";

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

function buildSystemPrompt(): string {
	const knowledge = loadKnowledgeBase();
	return `Sos el asistente de WhatsApp del negocio. Respondé siempre en español,
de forma breve, clara y amable, como lo haría una persona del equipo.

Usá SOLO la información de la base de conocimiento de abajo para responder
preguntas sobre el negocio. Si la respuesta no está ahí, decilo con
honestidad y ofrecé escalar la conversación a una persona del equipo —
no inventes precios, políticas ni disponibilidad.

Cuando necesites datos del cliente o registrar algo, usá las
herramientas disponibles (buscar contacto, ver negocios, agregar nota)
en vez de asumir.

Cuando aprendas algo nuevo y útil durante la charla (un precio que se
confirmó, una pregunta que no sabías responder y te explicaron, una
corrección), guardalo con la herramienta guardar_aprendizaje — así la
próxima conversación ya lo sabés, sin que nadie tenga que escribirlo
a mano.

--- BASE DE CONOCIMIENTO ---
${knowledge}`;
}

export interface AgentResult {
	text: string;
	/** true si el agente no tuvo suficiente información y conviene revisión humana */
	needsReview: boolean;
}

export async function runAgent(
	history: { role: "user" | "assistant"; content: string }[],
	conversationId: number,
): Promise<AgentResult> {
	const messages: Anthropic.MessageParam[] = history.map((m) => ({
		role: m.role,
		content: m.content,
	}));

	let needsReview = false;

	// Bucle de tool use: Claude puede pedir usar una o más herramientas antes
	// de dar la respuesta final.
	for (let turn = 0; turn < 5; turn++) {
		const response = await anthropic.messages.create({
			model: env.ANTHROPIC_MODEL,
			max_tokens: 1024,
			system: buildSystemPrompt(),
			tools: allToolDefinitions,
			messages,
		});

		if (response.stop_reason !== "tool_use") {
			const text = response.content
				.filter((block): block is Anthropic.TextBlock => block.type === "text")
				.map((block) => block.text)
				.join("\n");

			if (/no (tengo|encontr[eé]) (esa )?informaci[oó]n|no estoy segur[oa]/i.test(text)) {
				needsReview = true;
			}

			return { text, needsReview };
		}

		messages.push({ role: "assistant", content: response.content });

		const toolResults: Anthropic.ToolResultBlockParam[] = [];
		for (const block of response.content) {
			if (block.type !== "tool_use") continue;
			try {
				const result = await runTool(block.name, block.input as Record<string, unknown>, conversationId);
				toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
			} catch (error) {
				toolResults.push({
					type: "tool_result",
					tool_use_id: block.id,
					content: `Error: ${(error as Error).message}`,
					is_error: true,
				});
			}
		}

		messages.push({ role: "user", content: toolResults });
	}

	return {
		text: "Perdón, tuve un problema para procesar tu mensaje. Ya te va a contactar alguien del equipo.",
		needsReview: true,
	};
}

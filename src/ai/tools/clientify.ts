import type Anthropic from "@anthropic-ai/sdk";
import * as clientify from "../../clientify/api.js";

export const clientifyToolDefinitions: Anthropic.Tool[] = [
	{
		name: "buscar_contacto",
		description: "Busca un contacto en el CRM por su número de teléfono de WhatsApp.",
		input_schema: {
			type: "object",
			properties: {
				telefono: { type: "string", description: "Número de teléfono, ej. 573023287951" },
			},
			required: ["telefono"],
		},
	},
	{
		name: "ver_negocios",
		description: "Lista los negocios (deals) asociados a un contacto del CRM.",
		input_schema: {
			type: "object",
			properties: {
				contacto_id: { type: "number" },
			},
			required: ["contacto_id"],
		},
	},
	{
		name: "agregar_nota",
		description: "Agrega una nota al contacto en el CRM (ej. resumen de la conversación o un pedido puntual).",
		input_schema: {
			type: "object",
			properties: {
				contacto_id: { type: "number" },
				nota: { type: "string" },
			},
			required: ["contacto_id", "nota"],
		},
	},
];

export async function runClientifyTool(name: string, input: Record<string, unknown>): Promise<string> {
	switch (name) {
		case "buscar_contacto": {
			const { results } = await clientify.searchContactsByPhone(String(input.telefono));
			return JSON.stringify(results);
		}
		case "ver_negocios": {
			const { results } = await clientify.getContactDeals(Number(input.contacto_id));
			return JSON.stringify(results);
		}
		case "agregar_nota": {
			await clientify.addNoteToContact(Number(input.contacto_id), String(input.nota));
			return "Nota agregada.";
		}
		default:
			throw new Error(`Tool desconocida: ${name}`);
	}
}

import { env } from "../config/env.js";
import { getOldestPendingMemory, resolveMemory } from "../db/schema.js";
import { sendConversationMessage } from "../clientify/api.js";

/**
 * Le avisa al dueño por WhatsApp que hay un aprendizaje importante
 * esperando confirmación. Usa una conversación fija de Clientify
 * (OWNER_CONVERSATION_ID) — hace falta escribirle una vez al propio
 * número de WhatsApp del negocio para que esa conversación exista en el
 * Team Inbox y tomar su id desde ahí (ver README).
 *
 * Si no está configurada, el aprendizaje igual queda guardado como
 * pendiente — solo que nadie se entera hasta que alguien mire la tabla
 * `memories` a mano.
 */
export async function notifyOwnerForConfirmation(memoryId: number, content: string) {
	if (!env.OWNER_CONVERSATION_ID) {
		console.log(`(sin OWNER_CONVERSATION_ID configurado) Aprendizaje #${memoryId} pendiente: ${content}`);
		return;
	}

	await sendConversationMessage(
		env.OWNER_CONVERSATION_ID,
		`🧠 Aprendí algo nuevo, ¿lo confirmo?\n\n"${content}"\n\nRespondé *sí* para confirmarlo o *no* para descartarlo.`,
	);
}

/**
 * Se llama cuando llega un mensaje en la conversación del dueño. Si hay
 * un aprendizaje pendiente y la respuesta es sí/no, lo resuelve. Devuelve
 * el texto a responder, o null si el mensaje no era una confirmación
 * (para que el llamador decida qué hacer con él).
 */
export function handleOwnerReply(text: string): string | null {
	const pending = getOldestPendingMemory();
	if (!pending) return null;

	const normalized = text.trim().toLowerCase();
	const isYes = /^(s[ií]|confirmo|dale|ok)\b/.test(normalized);
	const isNo = /^(no|descart)/.test(normalized);

	if (!isYes && !isNo) return null;

	resolveMemory(pending.id, isYes ? "confirmed" : "rejected");
	return isYes
		? `Listo, confirmado: "${pending.content}"`
		: `Descartado: "${pending.content}"`;
}

import { db } from "../db/client.js";

/**
 * Marca una respuesta del agente para revisión humana (ej. baja confianza,
 * el cliente pidió hablar con una persona, o el agente no encontró la
 * respuesta en la base de conocimiento).
 */
export function flagForReview(conversationId: number, messageId: number, reason: string) {
	db.prepare(
		"INSERT INTO review_queue (conversation_id, message_id, reason) VALUES (?, ?, ?)",
	).run(conversationId, messageId, reason);
}

export function listPending() {
	return db
		.prepare(
			`SELECT review_queue.id, reason, messages.content AS response, conversations.wa_phone
			 FROM review_queue
			 JOIN messages ON messages.id = review_queue.message_id
			 JOIN conversations ON conversations.id = review_queue.conversation_id
			 WHERE review_queue.status = 'pending'
			 ORDER BY review_queue.created_at DESC`,
		)
		.all();
}

/**
 * Aprobar una corrección la deja lista para sumarse a knowledge/documents
 * (ese paso de "aprender de la corrección" se hace a mano por ahora: se
 * agrega el texto corregido como un nuevo documento o se edita el
 * existente, y el agente lo usa en la próxima conversación).
 */
export function resolveReview(id: number, status: "approved" | "dismissed", correction?: string) {
	db.prepare("UPDATE review_queue SET status = ?, correction = ? WHERE id = ?").run(
		status,
		correction ?? null,
		id,
	);
}

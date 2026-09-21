import { Router } from "express";
import { env } from "../config/env.js";
import { runAgent } from "../ai/agent.js";
import { describeImage } from "../ai/vision.js";
import { transcribeAudio } from "../ai/transcribe.js";
import { getOrCreateConversation, getRecentMessages, saveMessage } from "../db/schema.js";
import { flagForReview } from "../review/queue.js";
import { handleOwnerReply } from "../admin/owner.js";
import { sendConversationMessage } from "./api.js";
import { downloadInboxMedia } from "./media.js";
import type { InboxMessage } from "./types.js";

export const clientifyWebhook = Router();

/**
 * Clientify reenvía acá cada mensaje del canal (ver PATCH
 * /v2/channels/{id}/external-webhook/). No firma las entregas (sin
 * HMAC), así que la única protección es este secreto compartido en la
 * query string, configurado al setear la URL del webhook en Clientify:
 * .../webhook/clientify?secret=...
 *
 * Payload confirmado el 2026-09-20 contra un canal real: es el objeto
 * de mensaje (ver InboxMessage), y el campo que distingue quién lo
 * mandó es `type` — NO `owner_id` (ese queda fijo, es el agente
 * asignado a la conversación, igual en todos los mensajes). Valores de
 * `type` vistos: "incoming" (el cliente) y "owner" (alguien del equipo,
 * incluido este mismo agente al responder).
 */
clientifyWebhook.post("/webhook/clientify", async (req, res) => {
	if (req.query.secret !== env.CLIENTIFY_WEBHOOK_SECRET) {
		res.sendStatus(403);
		return;
	}

	// Responder rápido: es una entrega "best-effort" con corte a los 5s.
	res.sendStatus(200);

	try {
		const message = req.body as InboxMessage;
		console.log("Mensaje recibido de Clientify:", JSON.stringify(message));

		// Evita que el agente se responda a sí mismo: los mensajes que
		// nosotros mandamos por sendConversationMessage también disparan
		// este webhook, pero con type "owner".
		if (message.type !== "incoming") return;

		// La conversación del dueño es un canal aparte, para confirmar
		// aprendizajes por sí/no — no pasa por el agente de cara al cliente.
		if (message.conversation_id === env.OWNER_CONVERSATION_ID) {
			const reply = handleOwnerReply(message.text);
			if (reply) await sendConversationMessage(message.conversation_id, reply);
			return;
		}

		const conversationId = getOrCreateConversation(message.conversation_id);

		let userText: string;

		if (message.media) {
			const { buffer, contentType } = await downloadInboxMedia(message.media);

			if (contentType.startsWith("audio/")) {
				userText = await transcribeAudio(buffer);
				saveMessage(conversationId, "user", "audio", userText);
			} else if (contentType.startsWith("image/")) {
				const mediaType = contentType === "image/png" ? "image/png" : "image/jpeg";
				userText = await describeImage(buffer, mediaType, message.text);
				saveMessage(conversationId, "user", "image", userText);
			} else {
				userText = message.text || "[Adjunto que no pude leer]";
				saveMessage(conversationId, "user", "text", userText);
			}
		} else {
			userText = message.text;
			saveMessage(conversationId, "user", "text", userText);
		}

		const history = getRecentMessages(conversationId);
		const result = await runAgent(history, conversationId);

		const assistantMessageId = saveMessage(conversationId, "assistant", "text", result.text);
		if (result.needsReview) {
			flagForReview(conversationId, assistantMessageId, "El agente no estaba seguro de la respuesta");
		}

		await sendConversationMessage(message.conversation_id, result.text);
	} catch (error) {
		console.error("Error procesando mensaje del inbox de Clientify:", error);
	}
});

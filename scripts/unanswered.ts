/**
 * Lista conversaciones cuyo último mensaje es del cliente ("incoming")
 * y no tiene respuesta nuestra ("owner") desde hace más de N horas.
 *
 * Uso: npx tsx scripts/unanswered.ts [horas=2]
 */
import "dotenv/config";
import { listConversations, listConversationMessages, getContact } from "../src/clientify/api.js";

const hoursThreshold = Number(process.argv[2] ?? 2);
const cutoff = Date.now() - hoursThreshold * 60 * 60 * 1000;

const { results: conversations } = await listConversations({});

const unanswered: { conversationId: number; contactId: number; lastMessage: string; created: string }[] = [];

for (const conv of conversations) {
	const { results: messages } = await listConversationMessages(conv.id);
	if (messages.length === 0) continue;

	// La API los devuelve más nuevo primero.
	const last = messages[0];
	if (last.type !== "incoming") continue;
	if (new Date(last.created).getTime() > cutoff) continue; // todavía dentro de la ventana, no cuenta como "sin responder hace N horas"

	unanswered.push({ conversationId: conv.id, contactId: conv.contact_id, lastMessage: last.text, created: last.created });
}

for (const u of unanswered) {
	const contact = await getContact(u.contactId).catch(() => null);
	const name = contact ? `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim() || "(sin nombre)" : "(?)";
	const phone = contact?.phones?.[0]?.phone ?? "(sin teléfono)";
	console.log(`Conversación ${u.conversationId} — ${name} — ${phone}`);
	console.log(`  Último mensaje (${u.created}): "${u.lastMessage}"`);
}

if (unanswered.length === 0) console.log(`Sin conversaciones sin responder hace más de ${hoursThreshold}h.`);

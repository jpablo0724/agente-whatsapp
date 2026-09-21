/**
 * Lista las conversaciones del Team Inbox y sus mensajes, con el nombre
 * del contacto. Útil para revisar rápido qué llegó sin entrar a Clientify.
 *
 * Uso: npx tsx scripts/check-inbox.ts
 */
import "dotenv/config";
import { listConversations, listConversationMessages, getContact } from "../src/clientify/api.js";

const { results: conversations } = await listConversations({});

for (const conv of conversations) {
	const contact = await getContact(conv.contact_id).catch(() => null);
	const name = contact
		? `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim() || contact.name || `#${conv.contact_id}`
		: `#${conv.contact_id}`;
	const phone = contact?.phones?.[0]?.phone ?? "(sin teléfono)";

	console.log(`\n=== Conversación ${conv.id} — contacto: ${name} — tel: ${phone} — estado: ${conv.status} ===`);

	const { results: messages } = await listConversationMessages(conv.id);
	for (const m of messages.slice().reverse()) {
		console.log(`  [${m.created}] (${m.type}) ${m.text?.slice(0, 200) || "(sin texto / adjunto)"}`);
	}
}

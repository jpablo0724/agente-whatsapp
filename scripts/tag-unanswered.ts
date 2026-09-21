/**
 * "Lista estática" de WhatsApp: la API de Clientify no tiene un recurso
 * de listas (revisé las 156 rutas del OpenAPI, no existe), así que esto
 * arma el equivalente con tags — etiqueta a cada contacto con
 * conversación ABIERTA cuyo último mensaje es del cliente ("incoming")
 * y sigue sin respuesta nuestra hace más de N minutos. La etiqueta es
 * filtrable/exportable desde el propio Clientify.
 *
 * Uso: npx tsx scripts/tag-unanswered.ts [minutos=10] [tag=sin-responder-whatsapp]
 */
import "dotenv/config";
import { listConversations, listConversationMessages, getContact } from "../src/clientify/api.js";
import { env } from "../src/config/env.js";

const minutesThreshold = Number(process.argv[2] ?? 10);
const tagName = process.argv[3] ?? "sin-responder-whatsapp";
const cutoff = Date.now() - minutesThreshold * 60 * 1000;

async function addTag(contactId: number, name: string) {
	const res = await fetch(`${env.CLIENTIFY_API_BASE_URL}/v2/contacts/${contactId}/tags/`, {
		method: "POST",
		headers: { Authorization: `Token ${env.CLIENTIFY_API_KEY}`, "Content-Type": "application/json" },
		body: JSON.stringify({ name }),
	});
	if (!res.ok) throw new Error(`No se pudo etiquetar contacto ${contactId}: ${res.status} ${await res.text()}`);
}

const { results: conversations } = await listConversations({ status: "open" });

const matches: { contactId: number; name: string; phone: string; lastMessage: string; created: string }[] = [];

for (const conv of conversations) {
	if (conv.status !== "open") continue;

	const { results: messages } = await listConversationMessages(conv.id);
	const last = messages[0];
	if (!last || last.type !== "incoming") continue;
	if (new Date(last.created).getTime() > cutoff) continue;

	const contact = await getContact(conv.contact_id).catch(() => null);
	matches.push({
		contactId: conv.contact_id,
		name: contact ? `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim() || "(sin nombre)" : "(?)",
		phone: contact?.phones?.[0]?.phone ?? "(sin teléfono)",
		lastMessage: last.text,
		created: last.created,
	});
}

if (matches.length === 0) {
	console.log(`Sin contactos sin responder hace más de ${minutesThreshold} min. No se etiquetó nada.`);
	process.exit(0);
}

console.log(`Etiquetando ${matches.length} contacto(s) con "${tagName}":\n`);
for (const m of matches) {
	await addTag(m.contactId, tagName);
	console.log(`✓ ${m.name} — ${m.phone} — último mensaje (${m.created}): "${m.lastMessage}"`);
}

import { env } from "../config/env.js";
import type { ClientifyContact, ClientifyDeal, InboxChannel, InboxConversation, InboxMessage } from "./types.js";

/**
 * Cliente HTTP para la API V2 de Clientify (`https://api-plus.clientify.com`).
 * Rutas y forma de los datos confirmadas contra la documentación oficial
 * (`/api/docs/v2/scalar/`) el 2026-09-18. Los endpoints de Team Inbox
 * (channels/conversations/messages) requieren el addon **API Avanzada** de
 * la cuenta y tienen un límite propio de 60 peticiones/minuto.
 */
async function clientifyFetch<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(`${env.CLIENTIFY_API_BASE_URL}${path}`, {
		...init,
		headers: {
			Authorization: `Token ${env.CLIENTIFY_API_KEY}`,
			"Content-Type": "application/json",
			...init?.headers,
		},
	});

	if (!response.ok) {
		throw new Error(`Clientify API error ${response.status}: ${await response.text()}`);
	}

	if (response.status === 204) return undefined as T;
	return response.json() as Promise<T>;
}

// --- Contactos (API Básica) ---

export function searchContactsByPhone(phone: string): Promise<{ results: ClientifyContact[] }> {
	return clientifyFetch(`/v2/contacts/?phone=${encodeURIComponent(phone)}`);
}

export function getContact(id: number): Promise<ClientifyContact> {
	return clientifyFetch(`/v2/contacts/${id}/`);
}

/**
 * Nota: crear el contacto con teléfono requiere `phone_id`, que sale de
 * crear antes un recurso en `/v2/contact_phones/` — no se manda el
 * teléfono como string directo acá. Falta confirmar ese paso contra la
 * cuenta real antes de usarlo en producción.
 */
export function createContact(data: {
	first_name: string;
	last_name?: string;
	phone_id?: number;
}): Promise<ClientifyContact> {
	return clientifyFetch(`/v2/contacts/`, {
		method: "POST",
		body: JSON.stringify(data),
	});
}

export function addNoteToContact(contactId: number, comment: string): Promise<void> {
	return clientifyFetch(`/v2/contacts/${contactId}/note/`, {
		method: "POST",
		body: JSON.stringify({ comment }),
	});
}

export function getContactDeals(contactId: number): Promise<{ results: ClientifyDeal[] }> {
	return clientifyFetch(`/v2/contacts/${contactId}/deals/`);
}

// --- Team Inbox / WhatsApp (API Avanzada) ---

export function listChannels(): Promise<{ results: InboxChannel[] }> {
	return clientifyFetch(`/v2/channels/`);
}

/** Configura (o desactiva con url vacía) el reenvío de mensajes del canal hacia nuestro webhook. */
export function configureChannelWebhook(channelId: number, url: string): Promise<unknown> {
	return clientifyFetch(`/v2/channels/${channelId}/external-webhook/`, {
		method: "PATCH",
		body: JSON.stringify({ external_webhook: url }),
	});
}

export function listConversations(params: {
	channel__id?: number;
	contact__id?: number;
	status?: string;
}): Promise<{ results: InboxConversation[] }> {
	const query = new URLSearchParams(params as Record<string, string>).toString();
	return clientifyFetch(`/v2/conversations/?${query}`);
}

export function listConversationMessages(conversationId: number): Promise<{ results: InboxMessage[] }> {
	return clientifyFetch(`/v2/conversations/${conversationId}/messages/`);
}

export function sendConversationMessage(conversationId: number, message: string): Promise<unknown> {
	return clientifyFetch(`/v2/conversations/${conversationId}/messages/send/`, {
		method: "POST",
		body: JSON.stringify({ message }),
	});
}

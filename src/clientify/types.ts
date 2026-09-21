export interface ClientifyContact {
	id: number;
	first_name?: string;
	last_name?: string;
	name?: string;
	/** Casi siempre null — el teléfono real vive en `phones[]`, no acá. */
	phone?: string;
	phones?: { id: number; phone: string; whatsapp: boolean }[];
}

export interface ClientifyDeal {
	id: number;
	name: string;
	status?: string;
}

export interface InboxMessage {
	id: number;
	text: string;
	/**
	 * Valores confirmados contra un canal real: "incoming" (mensaje del
	 * cliente) y "owner" (alguien del equipo, o nosotros al responder).
	 * Puede haber otros no vistos todavía (ej. mensajes de sistema).
	 */
	type: string;
	media: string | null;
	path: string;
	created: string;
	channel_id: number | null;
	/** Fijo por conversación (el agente/usuario asignado) — no sirve para saber quién mandó ESTE mensaje, para eso usar `type`. */
	owner_id: number | null;
	conversation_id: number;
	contact_id: string;
}

export interface InboxConversation {
	id: number;
	status: string;
	channel_id: number;
	owner_id: number;
	contact_id: number;
}

export interface InboxChannel {
	pk: number;
	name: string;
	type: string;
	source_id: string;
}

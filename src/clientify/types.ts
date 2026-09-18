export interface ClientifyContact {
	id: number;
	first_name?: string;
	last_name?: string;
	name?: string;
	phone?: string;
}

export interface ClientifyDeal {
	id: number;
	name: string;
	status?: string;
}

export interface InboxMessage {
	id: number;
	text: string;
	/** Sin enum documentado por Clientify: se infiere el tipo real descargando `media`. */
	type: string;
	media: string | null;
	path: string;
	created: string;
	channel_id: number | null;
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

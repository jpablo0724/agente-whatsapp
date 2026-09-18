import { db } from "./client.js";

db.exec(`
	CREATE TABLE IF NOT EXISTS conversations (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		clientify_conversation_id INTEGER NOT NULL UNIQUE,
		created_at TEXT NOT NULL DEFAULT (datetime('now'))
	);

	CREATE TABLE IF NOT EXISTS messages (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		conversation_id INTEGER NOT NULL REFERENCES conversations(id),
		role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
		type TEXT NOT NULL CHECK (type IN ('text', 'audio', 'image')),
		content TEXT NOT NULL,
		created_at TEXT NOT NULL DEFAULT (datetime('now'))
	);

	CREATE TABLE IF NOT EXISTS review_queue (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		conversation_id INTEGER NOT NULL REFERENCES conversations(id),
		message_id INTEGER NOT NULL REFERENCES messages(id),
		reason TEXT NOT NULL,
		status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'dismissed')),
		correction TEXT,
		created_at TEXT NOT NULL DEFAULT (datetime('now'))
	);

	-- El "cerebro que se autoalimenta": lo que el agente aprende solo, en
	-- medio de las conversaciones (ver src/ai/tools/memory.ts). Lo de bajo
	-- impacto queda "confirmed" al toque; lo importante queda "pending"
	-- hasta que el dueño lo confirma por WhatsApp (ver src/admin/owner.ts).
	CREATE TABLE IF NOT EXISTS memories (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		content TEXT NOT NULL,
		status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'pending', 'rejected')),
		source_conversation_id INTEGER REFERENCES conversations(id),
		created_at TEXT NOT NULL DEFAULT (datetime('now')),
		confirmed_at TEXT
	);
`);

/** `clientifyConversationId` es el id de la conversación en el Team Inbox de Clientify. */
export function getOrCreateConversation(clientifyConversationId: number): number {
	const existing = db
		.prepare("SELECT id FROM conversations WHERE clientify_conversation_id = ?")
		.get(clientifyConversationId) as { id: number } | undefined;
	if (existing) return existing.id;

	const result = db
		.prepare("INSERT INTO conversations (clientify_conversation_id) VALUES (?)")
		.run(clientifyConversationId);
	return Number(result.lastInsertRowid);
}

export function saveMessage(
	conversationId: number,
	role: "user" | "assistant",
	type: "text" | "audio" | "image",
	content: string,
): number {
	const result = db
		.prepare("INSERT INTO messages (conversation_id, role, type, content) VALUES (?, ?, ?, ?)")
		.run(conversationId, role, type, content);
	return Number(result.lastInsertRowid);
}

export function getRecentMessages(conversationId: number, limit = 20) {
	return db
		.prepare(
			"SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT ?",
		)
		.all(conversationId, limit)
		.reverse() as { role: "user" | "assistant"; content: string }[];
}

// --- Memoria del agente ("el cerebro que se autoalimenta") ---

export function saveMemory(content: string, status: "confirmed" | "pending", sourceConversationId: number): number {
	const result = db
		.prepare(
			`INSERT INTO memories (content, status, source_conversation_id, confirmed_at)
			 VALUES (?, ?, ?, ?)`,
		)
		.run(content, status, sourceConversationId, status === "confirmed" ? new Date().toISOString() : null);
	return Number(result.lastInsertRowid);
}

export function getConfirmedMemories(): { id: number; content: string }[] {
	return db.prepare("SELECT id, content FROM memories WHERE status = 'confirmed'").all() as {
		id: number;
		content: string;
	}[];
}

/** La más antigua primero: así se confirman en el orden en que se aprendieron. */
export function getOldestPendingMemory(): { id: number; content: string } | undefined {
	return db.prepare("SELECT id, content FROM memories WHERE status = 'pending' ORDER BY id ASC LIMIT 1").get() as
		| { id: number; content: string }
		| undefined;
}

export function resolveMemory(id: number, status: "confirmed" | "rejected") {
	db.prepare("UPDATE memories SET status = ?, confirmed_at = ? WHERE id = ?").run(
		status,
		status === "confirmed" ? new Date().toISOString() : null,
		id,
	);
}

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

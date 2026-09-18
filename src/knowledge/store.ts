import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getConfirmedMemories } from "../db/schema.js";

const documentsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "documents");

function loadDocuments(): string {
	const files = readdirSync(documentsDir).filter((file) => file.endsWith(".md"));

	return files
		.map((file) => {
			const content = readFileSync(path.join(documentsDir, file), "utf-8");
			return `--- ${file} ---\n${content}`;
		})
		.join("\n\n");
}

/**
 * Todo lo que el agente sabe: lo que vos escribiste a mano en
 * `documents/` más lo que el agente aprendió solo de conversaciones
 * reales (tabla `memories`, confirmado — ver src/ai/tools/memory.ts).
 *
 * Esto alcanza mientras la base sea chica (hasta unas decenas de
 * entradas). Si crece mucho y empieza a no entrar en el contexto, el
 * siguiente paso es indexar con embeddings (Voyage AI, que es lo que
 * recomienda Anthropic) y traer solo los fragmentos relevantes a cada
 * pregunta en vez de todo el texto.
 */
export function loadKnowledgeBase(): string {
	const documents = loadDocuments();

	const memories = getConfirmedMemories();
	const memoriesBlock = memories.length
		? `--- Aprendido de conversaciones anteriores ---\n${memories.map((m) => `- ${m.content}`).join("\n")}`
		: "";

	return [documents, memoriesBlock].filter(Boolean).join("\n\n");
}

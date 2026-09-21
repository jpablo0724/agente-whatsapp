import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getActiveRules, getAllKnowledgeSources, getConfirmedMemories } from "../db/schema.js";

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

function loadUploadedKnowledge(): string {
	const sources = getAllKnowledgeSources();
	if (!sources.length) return "";

	return `--- Cargado desde el panel de admin ---\n${sources
		.map((s) => `## ${s.title}${s.url ? ` (${s.url})` : ""}\n${s.content}`)
		.join("\n\n")}`;
}

function loadRules(): string {
	const rules = getActiveRules();
	if (!rules.length) return "";

	const decir = rules.filter((r) => r.type === "decir");
	const noDecir = rules.filter((r) => r.type === "no_decir");

	const blocks: string[] = [];
	if (decir.length) blocks.push(`SIEMPRE hay que:\n${decir.map((r) => `- ${r.content}`).join("\n")}`);
	if (noDecir.length) blocks.push(`NUNCA hay que:\n${noDecir.map((r) => `- ${r.content}`).join("\n")}`);

	return `--- REGLAS DEL DUEÑO (tienen prioridad sobre todo lo demás) ---\n${blocks.join("\n\n")}`;
}

/**
 * Todo lo que el agente sabe: lo que vos escribiste a mano en
 * `documents/` más lo que el agente aprendió solo de conversaciones
 * reales (tabla `memories`, confirmado — ver src/ai/tools/memory.ts) más
 * lo que se carga desde el panel de admin (archivos y sitios web, tabla
 * `knowledge_sources`) más las reglas explícitas del dueño (tabla `rules`).
 *
 * Esto alcanza mientras la base sea chica (hasta unas decenas de
 * entradas). Si crece mucho y empieza a no entrar en el contexto, el
 * siguiente paso es indexar con embeddings (Voyage AI, que es lo que
 * recomienda Anthropic) y traer solo los fragmentos relevantes a cada
 * pregunta en vez de todo el texto.
 */
export function loadKnowledgeBase(): string {
	const documents = loadDocuments();
	const uploaded = loadUploadedKnowledge();

	const memories = getConfirmedMemories();
	const memoriesBlock = memories.length
		? `--- Aprendido de conversaciones anteriores ---\n${memories.map((m) => `- ${m.content}`).join("\n")}`
		: "";

	const rules = loadRules();

	// Las reglas del dueño van al final, para que queden más "frescas" en
	// el contexto y el modelo las priorice sobre el resto.
	return [documents, uploaded, memoriesBlock, rules].filter(Boolean).join("\n\n");
}

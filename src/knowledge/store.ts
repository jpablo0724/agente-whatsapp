import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const documentsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "documents");

/**
 * Carga todos los documentos de entrenamiento y los devuelve como un solo
 * bloque de texto para el prompt del agente.
 *
 * Esto alcanza mientras la base de conocimiento sea chica (hasta unas
 * decenas de documentos). Si crece mucho y empieza a no entrar en el
 * contexto, el siguiente paso es indexar los documentos con embeddings
 * (por ejemplo con Voyage AI, que es lo que recomienda Anthropic) y traer
 * solo los fragmentos relevantes a cada pregunta en vez de todo el texto.
 */
export function loadKnowledgeBase(): string {
	const files = readdirSync(documentsDir).filter((file) => file.endsWith(".md"));

	return files
		.map((file) => {
			const content = readFileSync(path.join(documentsDir, file), "utf-8");
			return `--- ${file} ---\n${content}`;
		})
		.join("\n\n");
}

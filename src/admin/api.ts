import { Router } from "express";
import multer from "multer";
import {
	addKnowledgeSource,
	addRule,
	deleteKnowledgeSource,
	deleteRule,
	listKnowledgeSources,
	listRules,
	setRuleActive,
} from "../db/schema.js";

/**
 * API del panel de administración (/admin). Sin login todavía — es para
 * probar. Si esto pasa a producción de verdad hay que ponerle
 * autenticación antes.
 */
export const adminApi = Router();

const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } });

// --- Reglas: qué debe y qué no debe decir el agente ---

adminApi.get("/api/rules", (_req, res) => {
	res.json(listRules());
});

adminApi.post("/api/rules", (req, res) => {
	const { type, content } = req.body as { type?: string; content?: string };
	if (type !== "decir" && type !== "no_decir") {
		return res.status(400).json({ error: "type debe ser 'decir' o 'no_decir'" });
	}
	if (!content || !content.trim()) {
		return res.status(400).json({ error: "Falta content" });
	}
	const id = addRule(type, content.trim());
	res.status(201).json({ id });
});

adminApi.patch("/api/rules/:id", (req, res) => {
	const id = Number(req.params.id);
	const { active } = req.body as { active?: boolean };
	setRuleActive(id, Boolean(active));
	res.json({ ok: true });
});

adminApi.delete("/api/rules/:id", (req, res) => {
	deleteRule(Number(req.params.id));
	res.json({ ok: true });
});

// --- Base de conocimiento: archivos y sitios web ---

adminApi.get("/api/knowledge", (_req, res) => {
	res.json(listKnowledgeSources());
});

adminApi.post("/api/knowledge/file", upload.single("file"), (req, res) => {
	const file = req.file;
	if (!file) return res.status(400).json({ error: "Falta el archivo" });

	const textLike = /\.(txt|md|csv|json)$/i.test(file.originalname);
	if (!textLike) {
		return res.status(400).json({ error: "Por ahora solo se aceptan archivos de texto (.txt, .md, .csv, .json)" });
	}

	const content = file.buffer.toString("utf-8");
	const id = addKnowledgeSource("file", file.originalname, content);
	res.status(201).json({ id });
});

adminApi.post("/api/knowledge/website", async (req, res) => {
	const { url } = req.body as { url?: string };
	if (!url || !/^https?:\/\//i.test(url)) {
		return res.status(400).json({ error: "Falta una url válida (con http:// o https://)" });
	}

	try {
		const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
		if (!response.ok) {
			return res.status(400).json({ error: `El sitio respondió ${response.status}` });
		}
		const html = await response.text();
		const text = htmlToText(html);
		if (!text.trim()) {
			return res.status(400).json({ error: "No se pudo extraer texto de esa página" });
		}
		const id = addKnowledgeSource("website", url, text, url);
		res.status(201).json({ id });
	} catch (error) {
		res.status(400).json({ error: `No se pudo leer el sitio: ${(error as Error).message}` });
	}
});

adminApi.delete("/api/knowledge/:id", (req, res) => {
	deleteKnowledgeSource(Number(req.params.id));
	res.json({ ok: true });
});

/** Extracción de texto simple, sin dependencias: saca scripts/estilos y tags, colapsa espacios. */
function htmlToText(html: string): string {
	return html
		.replace(/<script[\s\S]*?<\/script>/gi, " ")
		.replace(/<style[\s\S]*?<\/style>/gi, " ")
		.replace(/<!--[\s\S]*?-->/g, " ")
		.replace(/<\/(p|div|br|li|h[1-6]|tr)>/gi, "\n")
		.replace(/<[^>]+>/g, " ")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/[ \t]+/g, " ")
		.replace(/\n\s*\n+/g, "\n")
		.trim()
		.slice(0, 20_000);
}

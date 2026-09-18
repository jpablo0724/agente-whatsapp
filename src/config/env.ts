import "dotenv/config";
import { z } from "zod";

const schema = z.object({
	PORT: z.coerce.number().default(3000),

	ANTHROPIC_API_KEY: z.string().min(1, "Falta ANTHROPIC_API_KEY"),
	ANTHROPIC_MODEL: z.string().default("claude-sonnet-5"),

	OPENAI_API_KEY: z.string().min(1, "Falta OPENAI_API_KEY"),

	CLIENTIFY_API_KEY: z.string().min(1, "Falta CLIENTIFY_API_KEY"),
	CLIENTIFY_API_BASE_URL: z.string().url().default("https://api-plus.clientify.com"),
	CLIENTIFY_WEBHOOK_SECRET: z.string().min(1, "Falta CLIENTIFY_WEBHOOK_SECRET"),

	// Conversación de Clientify con el dueño del negocio, para avisarle de
	// aprendizajes importantes. Opcional: si no está, esos aprendizajes
	// quedan pendientes igual, solo que sin aviso automático.
	OWNER_CONVERSATION_ID: z.coerce.number().optional(),

	DATABASE_PATH: z.string().default("./data.sqlite"),
});

export const env = schema.parse(process.env);

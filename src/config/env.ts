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

	DATABASE_PATH: z.string().default("./data.sqlite"),
});

export const env = schema.parse(process.env);

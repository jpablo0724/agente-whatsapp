import Anthropic from "@anthropic-ai/sdk";
import { env } from "../config/env.js";

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

type ImageMediaType = "image/jpeg" | "image/png" | "image/webp";

/**
 * Describe una imagen que llegó por WhatsApp usando Claude. Mantiene al
 * agente principal (ai/agent.ts) simple y trabajando siempre con texto:
 * la imagen se convierte en una descripción, y esa descripción entra a la
 * conversación como si fuera un mensaje más del cliente.
 */
export async function describeImage(
	imageBuffer: Buffer,
	mediaType: ImageMediaType,
	caption?: string,
): Promise<string> {
	const response = await anthropic.messages.create({
		model: env.ANTHROPIC_MODEL,
		max_tokens: 300,
		messages: [
			{
				role: "user",
				content: [
					{
						type: "image",
						source: { type: "base64", media_type: mediaType, data: imageBuffer.toString("base64") },
					},
					{
						type: "text",
						text: caption
							? `El cliente mandó esta imagen con el mensaje: "${caption}". Describí en 1-2 frases qué muestra la imagen y cómo se relaciona con el mensaje.`
							: "Describí en 1-2 frases qué muestra esta imagen, en el contexto de una conversación de atención al cliente.",
					},
				],
			},
		],
	});

	return response.content
		.filter((block): block is Anthropic.TextBlock => block.type === "text")
		.map((block) => block.text)
		.join("\n");
}

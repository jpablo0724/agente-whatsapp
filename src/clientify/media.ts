import { env } from "../config/env.js";

/**
 * Descarga un archivo adjunto (audio/imagen) a partir de la URL que viene
 * en el campo `media` de un mensaje del inbox. No hay enum documentado
 * para distinguir audio/imagen por `type`, así que el tipo real se decide
 * acá mismo con el `Content-Type` que devuelve la descarga.
 */
export async function downloadInboxMedia(mediaUrl: string): Promise<{ buffer: Buffer; contentType: string }> {
	const response = await fetch(mediaUrl, {
		headers: { Authorization: `Token ${env.CLIENTIFY_API_KEY}` },
	});
	if (!response.ok) {
		throw new Error(`No se pudo descargar el adjunto (${response.status}): ${mediaUrl}`);
	}

	const buffer = Buffer.from(await response.arrayBuffer());
	const contentType = response.headers.get("content-type") ?? "application/octet-stream";
	return { buffer, contentType };
}

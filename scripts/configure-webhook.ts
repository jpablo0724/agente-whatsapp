/**
 * Configura el reenvío de mensajes del canal de WhatsApp hacia nuestro
 * servidor. Se corre una sola vez (o de nuevo si el canal se apaga solo
 * tras 5 entregas fallidas — ver README).
 *
 * Uso:
 *   npx tsx scripts/configure-webhook.ts https://tu-servidor.com
 */
import { env } from "../src/config/env.js";
import { configureChannelWebhook, listChannels } from "../src/clientify/api.js";

const serverUrl = process.argv[2];
if (!serverUrl) {
	console.error("Uso: npx tsx scripts/configure-webhook.ts https://tu-servidor.com");
	process.exit(1);
}

const { results: channels } = await listChannels();
const whatsappChannel = channels.find((c) => c.type === "whatsapp" || c.type === "whatsapp_lite");

if (!whatsappChannel) {
	console.error("No encontré ningún canal de tipo whatsapp en la cuenta de Clientify. Canales disponibles:");
	console.error(channels.map((c) => `  - ${c.name} (${c.type}, id ${c.pk})`).join("\n"));
	process.exit(1);
}

const webhookUrl = `${serverUrl.replace(/\/$/, "")}/webhook/clientify?secret=${env.CLIENTIFY_WEBHOOK_SECRET}`;
await configureChannelWebhook(whatsappChannel.pk, webhookUrl);

console.log(`Listo: el canal "${whatsappChannel.name}" (id ${whatsappChannel.pk}) reenvía ahora a:`);
console.log(webhookUrl);

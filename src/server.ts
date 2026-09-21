import express from "express";
import { env } from "./config/env.js";
import "./db/schema.js";
import { clientifyWebhook } from "./clientify/webhook.js";

// Red de seguridad: un error que nadie atrapó no debe tirar abajo todo el
// servidor (y con él, la posibilidad de responder a CUALQUIER conversación).
// Esto pasó en producción: Clientify cortó una conexión a mitad de entrega
// ("request aborted") y, al no estar manejado, el proceso entero murió hasta
// que Railway lo reinició solo unos segundos después.
process.on("uncaughtException", (error) => {
	console.error("uncaughtException (el proceso sigue vivo):", error);
});
process.on("unhandledRejection", (error) => {
	console.error("unhandledRejection (el proceso sigue vivo):", error);
});

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
	res.json({ status: "ok" });
});

app.use(clientifyWebhook);

// Error-handling middleware de Express (4 argumentos): atrapa errores como
// un body mal formado o una conexión cortada a mitad de entrega, sin
// crashear el proceso.
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
	console.error("Error en un request (el proceso sigue vivo):", error);
	if (!res.headersSent) res.sendStatus(200);
});

app.listen(env.PORT, () => {
	console.log(`Agente de WhatsApp escuchando en el puerto ${env.PORT}`);
});

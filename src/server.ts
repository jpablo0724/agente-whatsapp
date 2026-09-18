import express from "express";
import { env } from "./config/env.js";
import "./db/schema.js";
import { clientifyWebhook } from "./clientify/webhook.js";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
	res.json({ status: "ok" });
});

app.use(clientifyWebhook);

app.listen(env.PORT, () => {
	console.log(`Agente de WhatsApp escuchando en el puerto ${env.PORT}`);
});

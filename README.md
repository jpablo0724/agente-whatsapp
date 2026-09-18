# agente-whatsapp

Agente que responde mensajes de WhatsApp (texto, audio e imágenes) usando
Claude, integrado con el Team Inbox de Clientify (tu CRM), y con una base
de conocimiento propia que se puede editar en cualquier momento.

## Cómo funciona

Tu WhatsApp ya está conectado como canal dentro del **Team Inbox** de
Clientify. El agente no habla directo con Meta: escucha lo que Clientify
reenvía y responde a través de la propia API de Clientify, que es quien
de verdad entrega el mensaje a WhatsApp.

```
Cliente escribe por WhatsApp
        │
        ▼
   Team Inbox de Clientify (canal WhatsApp ya conectado)
        │  reenvía el mensaje (webhook configurado con scripts/configure-webhook.ts)
        ▼
  src/clientify/webhook.ts   ← recibe el mensaje
        │
        ├─ audio  → src/ai/transcribe.ts   (Whisper → texto)
        ├─ imagen → src/ai/vision.ts       (Claude describe la imagen)
        └─ texto  → directo
        │
        ▼
  src/ai/agent.ts   ← arma el contexto (historial + base de conocimiento)
        │            y llama a Claude, que puede usar tools de Clientify
        │            (buscar contacto, ver negocios, agregar nota)
        ▼
  POST /v2/conversations/{id}/messages/send/   ← Clientify entrega la
                                                   respuesta por WhatsApp
```

## Base de conocimiento ("entrenar" al agente)

Editá o agregá archivos `.md` en `src/knowledge/documents/` — eso es todo.
El agente los carga automáticamente y responde en base a ellos. No
responde con información que no esté documentada ahí (evita que invente
precios o políticas).

## Mejora continua ("autoaprendizaje" supervisado)

Cuando el agente no está seguro de una respuesta, la conversación queda
en `review_queue` (ver `src/review/queue.ts`). Revisando esa cola podés
corregir la respuesta y sumar esa corrección como un nuevo documento en
`src/knowledge/documents/` — así el agente mejora con el tiempo, siempre
con una persona revisando antes de que el cambio quede activo.

## Configuración

1. `npm install`
2. Copiá `.env.example` a `.env` y completá:
   - **CLIENTIFY_API_KEY**: la de tu cuenta (necesita el addon **API
     Avanzada** contratado para poder leer/responder el Team Inbox — sin
     eso los endpoints de conversaciones devuelven 403).
   - **CLIENTIFY_WEBHOOK_SECRET**: inventá cualquier string largo — es
     la única protección del webhook, porque Clientify entrega sin firma.
   - **ANTHROPIC_API_KEY**: de console.anthropic.com
   - **OPENAI_API_KEY**: solo se usa para transcribir audios (Whisper)
3. `npm run dev` para correrlo local. Para que Clientify pueda llegar al
   webhook durante pruebas, exponé el puerto con algo como `ngrok http
   3000`.
4. Una sola vez (o de nuevo si Clientify apaga el canal tras 5 fallos de
   entrega), conectá el canal de WhatsApp a este servidor:
   ```
   npx tsx scripts/configure-webhook.ts https://tu-url-publica
   ```

## Pendiente de confirmar antes de producción

- El **payload exacto** que Clientify manda al webhook no está 100%
  documentado — `src/clientify/webhook.ts` asume que es el objeto de
  mensaje (`InboxMessage`) y lo loguea completo; hay que mirar ese log
  con el primer mensaje real y ajustar si hace falta.
- Cómo distinguir un mensaje **entrante** de uno que **nosotros mismos
  mandamos** (para no entrar en loop respondiéndose a sí mismo) — hoy se
  asume que `owner_id` viene vacío en los entrantes; confirmar con un
  mensaje real.
- `crear_contacto` en `src/clientify/api.ts` existe pero no está
  conectada como tool del agente todavía: crear un contacto con teléfono
  requiere primero crear un recurso en `/v2/contact_phones/` y no está
  probado.
- Dónde va a correr 24/7 (Hostinger, Railway, un VPS, etc.) — todavía no
  definido.

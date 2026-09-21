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

## El cerebro que se autoalimenta (memoria automática)

No hace falta escribir documentos a mano para que el agente aprenda: en
cada conversación, si nota algo útil y duradero, lo guarda solo con la
herramienta `guardar_aprendizaje` (`src/ai/tools/memory.ts`) — un precio
que se confirmó, una pregunta nueva que le explicaron, una corrección.
Eso queda en la tabla `memories` y se suma automáticamente a lo que el
agente sabe (`src/knowledge/store.ts`).

Dos niveles, según el propio agente decida si es importante:

- **Bajo riesgo** (una preferencia puntual, una aclaración menor): se
  guarda y se usa de inmediato, sin pedir nada.
- **Alto riesgo** (precios, políticas — algo que si está mal se repite a
  muchos clientes): queda "pendiente" y **no se usa todavía**. El agente
  le manda un WhatsApp al dueño (`OWNER_CONVERSATION_ID`, ver
  `src/admin/owner.ts`) preguntando si lo confirma; contestando *sí* o
  *no* directamente en esa conversación queda resuelto, sin entrar a
  ningún panel.

Si nunca contestás nada, el aprendizaje simplemente no se usa — nunca se
activa solo.

También queda `review_queue` (`src/review/queue.ts`) para el caso
distinto: cuando el agente ya respondió algo de lo que no estaba seguro,
para poder revisarlo después.

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

## Confirmado contra la cuenta real (2026-09-20)

- El canal de WhatsApp existe (`type: "whatsapp"`) y el payload que
  Clientify manda es efectivamente el objeto `InboxMessage`.
- El campo que distingue quién mandó el mensaje es **`type`**
  (`"incoming"` = cliente, `"owner"` = equipo/nosotros) — **no**
  `owner_id`, que queda fijo por conversación. `src/clientify/webhook.ts`
  ya filtra por `type`.
- Los endpoints `/v2/channels/` y `/v2/conversations/` **exigen** un
  parámetro `?fields=...` (no es opcional como sugiere la doc) —
  `src/clientify/api.ts` ya lo manda en cada llamada.

## Pendiente de confirmar antes de producción

- Todavía no vino ningún mensaje real con **audio o imagen** — el
  formato del campo `media` en esos casos (URL completa vs. relativa,
  si el content-type se puede inferir igual) está sin probar.
- `crear_contacto` en `src/clientify/api.ts` existe pero no está
  conectada como tool del agente todavía: crear un contacto con teléfono
  requiere primero crear un recurso en `/v2/contact_phones/` y no está
  probado.
- Dónde va a correr 24/7 (Hostinger, Railway, un VPS, etc.) — todavía no
  definido.
- `OWNER_CONVERSATION_ID` sin configurar todavía — sin eso, los
  aprendizajes importantes quedan pendientes pero nadie se entera (ver
  sección de arriba).

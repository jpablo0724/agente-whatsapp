import OpenAI from "openai";
import { env } from "../config/env.js";

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

/** Transcribe un audio (nota de voz de WhatsApp) a texto. */
export async function transcribeAudio(audioBuffer: Buffer, filename = "audio.ogg"): Promise<string> {
	const file = new File([audioBuffer], filename);
	const result = await openai.audio.transcriptions.create({
		file,
		model: "whisper-1",
		language: "es",
	});
	return result.text;
}

import type { APIRoute } from "astro";
import { Hono } from "hono";
import { Mistral } from '@mistralai/mistralai';
import * as z from "zod";
import { zValidator } from '@hono/zod-validator'


const MAX_AUDIO_SIZE_MB = 500
const MAX_AUDIO_SIZE_BYTE = MAX_AUDIO_SIZE_MB * 1024 * 1024;

const languageSchema = z.enum([  "en",
  "zh",
  "hi",
  "es",
  "ar",
  "fr",
  "pt",
  "ru",
  "de",
  "ja",
  "ko",
  "it",
  "nl",
  ]).default("ja");

const audioSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size > 0, "音声ファイルが空です")
    .refine(
      (file) => file.size <= MAX_AUDIO_SIZE_BYTE,
      `音声ファイルは${MAX_AUDIO_SIZE_MB}MB以下にしてください`,
    )
    .refine(
      (file) =>
        [
          "audio/wav",
          "audio/x-wav",
          "audio/mpeg",
          "audio/flac",
          "audio/ogg",
          "audio/webm",
        ].includes(file.type),
      "対応していない音声形式です",
    ),
  language: languageSchema,
});

const client = new Mistral({ apiKey: import.meta.env.MISTRAL_API_KEY });

const app = new Hono().basePath('/api/');

app.post('/transcribe',
  zValidator('form', audioSchema),
  async (c) => {
    const { language, file } = c.req.valid("form");

    try {
      const response = await client.audio.transcriptions.complete({
        model: "voxtral-mini-latest",
        file: {
          fileName: file.name,
          content: new Uint8Array(await file.arrayBuffer())
        },
        language: language
      });
      return c.json({
        segments: response.segments,
        text: response.text
      }, 200);
    } catch (e){
      console.error(e);
      return c.text("Transcribe Error", 500);
    };
  });

export const ALL: APIRoute = (context) => app.fetch(context.request);
export type App = typeof app;

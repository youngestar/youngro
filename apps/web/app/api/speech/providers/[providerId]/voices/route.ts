import { NextResponse } from "next/server";

import { VoiceGatewayRequest, normalizeBaseUrl } from "../../shared";
import tencentStaticVoiceTable from "../../../../../../data/tencentVoices.json";
type TencentStaticVoiceRecord = {
  id: number;
  name: string;
  scene: string;
  category: string;
  languages: string[];
  sampleRates: number[];
  emotions: string[];
};

interface VoiceInfoResponse {
  id: string;
  name: string;
  provider: string;
  description?: string;
  previewUrl?: string;
  gender?: string;
  languages?: {
    code: string;
    title: string;
  }[];
  metadata?: Record<string, unknown>;
}

interface ElevenLabsVoiceLanguage {
  code?: string;
  language_code?: string;
  name?: string;
  title?: string;
  language?: string;
}

interface ElevenLabsVoiceResponse {
  voice_id?: string;
  id?: string;
  name?: string;
  category?: string;
  preview_url?: string;
  preview_audio_url?: string;
  labels?: Record<string, unknown> & {
    accent?: string;
    gender?: string;
  };
  languages?: Array<string | ElevenLabsVoiceLanguage>;
}

interface ElevenLabsVoicesPayload {
  voices?: ElevenLabsVoiceResponse[];
  data?: ElevenLabsVoiceResponse[];
}

async function fetchTencentCloudVoices(request: VoiceGatewayRequest) {
  const source = (tencentStaticVoiceTable as TencentStaticVoiceRecord[]) || [];
  const requestedVoiceType =
    request.voiceType === undefined || request.voiceType === null
      ? null
      : Number(request.voiceType);

  const voices: VoiceInfoResponse[] = source
    .filter((entry) =>
      requestedVoiceType !== null && !Number.isNaN(requestedVoiceType)
        ? entry.id === requestedVoiceType
        : true
    )
    .map((entry) => ({
      id: String(entry.id),
      name: entry.name,
      provider: "tencent-cloud-speech",
      description: `${entry.scene} · ${entry.category}`,
      languages: entry.languages?.map((lang) => ({ code: lang, title: lang })),
      metadata: {
        voiceType: entry.id,
        scene: entry.scene,
        category: entry.category,
        sampleRates: entry.sampleRates,
        emotions: entry.emotions,
      },
    }));

  return NextResponse.json({ voices });
}

async function fetchElevenLabsVoices(request: VoiceGatewayRequest) {
  if (!request.apiKey) {
    return NextResponse.json(
      { error: "API key is required for ElevenLabs" },
      { status: 400 }
    );
  }

  const endpoint = `${normalizeBaseUrl(request.baseUrl)}voices`;

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "xi-api-key": request.apiKey,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return NextResponse.json(
        {
          error: "Failed to fetch voices from ElevenLabs",
          status: response.status,
          detail: errorBody,
        },
        { status: response.status }
      );
    }

    const payload = (await response.json()) as ElevenLabsVoicesPayload;
    const rawVoices = payload.voices || payload.data || [];

    const voices: VoiceInfoResponse[] = rawVoices
      .map((voice) => {
        const id = voice.voice_id || voice.id;
        if (!id) return null;
        const languages = Array.isArray(voice.languages)
          ? voice.languages
              .map((lang) => {
                if (typeof lang === "string") {
                  return { code: lang, title: lang };
                }
                if (lang && typeof lang === "object") {
                  const code =
                    lang.code ||
                    lang.language_code ||
                    lang.language ||
                    "unknown";
                  const title = lang.name || lang.title || code;
                  return { code, title };
                }
                return null;
              })
              .filter((lang): lang is { code: string; title: string } =>
                Boolean(lang)
              )
          : undefined;

        return {
          id,
          name: voice.name || id,
          provider: "elevenlabs",
          description: voice.labels?.accent || voice.category,
          previewUrl: voice.preview_url || voice.preview_audio_url,
          gender: voice.labels?.gender,
          languages,
          metadata: {
            category: voice.category,
            labels: voice.labels,
          },
        } satisfies VoiceInfoResponse;
      })
      .filter(Boolean) as VoiceInfoResponse[];

    return NextResponse.json({ voices });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unexpected error while contacting ElevenLabs",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: { providerId: string } | Promise<{ providerId: string }> }
) {
  const { providerId } = await context.params;
  if (!providerId) {
    return NextResponse.json(
      { error: "providerId is required" },
      { status: 400 }
    );
  }

  let body: VoiceGatewayRequest = {};
  try {
    body = (await request.json()) as VoiceGatewayRequest;
  } catch {
    // Ignore, allow empty body for providers that might not need extra data
  }

  switch (providerId) {
    case "elevenlabs":
      return fetchElevenLabsVoices(body);
    case "tencent-cloud-speech":
      return fetchTencentCloudVoices(body);
    default:
      return NextResponse.json(
        {
          error: `Voice listing for provider '${providerId}' is not implemented yet.`,
        },
        { status: 501 }
      );
  }
}

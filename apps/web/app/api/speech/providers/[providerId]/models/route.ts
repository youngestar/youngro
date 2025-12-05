import { NextResponse } from "next/server";

import { VoiceGatewayRequest, normalizeBaseUrl } from "../../shared";

interface ModelInfoResponse {
  id: string;
  name: string;
  provider: string;
  description?: string;
  languages?: { code: string; title: string }[];
  metadata?: Record<string, unknown>;
}

interface ElevenLabsModelItem {
  model_id?: string;
  id?: string;
  name?: string;
  description?: string;
  languages?: Array<{ language_id?: string; name?: string; language?: string }>;
}

interface ElevenLabsModelsPayload {
  models?: ElevenLabsModelItem[];
  data?: ElevenLabsModelItem[];
}

const STATIC_MODEL_PRESETS: Record<string, ModelInfoResponse[]> = {
  "azure-speech": [
    {
      id: "azure-neural-multilingual-v2",
      name: "Neural Multilingual v2",
      provider: "azure-speech",
      description: "Azure 神经网络多语言语音合成",
    },
    {
      id: "azure-neural-standard",
      name: "Neural Standard",
      provider: "azure-speech",
      description: "标准神经网络语音，延迟低",
    },
    {
      id: "azure-fast-lite",
      name: "Fast Lite",
      provider: "azure-speech",
      description: "轻量 TTS，适合实时播报",
    },
  ],
  "tencent-cloud-speech": [
    {
      id: "tencent-standard",
      name: "标准合成",
      provider: "tencent-cloud-speech",
      description: "腾讯云通用标准合成模型",
    },
    {
      id: "tencent-premium-expressive",
      name: "精品情感",
      provider: "tencent-cloud-speech",
      description: "支持多情感调节与高保真音色",
    },
    {
      id: "tencent-bilingual-dual",
      name: "中英双语",
      provider: "tencent-cloud-speech",
      description: "自动感知中英文混读场景",
    },
  ],
  "local-tts": [
    {
      id: "local-fast-vits",
      name: "Fast VITS",
      provider: "local-tts",
      description: "本地推理 VITS，适合实验环境",
    },
    {
      id: "local-fastspeech2",
      name: "FastSpeech 2",
      provider: "local-tts",
      description: "兼容多语言合成，可配合自定义声线",
    },
  ],
};

const DEFAULT_PLACEHOLDER_MODEL: ModelInfoResponse = {
  id: "default",
  name: "默认语音模型",
  provider: "speech-provider",
  description: "当前 Provider 暂未提供模型列表，返回占位项",
};

function respondWithStaticModels(providerId: string) {
  const entries = STATIC_MODEL_PRESETS[providerId]?.map((model) => ({
    ...model,
    provider: providerId,
  }));

  if (entries && entries.length > 0) {
    return NextResponse.json({ models: entries });
  }

  return NextResponse.json({
    models: [
      {
        ...DEFAULT_PLACEHOLDER_MODEL,
        id: `${providerId}-default`,
        provider: providerId,
      },
    ],
  });
}

async function fetchElevenLabsModels(body: VoiceGatewayRequest) {
  if (!body.apiKey) {
    return NextResponse.json(
      { error: "请先在 Provider 中填写 ElevenLabs API Key" },
      { status: 400 }
    );
  }

  const endpoint = `${normalizeBaseUrl(body.baseUrl)}models`;

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "xi-api-key": body.apiKey,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const rawPayload = (await response.json().catch(() => null)) as
      | ElevenLabsModelsPayload
      | ElevenLabsModelItem[]
      | null;

    if (!response.ok) {
      const detail =
        (rawPayload as { error?: string; detail?: string } | null)?.error ||
        response.statusText ||
        "拉取 ElevenLabs 模型失败";
      return NextResponse.json({ error: detail }, { status: response.status });
    }

    const collection = Array.isArray(rawPayload)
      ? rawPayload
      : rawPayload?.models || rawPayload?.data || [];

    const models: ModelInfoResponse[] = (collection || [])
      .map((model) => {
        const id = model.model_id || model.id || model.name;
        if (!id) return null;
        return {
          id,
          name: model.name || id,
          provider: "elevenlabs",
          description: model.description,
          metadata: {
            languages: model.languages?.map(
              (lang) => lang?.language_id || lang?.language || lang?.name
            ),
          },
        } satisfies ModelInfoResponse;
      })
      .filter(Boolean) as ModelInfoResponse[];

    if (!models.length) {
      return NextResponse.json({
        models: [
          {
            ...DEFAULT_PLACEHOLDER_MODEL,
            id: "elevenlabs-default",
            provider: "elevenlabs",
            description: "ElevenLabs 未返回模型列表",
          },
        ],
      });
    }

    return NextResponse.json({ models });
  } catch (error) {
    return NextResponse.json(
      {
        error: "请求 ElevenLabs 模型接口出错",
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
    // ignore malformed body; treat as empty config
  }

  switch (providerId) {
    case "elevenlabs":
      return fetchElevenLabsModels(body);
    case "azure-speech":
    case "tencent-cloud-speech":
    case "local-tts":
      return respondWithStaticModels(providerId);
    default:
      return respondWithStaticModels(providerId);
  }
}

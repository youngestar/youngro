import { NextResponse } from "next/server";

import {
  VoiceGatewayRequest,
  buildTencentClient,
  resolveTencentProjectId,
  resolveTencentVoiceType,
} from "../../shared";

type TextToVoiceRequest = {
  Text: string;
  SessionId: string;
  Volume?: number;
  Speed?: number;
  ProjectId?: number;
  VoiceType?: number;
  SampleRate?: number;
  Codec?: string;
};

type TextToVoiceResponse = {
  Audio?: string;
  SessionId?: string;
};

type TencentTextToVoiceClient = {
  TextToVoice: (params: TextToVoiceRequest) => Promise<TextToVoiceResponse>;
};

interface SpeechSynthesisRequest extends VoiceGatewayRequest {
  text?: string;
  ssmlEnabled?: boolean;
  voiceId?: string;
  voiceMetadata?: Record<string, unknown>;
  pitch?: number;
  rate?: number;
  modelId?: string;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function mapRateToTencent(rate?: number) {
  if (typeof rate !== "number") return undefined;
  const normalized = (rate - 1) * 4; // ≈ [-2, 4]
  return Number(clamp(normalized, -2, 6).toFixed(2));
}

function mapPitchToVolume(pitch?: number) {
  if (typeof pitch !== "number") return undefined;
  const scaled = (pitch / 12) * 10; // pitch slider [-12,12] => volume [-10,10]
  return Number(clamp(scaled, -10, 10).toFixed(2));
}

function ensureSessionId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function synthesizeTencentCloud(body: SpeechSynthesisRequest) {
  if (!body.secretId || !body.secretKey) {
    return NextResponse.json(
      { error: "请填写 SecretId 与 SecretKey" },
      { status: 400 }
    );
  }

  if (!body.text || !body.text.trim()) {
    return NextResponse.json({ error: "请输入待合成文本" }, { status: 400 });
  }

  const voiceType = resolveTencentVoiceType(body, body.voiceMetadata);
  if (voiceType === undefined) {
    return NextResponse.json(
      { error: "当前声线缺少 voiceType 信息，请重新拉取声线列表后重试" },
      { status: 400 }
    );
  }

  try {
    const client = buildTencentClient(body);
    const params: TextToVoiceRequest = {
      Text: body.text,
      SessionId: ensureSessionId(),
      VoiceType: voiceType,
      Codec: "mp3",
      SampleRate: 16000,
    };

    const projectId = resolveTencentProjectId(body.appId);
    if (projectId !== undefined) params.ProjectId = projectId;

    const mappedSpeed = mapRateToTencent(body.rate);
    if (mappedSpeed !== undefined) params.Speed = mappedSpeed;

    const mappedVolume = mapPitchToVolume(body.pitch);
    if (mappedVolume !== undefined) params.Volume = mappedVolume;

    const response = await (
      client as unknown as TencentTextToVoiceClient
    ).TextToVoice(params);

    if (!response?.Audio) {
      return NextResponse.json(
        { error: "腾讯云未返回音频数据" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      audio: response.Audio,
      mimeType: "audio/mpeg",
      format: "mp3",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "请求腾讯云合成失败",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
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

  let body: SpeechSynthesisRequest = {};
  try {
    body = (await request.json()) as SpeechSynthesisRequest;
  } catch {
    // ignore
  }

  switch (providerId) {
    case "tencent-cloud-speech":
      return synthesizeTencentCloud(body);
    default:
      return NextResponse.json(
        { error: `Provider '${providerId}' 合成尚未实现` },
        { status: 501 }
      );
  }
}

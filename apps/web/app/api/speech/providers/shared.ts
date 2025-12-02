import { Client as TencentTtsClient } from "tencentcloud-sdk-nodejs/tencentcloud/services/tts/v20190823/tts_client";

export interface VoiceGatewayRequest {
  apiKey?: string;
  baseUrl?: string;
  secretId?: string;
  secretKey?: string;
  region?: string;
  appId?: string | number;
  voiceType?: number | string;
  websiteType?: string | number;
}

export interface TencentVoiceRecord {
  VoiceType?: number | string;
  VoiceName?: string;
  VoiceGender?: string;
  VoiceLanguage?: string;
  VoiceDescription?: string;
  Tag?: string;
  Languages?: string[];
  LanguageCodes?: string[];
  Language?: string;
  Gender?: string;
  SampleRate?: number;
  VoiceId?: string | number;
  Status?: string | number;
  [key: string]: unknown;
}

export const DEFAULT_ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1/";
export const DEFAULT_TENCENT_REGION = "ap-hongkong";

const WEBSITE_TYPE_ALIASES: Record<string, number> = {
  default: 0,
  international: 1,
};

export function normalizeBaseUrl(input?: string) {
  if (!input) return DEFAULT_ELEVENLABS_BASE_URL;
  try {
    const url = new URL(input);
    return url.href.endsWith("/") ? url.href : `${url.href}/`;
  } catch {
    return DEFAULT_ELEVENLABS_BASE_URL;
  }
}

export function buildTencentClient(request: VoiceGatewayRequest) {
  if (!request.secretId || !request.secretKey) {
    throw new Error("SecretId and SecretKey are required for Tencent Cloud");
  }

  const region = request.region?.trim() || DEFAULT_TENCENT_REGION;

  return new TencentTtsClient({
    credential: {
      secretId: request.secretId,
      secretKey: request.secretKey,
    },
    region,
    profile: {
      httpProfile: {
        endpoint: "tts.tencentcloudapi.com",
      },
    },
  });
}

export function coerceNumber(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
}

export function resolveTencentProjectId(
  input: string | number | undefined | null
): number | undefined {
  if (input === undefined || input === null || `${input}`.trim() === "") {
    return undefined;
  }
  return coerceNumber(input);
}

export function resolveTencentVoiceType(
  request: VoiceGatewayRequest,
  metadata?: Record<string, unknown>
): number | undefined {
  const direct = coerceNumber(request.voiceType);
  if (direct !== undefined) return direct;
  const fromMetadata = coerceNumber(metadata?.voiceType);
  if (fromMetadata !== undefined) return fromMetadata;
  return undefined;
}

export function resolveTencentWebsiteType(
  value: VoiceGatewayRequest["websiteType"]
): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const alias = WEBSITE_TYPE_ALIASES[trimmed.toLowerCase()];
    if (alias !== undefined) return alias;
    return coerceNumber(trimmed);
  }
  return coerceNumber(value);
}

export function normalizeTencentLanguages(voice: TencentVoiceRecord):
  | {
      code: string;
      title: string;
    }[]
  | undefined {
  const codes = new Set<string>();
  const candidates: Array<string | undefined | null> = [];

  if (Array.isArray(voice.Languages)) candidates.push(...voice.Languages);
  if (Array.isArray(voice.LanguageCodes))
    candidates.push(...voice.LanguageCodes);
  candidates.push(
    typeof voice.Language === "string" ? voice.Language : undefined
  );
  candidates.push(
    typeof voice.VoiceLanguage === "string" ? voice.VoiceLanguage : undefined
  );

  for (const entry of candidates) {
    if (!entry) continue;
    const trimmed = entry.trim();
    if (trimmed) codes.add(trimmed);
  }

  if (!codes.size) return undefined;

  return Array.from(codes).map((code) => ({ code, title: code }));
}

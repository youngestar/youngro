import { NextResponse } from "next/server";

import {
  VoiceGatewayRequest,
  buildTencentClient,
  normalizeBaseUrl,
  resolveTencentProjectId,
  resolveTencentWebsiteType,
} from "../../shared";

type DescribeVoicesRequest = {
  ProjectId?: number;
  VoiceType?: number;
  WebsiteType?: number;
};

type TencentClientWithRequest = {
  request: (action: string, params?: unknown) => Promise<unknown>;
};

type DescribeVoicesResponse = {
  Data?: {
    VoiceTypes?: unknown[];
    Voices?: unknown[];
    List?: unknown[];
  };
  VoiceTypes?: unknown[];
  Voices?: unknown[];
};

async function validateTencentCloud(body: VoiceGatewayRequest) {
  if (!body.secretId || !body.secretKey) {
    return NextResponse.json(
      { error: "请填写 SecretId 与 SecretKey" },
      { status: 400 }
    );
  }

  try {
    const client = buildTencentClient(body);
    const params: DescribeVoicesRequest = {};
    const projectId = resolveTencentProjectId(body.appId);
    if (projectId !== undefined) params.ProjectId = projectId;
    const websiteTypeSource =
      body.websiteType === undefined ||
      body.websiteType === null ||
      `${body.websiteType}`.trim() === ""
        ? "default"
        : body.websiteType;
    const websiteType = resolveTencentWebsiteType(websiteTypeSource);
    if (websiteType === undefined) {
      return NextResponse.json(
        {
          error: "Tencent Cloud 凭证校验失败",
          detail: "WebsiteType 格式不正确（可填 0=default, 1=international）",
        },
        { status: 400 }
      );
    }
    params.WebsiteType = websiteType;

    const response = (await (
      client as unknown as TencentClientWithRequest
    ).request("DescribeVoices", params)) as DescribeVoicesResponse;

    const possibleLists = [
      response?.Data?.VoiceTypes,
      response?.Data?.Voices,
      response?.VoiceTypes,
      response?.Voices,
      response?.Data?.List,
    ];

    const total =
      possibleLists.find((entry) => Array.isArray(entry))?.length ?? 0;

    return NextResponse.json({ ok: true, voicesDetected: total });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Tencent Cloud 凭证校验失败",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    );
  }
}

async function validateElevenLabs(body: VoiceGatewayRequest) {
  if (!body.apiKey) {
    return NextResponse.json(
      { error: "请提供 ElevenLabs API Key" },
      { status: 400 }
    );
  }

  const endpoint = `${normalizeBaseUrl(body.baseUrl)}voices`;

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "xi-api-key": body.apiKey,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json(
        {
          error: "ElevenLabs 验证失败",
          detail,
        },
        { status: response.status }
      );
    }

    const payload = (await response.json()) as {
      voices?: unknown[];
      data?: unknown[];
    };
    const total = (payload.voices ?? payload.data ?? []).length ?? 0;
    return NextResponse.json({ ok: true, voicesDetected: total });
  } catch (error) {
    return NextResponse.json(
      {
        error: "调用 ElevenLabs 接口失败",
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

  let body: VoiceGatewayRequest = {};
  try {
    body = (await request.json()) as VoiceGatewayRequest;
  } catch {
    // ignore, allow empty body
  }

  switch (providerId) {
    case "tencent-cloud-speech":
      return validateTencentCloud(body);
    case "elevenlabs":
      return validateElevenLabs(body);
    default:
      return NextResponse.json(
        { error: `Provider '${providerId}' 验证尚未实现` },
        { status: 501 }
      );
  }
}

import { useCallback, useMemo } from "react";

import {
  useProvidersStore,
  type ProviderState,
  type SpeechProviderConfig,
} from "../store/providersStore";
import { useSpeechStore, type VoiceInfo } from "../store/speechStore";
import {
  speechProviderSupportsSSML,
  speechProviderHasManagedModels,
  speechProviderHasManagedVoices,
} from "../data/settings/providers";

interface UseSpeechResourcesArgs {
  providerId?: string;
}

type VoiceStatus = "idle" | "loading" | "success" | "error";

interface SpeechResourcesResult {
  provider: ProviderState | undefined;
  voices: VoiceInfo[] | undefined;
  voicesReady: boolean;
  voicesError: string | null | undefined;
  voiceStatus: VoiceStatus;
  fetchVoices: (
    force?: boolean,
    overrideConfig?: SpeechProviderConfig
  ) => Promise<void>;
  fetchModels: (force?: boolean) => Promise<void>;
  modelsReady: boolean;
  modelsError: string | null | undefined;
  modelsStatus: ProviderState["resources"]["status"];
  supportsSSML: boolean;
  hasManagedModels: boolean;
  hasManagedVoices: boolean;
}

export function useSpeechResources(
  args: UseSpeechResourcesArgs
): SpeechResourcesResult {
  const providerId = args.providerId;
  const provider = useProvidersStore((state) =>
    providerId ? state.registry[providerId] : undefined
  );
  const fetchModelsAction = useProvidersStore((state) => state.fetchModels);

  const voices = useSpeechStore((state) =>
    providerId ? state.availableVoices[providerId] : undefined
  );
  const voiceStatusBucket = useSpeechStore((state) =>
    providerId ? state.voiceStatus[providerId] : undefined
  );
  const fetchVoicesAction = useSpeechStore((state) => state.fetchVoices);
  const voiceStatus = voiceStatusBucket?.status ?? "idle";
  const modelsStatus = provider?.resources.status ?? "idle";
  const modelsError = provider?.resources.error ?? null;
  const voicesError = voiceStatusBucket?.error;

  const fetchModels = useCallback(
    async (force?: boolean) => {
      if (!providerId) return;
      await fetchModelsAction(providerId, force);
    },
    [providerId, fetchModelsAction]
  );

  const fetchVoices = useCallback(
    async (force?: boolean, overrideConfig?: SpeechProviderConfig) => {
      if (!providerId || !provider) return;
      const config = (overrideConfig ??
        provider.config) as SpeechProviderConfig;
      await fetchVoicesAction(providerId, config, { force });
    },
    [providerId, provider, fetchVoicesAction]
  );

  const derived = useMemo(
    () => ({
      supportsSSML: speechProviderSupportsSSML(provider?.meta),
      hasManagedModels: speechProviderHasManagedModels(provider?.meta),
      hasManagedVoices: speechProviderHasManagedVoices(provider?.meta),
    }),
    [provider?.meta]
  );

  return {
    provider,
    voices,
    voicesReady: voiceStatus === "success",
    voicesError,
    voiceStatus,
    fetchVoices,
    fetchModels,
    modelsReady: modelsStatus === "success",
    modelsError,
    modelsStatus,
    ...derived,
  } satisfies SpeechResourcesResult;
}

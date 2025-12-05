import { useMemo } from "react";
import { modulesList, SettingsModuleEntry } from "../data/settings/modules";
import { useConsciousnessStore } from "../store/consciousnessStore";
import {
  useProvidersStore,
  useProvidersHydrate,
} from "../store/providersStore";

export function useModulesList() {
  useProvidersHydrate();
  const { activeProviderId, activeModelId, customModelName } =
    useConsciousnessStore();
  const providers = useProvidersStore((s) => s.registry);

  const isConsciousnessConfigured = useMemo(() => {
    return (
      !!activeProviderId &&
      (!!activeModelId || !!customModelName) &&
      providers[activeProviderId]?.configured
    );
  }, [activeProviderId, activeModelId, customModelName, providers]);

  const isSpeechConfigured = useMemo(() => {
    return Object.values(providers).some(
      (provider) => provider.meta.category === "speech" && provider.configured
    );
  }, [providers]);

  const list = useMemo<SettingsModuleEntry[]>(() => {
    return modulesList.map((module) => {
      if (module.id === "consciousness") {
        return { ...module, configured: isConsciousnessConfigured };
      }
      if (module.id === "speech") {
        return { ...module, configured: isSpeechConfigured };
      }
      return module;
    });
  }, [isConsciousnessConfigured, isSpeechConfigured]);

  return {
    modulesList: list,
  };
}

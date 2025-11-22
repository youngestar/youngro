import { useMemo } from "react";
import { modulesList, SettingsModuleEntry } from "../data/settings/modules";
import { useConsciousnessStore } from "../store/consciousnessStore";
import { useProvidersStore } from "../store/providersStore";

export function useModulesList() {
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

  const list = useMemo<SettingsModuleEntry[]>(() => {
    return modulesList.map((module) => {
      if (module.id === "consciousness") {
        return {
          ...module,
          configured: isConsciousnessConfigured,
        };
      }
      // Future: Add logic for other modules here (speech, hearing, etc.)
      return module;
    });
  }, [isConsciousnessConfigured]);

  return {
    modulesList: list,
  };
}

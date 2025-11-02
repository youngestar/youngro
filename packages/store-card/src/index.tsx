import * as React from "react";
import { create } from "zustand";

// ----- Shared domain types (migrated from app layer) -----
export interface YoungroExtension {
  modules: {
    consciousness: { model: string };
    speech: {
      model: string;
      voice_id: string;
      pitch?: number;
      rate?: number;
      ssml?: boolean;
      language?: string;
    };
    vrm?: { source?: "file" | "url"; file?: string; url?: string };
    live2d?: { source?: "file" | "url"; file?: string; url?: string };
  };
  agents: Record<string, { prompt: string }>;
}

export interface BaseCard {
  name: string;
  nickname?: string;
  version: string;
  description?: string;
  creator?: string;
  notes?: string;
  personality?: string;
  scenario?: string;
  greetings?: string[];
  notesMultilingual?: unknown;
  systemPrompt?: string;
  postHistoryInstructions?: string;
  messageExample?: readonly (readonly string[])[] | string[][];
  tags?: string[];
  extensions?: Record<string, unknown>;
}

export interface YoungroCard extends BaseCard {
  extensions: { youngro: YoungroExtension } & BaseCard["extensions"];
}

export interface CCV3CharacterCardV3 {
  data: {
    name: string;
    character_version?: string;
    description?: string;
    creator?: string;
    creator_notes?: string;
    creator_notes_multilingual?: unknown;
    personality?: string;
    scenario?: string;
    first_mes?: string;
    alternate_greetings?: string[];
    system_prompt?: string;
    post_history_instructions?: string;
    mes_example?: string; // START separated
    tags?: string[];
    extensions?: Record<string, unknown>;
  };
}

function parseMesExample(mes?: string): string[][] | undefined {
  if (!mes) return undefined;
  const parts = mes
    .split("<START>\n")
    .filter(Boolean)
    .map((example) => example.split("\n").filter(Boolean));
  return parts.length ? parts : undefined;
}

export function resolveYoungroExtension(
  card: BaseCard | CCV3CharacterCardV3,
  defaults: {
    consciousnessModel: string;
    speechModel: string;
    speechVoiceId: string;
  }
): YoungroExtension {
  const existing =
    "data" in card
      ? ((card.data.extensions?.["youngro"] as YoungroExtension | undefined) ??
        undefined)
      : ((card.extensions as Record<string, unknown> | undefined)?.[
          "youngro"
        ] as YoungroExtension | undefined);

  return {
    modules: {
      consciousness: {
        model:
          existing?.modules?.consciousness?.model ??
          defaults.consciousnessModel,
      },
      speech: {
        model: existing?.modules?.speech?.model ?? defaults.speechModel,
        voice_id: existing?.modules?.speech?.voice_id ?? defaults.speechVoiceId,
        pitch: existing?.modules?.speech?.pitch,
        rate: existing?.modules?.speech?.rate,
        ssml: existing?.modules?.speech?.ssml,
        language: existing?.modules?.speech?.language,
      },
      vrm: existing?.modules?.vrm,
      live2d: existing?.modules?.live2d,
    },
    agents: existing?.agents ?? {},
  };
}

export function newYoungroCard(
  card: BaseCard | CCV3CharacterCardV3,
  defaults: {
    consciousnessModel: string;
    speechModel: string;
    speechVoiceId: string;
  }
): YoungroCard {
  const ext = resolveYoungroExtension(card, defaults);

  if ("data" in card) {
    const data = card.data;
    return {
      name: data.name,
      version: data.character_version ?? "1.0.0",
      description: data.description ?? "",
      creator: data.creator ?? "",
      notes: data.creator_notes ?? "",
      notesMultilingual: data.creator_notes_multilingual,
      personality: data.personality ?? "",
      scenario: data.scenario ?? "",
      greetings: [data.first_mes, ...(data.alternate_greetings ?? [])].filter(
        Boolean
      ) as string[],
      systemPrompt: data.system_prompt ?? "",
      postHistoryInstructions: data.post_history_instructions ?? "",
      messageExample: parseMesExample(data.mes_example),
      tags: data.tags ?? [],
      extensions: { youngro: ext, ...(data.extensions ?? {}) },
    };
  }

  return {
    ...card,
    extensions: { youngro: ext, ...(card.extensions ?? {}) },
  } as YoungroCard;
}

// ----- Zustand store (generic, optional) -----
export type Card = {
  id: string;
  title: string;
  description?: string;
  createdAt?: number;
};

type CardState = {
  cards: Record<string, Card>;
  upsert: (card: Card) => void;
  remove: (id: string) => void;
  reset: () => void;
};

export const useCardStore = create<CardState>((set) => ({
  cards: {},
  upsert: (card) =>
    set((s) => ({
      cards: { ...s.cards, [card.id]: { ...s.cards[card.id], ...card } },
    })),
  remove: (id) =>
    set((s) => {
      const next = { ...s.cards };
      delete next[id];
      return { cards: next };
    }),
  reset: () => set({ cards: {} }),
}));

export const selectCardById = (id: string) => (s: CardState) => s.cards[id];

// ----- React context store for Youngro cards (migrated) -----
type CardsMap = Record<string, YoungroCard>;

export interface YoungroCardState {
  cards: CardsMap;
  activeCardId: string;
}

export interface YoungroCardActions {
  addCard: (card: YoungroCard | BaseCard | unknown) => string; // unknown for ccv3 input
  removeCard: (id: string) => void;
  getCard: (id: string) => YoungroCard | undefined;
  setActiveCard: (id: string) => void;
}

type YoungroCardContextType = [YoungroCardState, YoungroCardActions];

const YoungroCardContext = React.createContext<YoungroCardContextType | null>(
  null
);

const STORAGE_KEY_CARDS = "youngro-cards";
const STORAGE_KEY_ACTIVE = "youngro-card-active-id";

function loadInitial(): YoungroCardState {
  return { cards: {}, activeCardId: "default" };
}

function persist(state: YoungroCardState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY_CARDS, JSON.stringify(state.cards));
  window.localStorage.setItem(STORAGE_KEY_ACTIVE, state.activeCardId);
}

export function YoungroCardProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = React.useState<YoungroCardState>(() =>
    loadInitial()
  );
  const stateRef = React.useRef(state);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY_CARDS);
      const loadedCards: CardsMap = raw ? JSON.parse(raw) : {};
      const loadedActive =
        window.localStorage.getItem(STORAGE_KEY_ACTIVE) || "";

      if (Object.keys(loadedCards).length > 0) {
        const firstKey = Object.keys(loadedCards)[0] || "default";
        const nextActiveId: string = loadedActive || firstKey;
        setState({
          cards: loadedCards as CardsMap,
          activeCardId: nextActiveId,
        } as YoungroCardState);
      } else {
        // seed default card
        const defaults = {
          consciousnessModel: "gpt-4o",
          speechModel: "eleven_multilingual_v2",
          speechVoiceId: "alloy",
        };
        const base: BaseCard = {
          name: "ReLU",
          version: "1.0.0",
          description: "",
          systemPrompt: "You are ReLU. Be helpful and concise.",
        };
        const card = newYoungroCard(base, defaults);
        setState({ cards: { default: card }, activeCardId: "default" });
      }
    } catch {
      // fallback: keep empty state and let user add
    }
  }, []);

  React.useEffect(() => {
    persist(state);
    stateRef.current = state;
  }, [state]);

  const actions = React.useMemo<YoungroCardActions>(
    () => ({
      addCard: (input: YoungroCard | BaseCard | unknown) => {
        const defaults = {
          consciousnessModel: "gpt-4o",
          speechModel: "eleven_multilingual_v2",
          speechVoiceId: "alloy",
        };
        const maybe = input as Partial<YoungroCard> & {
          extensions?: { youngro?: unknown };
        };
        const card: YoungroCard = maybe.extensions?.youngro
          ? (maybe as YoungroCard)
          : newYoungroCard(input as BaseCard, defaults);
        const id =
          typeof crypto !== "undefined" &&
          typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        setState((prev: YoungroCardState) => ({
          cards: { ...prev.cards, [id]: card },
          activeCardId: prev.activeCardId,
        }));
        return id;
      },
      removeCard: (id: string) => {
        setState((prev: YoungroCardState) => {
          const copy = { ...prev.cards };
          delete copy[id];
          const nextActive =
            prev.activeCardId === id ? "default" : prev.activeCardId;
          return { cards: copy, activeCardId: nextActive };
        });
      },
      getCard: (id: string) => stateRef.current.cards[id],
      setActiveCard: (id: string) => {
        const selected = stateRef.current.cards[id];
        setState((prev: YoungroCardState) => ({ ...prev, activeCardId: id }));
        if (typeof window !== "undefined" && selected) {
          window.dispatchEvent(
            new CustomEvent("youngro-card-activated", {
              detail: { card: selected },
            })
          );
        }
      },
    }),
    []
  );

  const value = React.useMemo<YoungroCardContextType>(
    () => [state, actions],
    [state, actions]
  );

  return (
    <YoungroCardContext.Provider value={value}>
      {children}
    </YoungroCardContext.Provider>
  );
}

export function useYoungroCards() {
  const ctx = React.useContext(YoungroCardContext);
  if (!ctx)
    throw new Error("useYoungroCards must be used within YoungroCardProvider");
  const [state, actions] = ctx;
  const activeCard = state.cards[state.activeCardId];
  return { ...state, activeCard, ...actions };
}

import * as React from "react";
import { create } from "zustand";
import { z } from "zod";

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
  },
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
  },
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
        Boolean,
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
  null,
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
    loadInitial(),
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
            }),
          );
        }
      },
    }),
    [],
  );

  const value = React.useMemo<YoungroCardContextType>(
    () => [state, actions],
    [state, actions],
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

// ---------------- Templates & Composition utilities -----------------

function cleanText(s: string) {
  return s
    .replace(/[\s\u00A0]+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();
}

function trimTo(s: string, n: number) {
  if (s.length <= n) return s;
  return s.slice(0, Math.max(0, n - 1)).trim() + "…";
}

function dedupeLines(lines: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const l of lines.map((x) => cleanText(x)).filter(Boolean)) {
    if (seen.has(l)) continue;
    seen.add(l);
    out.push(l);
  }
  return out;
}

export const DEFAULT_POST_HISTORY_INSTRUCTIONS =
  "在完整阅读对话历史后再回答；优先准确与简洁；信息不足时先澄清。";

export function composeDescription(input: {
  name: string;
  personality?: string;
  scenario?: string;
  tags?: string[];
  description?: string;
}) {
  if (input.description && input.description.trim())
    return cleanText(input.description);
  const traits = (input.personality || "")
    .split(/[，,。\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 2);
  const traitText = traits.length ? traits.join("、") : "专业、可靠";
  const tagText =
    input.tags && input.tags.length
      ? `，擅长${input.tags.slice(0, 3).join("、")}`
      : "";
  const scene = input.scenario ? `，场景：${trimTo(input.scenario, 60)}` : "";
  return cleanText(
    `${input.name} 是一位${traitText}的 AI 助手${tagText}${scene}。`,
  );
}

export function composeSystemPrompt(input: {
  name: string;
  personality?: string;
  scenario?: string;
  systemPrompt?: string;
}) {
  const blocks = [
    `你的身份：${cleanText(input.name)}。`,
    input.personality
      ? `人设/风格：${trimTo(cleanText(input.personality), 220)}`
      : null,
    input.scenario
      ? `工作场景：${trimTo(cleanText(input.scenario), 220)}`
      : null,
    "语言与风格：使用简洁、礼貌、专业的中文回答；必要时分点阐述。",
    "能力与工具：如需外部信息，先澄清再选择检索/函数；不得编造。",
  ].filter(Boolean) as string[];

  if (input.systemPrompt && input.systemPrompt.trim()) {
    blocks.push(`自定义补充：${trimTo(cleanText(input.systemPrompt), 600)}`);
  }
  return dedupeLines(blocks).join("\n");
}

export function composePostHistoryInstructions(
  defaults: string | undefined,
  user: string | undefined,
) {
  const parts = [defaults || DEFAULT_POST_HISTORY_INSTRUCTIONS, user || ""]
    .map((x) => x.trim())
    .filter(Boolean);
  return dedupeLines(parts).join("\n");
}

export type { YoungroCard as TYoungroCard };

// Derive a runtime-ready system prompt from a card.
// Merge base systemPrompt with description/personality/scenario and post-history instructions.
export function getRuntimeSystemPrompt(card: BaseCard | YoungroCard): string {
  const parts: string[] = [];
  if (card.systemPrompt) parts.push(cleanText(card.systemPrompt));
  if (card.description) parts.push(cleanText(card.description));
  if (card.personality)
    parts.push(`人设/风格：${trimTo(cleanText(card.personality), 220)}`);
  if (card.scenario)
    parts.push(`工作场景：${trimTo(cleanText(card.scenario), 220)}`);
  if (card.postHistoryInstructions)
    parts.push(cleanText(card.postHistoryInstructions));
  return dedupeLines(parts).join("\n");
}

// ---------------- Schema & import parsing -----------------

const BaseCardSchema = z.object({
  name: z.string().min(1, "name is required"),
  version: z.string().optional(),
  description: z.string().optional(),
  creator: z.string().optional(),
  notes: z.string().optional(),
  personality: z.string().optional(),
  scenario: z.string().optional(),
  greetings: z.array(z.string()).optional(),
  systemPrompt: z.string().optional(),
  postHistoryInstructions: z.string().optional(),
  messageExample: z.any().optional(),
  tags: z.array(z.string()).optional(),
  extensions: z.record(z.unknown()).optional(),
});

const CCV3DataSchema = z.object({
  name: z.string().min(1, "data.name is required"),
  character_version: z.string().optional(),
  description: z.string().optional(),
  creator: z.string().optional(),
  creator_notes: z.string().optional(),
  creator_notes_multilingual: z.unknown().optional(),
  personality: z.string().optional(),
  scenario: z.string().optional(),
  first_mes: z.string().optional(),
  alternate_greetings: z.array(z.string()).optional(),
  group_only_greetings: z.array(z.string()).optional(),
  system_prompt: z.string().optional(),
  post_history_instructions: z.string().optional(),
  mes_example: z.string().optional(),
  tags: z.array(z.string()).optional(),
  extensions: z.record(z.unknown()).optional(),
});

const CCV3Schema = z.object({ data: CCV3DataSchema });

export function parseImportedCard(
  json: unknown,
): BaseCard | CCV3CharacterCardV3 {
  // Try CCV3 first
  const cc = CCV3Schema.safeParse(json);
  if (cc.success) return cc.data as CCV3CharacterCardV3;
  // Fallback to BaseCard
  const bc = BaseCardSchema.safeParse(json);
  if (bc.success) return bc.data as BaseCard;
  // Compose error message
  const err = cc.error ?? bc.error;
  const issues =
    err?.issues?.map(
      (i: { path: (string | number)[]; message: string }) =>
        `${i.path.join(".")}: ${i.message}`,
    ) ?? [];
  throw new Error(`无效的卡片 JSON：\n${issues.join("\n")}`);
}

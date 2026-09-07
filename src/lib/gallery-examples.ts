import type { PromptParams } from "@/types";
import { DEFAULT_CLIPS } from "@/lib/constants";

export type GalleryFilterId = "all" | "recent" | "personagem" | "item" | "cenario" | "efeito";

export type GalleryExample = {
  id: string;
  name: string;
  cols: number;
  rows: number;
  tags: string[];
  motif: "fox" | "knight" | "trees" | "coins" | "slime" | "crates" | "potions" | "fire" | "robot";
  updatedAt: string;
  prompt: Partial<PromptParams>;
};

export const GALLERY_FILTERS: { id: GalleryFilterId; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "recent", label: "Recentes" },
  { id: "personagem", label: "Personagens" },
  { id: "item", label: "Itens" },
  { id: "cenario", label: "Cenários" },
  { id: "efeito", label: "Efeitos" }
];

export const GALLERY_EXAMPLES: GalleryExample[] = [
  {
    id: "ex-fox",
    name: "Raposa Aventureira",
    cols: 8,
    rows: 8,
    tags: ["personagem", "pixel"],
    motif: "fox",
    updatedAt: "2026-09-07T18:13:00",
    prompt: {
      cols: 8,
      character:
        "uma raposa cartoon laranja e fofa, mantendo tamanho e proporções consistentes em todos os frames, vista lateral no estilo de jogos de plataforma, cores sólidas e pixels do personagem totalmente opacos",
      style: "cartoon 2D pixel, bordas nítidas, sem desfoque",
      fileName: "raposa_aventureira.png"
    }
  },
  {
    id: "ex-knight",
    name: "Cavaleiro",
    cols: 6,
    rows: 6,
    tags: ["personagem", "fantasia"],
    motif: "knight",
    updatedAt: "2026-09-07T17:42:00",
    prompt: {
      cols: 6,
      character:
        "um cavaleiro medieval de armadura prateada e capa vermelha, proporções consistentes, vista lateral de plataforma",
      style: "fantasia 2D plana, bordas nítidas",
      fileName: "cavaleiro.png"
    }
  },
  {
    id: "ex-trees",
    name: "Árvores da Floresta",
    cols: 4,
    rows: 4,
    tags: ["cenário", "natureza"],
    motif: "trees",
    updatedAt: "2026-09-06T21:08:00",
    prompt: {
      cols: 4,
      character: "árvores de floresta pixel art, troncos e copas em variação de tamanho, sem personagem",
      style: "cenário 2D pixel, paleta verde e marrom",
      fileName: "arvores_floresta.png",
      clips: DEFAULT_CLIPS.slice(0, 4).map((c) => ({ ...c }))
    }
  },
  {
    id: "ex-coins",
    name: "Moedas",
    cols: 8,
    rows: 8,
    tags: ["item", "coleta"],
    motif: "coins",
    updatedAt: "2026-09-06T15:20:00",
    prompt: {
      cols: 8,
      character: "moedas de ouro brilhantes em ciclo de rotação, item colecionável de jogo",
      style: "pixel art 2D, brilho nítido",
      fileName: "moedas.png"
    }
  },
  {
    id: "ex-slime",
    name: "Slime",
    cols: 5,
    rows: 5,
    tags: ["inimigo", "pixel"],
    motif: "slime",
    updatedAt: "2026-09-05T11:04:00",
    prompt: {
      cols: 5,
      character: "um slime verde gelatinoso com olhos grandes, inimigo de jogo de plataforma, vista lateral",
      style: "cartoon 2D pixel, bordas nítidas",
      fileName: "slime.png",
      clips: DEFAULT_CLIPS.slice(0, 5).map((c) => ({ ...c }))
    }
  },
  {
    id: "ex-crates",
    name: "Caixotes",
    cols: 4,
    rows: 4,
    tags: ["item", "prop"],
    motif: "crates",
    updatedAt: "2026-09-04T19:30:00",
    prompt: {
      cols: 4,
      character: "caixotes de madeira pixel art, item/prop de cenário, variações intacto e quebrado",
      style: "pixel art 2D, madeira e metal",
      fileName: "caixotes.png",
      clips: DEFAULT_CLIPS.slice(0, 4).map((c) => ({ ...c }))
    }
  },
  {
    id: "ex-potions",
    name: "Poções",
    cols: 6,
    rows: 4,
    tags: ["item", "magia"],
    motif: "potions",
    updatedAt: "2026-09-04T14:12:00",
    prompt: {
      cols: 6,
      character: "frascos de poção mágica em várias cores, item de inventário, brilho suave no líquido",
      style: "fantasia 2D pixel",
      fileName: "pocoes.png",
      clips: DEFAULT_CLIPS.slice(0, 4).map((c) => ({ ...c }))
    }
  },
  {
    id: "ex-fire",
    name: "Fogo",
    cols: 8,
    rows: 4,
    tags: ["efeito", "pixel"],
    motif: "fire",
    updatedAt: "2026-09-03T22:55:00",
    prompt: {
      cols: 8,
      character: "chamas de fogo em ciclo de animação, efeito de jogo sem personagem, transparência no fundo",
      style: "efeito pixel art, laranja e amarelo",
      fileName: "fogo.png",
      clips: DEFAULT_CLIPS.slice(0, 4).map((c) => ({ ...c }))
    }
  },
  {
    id: "ex-robot",
    name: "Robô",
    cols: 6,
    rows: 6,
    tags: ["personagem", "sci-fi"],
    motif: "robot",
    updatedAt: "2026-09-02T09:18:00",
    prompt: {
      cols: 6,
      character: "um robô compacto de metal azul e amarelo, vista lateral de plataforma, proporções consistentes",
      style: "sci-fi 2D pixel, bordas nítidas",
      fileName: "robo.png",
      clips: DEFAULT_CLIPS.slice(0, 6).map((c) => ({ ...c }))
    }
  }
];

export function normalizeTag(tag: string) {
  return tag
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function tagTone(tag: string) {
  const t = normalizeTag(tag);
  if (t.includes("personagem")) return "purple";
  if (t.includes("cenario") || t.includes("natureza")) return "green";
  if (t.includes("item") || t.includes("coleta") || t.includes("prop")) return "blue";
  if (t.includes("efeito") || t.includes("inimigo")) return "orange";
  if (t.includes("fantasia") || t.includes("magia")) return "teal";
  if (t.includes("sci-fi") || t.includes("pixel")) return "slate";
  return "slate";
}

export function matchesGalleryFilter(tags: string[], updatedAt: string, filter: GalleryFilterId) {
  if (filter === "all") return true;
  if (filter === "recent") {
    const t = new Date(updatedAt).getTime();
    if (Number.isNaN(t)) return true;
    return Date.now() - t < 14 * 24 * 60 * 60 * 1000;
  }
  const key = filter === "cenario" ? "cenario" : filter;
  return tags.some((tag) => {
    const n = normalizeTag(tag);
    if (key === "personagem") return n.includes("personagem") || n.includes("inimigo");
    if (key === "item") return n.includes("item") || n.includes("coleta") || n.includes("prop");
    if (key === "cenario") return n.includes("cenario") || n.includes("natureza");
    if (key === "efeito") return n.includes("efeito");
    return n.includes(key);
  });
}

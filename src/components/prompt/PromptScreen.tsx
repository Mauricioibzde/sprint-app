"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  GripVertical,
  ListPlus,
  Plus,
  Search,
  Sparkles,
  Trash2,
  ZoomIn
} from "lucide-react";
import { FoxThumb, SheetPreview } from "@/components/prompt/FoxThumb";
import { useSpriteCut } from "@/context/sprite-cut-context";
import { CLIP_PRESETS, PROMPT_DEFAULTS, canvasFromParams, clampInt, parsePx } from "@/lib/constants";
import { nextClipName } from "@/lib/prompt";

const STYLE_OPTIONS = [
  "cartoon 2D plano, bordas nítidas, sem desfoque",
  "pixel art 16-bit, paleta limitada, pixels nítidos",
  "pixel art 32-bit, sombras suaves, contorno limpo",
  "anime 2D, linhas limpas, cores chapadas"
];

const TIPS = [
  "Use fundo transparente (alpha)",
  "Cores sólidas, sem desfoque",
  "Alinhe o personagem à grade",
  "Não desenhe guias na PNG"
];

export function PromptScreen() {
  const app = useSpriteCut();
  const p = app.promptParams;
  const size = canvasFromParams(p);
  const nRows = Math.max(1, p.clips.length);
  const [gridMode, setGridMode] = useState<"manual" | "auto">("manual");
  const [extraOpen, setExtraOpen] = useState(Boolean(p.extra));
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [presetOpen, setPresetOpen] = useState(false);
  const [presetQuery, setPresetQuery] = useState("");
  const presetPanelRef = useRef<HTMLDivElement | null>(null);
  const locked = gridMode === "auto";
  const atClipLimit = p.clips.length >= 32;

  const filteredPresets = useMemo(() => {
    const q = presetQuery.trim().toLowerCase();
    if (!q) return CLIP_PRESETS;
    return CLIP_PRESETS.filter((preset) => {
      const blob = (preset.name + " " + preset.desc).toLowerCase();
      return blob.includes(q);
    });
  }, [presetQuery]);

  useEffect(() => {
    if (!presetOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (!presetPanelRef.current?.contains(e.target as Node)) setPresetOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPresetOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [presetOpen]);

  const addPreset = (preset: { name: string; desc: string }) => {
    if (atClipLimit) return;
    const name = nextClipName(p, preset.name);
    app.updatePrompt({ clips: [...p.clips, { name, desc: preset.desc }] }, true);
  };

  const commitNum = (key: "cols" | "labelW" | "cellW" | "cellH" | "gutter", raw: string, min: number, max: number) => {
    const n = key === "cols" ? clampInt(raw, min, max, p[key]) : clampInt(parsePx(raw), min, max, p[key]);
    app.updatePrompt({ [key]: n }, true);
  };

  const setRows = (raw: string) => {
    const n = clampInt(raw, 1, 32, nRows);
    if (n === nRows) return;
    let clips = p.clips.slice();
    if (n > clips.length) {
      while (clips.length < n) clips.push({ name: "LINHA " + (clips.length + 1), desc: "" });
    } else {
      clips = clips.slice(0, n);
    }
    app.updatePrompt({ clips }, true);
  };

  const applyAuto = () => {
    setGridMode("auto");
    app.updatePrompt(
      {
        cols: PROMPT_DEFAULTS.cols,
        labelW: PROMPT_DEFAULTS.labelW,
        cellW: PROMPT_DEFAULTS.cellW,
        cellH: PROMPT_DEFAULTS.cellH,
        gutter: PROMPT_DEFAULTS.gutter
      },
      true
    );
  };

  const downloadTxt = () => {
    const blob = new Blob([app.promptText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (p.fileName.replace(/\.png$/i, "") || "spritesheet") + "_prompt.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const styleOptions = STYLE_OPTIONS.includes(p.style) ? STYLE_OPTIONS : [p.style, ...STYLE_OPTIONS];

  return (
    <section className="screen-page prompt-page" id="screen-about">
      <div className="page-head">
        <h2>Prompt</h2>
        <p>Defina personagem e animações, copie o texto e gere a PNG com alpha.</p>
      </div>

      <div className="prompt-layout">
        <div className="prompt-editor">
          <article className="ui-card">
            <header className="sec-head">
              <span className="sec-num">1</span>
              <div>
                <h3>Personagem</h3>
                <p>Nome do arquivo, descrição e estilo visual da spritesheet.</p>
              </div>
            </header>
            <label className="stack-label" htmlFor="param-filename">
              Nome do arquivo
            </label>
            <input className="wide-input" id="param-filename" value={p.fileName} onChange={(e) => app.updatePrompt({ fileName: e.target.value })} />
            <div className="char-grid">
              <div>
                <label className="stack-label" htmlFor="param-character">
                  Descrição do personagem
                </label>
                <textarea className="prompt-box short char-box" id="param-character" value={p.character} onChange={(e) => app.updatePrompt({ character: e.target.value })} />
              </div>
              <figure className="visual-example">
                <FoxThumb />
                <figcaption>Exemplo visual</figcaption>
              </figure>
            </div>
            <label className="stack-label" htmlFor="param-style">
              Estilo visual
            </label>
            <select className="wide-input" id="param-style" value={p.style} onChange={(e) => app.updatePrompt({ style: e.target.value })}>
              {styleOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </article>

          <article className="ui-card">
            <header className="sec-head">
              <span className="sec-num">2</span>
              <div>
                <h3>Grade da spritesheet</h3>
                <p>Canvas, células e folga usados no prompt e no recorte.</p>
              </div>
              <div className="seg mode-seg" role="group" aria-label="Modo da grade">
                <button type="button" className={gridMode === "manual" ? "active" : ""} onClick={() => setGridMode("manual")}>
                  Manual
                </button>
                <button type="button" className={gridMode === "auto" ? "active" : ""} onClick={applyAuto}>
                  <Sparkles size={14} strokeWidth={1.75} /> Automático
                </button>
              </div>
            </header>

            <div className="pair-grid">
              <div className="pair-block">
                <span className="stack-label">Canvas (largura × altura)</span>
                <div className="pair-inputs">
                  <input
                    defaultValue={size.width}
                    key={"w-" + size.width}
                    inputMode="numeric"
                    disabled={locked}
                    aria-label="Canvas largura"
                    onBlur={(e) => {
                      const w = parsePx(e.target.value);
                      if (Number.isNaN(w)) return;
                      const minW = p.labelW + p.cols * 8;
                      const next = Math.max(minW, Math.round(w));
                      app.updatePrompt({ cellW: Math.max(8, Math.round((next - p.labelW) / p.cols)) }, true);
                    }}
                  />
                  <span>×</span>
                  <input
                    defaultValue={size.height}
                    key={"h-" + size.height}
                    inputMode="numeric"
                    disabled={locked}
                    aria-label="Canvas altura"
                    onBlur={(e) => {
                      const h = parsePx(e.target.value);
                      if (Number.isNaN(h)) return;
                      app.updatePrompt({ cellH: Math.max(8, Math.round(Math.max(nRows * 8, h) / nRows)) }, true);
                    }}
                  />
                </div>
              </div>
              <div className="pair-block">
                <span className="stack-label">Grade (colunas × linhas)</span>
                <div className="pair-inputs">
                  <input
                    defaultValue={String(p.cols)}
                    key={"c-" + p.cols}
                    inputMode="numeric"
                    disabled={locked}
                    aria-label="Colunas"
                    onBlur={(e) => commitNum("cols", e.target.value, 1, 32)}
                  />
                  <span>×</span>
                  <input
                    defaultValue={String(nRows)}
                    key={"r-" + nRows}
                    inputMode="numeric"
                    disabled={locked}
                    aria-label="Linhas"
                    onBlur={(e) => setRows(e.target.value)}
                  />
                </div>
              </div>
              <div className="pair-block">
                <span className="stack-label">Célula (largura × altura)</span>
                <div className="pair-inputs">
                  <input
                    defaultValue={p.cellW}
                    key={"cw-" + p.cellW}
                    inputMode="numeric"
                    disabled={locked}
                    aria-label="Célula largura"
                    onBlur={(e) => commitNum("cellW", e.target.value, 8, 4096)}
                  />
                  <span>×</span>
                  <input
                    defaultValue={p.cellH}
                    key={"ch-" + p.cellH}
                    inputMode="numeric"
                    disabled={locked}
                    aria-label="Célula altura"
                    onBlur={(e) => commitNum("cellH", e.target.value, 8, 4096)}
                  />
                </div>
              </div>
            </div>

            <div className="meta-row">
              <label className="meta-chip">
                <span>Folga mínima</span>
                <input
                  defaultValue={p.gutter + " px"}
                  key={"g-" + p.gutter}
                  inputMode="numeric"
                  disabled={locked}
                  onBlur={(e) => commitNum("gutter", e.target.value, 0, 256)}
                />
              </label>
              <div className="meta-chip">
                <span>Linhas</span>
                <strong>{nRows}</strong>
              </div>
              <div className="meta-chip">
                <span>Frames</span>
                <strong>{p.cols * nRows}</strong>
              </div>
              <div className="meta-chip">
                <span>Fundo</span>
                <strong>Alpha 0</strong>
              </div>
              <div className="meta-chip">
                <span>Guias</span>
                <strong>Não desenhar</strong>
              </div>
            </div>
            <p className="hint">
              Canvas = {p.cols} × {p.cellW} por {nRows} × {p.cellH} → {p.cols * p.cellW}×{nRows * p.cellH}. Sem texto na PNG.
            </p>
          </article>

          <article className="ui-card">
            <header className="sec-head">
              <span className="sec-num">3</span>
              <div>
                <h3>Animações por linha</h3>
                <p>Uma linha = um clip. O nome fica no ZIP e no ecrã Animar — não é desenhado na PNG.</p>
              </div>
            </header>
            <div className="clip-preset-bar" ref={presetPanelRef}>
              <button
                type="button"
                className="btn"
                aria-expanded={presetOpen}
                aria-haspopup="listbox"
                disabled={atClipLimit}
                onClick={() => setPresetOpen((v) => !v)}
              >
                <ListPlus size={16} strokeWidth={1.75} /> Adicionar preset
                <ChevronDown size={14} strokeWidth={1.75} className={presetOpen ? "open" : ""} />
              </button>
              {presetOpen ? (
                <div className="clip-preset-panel" role="listbox" aria-label="Presets de animação">
                  <label className="clip-preset-search">
                    <Search size={14} strokeWidth={1.75} />
                    <input
                      value={presetQuery}
                      onChange={(e) => setPresetQuery(e.target.value)}
                      placeholder="Buscar: dash, subir, magia…"
                      aria-label="Buscar preset de animação"
                      autoFocus
                    />
                  </label>
                  <p className="clip-preset-hint">Escolha um preset para criar uma nova linha. Nomes repetidos viram IDLE 2, etc.</p>
                  <div className="clip-preset-grid">
                    {filteredPresets.map((preset) => {
                      const nextName = nextClipName(p, preset.name);
                      const exists = nextName !== preset.name;
                      return (
                        <button
                          type="button"
                          role="option"
                          key={preset.name}
                          className={"clip-preset-chip" + (exists ? " in-list" : "")}
                          disabled={atClipLimit}
                          title={exists ? "Já na lista — adicionar como " + nextName : preset.desc}
                          onClick={() => addPreset(preset)}
                        >
                          <strong>{preset.name}</strong>
                          {exists ? <em>{nextName}</em> : null}
                          <span>{preset.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                  {filteredPresets.length === 0 ? <p className="clip-preset-empty">Nenhum preset encontrado.</p> : null}
                </div>
              ) : null}
            </div>
            <div className="clip-editor">
              {p.clips.map((clip, i) => (
                <div
                  className={"clip-row" + (dragFrom === i ? " dragging" : "")}
                  key={i}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragFrom == null || dragFrom === i) return;
                    const clips = [...p.clips];
                    const [moved] = clips.splice(dragFrom, 1);
                    if (!moved) return;
                    clips.splice(i, 0, moved);
                    app.updatePrompt({ clips }, true);
                    setDragFrom(null);
                  }}
                >
                  <span
                    className="clip-grip"
                    title="Arrastar"
                    draggable
                    onDragStart={() => setDragFrom(i)}
                    onDragEnd={() => setDragFrom(null)}
                  >
                    <GripVertical size={16} strokeWidth={1.75} />
                  </span>
                  <span className="clip-badge">{String(i + 1).padStart(2, "0")}</span>
                  <input
                    className="clip-name-input"
                    value={clip.name}
                    placeholder="Nome"
                    aria-label={"Nome da linha " + (i + 1)}
                    onChange={(e) => {
                      const clips = p.clips.map((c, idx) => (idx === i ? { ...c, name: e.target.value } : c));
                      app.updatePrompt({ clips });
                    }}
                  />
                  <input
                    className="clip-desc-input"
                    value={clip.desc}
                    placeholder="Descrição"
                    aria-label={"Descrição da linha " + (i + 1)}
                    onChange={(e) => {
                      const clips = p.clips.map((c, idx) => (idx === i ? { ...c, desc: e.target.value } : c));
                      app.updatePrompt({ clips });
                    }}
                  />
                  <div className="clip-icons">
                    <button type="button" className="icon-btn" title="Duplicar" disabled={p.clips.length >= 32} onClick={() => app.duplicateClip(i)}>
                      <Copy size={15} strokeWidth={1.75} />
                    </button>
                    <button type="button" className="icon-btn" title="Subir" onClick={() => app.moveClip(i, -1)}>
                      <ChevronUp size={15} strokeWidth={1.75} />
                    </button>
                    <button type="button" className="icon-btn" title="Descer" onClick={() => app.moveClip(i, 1)}>
                      <ChevronDown size={15} strokeWidth={1.75} />
                    </button>
                    <button type="button" className="icon-btn danger" title="Remover" disabled={p.clips.length <= 1} onClick={() => app.removeClip(i)}>
                      <Trash2 size={15} strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="prompt-actions">
              <button type="button" className="btn" onClick={app.addClip}>
                <Plus size={16} strokeWidth={1.75} /> Adicionar linha
              </button>
              <button type="button" className="btn ghost" onClick={app.resetParams}>
                Restaurar padrão
              </button>
            </div>
          </article>

          <article className="ui-card extra-card">
            <button type="button" className="accordion-head" onClick={() => setExtraOpen((v) => !v)} aria-expanded={extraOpen}>
              <span className="sec-num ghost-num">4</span>
              <span>
                <strong>Instruções extras</strong>
                <small>Detalhes opcionais para o gerador</small>
              </span>
              <ChevronDown size={18} strokeWidth={1.75} className={extraOpen ? "open" : ""} />
            </button>
            {extraOpen ? (
              <textarea
                className="prompt-box short"
                id="param-extra"
                placeholder="Ex.: a raposa usa um lenço azul; ataque com a pata da frente."
                value={p.extra}
                onChange={(e) => app.updatePrompt({ extra: e.target.value })}
              />
            ) : null}
          </article>
        </div>

        <aside className="prompt-preview">
          <div className="preview-head">
            <div>
              <span className="eyebrow">Prompt gerado</span>
              <strong>
                {size.width} × {size.height} px
              </strong>
              <p className="hint">
                {p.cols} × {nRows} · {p.cols * nRows} frames
              </p>
            </div>
            <span className="status-pill">
              <i /> Pronto
            </span>
          </div>
          <div className="prompt-code">{app.promptText}</div>
          <button type="button" className="btn primary" onClick={() => void app.copyPrompt()}>
            <Copy size={16} strokeWidth={1.75} /> Copiar prompt
          </button>
          <div className="preview-links">
            <button type="button" className="btn ghost" onClick={() => app.applyPreset()}>
              Aplicar no editor
            </button>
            <button type="button" className="text-link" onClick={downloadTxt}>
              <Download size={14} strokeWidth={1.75} /> Baixar .txt
            </button>
            <button type="button" className="text-link" onClick={() => void app.copyNegative()}>
              Copiar negativo
            </button>
          </div>

          <div className="tips-card">
            <h4>Dicas de qualidade</h4>
            <ul>
              {TIPS.map((tip) => (
                <li key={tip}>
                  <Check size={15} strokeWidth={1.75} /> {tip}
                </li>
              ))}
            </ul>
          </div>

          <div className="example-card">
            <div className="example-head">
              <h4>Exemplo de spritesheet</h4>
              <span className="icon-btn" title="Pré-visualização">
                <ZoomIn size={14} strokeWidth={1.75} />
              </span>
            </div>
            <SheetPreview cols={p.cols} rows={nRows} />
          </div>
        </aside>
      </div>
    </section>
  );
}

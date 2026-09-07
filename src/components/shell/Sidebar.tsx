"use client";

import { useEffect, useState } from "react";
import {
  CirclePlay,
  Copy,
  Crop,
  Download,
  Ellipsis,
  Heart,
  History,
  Layers,
  LayoutGrid,
  Maximize2,
  Moon,
  Plus,
  SlidersHorizontal,
  Sparkles,
  X,
  type LucideIcon
} from "lucide-react";
import { WORKFLOW_STEPS } from "@/lib/constants";
import { useSpriteCut } from "@/context/sprite-cut-context";
import type { ScreenId } from "@/types";

const PRIMARY: { screen: ScreenId; label: string; hint: string; icon: LucideIcon }[] = [
  { screen: "about", label: "Prompt", hint: "Gerar a PNG", icon: Sparkles },
  { screen: "cut", label: "Recortar", hint: "Abrir a spritesheet", icon: Crop },
  { screen: "animate", label: "Animar", hint: "Exportar o clip", icon: CirclePlay }
];

const SECONDARY: { screen: ScreenId; label: string; icon: LucideIcon }[] = [
  { screen: "gallery", label: "Galeria", icon: LayoutGrid },
  { screen: "batch", label: "Lote", icon: Layers },
  { screen: "history", label: "Histórico", icon: History },
  { screen: "settings", label: "Config", icon: SlidersHorizontal }
];

const MOBILE_TABS: { screen: ScreenId; label: string; icon: LucideIcon }[] = [
  { screen: "about", label: "Prompt", icon: Sparkles },
  { screen: "cut", label: "Recortar", icon: Crop },
  { screen: "animate", label: "Animar", icon: CirclePlay },
  { screen: "gallery", label: "Galeria", icon: LayoutGrid }
];

const MOBILE_MORE: { screen: ScreenId; label: string; hint: string; icon: LucideIcon }[] = [
  { screen: "batch", label: "Lote", hint: "Várias sheets de uma vez", icon: Layers },
  { screen: "history", label: "Histórico", hint: "Ações desta sessão", icon: History },
  { screen: "settings", label: "Config", hint: "Preferências", icon: SlidersHorizontal }
];

function TutorialDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="tutorial-layer" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
      <div className="tutorial-card">
        <h3 id="tutorial-title">Como usar o SpriteCut PRO</h3>
        <ol>
          <li>
            <strong>Prompt</strong> — descreva o personagem, ajuste a grade e copie o texto para o gerador de imagens.
          </li>
          <li>
            <strong>Recortar</strong> — abra a PNG com fundo transparente. As guias seguem a grade do prompt.
          </li>
          <li>
            <strong>Animar</strong> — pré-visualize cada linha e exporte ZIP (uma pasta por clip) ou HTML.
          </li>
        </ol>
        <button type="button" className="btn primary" onClick={onClose}>
          Entendi
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const { screen, setScreen, hasImage } = useSpriteCut();
  const [tutorial, setTutorial] = useState(false);

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="brand">
          <div className="brandmark">✦</div>
          <div>
            <h1>
              SpriteCut <span>PRO</span>
            </h1>
            <small>Do prompt ao sprite de jogo</small>
          </div>
        </div>
        <p className="nav-kicker">Criação</p>
        <div className="nav">
          {PRIMARY.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.screen}
                type="button"
                className={"nav-item" + (screen === item.screen ? " active" : "")}
                onClick={() => setScreen(item.screen)}
              >
                <span className="nav-ico">
                  <Icon size={18} strokeWidth={1.75} />
                </span>
                <span className="nav-copy">
                  <span className="nav-main">{item.label}</span>
                  <span className="nav-hint">{item.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="nav-kicker">Geral</p>
        <div className="nav nav-secondary">
          {SECONDARY.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.screen}
                type="button"
                className={"nav-item compact" + (screen === item.screen ? " active" : "")}
                onClick={() => setScreen(item.screen)}
              >
                <span className="nav-ico">
                  <Icon size={16} strokeWidth={1.75} />
                </span>
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="tip guia-card">
        <b>Guia rápido</b>
        <ol className="tip-steps">
          <li>Copie o prompt e gere a PNG com alpha.</li>
          <li>Abra a imagem — a grade aplica-se sozinha.</li>
          <li>Anime cada clip e exporte ZIP ou HTML.</li>
        </ol>
        <button type="button" className="btn tutorial-btn" onClick={() => setTutorial(true)}>
          <CirclePlay size={14} strokeWidth={1.75} /> Ver tutorial
        </button>
        {hasImage ? <span className="tip-ok">Pronto · PNG na sessão</span> : <span className="tip-wait">Ainda sem PNG</span>}
      </div>
      <div className="sidebar-foot">
        <span>v0.1.0</span>
        <Heart size={14} strokeWidth={1.75} />
      </div>
      <TutorialDialog open={tutorial} onClose={() => setTutorial(false)} />
    </aside>
  );
}

export function MobileNav() {
  const { screen, setScreen, hasImage } = useSpriteCut();
  const [moreOpen, setMoreOpen] = useState(false);
  const [tutorial, setTutorial] = useState(false);
  const moreActive = MOBILE_MORE.some((item) => item.screen === screen);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  return (
    <>
      <nav className="mobile-bottom" aria-label="Navegação principal">
        {MOBILE_TABS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.screen}
              type="button"
              className={screen === item.screen ? "active" : ""}
              aria-current={screen === item.screen ? "page" : undefined}
              onClick={() => {
                setMoreOpen(false);
                setScreen(item.screen);
              }}
            >
              <Icon size={20} strokeWidth={1.75} aria-hidden />
              <span>{item.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          className={moreOpen || moreActive ? "active" : ""}
          aria-expanded={moreOpen}
          aria-controls="mobile-more-sheet"
          onClick={() => setMoreOpen((v) => !v)}
        >
          <Ellipsis size={20} strokeWidth={1.75} aria-hidden />
          <span>Mais</span>
        </button>
      </nav>

      {moreOpen ? (
        <div className="mobile-sheet-layer" role="presentation" onClick={() => setMoreOpen(false)}>
          <div
            id="mobile-more-sheet"
            className="mobile-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Mais opções"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mobile-sheet-handle" aria-hidden />
            <div className="mobile-sheet-head">
              <div>
                <strong>SpriteCut PRO</strong>
                <p>{hasImage ? "PNG pronta nesta sessão" : "Ainda sem PNG"}</p>
              </div>
              <button type="button" className="icon-btn" aria-label="Fechar" onClick={() => setMoreOpen(false)}>
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>
            <div className="mobile-sheet-list">
              {MOBILE_MORE.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.screen}
                    type="button"
                    className={"mobile-sheet-item" + (screen === item.screen ? " active" : "")}
                    onClick={() => {
                      setScreen(item.screen);
                      setMoreOpen(false);
                    }}
                  >
                    <span className="nav-ico">
                      <Icon size={18} strokeWidth={1.75} />
                    </span>
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.hint}</small>
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                className="mobile-sheet-item"
                onClick={() => {
                  setMoreOpen(false);
                  setTutorial(true);
                }}
              >
                <span className="nav-ico">
                  <CirclePlay size={18} strokeWidth={1.75} />
                </span>
                <span>
                  <strong>Tutorial</strong>
                  <small>Como ir do prompt ao ZIP</small>
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <TutorialDialog open={tutorial} onClose={() => setTutorial(false)} />
    </>
  );
}

export function TopBar() {
  const {
    page,
    screen,
    hasImage,
    setScreen,
    fileInputRef,
    exportZip,
    exportHtml,
    copyPrompt,
    saveProject,
    pickLibraryFolder,
    libraryName,
    startNewProject
  } = useSpriteCut();

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen();
  };

  return (
    <header className="topbar">
      <div className="mobile-brand">
        <div className="brandmark">✦</div>
        <div className="mobile-brand-copy">
          <strong>
            SpriteCut <span>PRO</span>
          </strong>
          <small>{page.title}</small>
        </div>
      </div>
      <div className="topbar-row">
        <ol className="flow-steps" aria-label="Passos do fluxo">
          {WORKFLOW_STEPS.map((step, i) => {
            const current = screen === step.screen;
            const done = (step.screen === "about" || step.screen === "cut") && hasImage;
            return (
              <li key={step.screen} className={(current ? "current " : "") + (done ? "done" : "")}>
                {i > 0 ? <span className="flow-line" aria-hidden /> : null}
                <button type="button" onClick={() => setScreen(step.screen)}>
                  <span className="flow-n">{step.n}</span>
                  <span className="flow-label">{step.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="actions">
          <button type="button" className="icon-btn desktop-chrome" title="Tema escuro" aria-pressed="true">
            <Moon size={18} strokeWidth={1.75} />
          </button>
          {screen === "about" ? (
            <>
              <button type="button" className="btn ghost desktop-chrome" onClick={() => fileInputRef.current?.click()}>
                Abrir PNG
              </button>
              <button type="button" className="btn ghost desktop-chrome" onClick={() => void saveProject(false)}>
                <Download size={16} strokeWidth={1.75} /> Guardar
              </button>
              <button type="button" className="icon-btn desktop-chrome" title="Ecrã inteiro" onClick={toggleFullscreen}>
                <Maximize2 size={18} strokeWidth={1.75} />
              </button>
              <button type="button" className="btn primary" onClick={() => void copyPrompt()}>
                <Copy size={16} strokeWidth={1.75} /> <span className="btn-label">Copiar prompt</span>
              </button>
            </>
          ) : screen === "animate" ? (
            <>
              <button type="button" className="btn ghost desktop-chrome" onClick={() => void saveProject(false)}>
                <Download size={16} strokeWidth={1.75} /> Guardar
              </button>
              <button type="button" className="btn ghost desktop-chrome" onClick={() => void exportZip()} disabled={!hasImage}>
                ZIP dos clips
              </button>
              <button type="button" className="btn primary" onClick={() => void exportHtml()} disabled={!hasImage}>
                <span className="btn-label">HTML animado</span>
              </button>
            </>
          ) : screen === "gallery" ? (
            <>
              <button type="button" className="btn ghost" onClick={() => void pickLibraryFolder()}>
                <Download size={16} strokeWidth={1.75} />{" "}
                <span className="btn-label">{libraryName ? "Trocar pasta" : "Escolher pasta"}</span>
              </button>
              <button type="button" className="btn primary" onClick={() => startNewProject()}>
                <Plus size={16} strokeWidth={1.75} /> <span className="btn-label">Novo projeto</span>
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn ghost" onClick={() => fileInputRef.current?.click()}>
                <span className="btn-label">{hasImage ? "Trocar PNG" : "Abrir PNG"}</span>
              </button>
              <button type="button" className="btn ghost desktop-chrome" onClick={() => void saveProject(false)}>
                <Download size={16} strokeWidth={1.75} /> Guardar
              </button>
              <button type="button" className="btn primary" onClick={() => void exportZip()} disabled={!hasImage}>
                <span className="btn-label">Exportar ZIP</span>
              </button>
            </>
          )}
        </div>
      </div>
      {screen !== "about" ? (
        <div className="title desktop-title">
          <h2>{page.title}</h2>
          <p>{page.sub}</p>
        </div>
      ) : null}
    </header>
  );
}

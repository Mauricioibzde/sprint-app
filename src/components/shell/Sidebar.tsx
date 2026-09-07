"use client";

import { useState } from "react";
import {
  CirclePlay,
  Copy,
  Crop,
  Download,
  Heart,
  History,
  Layers,
  LayoutGrid,
  Maximize2,
  Moon,
  Plus,
  SlidersHorizontal,
  Sparkles,
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
      {tutorial ? (
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
            <button type="button" className="btn primary" onClick={() => setTutorial(false)}>
              Entendi
            </button>
          </div>
        </div>
      ) : null}
    </aside>
  );
}

export function MobileNav() {
  const { screen, setScreen } = useSpriteCut();
  return (
    <nav className="mobile-bottom">
      <button type="button" className={screen === "about" ? "active" : ""} onClick={() => setScreen("about")}>
        1<span>Prompt</span>
      </button>
      <button type="button" className={screen === "cut" ? "active" : ""} onClick={() => setScreen("cut")}>
        2<span>Recortar</span>
      </button>
      <button type="button" className={screen === "animate" ? "active" : ""} onClick={() => setScreen("animate")}>
        3<span>Animar</span>
      </button>
      <button type="button" className={screen === "gallery" ? "active" : ""} onClick={() => setScreen("gallery")}>
        Galeria
      </button>
      <button type="button" className={screen === "history" ? "active" : ""} onClick={() => setScreen("history")}>
        Histórico
      </button>
      <button type="button" className={screen === "settings" ? "active" : ""} onClick={() => setScreen("settings")}>
        Config
      </button>
    </nav>
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
                  {step.label}
                </button>
              </li>
            );
          })}
        </ol>
        <div className="actions">
          <button type="button" className="icon-btn" title="Tema escuro" aria-pressed="true">
            <Moon size={18} strokeWidth={1.75} />
          </button>
        {screen === "about" ? (
          <>
            <button type="button" className="btn ghost" onClick={() => fileInputRef.current?.click()}>
              Abrir PNG
            </button>
            <button type="button" className="btn ghost" onClick={() => void saveProject(false)}>
              <Download size={16} strokeWidth={1.75} /> Guardar
            </button>
            <button type="button" className="icon-btn" title="Ecrã inteiro" onClick={toggleFullscreen}>
              <Maximize2 size={18} strokeWidth={1.75} />
            </button>
            <button type="button" className="btn primary" onClick={() => void copyPrompt()}>
              <Copy size={16} strokeWidth={1.75} /> Copiar prompt
            </button>
          </>
        ) : screen === "animate" ? (
          <>
            <button type="button" className="btn ghost" onClick={() => void saveProject(false)}>
              <Download size={16} strokeWidth={1.75} /> Guardar
            </button>
            <button type="button" className="btn ghost" onClick={() => void exportZip()} disabled={!hasImage}>
              ZIP dos clips
            </button>
            <button type="button" className="btn primary" onClick={() => void exportHtml()} disabled={!hasImage}>
              HTML animado
            </button>
          </>
        ) : screen === "gallery" ? (
          <>
            <button type="button" className="btn ghost" onClick={() => void pickLibraryFolder()}>
              <Download size={16} strokeWidth={1.75} /> {libraryName ? "Trocar pasta" : "Escolher pasta"}
            </button>
            <button type="button" className="btn primary" onClick={() => startNewProject()}>
              <Plus size={16} strokeWidth={1.75} /> Novo projeto
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn ghost" onClick={() => fileInputRef.current?.click()}>
              {hasImage ? "Trocar PNG" : "Abrir PNG"}
            </button>
            <button type="button" className="btn ghost" onClick={() => void saveProject(false)}>
              <Download size={16} strokeWidth={1.75} /> Guardar
            </button>
            <button type="button" className="btn primary" onClick={() => void exportZip()} disabled={!hasImage}>
              Exportar ZIP
            </button>
          </>
        )}
        </div>
      </div>
      {screen !== "about" ? (
        <div className="title">
          <h2>{page.title}</h2>
          <p>{page.sub}</p>
        </div>
      ) : null}
    </header>
  );
}

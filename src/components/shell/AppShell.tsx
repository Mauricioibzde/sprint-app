"use client";

import { useEffect, useState, type DragEvent } from "react";
import { AnimateScreen } from "@/components/animate/AnimateScreen";
import { CutScreen } from "@/components/editor/CutScreen";
import { PromptScreen } from "@/components/prompt/PromptScreen";
import { GalleryScreen } from "@/components/screens/GalleryScreen";
import { BatchScreen, HistoryScreen, SettingsScreen } from "@/components/screens/OtherScreens";
import { MobileNav, Sidebar, TopBar } from "@/components/shell/Sidebar";
import { Toast } from "@/components/ui/Toast";
import { useSpriteCut } from "@/context/sprite-cut-context";

export function AppShell() {
  const app = useSpriteCut();
  const [fileOver, setFileOver] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "s" || e.key === "S") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        void app.saveProject(false);
        return;
      }
      const tag = (e.target as HTMLElement | null)?.tagName || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (app.screen === "animate") {
        if (e.key === " " || e.code === "Space") {
          e.preventDefault();
          app.togglePlay();
          return;
        }
        if (e.key === "ArrowLeft" || e.key === "[") {
          e.preventDefault();
          app.stepAnim(-1);
          return;
        }
        if (e.key === "ArrowRight" || e.key === "]") {
          e.preventDefault();
          app.stepAnim(1);
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          app.stopPlay();
        }
        return;
      }

      if ((e.key === "+" || e.key === "=") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        app.setZoom(app.zoom * 1.15);
        return;
      }
      if (e.key === "-" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        app.setZoom(app.zoom / 1.15);
        return;
      }
      if (e.key === "0" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        app.fitToView();
        return;
      }
      if (e.key === "h" || e.key === "H") {
        app.setTool("pan");
        return;
      }
      if (e.key === "g" || e.key === "G") {
        app.setTool("guides");
        app.setTab("guides");
        return;
      }
      if (app.tool !== "guides") return;
      if (!app.lockUniformGrid && !app.activeGuideId) return;
      if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "[") {
        e.preventDefault();
        app.nudgeGuide(-1);
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "]") {
        e.preventDefault();
        app.nudgeGuide(1);
      } else if (!app.lockUniformGrid && (e.key === "Delete" || e.key === "Backspace")) {
        e.preventDefault();
        app.removeGuide();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [app]);

  const onDragOver = (e: DragEvent) => {
    if (![...e.dataTransfer.types].includes("Files")) return;
    e.preventDefault();
    setFileOver(true);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setFileOver(false);
    const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    if (files.length > 1) {
      app.openBatch(files);
      app.setScreen("batch");
      return;
    }
    app.openImage(files[0]);
  };

  return (
    <div
      className={"app" + (fileOver ? " file-over" : "")}
      data-screen={app.screen}
      id="app"
      onDragOver={onDragOver}
      onDragLeave={() => setFileOver(false)}
      onDrop={onDrop}
    >
      <Sidebar />
      <main className="main">
        <TopBar />
        <input
          ref={app.fileInputRef}
          type="file"
          className="hidden-file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) app.openImage(file);
            e.target.value = "";
          }}
        />
        <input
          ref={app.batchInputRef}
          type="file"
          className="hidden-file"
          accept="image/*"
          multiple
          onChange={(e) => {
            if (e.target.files?.length) app.openBatch(e.target.files);
            e.target.value = "";
          }}
        />
        {app.screen === "cut" ? <CutScreen /> : null}
        {app.screen === "animate" ? <AnimateScreen /> : null}
        {app.screen === "batch" ? <BatchScreen /> : null}
        {app.screen === "gallery" ? <GalleryScreen /> : null}
        {app.screen === "settings" ? <SettingsScreen /> : null}
        {app.screen === "history" ? <HistoryScreen /> : null}
        {app.screen === "about" ? <PromptScreen /> : null}
      </main>
      <MobileNav />
      {fileOver ? (
        <div className="drop-layer" aria-hidden>
          Solte a PNG da spritesheet
        </div>
      ) : null}
      <Toast />
    </div>
  );
}

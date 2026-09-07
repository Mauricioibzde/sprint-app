"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { SpriteCutProvider } from "@/context/sprite-cut-context";

function BootScreen() {
  return (
    <div className="app-boot" role="status">
      <div className="brandmark">✦</div>
      <p>SpriteCut PRO</p>
    </div>
  );
}

export default function HomePage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) return <BootScreen />;

  return (
    <SpriteCutProvider>
      <AppShell />
    </SpriteCutProvider>
  );
}

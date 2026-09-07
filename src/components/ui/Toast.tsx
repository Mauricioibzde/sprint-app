"use client";

import { useSpriteCut } from "@/context/sprite-cut-context";

export function Toast() {
  const { toast } = useSpriteCut();
  if (!toast) return null;
  return (
    <div className={"toast show " + toast.kind} role="status" aria-live="polite">
      {toast.msg}
    </div>
  );
}

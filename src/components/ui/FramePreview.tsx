"use client";

import { useEffect, useRef } from "react";
import type { FrameRect } from "@/types";
import { paintRectPreview } from "@/lib/export";

export function FramePreview({
  img,
  rect,
  maxSide,
  center = false,
  className
}: {
  img: CanvasImageSource | null;
  rect?: FrameRect;
  maxSide: number;
  center?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) paintRectPreview(ref.current, img, rect, maxSide, center);
  }, [img, rect, maxSide, center]);
  return <canvas ref={ref} className={className} aria-hidden />;
}

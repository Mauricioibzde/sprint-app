import type { FrameRect } from "@/types";

export function cropFramePng(img: CanvasImageSource, rect: FrameRect): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = rect.w;
  canvas.height = rect.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Falha ao gerar PNG"));
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, rect.w, rect.h);
  ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao gerar PNG"))), "image/png");
  });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function paintRectPreview(
  targetCanvas: HTMLCanvasElement,
  img: CanvasImageSource | null,
  rect: FrameRect | undefined,
  maxSide: number
) {
  const ctx = targetCanvas.getContext("2d");
  if (!ctx) return;
  const w = rect?.w || 64;
  const h = rect?.h || 64;
  const scale = Math.min(maxSide / w, maxSide / h, 1);
  targetCanvas.width = Math.max(1, Math.round(w * scale));
  targetCanvas.height = Math.max(1, Math.round(h * scale));
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  if (!img || !rect) return;
  ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, targetCanvas.width, targetCanvas.height);
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildAnimatedIndexHtml(opts: {
  title: string;
  fps: number;
  loop: boolean;
  frames: { src: string; w: number; h: number }[];
}): string {
  const frames = opts.frames;
  const w = Math.max(...frames.map((f) => f.w), 1);
  const h = Math.max(...frames.map((f) => f.h), 1);
  const srcJson = JSON.stringify(frames.map((f) => f.src));
  const closeScript = "</" + "script>";
  const closeBody = "</" + "body>";
  const closeHtml = "</" + "html>";
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(opts.title)}</title>
<style>
  html,body{margin:0;padding:0;background:transparent}
  body{display:inline-block;line-height:0}
  img{
    display:block;width:${w}px;height:${h}px;
    image-rendering:pixelated;image-rendering:crisp-edges;
    background:transparent;user-select:none;pointer-events:none
  }
</style>
</head>
<body>
<img id="s" width="${w}" height="${h}" alt="" />
<script>
(function(){
  var F=${srcJson},i=0,fps=${Math.max(1, opts.fps | 0)},loop=${opts.loop ? "true" : "false"};
  var el=document.getElementById('s');
  function draw(){ el.src=F[i]; }
  function tick(){
    i++;
    if(i>=F.length){ if(!loop){ i=F.length-1; draw(); return; } i=0; }
    draw();
    setTimeout(tick,1000/fps);
  }
  draw();
  if(F.length>1) setTimeout(tick,1000/fps);
})();
${closeScript}
${closeBody}
${closeHtml}`;
}

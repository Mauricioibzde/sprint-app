import type { FrameRect } from "@/types";
import { drawAlignedFrame } from "@/lib/frame-align";

export function cropFramePng(img: CanvasImageSource, rect: FrameRect, center = false): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = rect.w;
  canvas.height = rect.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Falha ao gerar PNG"));
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, rect.w, rect.h);
  if (center) drawAlignedFrame(ctx, img, rect, rect.w, rect.h);
  else ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
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
  maxSide: number,
  center = false
) {
  const ctx = targetCanvas.getContext("2d");
  if (!ctx) return;
  const w = rect?.w || 64;
  const h = rect?.h || 64;
  const scale = Math.min(maxSide / w, maxSide / h, 1);
  const destW = Math.max(1, Math.round(w * scale));
  const destH = Math.max(1, Math.round(h * scale));
  if (targetCanvas.width !== destW) targetCanvas.width = destW;
  if (targetCanvas.height !== destH) targetCanvas.height = destH;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, destW, destH);
  if (!img || !rect) return;
  if (center) drawAlignedFrame(ctx, img, rect, destW, destH);
  else ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, destW, destH);
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
  pingPong?: boolean;
  speed?: number;
  frames: { src: string; w: number; h: number }[];
}): string {
  const frames = opts.frames;
  const w = Math.max(...frames.map((f) => f.w), 1);
  const h = Math.max(...frames.map((f) => f.h), 1);
  const srcJson = JSON.stringify(frames.map((f) => f.src));
  const fps = Math.max(1, opts.fps | 0);
  const speed = Math.max(0.25, Number(opts.speed) || 1);
  const loop = opts.loop ? "true" : "false";
  const pingPong = opts.pingPong ? "true" : "false";
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
  canvas{
    display:block;width:${w}px;height:${h}px;
    image-rendering:pixelated;image-rendering:crisp-edges;
    background:transparent;user-select:none;pointer-events:none
  }
</style>
</head>
<body>
<canvas id="s" width="${w}" height="${h}" aria-label=""></canvas>
<script>
(function(){
  var F=${srcJson};
  var i=0,dir=1,loop=${loop},pingPong=${pingPong};
  var fps=${fps},speed=${speed};
  var el=document.getElementById('s');
  var ctx=el.getContext('2d');
  ctx.imageSmoothingEnabled=false;
  var imgs=F.map(function(src){ var im=new Image(); im.src=src; return im; });
  function draw(){
    var im=imgs[i];
    if(!im||!im.complete||!im.naturalWidth) return;
    var dx=Math.round((el.width-im.naturalWidth)/2);
    var dy=Math.round((el.height-im.naturalHeight)/2);
    ctx.clearRect(0,0,el.width,el.height);
    ctx.drawImage(im,dx,dy);
  }
  var last=0,frameMs=1000/Math.max(1,fps*speed),started=false,running=true;
  function advance(){
    var lastIdx=imgs.length-1;
    if(pingPong){
      var next=i+dir;
      if(next>lastIdx){
        if(!loop && i===lastIdx){ running=false; return; }
        dir=-1;
        next=Math.max(0,lastIdx-1);
      }else if(next<0){
        if(!loop && i===0){ running=false; return; }
        dir=1;
        next=Math.min(lastIdx,1);
      }
      i=next;
      return;
    }
    i+=1;
    if(i>lastIdx){
      if(!loop){ i=lastIdx; running=false; return; }
      i=0;
    }
  }
  function tick(now){
    if(!running) return;
    if(!last) last=now;
    var acc=now-last;
    if(acc>=frameMs){
      last=now-(acc%frameMs);
      advance();
      draw();
    }
    if(running) requestAnimationFrame(tick);
  }
  function start(){
    if(started) return;
    started=true;
    draw();
    if(imgs.length>1) requestAnimationFrame(tick);
  }
  imgs[0].onload=start;
  if(imgs[0].complete) start();
})();
${closeScript}
${closeBody}
${closeHtml}`;
}

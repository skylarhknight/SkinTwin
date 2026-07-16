"use client";

import { useState } from "react";
import type { SkinScan } from "@/lib/types";

type Props = {
  scan: SkinScan;
  fullName?: string | null;
  futureImageUrl?: string | null;
  className?: string;
};

const W = 1080;
const H = 1350;

const COLORS = {
  bgFrom: "#f4f8ff",
  bgVia: "#ffffff",
  bgTo: "#fff8dc",
  ink: "#3d4a63",
  muted: "#7f8aa3",
  blue: "#5e8fce",
  blueSoft: "#e6effb",
  yellow: "#f1de77",
  yellowSoft: "#fff8dc",
  white: "#ffffff",
  ringBlue: "#c9dcf5",
};

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

function drawPill(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fill: string,
  stroke: string,
  textColor: string
) {
  ctx.font = "600 26px system-ui, -apple-system, 'Segoe UI', sans-serif";
  const metrics = ctx.measureText(text);
  const padX = 22;
  const padY = 12;
  const w = metrics.width + padX * 2;
  const h = 26 + padY * 2;
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = textColor;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + padX, y + h / 2);
  return { width: w, height: h };
}

function drawProgressRow(
  ctx: CanvasRenderingContext2D,
  label: string,
  value: number,
  x: number,
  y: number,
  width: number
) {
  ctx.fillStyle = COLORS.ink;
  ctx.font = "600 26px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x, y);
  ctx.textAlign = "right";
  ctx.fillStyle = COLORS.muted;
  ctx.fillText(`${value}/100`, x + width, y);
  ctx.textAlign = "left";

  const barX = x;
  const barY = y + 22;
  const barW = width;
  const barH = 14;
  ctx.fillStyle = COLORS.blueSoft;
  roundRect(ctx, barX, barY, barW, barH, barH / 2);
  ctx.fill();
  ctx.fillStyle = COLORS.blue;
  roundRect(
    ctx,
    barX,
    barY,
    Math.max(barH, (barW * Math.max(0, Math.min(100, value))) / 100),
    barH,
    barH / 2
  );
  ctx.fill();
}

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function renderSkinCard(scan: SkinScan, fullName?: string | null, futureImageUrl?: string | null): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  /** Background gradient. */
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, COLORS.bgFrom);
  grad.addColorStop(0.55, COLORS.bgVia);
  grad.addColorStop(1, COLORS.bgTo);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  /** Decorative blobs. */
  ctx.fillStyle = "rgba(118, 163, 222, 0.18)";
  ctx.beginPath();
  ctx.arc(120, 160, 220, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(241, 222, 119, 0.28)";
  ctx.beginPath();
  ctx.arc(W - 80, H - 220, 240, 0, Math.PI * 2);
  ctx.fill();

  /** Header. */
  ctx.fillStyle = COLORS.ink;
  ctx.font = "800 44px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("SkinTwin", 80, 110);

  ctx.fillStyle = COLORS.muted;
  ctx.font = "500 26px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.fillText(`Skin report · ${new Date(scan.scanDate).toLocaleDateString()}`, 80, 150);

  /** Score card. */
  const cardX = 80;
  const cardY = 200;
  const cardW = W - 160;
  const cardH = 320;
  ctx.fillStyle = COLORS.white;
  ctx.strokeStyle = COLORS.ringBlue;
  ctx.lineWidth = 1.5;
  roundRect(ctx, cardX, cardY, cardW, cardH, 36);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = COLORS.muted;
  ctx.font = "700 22px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.fillText("SKINFORWARD SCORE", cardX + 40, cardY + 70);

  ctx.fillStyle = COLORS.blue;
  ctx.font = "800 200px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.fillText(`${scan.overallScore}`, cardX + 40, cardY + 240);

  ctx.fillStyle = COLORS.ink;
  ctx.font = "600 28px system-ui, -apple-system, 'Segoe UI', sans-serif";
  if (fullName) {
    ctx.textAlign = "right";
    ctx.fillText(fullName, cardX + cardW - 40, cardY + 70);
    ctx.textAlign = "left";
  }

  /** Tone block. */
  if (scan.facialToneData) {
    const tone = scan.facialToneData;
    const tx = cardX + cardW - 360;
    const ty = cardY + 110;
    ctx.fillStyle = COLORS.yellowSoft;
    ctx.strokeStyle = COLORS.yellow;
    ctx.lineWidth = 1.5;
    roundRect(ctx, tx, ty, 320, 170, 28);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = COLORS.muted;
    ctx.font = "700 18px system-ui, -apple-system, 'Segoe UI', sans-serif";
    ctx.fillText("UNDERTONE", tx + 30, ty + 38);

    ctx.fillStyle = COLORS.ink;
    ctx.font = "800 48px system-ui, -apple-system, 'Segoe UI', sans-serif";
    ctx.fillText(tone.undertone.charAt(0).toUpperCase() + tone.undertone.slice(1), tx + 30, ty + 90);

    ctx.fillStyle = COLORS.muted;
    ctx.font = "500 20px system-ui, -apple-system, 'Segoe UI', sans-serif";
    ctx.fillText(`Pigmentation idx ${tone.pigmentationIndex}`, tx + 30, ty + 125);
    ctx.fillText(`Redness idx ${tone.rednessIndex}`, tx + 30, ty + 150);
  }

  /** Top concerns pills. */
  ctx.fillStyle = COLORS.ink;
  ctx.font = "700 30px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.fillText("Top concerns today", 80, 580);
  let pillX = 80;
  const pillY = 610;
  for (const c of (scan.topConcerns ?? []).slice(0, 4)) {
    const { width } = drawPill(ctx, c, pillX, pillY, COLORS.blueSoft, COLORS.ringBlue, COLORS.ink);
    pillX += width + 12;
  }

  /** Three metric bars. */
  const metricKeys: { key: keyof typeof scan.metrics; label: string }[] = [
    { key: "hydration", label: "Hydration" },
    { key: "pigmentation", label: "Tone" },
    { key: "radiance", label: "Radiance" },
  ];
  let rowY = 760;
  for (const m of metricKeys) {
    drawProgressRow(ctx, m.label, scan.metrics[m.key], 80, rowY, W - 160);
    rowY += 80;
  }

  /** Future-self thumbnail (optional). */
  if (futureImageUrl) {
    const futureImg = await loadImage(futureImageUrl);
    if (futureImg) {
      const fx = W - 320;
      const fy = 1010;
      const fs = 220;
      ctx.fillStyle = COLORS.white;
      ctx.strokeStyle = COLORS.ringBlue;
      ctx.lineWidth = 1.5;
      roundRect(ctx, fx - 12, fy - 12, fs + 24, fs + 60, 24);
      ctx.fill();
      ctx.stroke();
      ctx.save();
      roundRect(ctx, fx, fy, fs, fs, 18);
      ctx.clip();
      ctx.drawImage(futureImg, fx, fy, fs, fs);
      ctx.restore();
      ctx.fillStyle = COLORS.muted;
      ctx.font = "600 18px system-ui, -apple-system, 'Segoe UI', sans-serif";
      ctx.fillText("20-year simulation", fx, fy + fs + 32);
    }
  }

  /** Footer. */
  const footerY = H - 100;
  ctx.fillStyle = COLORS.ink;
  ctx.font = "700 22px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.fillText("Powered by Perfect Corp", 80, footerY);
  ctx.fillStyle = COLORS.muted;
  ctx.font = "500 20px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.fillText("AI Skin Analysis · Facial Color Tones · AI Skin Simulation", 80, footerY + 32);

  return canvas.toDataURL("image/png");
}

export function SkinCardDownload({ scan, fullName, futureImageUrl, className = "" }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onClick = async () => {
    setBusy(true);
    setError("");
    try {
      const dataUrl = await renderSkinCard(scan, fullName, futureImageUrl);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `skintwin-${scan.scanDate || "today"}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate card");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`inline-flex flex-col items-start gap-1 ${className}`}>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-full border border-[#d8e2f2] bg-white px-4 py-2 text-xs font-semibold text-sf-ink shadow-sm transition-colors hover:bg-sf-blue-soft disabled:opacity-60"
      >
        {busy ? (
          <>
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Rendering…
          </>
        ) : (
          <>
            <span aria-hidden>📥</span>
            Download Skin Card
          </>
        )}
      </button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

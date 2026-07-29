"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DemoSeedButton } from "@/components/DemoSeedButton";
import { PageHeader } from "@/components/PageHeader";
import { PoweredByPerfect } from "@/components/PoweredByPerfect";
import { getAccessToken, getCurrentUser } from "@/lib/auth/authClient";
import { LS_KEYS } from "@/lib/storage/localStorageKeys";
import type { SkinScan } from "@/lib/types";

const MAX_SCAN_HISTORY_ITEMS = 20;

function compactScanForStorage(scan: SkinScan): SkinScan {
  return {
    ...scan,
    // These raw payloads can be very large and are not needed for normal UX flows.
    rawSkinAnalysisResponse: undefined,
    rawColorToneResponse: undefined,
  };
}

function compactHistoryItem(scan: SkinScan): SkinScan {
  return {
    id: scan.id,
    userId: scan.userId,
    imageUrl: "/mock/skin-scan-placeholder.svg",
    scanDate: scan.scanDate,
    overallScore: scan.overallScore,
    metrics: scan.metrics,
    topConcerns: scan.topConcerns,
    summary: scan.summary,
    isMock: scan.isMock,
    analyzedMetricKeys: scan.analyzedMetricKeys,
    mockFallbackNote: scan.mockFallbackNote,
    facialToneData: scan.facialToneData,
  };
}

function setScanStorage(scan: SkinScan, preview: string) {
  const compactLatest = compactScanForStorage(scan);
  localStorage.setItem(LS_KEYS.latestScan, JSON.stringify(compactLatest));
  localStorage.setItem(LS_KEYS.latestImage, preview);

  const existing = JSON.parse(localStorage.getItem(LS_KEYS.scanHistory) || "[]") as SkinScan[];
  const withoutSameId = existing.filter((s) => s.id !== compactLatest.id);
  const next = [...withoutSameId, compactHistoryItem(compactLatest)].slice(-MAX_SCAN_HISTORY_ITEMS);
  localStorage.setItem(LS_KEYS.scanHistory, JSON.stringify(next));
}

/** Oval overlay + dimmed surround — aligns with typical face-analysis framing (centered, full face). */
function CameraFaceGuide() {
  const maskId = useId().replace(/:/g, "");
  /** Portrait oval on screen: preview is landscape (aspect 4/3), so ry/rx must exceed width/height (~1.33) or the stretch makes the oval look sideways. */
  const cx = 50;
  const cy = 44;
  const rx = 27;
  const ry = 42;

  return (
    <>
      <svg
        className="pointer-events-none absolute inset-0 z-10 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <mask id={maskId}>
            <rect width="100" height="100" fill="white" />
            <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="black" />
          </mask>
        </defs>
        <rect width="100" height="100" fill="rgba(0,0,0,0.52)" mask={`url(#${maskId})`} />
      </svg>
      <svg
        className="pointer-events-none absolute inset-0 z-[11] h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <ellipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill="none"
          stroke="rgba(255,255,255,0.95)"
          strokeWidth="0.35"
          strokeDasharray="1.2 0.9"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <p className="pointer-events-none absolute bottom-[10%] left-0 right-0 z-[12] px-4 text-center text-xs font-medium leading-snug text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)] sm:text-sm">
        Keep your face within the oval — move closer until your face fills it.
      </p>
    </>
  );
}

export default function ScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [cameraOn, setCameraOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getCurrentUser()
      .then((u) => {
        if (!u) {
          router.replace("/login");
          return;
        }
        setAuthChecked(true);
      })
      .catch(() => {
        router.replace("/login");
      });
  }, [router]);

  const onFile = (f: File | null) => {
    setError("");
    setFile(f);
    if (f) {
      const r = new FileReader();
      r.onload = () => setPreview(String(r.result));
      r.readAsDataURL(f);
    }
  };

  const startCamera = async () => {
    setError("");
    try {
      /** Prefer HD capture so JPEGs meet Perfect minimum dimensions (avoids error_below_min_image_size). */
      const attempts: MediaStreamConstraints[] = [
        {
          audio: false,
          video: {
            facingMode: "user",
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
          },
        },
        {
          audio: false,
          video: {
            facingMode: "user",
            width: { ideal: 1280, min: 960 },
            height: { ideal: 720, min: 540 },
          },
        },
        {
          audio: false,
          video: {
            facingMode: "user",
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
          },
        },
        { audio: false, video: { facingMode: "user" } },
      ];
      let stream: MediaStream | null = null;
      let lastErr: unknown;
      for (const constraints of attempts) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          break;
        } catch (e) {
          lastErr = e;
        }
      }
      if (!stream) throw lastErr;
      streamRef.current = stream;
      setCameraOn(true);
    } catch {
      setError("Camera permission was denied or is unavailable. You can still upload a selfie.");
    }
  };

  useEffect(() => {
    if (!cameraOn) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;
    const play = () => {
      video.play().catch(() => {
        /* autoplay policy edge cases */
      });
    };
    play();
    video.addEventListener("loadedmetadata", play);
    return () => {
      video.removeEventListener("loadedmetadata", play);
      video.srcObject = null;
    };
  }, [cameraOn]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  const capturePhoto = async () => {
    setError("");
    const video = videoRef.current;
    if (!video) return setError("Camera is not ready yet.");
    const vw = video.videoWidth || 960;
    const vh = video.videoHeight || 720;
    const MIN_SHORT = 480;
    const short = Math.min(vw, vh);
    let scale = 1;
    if (short > 0 && short < MIN_SHORT) {
      scale = MIN_SHORT / short;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(Math.round(vw * scale), MIN_SHORT);
    canvas.height = Math.max(Math.round(vh * scale), MIN_SHORT);
    const ctx = canvas.getContext("2d");
    if (!ctx) return setError("Unable to capture photo.");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(video, 0, 0, vw, vh, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setPreview(dataUrl);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) return setError("Unable to process captured photo.");
    setFile(new File([blob], `skintwin-selfie-${Date.now()}.jpg`, { type: "image/jpeg" }));
    stopCamera();
  };

  const checkImageLargeEnough = (f: File): Promise<{ ok: boolean; shortSide: number }> =>
    new Promise((resolve) => {
      const url = URL.createObjectURL(f);
      const img = new window.Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const shortSide = Math.min(img.naturalWidth, img.naturalHeight);
        resolve({ ok: shortSide >= 480, shortSide });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ ok: true, shortSide: 0 });
      };
      img.src = url;
    });

  const analyze = async () => {
    if (!authChecked) return;
    if (!file) return setError("Upload or take a selfie first.");
    setLoading(true);
    setError("");
    try {
      const dims = await checkImageLargeEnough(file);
      if (!dims.ok && dims.shortSide > 0) {
        setLoading(false);
        return setError(
          `Photo is only about ${dims.shortSide}px on the short side. Perfect needs at least ~480px and your face should fill most of the frame. Move closer or use a higher-resolution photo.`
        );
      }
      const form = new FormData();
      form.append("image", file);
      const token = await getAccessToken();
      if (!token) throw new Error("Please sign in again to continue.");
      const res = await fetch("/api/scans", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        const title = typeof data.error === "string" ? data.error : "Scan failed";
        const hint = typeof data.hint === "string" ? data.hint : "";
        throw new Error(hint ? `${title}\n\n${hint}` : title);
      }
      const scan = compactScanForStorage({ ...data, id: data.scanId, imageUrl: preview || data.imageUrl } as SkinScan);
      try {
        setScanStorage(scan, preview);
      } catch (storageError) {
        // Recover from quota errors by aggressively trimming history and retrying once.
        const minimalHistory = [compactHistoryItem(scan)];
        localStorage.setItem(LS_KEYS.scanHistory, JSON.stringify(minimalHistory));
        setScanStorage(scan, preview);
        console.warn("[scan] localStorage quota hit; history trimmed:", storageError);
      }
      router.push(`/scan/${data.scanId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
      setLoading(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="card">
          <p className="text-sm text-sf-muted">Checking session...</p>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        eyebrow="Daily scan"
        title={<>Take your daily skin <span className="italic">scan</span></>}
        intro="A live selfie or a clear face photo becomes your skin report. Fill the oval, keep ~480px on the short side — very small or distant photos may be rejected."
      >
        <div className="flex flex-col items-start gap-2 md:items-end">
          <PoweredByPerfect apis={["skin-analysis", "facial-tone"]} className="shrink-0" />
          <DemoSeedButton label="No camera? Try demo data" variant="ghost" redirectTo="/dashboard" />
        </div>
      </PageHeader>

      <div data-reveal className="grid gap-6 md:grid-cols-[1fr_.8fr]">
        <section className="card space-y-4">
          <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-3xl bg-sf-blue-soft">
            {cameraOn ? (
              <>
                <video ref={videoRef} autoPlay playsInline muted className="relative z-0 h-full w-full object-cover" />
                <CameraFaceGuide />
              </>
            ) : preview ? (
              <img src={preview} alt="Selected selfie preview" className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm text-sf-muted">Selfie preview</span>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {!cameraOn ? (
              <button className="btn-secondary w-full" onClick={startCamera} type="button">Open Camera</button>
            ) : (
              <button className="btn-primary w-full" onClick={capturePhoto} type="button">Take Photo</button>
            )}
            <label className="btn-secondary flex cursor-pointer items-center justify-center text-center">
              Upload Selfie
              <input className="sr-only" type="file" accept="image/*" capture="user" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>

          {cameraOn && <button className="w-full rounded-full px-4 py-2 text-sm font-medium text-sf-muted hover:bg-sf-blue-soft" onClick={stopCamera} type="button">Cancel camera</button>}
          <button className="btn-primary w-full" onClick={analyze} disabled={loading}>{loading ? "Analyzing..." : "Analyze My Skin"}</button>
          {error && (
            <p className="whitespace-pre-line rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
          )}
        </section>

        <section className="space-y-3">
          <div className="card">
            <p className="text-xs font-semibold uppercase tracking-wide text-sf-blue-deep">For best results</p>
            <ul className="mt-3 space-y-2 text-sm text-sf-ink">
              {[
                ["💡", "Bright, even, front-facing light"],
                ["🕶️", "Remove glasses if possible"],
                ["🙂", "Keep a neutral expression"],
                ["🎯", "Center your face in the oval"],
              ].map(([icon, label]) => (
                <li key={label} className="flex items-start gap-2">
                  <span aria-hidden>{icon}</span>
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card">
            <p className="text-xs font-semibold uppercase tracking-wide text-sf-blue-deep">What runs on your photo</p>
            <ul className="mt-3 space-y-2 text-sm text-sf-ink">
              <li>
                <span className="font-medium">AI Skin Analysis</span>
                <span className="text-sf-muted"> — hydration, pores, texture, redness, pigmentation, radiance, and more.</span>
              </li>
              <li>
                <span className="font-medium">AI Facial Color Tones</span>
                <span className="text-sf-muted"> — undertone + pigmentation/redness indices.</span>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}

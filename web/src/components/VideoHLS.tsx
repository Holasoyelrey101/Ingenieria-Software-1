import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

export default function VideoHLS({ camId, hlsUrl, title }: { camId: string; hlsUrl: string; title?: string; }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const hlsRef = useRef<Hls | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadStream = () => {
    const video = videoRef.current;
    if (!video) return;

    console.log("[" + camId + "] Intentando cargar stream:", hlsUrl);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    
    setError(null);
    setOnline(false);
    setRetrying(false);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        maxBufferSize: 60 * 1000 * 1000,
        maxBufferHole: 0.5,
        highBufferWatchdogPeriod: 2,
        nudgeMaxRetry: 3,
        manifestLoadingTimeOut: 20000,
        manifestLoadingMaxRetry: 2,
        manifestLoadingRetryDelay: 2000,
        levelLoadingTimeOut: 20000,
        levelLoadingMaxRetry: 2,
        fragLoadingTimeOut: 30000,
        fragLoadingMaxRetry: 3,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10,
      });

      hlsRef.current = hls;

      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        console.log("[" + camId + "] Media attached, loading source...");
        hls.loadSource(hlsUrl);
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log("[" + camId + "] ✅ Manifest parsed successfully!");
        setOnline(true);
        setError(null);
        setRetryCount(0);
        video.play().catch((e) => {
          console.warn("[" + camId + "] Autoplay blocked:", e);
          setError("Haz clic para reproducir");
        });
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error("[" + camId + "] ❌ HLS Error:", {
          type: data.type,
          details: data.details,
          fatal: data.fatal,
          url: data.url,
          response: data.response
        });

        if (data.fatal) {
          setOnline(false);
          
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              const newRetryCount = retryCount + 1;
              setRetryCount(newRetryCount);
              
              if (newRetryCount > 5) {
                setError("Demasiados reintentos. Stream no disponible.");
                hls.destroy();
                console.error("[" + camId + "] Demasiados reintentos, deteniendo...");
                return;
              }
              
              setError("Error de conexión (intento " + newRetryCount + "/5)");
              setRetrying(true);
              retryTimeoutRef.current = setTimeout(() => {
                console.log("[" + camId + "] Reintentando conexión... (intento " + newRetryCount + ")");
                loadStream();
              }, 5000);
              break;

            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log("[" + camId + "] Intentando recuperar error de media...");
              hls.recoverMediaError();
              setError("Recuperando stream...");
              setRetrying(true);
              break;

            default:
              setError("Error fatal: " + data.details);
              hls.destroy();
              
              retryTimeoutRef.current = setTimeout(() => {
                console.log("[" + camId + "] Reintentando después de error fatal...");
                loadStream();
              }, 10000);
              break;
          }
        }
      });

      hls.attachMedia(video);

    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      console.log("[" + camId + "] Usando HLS nativo (Safari)");
      video.src = hlsUrl;
      video.addEventListener("loadedmetadata", () => {
        setOnline(true);
        setRetryCount(0);
        video.play().catch(() => setError("Haz clic para reproducir"));
      });
      video.addEventListener("error", () => {
        console.error("[" + camId + "] Error en HLS nativo");
        setError("Error al cargar el stream");
        setOnline(false);
      });
    } else {
      setError("Tu navegador no soporta HLS");
    }
  };

  useEffect(() => {
    loadStream();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [hlsUrl]);

  const handleRetry = () => {
    console.log("[" + camId + "] Reinicio manual solicitado");
    setRetryCount(0);
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    loadStream();
  };

  return (
    <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 8px 20px rgba(0,0,0,.06)" }}>
      <div style={{ background: "#111827", color: "#fff", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong>{title || camId}</strong>
        <span
          title={online ? "Online" : retrying ? "Reconectando..." : "Offline"}
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: online ? "#10b981" : retrying ? "#f59e0b" : "#ef4444",
            display: "inline-block",
            animation: retrying ? "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" : "none"
          }}
        />
      </div>
      <div style={{ background: "#000", aspectRatio: "16/9", position: "relative" }}>
        {error ? (
          <div style={{ color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "12px", padding: "20px" }}>
            <div style={{ textAlign: "center" }}>⚠️ {error}</div>
            <button
              onClick={handleRetry}
              style={{
                background: "#3b82f6",
                color: "#fff",
                border: "none",
                padding: "8px 16px",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 14
              }}
            >
              🔄 Reintentar
            </button>
          </div>
        ) : (
          <video
            ref={videoRef}
            controls
            autoPlay
            muted
            playsInline
            style={{ width: "100%", height: "100%", display: "block" }}
          />
        )}
      </div>
      <div style={{ fontSize: 12, color: "#6b7280", background: "#f9fafb", padding: "8px 12px" }}>
        📹 {camId} · {online ? "● En vivo" : retrying ? "🔄 Reconectando..." : "○ Desconectado"}
        {retryCount > 0 && " · Reintentos: " + retryCount}
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
      `}</style>
    </div>
  );
}
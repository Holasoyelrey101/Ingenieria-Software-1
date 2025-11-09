import React, { useEffect, useState } from "react";
import VideoHLS from "../components/VideoHLS";

type Cam = { id: string; m3u8: string };
const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function CamarasPage() {
  const [cams, setCams] = useState<Cam[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const list = await fetch(`${API}/api/camaras/list`).then(r => r.json());
      const ids: string[] = list.camaras || [];
      const urls = await Promise.all(ids.map(async (id: string) => {
        const r = await fetch(`${API}/api/camaras/hls/${id}`).then(x => x.json());
        return { id, m3u8: r.m3u8 || r.url };
      }));
      setCams(urls);
    } catch (e: any) {
      console.error("Error cargando cámaras:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}></div>
          <div style={{ fontSize: 18, color: "#6b7280" }}>Cargando cámaras</div>
        </div>
      </div>
    );
  }

  if (!cams.length) {
    return (
      <div style={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center", color: "#6b7280" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}></div>
          <div style={{ fontSize: 18 }}>No hay cámaras disponibles</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 16px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: "#111827" }}>
         Cámaras en vivo
      </h1>
      <p style={{ color: "#6b7280", marginBottom: 24, fontSize: 16 }}>
        Monitoreo en tiempo real de <strong>{cams.length}</strong> cámara(s)
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px,1fr))", gap: 20 }}>
        {cams.map(c => (
          <VideoHLS 
            key={c.id} 
            camId={c.id}
            hlsUrl={c.m3u8} 
            title={`Cámara ${c.id.toUpperCase()}`} 
          />
        ))}
      </div>
    </div>
  );
}

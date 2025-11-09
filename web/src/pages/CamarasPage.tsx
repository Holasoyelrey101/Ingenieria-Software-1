import React, { useEffect, useState } from "react";
import VideoHLS from "../components/VideoHLS";

type Cam = { id: string; m3u8: string; };
const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function CamarasPage() {
  const [cams, setCams] = useState<Cam[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    try {
      setErr(null);
      const list = await fetch(`${API}/camaras/list`).then(r=>r.json());
      const ids: string[] = list.camaras || [];
      const urls = await Promise.all(ids.map(async id => {
        const r = await fetch(`${API}/camaras/hls/${id}`).then(x=>x.json());
        return { id, m3u8: r.m3u8 || r.url };
      }));
      setCams(urls);
    } catch (e:any) { setErr(e?.message || "Error cargando cámaras"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); const t=setInterval(load,30000); return ()=>clearInterval(t); }, []);

  if (loading) return <div style={{minHeight:"60vh",display:"grid",placeItems:"center"}}>Cargando cámaras…</div>;
  if (err) return <div style={{minHeight:"60vh",display:"grid",placeItems:"center",color:"#b91c1c"}}>⚠️ {err}</div>;
  if (!cams.length) return <div style={{minHeight:"60vh",display:"grid",placeItems:"center",color:"#6b7280"}}>No hay cámaras disponibles</div>;

  return (
    <div style={{ maxWidth:1400, margin:"0 auto", padding:"24px 16px" }}>
      <h1 style={{ fontSize:28, fontWeight:700, marginBottom:8 }}>🎥 Cámaras en vivo</h1>
      <p style={{ color:"#6b7280", marginBottom:24 }}>Monitoreo en tiempo real de {cams.length} cámara(s)</p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(380px,1fr))", gap:20 }}>
        {cams.map(c => <VideoHLS key={c.id} camId={c.id} hlsUrl={c.m3u8} title={`Cámara ${c.id.toUpperCase()}`} />)}
      </div>
    </div>
  );
}

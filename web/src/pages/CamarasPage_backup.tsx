import React, { useEffect, useState } from "react";import React, { useEffect, useState } from "react";import React, { useEffect, useState } from "react";import React, { useEffect, useState, useRef } from "react";import React, { useEffect, useState, useRef } from "react";

import VideoHLS from "../components/VideoHLS";

import axios from "axios";

type Cam = { id: string; m3u8: string };

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";import VideoHLS from "../components/VideoHLS";import VideoHLS from "../components/VideoHLS";



export default function CamarasPage() {

  const [cams, setCams] = useState<Cam[]>([]);

  const [loading, setLoading] = useState(true);interface CameraInfo {import Hls from "hls.js";import Hls from "hls.js";



  const load = async () => {  id: string;

    try {

      const list = await fetch(`${API}/api/camaras/list`).then(r => r.json());  name: string;type Cam = { id: string; m3u8: string };

      const ids: string[] = list.camaras || [];

      const urls = await Promise.all(ids.map(async (id: string) => {  m3u8: string;

        const r = await fetch(`${API}/api/camaras/hls/${id}`).then(x => x.json());

        return { id, m3u8: r.m3u8 || r.url };}const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

      }));

      setCams(urls);

    } catch (e: any) {

      console.error("Error cargando cámaras:", e);export default function CamarasPage() {

    } finally {

      setLoading(false);  const [camaras, setCamaras] = useState<CameraInfo[]>([]);

    }

  };  const [loading, setLoading] = useState(true);export default function CamarasPage() {type Cam = { id: string; m3u8: string; };type Cam = { id: string; m3u8: string; };



  useEffect(() => {

    load();

  }, []);  useEffect(() => {  const [cams, setCams] = useState<Cam[]>([]);



  if (loading) {    const fetchCamaras = async () => {

    return (

      <div style={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>      try {  const [loading, setLoading] = useState(true);const API = import.meta.env.VITE_API_URL || "http://localhost:8000";const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

        <div style={{ textAlign: "center" }}>

          <div style={{ fontSize: 48, marginBottom: 16 }}>📡</div>        const res = await axios.get("http://localhost:8000/api/camaras/list");

          <div style={{ fontSize: 18, color: "#6b7280" }}>Cargando cámaras…</div>

        </div>        const camIds: string[] = res.data.camaras || [];

      </div>

    );        

  }

        // Obtener URLs HLS inmediatamente para todas las cámaras  const load = async () => {

  if (!cams.length) {

    return (        const camarasWithStreams = await Promise.all(

      <div style={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>

        <div style={{ textAlign: "center", color: "#6b7280" }}>          camIds.map(async (id) => {    try {

          <div style={{ fontSize: 48, marginBottom: 16 }}>📹</div>

          <div style={{ fontSize: 18 }}>No hay cámaras disponibles</div>            try {

        </div>

      </div>              const hlsRes = await axios.get(`http://localhost:8000/api/camaras/hls/${id}`);      const listRes = await fetch(`${API}/api/camaras/list`);function VideoPlayer({ m3u8Url, title }: { m3u8Url: string; title: string }) {function VideoPlayer({ m3u8Url, title }: { m3u8Url: string; title: string }) {

    );

  }              return {



  return (                id,      const listData = await listRes.json();

    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 16px" }}>

      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: "#111827" }}>                name: `Cámara ${id.toUpperCase()}`,

        🎥 Cámaras en vivo

      </h1>                m3u8: hlsRes.data.m3u8,      const ids: string[] = listData.camaras || [];  const videoRef = useRef<HTMLVideoElement>(null);  const videoRef = useRef<HTMLVideoElement>(null);

      <p style={{ color: "#6b7280", marginBottom: 24, fontSize: 16 }}>

        Monitoreo en tiempo real de <strong>{cams.length}</strong> cámara(s)              };

      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px,1fr))", gap: 20 }}>            } catch (error) {

        {cams.map(c => (

          <VideoHLS               console.error(`Error fetching HLS for ${id}:`, error);

            key={c.id} 

            camId={c.id}              return null;      const camsData = await Promise.all(  const [error, setError] = useState<string | null>(null);

            hlsUrl={c.m3u8} 

            title={`Cámara ${c.id.toUpperCase()}`}             }

          />

        ))}          })        ids.map(async (id: string) => {

      </div>

    </div>        );

  );

}                  const hlsRes = await fetch(`${API}/api/camaras/hls/${id}`);  useEffect(() => {


        setCamaras(camarasWithStreams.filter(cam => cam !== null) as CameraInfo[]);

      } catch (error) {          const hlsData = await hlsRes.json();

        console.error("Error fetching cámaras:", error);

      } finally {          return { id, m3u8: hlsData.m3u8 || hlsData.url };  useEffect(() => {    const video = videoRef.current;

        setLoading(false);

      }        })

    };

      );    const video = videoRef.current;    if (!video) return;

    fetchCamaras();

  }, []);



  if (loading) {      setCams(camsData);    if (!video) return;

    return (

      <div style={{ padding: "2rem", textAlign: "center" }}>    } catch (err) {

        <p>Cargando cámaras...</p>

      </div>      console.error("Error cargando cámaras:", err);    if (Hls.isSupported()) {

    );

  }    } finally {



  return (      setLoading(false);    if (Hls.isSupported()) {      const hls = new Hls();

    <div style={{ padding: "2rem" }}>

      <h1 style={{ fontSize: "1.875rem", fontWeight: "bold", marginBottom: "1.5rem" }}>    }

        📹 Sistema de Cámaras en Vivo

      </h1>  };      const hls = new Hls({      hls.loadSource(m3u8Url);



      {camaras.length === 0 ? (

        <p style={{ color: "#6b7280" }}>No hay cámaras disponibles</p>

      ) : (  useEffect(() => {        enableWorker: true,      hls.attachMedia(video);

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "1.5rem" }}>

          {camaras.map((cam) => (    load();

            <div

              key={cam.id}  }, []);        lowLatencyMode: true,      hls.on(Hls.Events.MANIFEST_PARSED, () => {

              style={{

                border: "1px solid #e5e7eb",

                borderRadius: "0.5rem",

                padding: "1rem",  if (loading) {      });        video.play().catch(() => {}); // Intenta reproducir automáticamente

                backgroundColor: "#ffffff",

                boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)",    return (

              }}

            >      <div style={{ padding: 32, textAlign: "center", fontSize: 18 }}>            });

              <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem" }}>

                {cam.name}        ⏳ Cargando cámaras…

              </h3>

              <VideoHLS m3u8Url={cam.m3u8} title={cam.name} />      </div>      hls.loadSource(m3u8Url);      return () => {

            </div>

          ))}    );

        </div>

      )}  }      hls.attachMedia(video);        hls.destroy();

    </div>

  );

}

  return (            };

    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 16px" }}>

      <h1 style={{ fontSize: 32, fontWeight: "bold", marginBottom: 24 }}>      hls.on(Hls.Events.MANIFEST_PARSED, () => {    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {

        🎥 Cámaras en vivo

      </h1>        video.play().catch((e) => {      // Safari nativo

      <div

        style={{          console.warn('Autoplay prevented:', e);      video.src = m3u8Url;

          display: "grid",

          gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",        });      video.addEventListener('loadedmetadata', () => {

          gap: 20,

        }}      });        video.play().catch(() => {});

      >

        {cams.map((c) => (      });

          <VideoHLS

            key={c.id}      hls.on(Hls.Events.ERROR, (_event, data) => {    }

            camId={c.id}

            hlsUrl={c.m3u8}        if (data.fatal) {  }, [m3u8Url]);

            title={`Cámara ${c.id.toUpperCase()}`}

          />          setError('Error cargando stream');

        ))}

      </div>          console.error('HLS Error:', data);  return (

    </div>

  );        }    <div style={{border:"1px solid #e5e7eb", borderRadius:8, padding:16}}>

}

      });      <h3 style={{marginBottom:8, fontSize:16, fontWeight:600}}>{title}</h3>

      <video 

      return () => {        ref={videoRef}

        hls.destroy();        controls 

      };        muted 

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {        style={{width:"100%", borderRadius:4, backgroundColor:"#000", maxHeight:300}}

      // Safari nativo      />

      video.src = m3u8Url;      <p style={{marginTop:8, fontSize:12, color:"#6b7280"}}>Stream: {m3u8Url}</p>

      video.addEventListener('loadedmetadata', () => {    </div>

        video.play().catch(() => {});  );

      });}

    } else {

      setError('HLS no soportado en este navegador');export default function CamarasPage() {

    }  const [cams, setCams] = useState<Cam[]>([]);

  }, [m3u8Url]);  const [loading, setLoading] = useState(true);

  const [err, setErr] = useState<string | null>(null);

  return (

    <div style={{border:"1px solid #e5e7eb", borderRadius:8, padding:16, backgroundColor:"#fff"}}>  const load = async () => {

      <h3 style={{marginBottom:12, fontSize:16, fontWeight:600, color:"#111827"}}>📹 {title}</h3>    try {

      {error ? (      setErr(null);

        <div style={{      const list = await fetch(`${API}/api/camaras/list`).then(r=>r.json());

          backgroundColor:"#fef2f2",      const ids: string[] = list.camaras || [];

          border:"1px solid #fecaca",      const urls = await Promise.all(ids.map(async (id: string) => {

          borderRadius:8,        const r = await fetch(`${API}/api/camaras/hls/${id}`).then(x=>x.json());

          padding:16,        return { id, m3u8: r.m3u8 || r.url };

          textAlign:"center",      }));

          color:"#991b1b"      setCams(urls);

        }}>    } catch (e:any) { setErr(e?.message || "Error cargando cámaras"); }

          ⚠️ {error}    finally { setLoading(false); }

        </div>  };

      ) : (

        <>  useEffect(() => { load(); const t=setInterval(load,30000); return ()=>clearInterval(t); }, []);

          <video 

            ref={videoRef}  if (loading) return <div style={{minHeight:"60vh",display:"grid",placeItems:"center"}}>Cargando cámaras…</div>;

            controls   if (err) return <div style={{minHeight:"60vh",display:"grid",placeItems:"center",color:"#b91c1c"}}>⚠️ {err}</div>;

            muted   if (!cams.length) return <div style={{minHeight:"60vh",display:"grid",placeItems:"center",color:"#6b7280"}}>No hay cámaras disponibles</div>;

            style={{

              width:"100%",   return (

              borderRadius:8,     <div style={{ maxWidth:1400, margin:"0 auto", padding:"24px 16px" }}>

              backgroundColor:"#000",      <h1 style={{ fontSize:28, fontWeight:700, marginBottom:8 }}>🎥 Cámaras en vivo</h1>

              minHeight:200,      <p style={{ color:"#6b7280", marginBottom:24 }}>Monitoreo en tiempo real de {cams.length} cámara(s)</p>

              maxHeight:300      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(380px,1fr))", gap:20 }}>

            }}        {cams.map(c => (

          />          <div key={c.id} style={{border:"1px solid #e5e7eb", borderRadius:8, padding:16, backgroundColor:"#f9fafb"}}>

          <div style={{marginTop:8, fontSize:11, color:"#6b7280", display:"flex", alignItems:"center", gap:8}}>            <h3 style={{marginBottom:12, fontSize:18, fontWeight:600}}>📹 Cámara {c.id.toUpperCase()}</h3>

            <span style={{color:"#10b981", fontSize:16}}>●</span>            <div style={{backgroundColor:"#1f2937", borderRadius:8, padding:40, textAlign:"center", marginBottom:12}}>

            <span>LIVE</span>              <div style={{color:"#9ca3af", fontSize:14, marginBottom:12}}>

          </div>                🎬 Stream HLS Disponible

        </>              </div>

      )}              <div style={{color:"#10b981", fontSize:24, fontWeight:700}}>● LIVE</div>

    </div>            </div>

  );            <div style={{marginTop:12}}>

}              <p style={{fontSize:12, color:"#6b7280", marginBottom:8, wordBreak:"break-all"}}>

                <strong>URL Stream:</strong><br/>

export default function CamarasPage() {                {c.m3u8}

  const [cams, setCams] = useState<Cam[]>([]);              </p>

  const [loading, setLoading] = useState(true);              <a 

  const [err, setErr] = useState<string | null>(null);                href={c.m3u8} 

                target="_blank" 

  const load = async () => {                rel="noopener noreferrer"

    try {                style={{

      setErr(null);                  display:"inline-block",

      const list = await fetch(`${API}/api/camaras/list`).then(r=>r.json());                  padding:"8px 16px",

      const ids: string[] = list.camaras || [];                  backgroundColor:"#3b82f6",

      const urls = await Promise.all(ids.map(async (id: string) => {                  color:"white",

        const r = await fetch(`${API}/api/camaras/hls/${id}`).then(x=>x.json());                  borderRadius:6,

        return { id, m3u8: r.m3u8 || r.url };                  textDecoration:"none",

      }));                  fontSize:14,

      setCams(urls);                  fontWeight:500,

    } catch (e:any) {                   marginTop:8

      setErr(e?.message || "Error cargando cámaras");                 }}

    } finally {               >

      setLoading(false);                 🔗 Abrir Stream HLS

    }              </a>

  };            </div>

          </div>

  useEffect(() => {         ))}

    load();       </div>

    const t = setInterval(load, 30000);     </div>

    return () => clearInterval(t);   );

  }, []);}



  if (loading) {
    return (
      <div style={{minHeight:"60vh",display:"grid",placeItems:"center"}}>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:48, marginBottom:16}}>📡</div>
          <div style={{fontSize:18, color:"#6b7280"}}>Cargando cámaras…</div>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div style={{minHeight:"60vh",display:"grid",placeItems:"center"}}>
        <div style={{textAlign:"center", color:"#b91c1c"}}>
          <div style={{fontSize:48, marginBottom:16}}>⚠️</div>
          <div style={{fontSize:18}}>{err}</div>
        </div>
      </div>
    );
  }

  if (!cams.length) {
    return (
      <div style={{minHeight:"60vh",display:"grid",placeItems:"center"}}>
        <div style={{textAlign:"center", color:"#6b7280"}}>
          <div style={{fontSize:48, marginBottom:16}}>📹</div>
          <div style={{fontSize:18}}>No hay cámaras disponibles</div>
          <p style={{fontSize:14, marginTop:8}}>
            Asigna cámaras a vehículos usando:<br/>
            <code style={{backgroundColor:"#f3f4f6", padding:"2px 6px", borderRadius:4}}>
              POST /api/camaras/vehicle/&#123;id&#125;/camera
            </code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth:1400, margin:"0 auto", padding:"24px 16px" }}>
      <h1 style={{ fontSize:28, fontWeight:700, marginBottom:8, color:"#111827" }}>
        🎥 Cámaras en vivo
      </h1>
      <p style={{ color:"#6b7280", marginBottom:24, fontSize:16 }}>
        Monitoreo en tiempo real de <strong>{cams.length}</strong> cámara(s)
      </p>
      <div style={{ 
        display:"grid", 
        gridTemplateColumns:"repeat(auto-fit, minmax(380px,1fr))", 
        gap:20 
      }}>
        {cams.map(c => (
          <VideoPlayer 
            key={c.id} 
            m3u8Url={c.m3u8} 
            title={`Cámara ${c.id.toUpperCase()}`} 
          />
        ))}
      </div>
    </div>
  );
}


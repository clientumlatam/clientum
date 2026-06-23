import { useState, useEffect, useRef } from 'react';
import {
  Play, Pause, RotateCcw, Copy, Sparkles, MessageSquare,
  Video, FileText, Sliders, FileCheck, CheckCircle, Download
} from 'lucide-react';

import { color as brandColor } from '@/brand';

const BRAND = {
  prussianBlue: brandColor.prussianBlue,
  duskBlue:     brandColor.duskBlue,
  offWhite:     brandColor.offWhite,
  pureWhite:    brandColor.pureWhite,
  alabasterGrey:brandColor.alabaster,
};

const BASE_SCENES = [
  { id: 0, title: "Apertura de marca",       duration: 5, icon: "◆" },
  { id: 1, title: "El caos administrativo",  duration: 7, icon: "📞" },
  { id: 2, title: "El costo real (Stats)",   duration: 6, icon: "📊" },
  { id: 3, title: "La solución integrada",   duration: 7, icon: "🔄" },
  { id: 4, title: "Bot de WhatsApp Activo",  duration: 5, icon: "🤖" },
  { id: 5, title: "Stack de tecnología",     duration: 5, icon: "🌐" },
  { id: 6, title: "Prueba social y confianza",duration: 5, icon: "★" },
  { id: 7, title: "Llamado a la acción (CTA)",duration: 5, icon: "🚀" }
];

const CAMPAIGN_TONES: Record<string, { name: string; scripts: { visual: string; copy: string }[] }> = {
  estandar: {
    name: "Estándar (Corporativo Seguro)",
    scripts: [
      { visual: "Logo Clientum aparece de forma fluida. Partículas sutiles de conexión tecnológica de fondo.", copy: "Tu PyME merece trabajar con Inteligencia Artificial. No sin ella." },
      { visual: "Palabras y tareas administrativas se apilan caóticamente (WhatsApp, Facturas, Excel, Stock).", copy: "Responder WhatsApps, cargar facturas, controlar stock... ¿Cuánto tiempo perdés en esto cada día?" },
      { visual: "Aparecen métricas limpias y un cronómetro acelerando. '1.095 horas al año perdidas'.", copy: "Son más de 3 horas diarias restadas a lo que de verdad hace crecer tu negocio." },
      { visual: "Flujo animado interactivo con flechas de conexión: WhatsApp → IA → CRM → ERP Clientum.", copy: "Clientum conecta tus herramientas con IA avanzada. Todo automatizado y bajo control." },
      { visual: "Mockup de dispositivo móvil respondiendo un presupuesto automáticamente en 2 segundos.", copy: "Tu negocio atiende, gestiona y califica clientes las 24 horas del día de forma automática." },
      { visual: "Se despliega la red de herramientas nativas integradas (n8n, WooCommerce, Dolibarr, Gemini).", copy: "Tecnología de primer nivel optimizada para la realidad de las PyMEs argentinas." },
      { visual: "Tarjeta de testimonio real de cliente en Neuquén con calificación de 5 estrellas.", copy: "'Dejé de responder WhatsApps manualmente. El bot con IA lo hace mucho mejor que yo'." },
      { visual: "Llamado a la acción final con URL de Clientum, WhatsApp de contacto y botón pulsante.", copy: "Pedí tu diagnóstico gratuito hoy. Diseñamos tu propuesta personalizada en un plazo de 48 horas." }
    ]
  },
  dramatico: {
    name: "Dramático (Impacto y Dolor)",
    scripts: [
      { visual: "Fondo oscuro con interferencias visuales premium. Logo estático de Clientum imponente.", copy: "¿Seguro que estás controlando tu PyME, o el desorden del día a día te controla a vos?" },
      { visual: "Alertas rojas parpadeantes y notificaciones sin responder acumulándose en pantalla.", copy: "Cada mensaje sin responder es dinero quemándose. Cada planilla manual es un error costoso." },
      { visual: "Frase de gran impacto visual: 'El cansancio humano no escala'. Transición cinematográfica.", copy: "No podés duplicar tus horas, pero sí podés multiplicar tu eficiencia con un sistema inteligente." },
      { visual: "Esquema ultra limpio donde desaparecen los pasos manuales y toma el control el backend inteligente.", copy: "Inyectá Inteligencia Artificial real y liberá a tu equipo de la rutina operativa repetitiva." },
      { visual: "Un chatbot automatizado cerrando una venta de manera autónoma a las 3:15 AM de un día feriado.", copy: "Recuperá tus fines de semana mientras tu sistema sigue facturando y respondiendo consultas sin pausa." },
      { visual: "Estructura de arquitectura blindada local sin plataformas costosas de licenciamiento en dólares.", copy: "Automatización robusta, transparente y adaptada con precisión a la economía local." },
      { visual: "Cita contundente en tipografía destacada sobre el aumento del 200% en ventas automáticas.", copy: "'Pasamos de perder la mitad de los mensajes a procesar todo al instante. Nos cambió la vida'." },
      { visual: "Placa final limpia e imperativa invitando a la acción de auditoría estratégica inmediata.", copy: "El desorden te cuesta caro. Reservá tu diagnóstico gratuito ahora y frená las pérdidas." }
    ]
  },
  express: {
    name: "Express (15s de Alta Conversión)",
    scripts: [
      { visual: "Entrada directa y veloz con tipografía de alto impacto y transición dinámica.", copy: "Dejá de contestar los mismos mensajes de WhatsApp una y otra vez." },
      { visual: "Flujo rápido de automatización integrando de forma instantánea el CRM y la Facturación AFIP.", copy: "Clientum automatiza tus ventas, CRM y stock con Inteligencia Artificial real." },
      { visual: "Iconos de marcas y nubes de herramientas integrándose sin costuras en pantalla.", copy: "Implementación ágil en 30 días, precios transparentes en pesos y sin sorpresas." },
      { visual: "Sticker interactivo de WhatsApp parpadeando y enlace de contacto directo en bio.", copy: "Hacé clic abajo y obtené tu diagnóstico 100% gratuito hoy mismo." },
      { visual: "Enlace web de Clientum directo en pantalla.", copy: "¡Obtené tu diagnóstico gratuito hoy!" },
      { visual: "Enlace web de Clientum directo en pantalla.", copy: "¡Obtené tu diagnóstico gratuito hoy!" },
      { visual: "Enlace web de Clientum directo en pantalla.", copy: "¡Obtené tu diagnóstico gratuito hoy!" },
      { visual: "Enlace web de Clientum directo en pantalla.", copy: "¡Obtené tu diagnóstico gratuito hoy!" }
    ]
  }
};

export default function StudioAppPage() {
  const [activeTab, setActiveTab]       = useState('video');
  const [tone, setTone]                 = useState('estandar');
  const [pymeName, setPymeName]         = useState('Clientum');
  const [pymePhone, setPymePhone]       = useState('+54 9 298 451-0883');
  const [priceBasic, setPriceBasic]     = useState('180.000');
  const [priceFull, setPriceFull]       = useState('350.000');
  const [selectedHook, setSelectedHook] = useState(0);
  const [isPlaying, setIsPlaying]       = useState(false);
  const [elapsed, setElapsed]           = useState(0);
  const playerRef                       = useRef<HTMLDivElement>(null);
  const [toast, setToast]               = useState({ show: false, message: '' });

  const hooksList = [
    `¿Cuántas horas por semana perdés con tareas de tu PyME que podría hacer una IA?`,
    `Si tu negocio depende de vos para responder cada WhatsApp... no tenés un negocio, tenés un autoempleo.`,
    `¿Sabías que las PyMEs que automatizan con IA crecen hasta 3 veces más rápido en Argentina?`,
    `La forma en la que administrás tu stock y facturación está frenando tus ventas. Así se soluciona.`
  ];

  const triggerToast = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  const copyToClipboard = (text: string) => {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); triggerToast('¡Copiado al portapapeles!'); }
    catch { triggerToast('Error al copiar.'); }
    document.body.removeChild(ta);
  };

  const sceneDurations = tone === 'express' ? [2, 3, 3, 3, 1, 1, 1, 1] : BASE_SCENES.map(s => s.duration);
  const totalDuration  = sceneDurations.reduce((a, b) => a + b, 0);
  const sceneTimes: number[] = [];
  let accum = 0;
  sceneDurations.forEach(d => { sceneTimes.push(accum); accum += d; });

  useEffect(() => {
    let rafId: number;
    let last = performance.now();
    const tick = (now: number) => {
      if (isPlaying) {
        const delta = (now - last) / 1000;
        setElapsed(prev => { const next = prev + delta; return next >= totalDuration ? 0 : next; });
      }
      last = now;
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, totalDuration]);

  let currentSceneIdx = 0;
  for (let i = sceneTimes.length - 1; i >= 0; i--) {
    if (elapsed >= sceneTimes[i]) { currentSceneIdx = i; break; }
  }

  const handleSceneDot  = (idx: number) => setElapsed(sceneTimes[idx]);
  const handlePrevScene = () => setElapsed(sceneTimes[currentSceneIdx > 0 ? currentSceneIdx - 1 : sceneTimes.length - 1]);
  const handleNextScene = () => setElapsed(sceneTimes[currentSceneIdx < sceneTimes.length - 1 ? currentSceneIdx + 1 : 0]);

  const generatedCaption = `Si tu negocio todavía depende de vos para responder cada mensaje, procesar cada pedido y cargar cada factura... estás trabajando para el negocio, no al revés.

${pymeName} automatiza eso con Inteligencia Artificial real.
→ Bot de WhatsApp activo 24/7
→ CRM + ERP integrado (WooCommerce, AFIP, stock)
→ Sin plataformas caras de licenciamiento en dólares
→ Configuración a medida en menos de 30 días

Planes desde $${priceBasic}/mes. ¡Setup e implementación única disponible!

Pedí tu diagnóstico gratuito sin costo hoy mismo 👇
📲 Escribinos por WhatsApp al ${pymePhone} o visitá clientum.com.ar`;

  const handleDownloadReelHTML = () => {
    const activeScript = CAMPAIGN_TONES[tone].scripts;
    const slides = BASE_SCENES.map((scene, idx) => ({
      title: scene.title,
      icon: scene.icon,
      copy: idx === 0 ? hooksList[selectedHook] : (activeScript[idx]?.copy || ''),
      visual: activeScript[idx]?.visual || '',
      idx,
    }));

    const escapedCaption = generatedCaption
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    const slidesHTML = slides.map(s => {
      const escapedCopy   = s.copy.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      const escapedVisual = s.visual.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      return `
      <div class="slide">
        <div class="slide-header">
          <span class="brand">@${pymeName.toLowerCase().replace(/\s+/g,'')}.ar</span>
          <span class="badge">REEL</span>
        </div>
        <div class="slide-body">
          <div class="scene-label">Esc. ${s.idx + 1} &nbsp;·&nbsp; ${s.title}</div>
          <div class="icon">${s.icon}</div>
          <div class="copy">${escapedCopy}</div>
          <div class="visual-note">${escapedVisual}</div>
        </div>
        <div class="footer">
          <div class="footer-brand">${pymeName}</div>
          <div class="footer-sub">clientum.com.ar · ${pymePhone}</div>
        </div>
      </div>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pymeName} — Reels Verticales · ${CAMPAIGN_TONES[tone].name}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{
      background:#0d1117;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      display:flex;flex-direction:column;align-items:center;
      padding:48px 24px 64px;gap:48px;min-height:100vh;color:#fff;
    }
    header{text-align:center}
    header h1{font-size:22px;font-weight:900;letter-spacing:1px;color:#FDFDFB}
    header p{font-size:12px;color:#3B506D;margin-top:6px;letter-spacing:2px;text-transform:uppercase}
    .grid{
      display:grid;
      grid-template-columns:repeat(auto-fill,260px);
      gap:28px;justify-content:center;width:100%;max-width:1200px;
    }
    .slide{
      width:260px;height:462px;
      background:linear-gradient(155deg,#1e3158 0%,#031E43 100%);
      border-radius:28px;padding:18px;
      display:flex;flex-direction:column;justify-content:space-between;
      border:1.5px solid rgba(255,255,255,0.09);
      box-shadow:0 24px 64px rgba(0,0,0,0.6);
      position:relative;overflow:hidden;
    }
    .slide::before{
      content:'';position:absolute;inset:0;
      background:radial-gradient(ellipse at 70% 15%,rgba(255,255,255,0.07) 0%,transparent 65%);
      pointer-events:none;
    }
    .slide-header{display:flex;justify-content:space-between;align-items:center;position:relative;z-index:1}
    .brand{font-size:9px;font-weight:800;letter-spacing:3px;color:rgba(255,255,255,0.75);text-transform:uppercase}
    .badge{
      background:#ef4444;color:#fff;
      font-size:7px;font-weight:900;padding:3px 7px;border-radius:5px;letter-spacing:1px;
    }
    .slide-body{flex:1;display:flex;flex-direction:column;justify-content:center;gap:10px;padding:12px 0;position:relative;z-index:1}
    .scene-label{font-size:8.5px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.45)}
    .icon{font-size:28px}
    .copy{font-size:14px;font-weight:900;color:#fff;line-height:1.45}
    .visual-note{
      font-size:9px;color:rgba(255,255,255,0.45);line-height:1.5;
      border-left:2px solid rgba(255,255,255,0.15);padding-left:8px;
      display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;
    }
    .footer{
      background:rgba(0,0,0,0.38);border-radius:14px;padding:10px 12px;
      position:relative;z-index:1;
    }
    .footer-brand{font-size:9px;font-weight:800;color:#fff;margin-bottom:3px}
    .footer-sub{font-size:8px;color:rgba(255,255,255,0.55)}
    .caption-section{width:100%;max-width:860px}
    .caption-section h2{
      font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;
      color:#3B506D;margin-bottom:14px;
    }
    .caption-box{
      background:#031E43;border-radius:18px;padding:24px 28px;
      border:1.5px solid rgba(255,255,255,0.07);
    }
    .caption-text{
      font-family:'Courier New',monospace;font-size:12.5px;
      color:#FDFDFB;line-height:1.75;white-space:pre-wrap;
    }
    .hashtags{
      margin-top:14px;padding-top:14px;
      border-top:1px solid rgba(255,255,255,0.08);
      font-size:12px;color:#3B506D;line-height:1.8;
    }
    .meta{font-size:10px;color:#3B506D;text-align:center;opacity:.6}
  </style>
</head>
<body>
  <header>
    <h1>${pymeName} — Video &amp; Reels Verticales</h1>
    <p>${CAMPAIGN_TONES[tone].name} &nbsp;·&nbsp; ${totalDuration}s &nbsp;·&nbsp; ${BASE_SCENES.length} escenas</p>
  </header>

  <div class="grid">
    ${slidesHTML}
  </div>

  <div class="caption-section">
    <h2>Caption para redes sociales</h2>
    <div class="caption-box">
      <div class="caption-text">${escapedCaption}</div>
      <div class="hashtags">#AutomatizacionIA &nbsp;#PyMEArgentina &nbsp;#WhatsAppBusiness &nbsp;#Clientum &nbsp;#CRM &nbsp;#ERP</div>
    </div>
  </div>

  <p class="meta">Generado con Clientum Studio · ${new Date().toLocaleDateString('es-AR')}</p>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `Reels_${pymeName.replace(/\s+/g,'_')}_${tone}.html`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    triggerToast('¡HTML descargado — abrilo en tu navegador!');
  };

  const handleDownloadPack = () => {
    const activeScript = CAMPAIGN_TONES[tone].scripts;
    const dateStr = new Date().toLocaleDateString('es-AR');
    const content = `======================================================================
CLIENTUM STUDIO - PACK DE CAMPAÑA AUTOMÁTICO
Generado el ${dateStr} - Tono: ${CAMPAIGN_TONES[tone].name}
======================================================================

1. DATOS DE CONFIGURACIÓN:
* Nombre: ${pymeName}
* WhatsApp: ${pymePhone}
* Plan Básico: $${priceBasic}/mes
* Plan Más Elegido: $${priceFull}/mes
* Hook activo: "${hooksList[selectedHook]}"

======================================================================
2. GUION & STORYBOARD (${totalDuration}s)
======================================================================
${BASE_SCENES.map((scene, idx) => {
  const s = activeScript[idx] || { visual: '', copy: '' };
  return `[ESCENA ${idx + 1}]: ${scene.title}
Tiempos: 0:${sceneTimes[idx].toString().padStart(2,'0')}s - 0:${(sceneTimes[idx]+sceneDurations[idx]).toString().padStart(2,'0')}s
Visual: ${s.visual}
Locución: "${idx === 0 ? hooksList[selectedHook] : s.copy}"
`;
}).join('\n')}
======================================================================
3. CAPTION PARA REDES
======================================================================
${generatedCaption}

#AutomatizacionIA #PyMEArgentina #WhatsAppBusiness #Clientum #CRM #ERP
======================================================================`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `Campaña_${pymeName.replace(/\s+/g,'_')}_${tone}.txt`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    triggerToast('¡Pack descargado correctamente!');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: BRAND.prussianBlue }}>
            Clientum Studio
          </h1>
          <p className="text-sm mt-0.5" style={{ color: BRAND.duskBlue }}>
            Estrategia, Video &amp; Copys con identidad de marca
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg px-3 py-2 border" style={{ borderColor: BRAND.alabasterGrey, backgroundColor: BRAND.offWhite }}>
            <span className="text-xs font-bold uppercase" style={{ color: BRAND.duskBlue }}>Tono:</span>
            <select value={tone} onChange={e => { setTone(e.target.value); setElapsed(0); }}
              className="text-xs font-semibold bg-transparent border-none focus:outline-none cursor-pointer"
              style={{ color: BRAND.prussianBlue }}>
              <option value="estandar">Estándar (Corporativo)</option>
              <option value="dramatico">Dramático (Impacto)</option>
              <option value="express">Express (15 seg)</option>
            </select>
          </div>
          <button onClick={handleDownloadPack}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold tracking-wider uppercase text-white shadow-sm transition hover:opacity-90"
            style={{ backgroundColor: BRAND.prussianBlue }}>
            <Download className="w-4 h-4" /> Descargar Pack
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast.show && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white"
          style={{ backgroundColor: BRAND.prussianBlue }}>
          <CheckCircle className="w-4 h-4 text-green-400" />
          {toast.message}
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-6">

        {/* LEFT: config */}
        <aside className="lg:col-span-4 flex flex-col gap-5">

          {/* Datos de marca */}
          <div className="rounded-2xl p-5 border shadow-sm" style={{ backgroundColor: BRAND.pureWhite, borderColor: BRAND.alabasterGrey }}>
            <div className="flex items-center gap-2 mb-3">
              <Sliders className="w-4 h-4" style={{ color: BRAND.duskBlue }} />
              <h2 className="text-xs font-bold uppercase tracking-wider">Configurar Datos de Marca</h2>
            </div>
            <p className="text-[11px] mb-4" style={{ color: BRAND.duskBlue }}>
              Modificá estos campos para actualizar el reproductor, el guion, los captions y las métricas.
            </p>
            <div className="space-y-3">
              {[
                { label: 'Nombre del Negocio', value: pymeName, set: setPymeName },
                { label: 'WhatsApp de Contacto', value: pymePhone, set: setPymePhone },
              ].map(({ label, value, set }) => (
                <div key={label}>
                  <label className="block text-[10px] font-bold uppercase mb-1" style={{ color: BRAND.duskBlue }}>{label}</label>
                  <input type="text" value={value} onChange={e => set(e.target.value)}
                    className="w-full text-sm px-3 py-1.5 rounded-lg border focus:outline-none"
                    style={{ borderColor: BRAND.alabasterGrey, color: BRAND.prussianBlue, backgroundColor: BRAND.offWhite }} />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Plan Básico ($)', value: priceBasic, set: setPriceBasic },
                  { label: 'Plan Elegido ($)', value: priceFull,  set: setPriceFull },
                ].map(({ label, value, set }) => (
                  <div key={label}>
                    <label className="block text-[10px] font-bold uppercase mb-1" style={{ color: BRAND.duskBlue }}>{label}</label>
                    <input type="text" value={value} onChange={e => set(e.target.value)}
                      className="w-full text-sm px-3 py-1.5 rounded-lg border focus:outline-none"
                      style={{ borderColor: BRAND.alabasterGrey, color: BRAND.prussianBlue, backgroundColor: BRAND.offWhite }} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Hooks */}
          <div className="rounded-2xl p-5 border shadow-sm" style={{ backgroundColor: BRAND.pureWhite, borderColor: BRAND.alabasterGrey }}>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4" style={{ color: BRAND.duskBlue }} />
              <h2 className="text-xs font-bold uppercase tracking-wider">Variaciones de Hooks (Reels)</h2>
            </div>
            <div className="space-y-2">
              {hooksList.map((h, idx) => (
                <button key={idx}
                  onClick={() => { setSelectedHook(idx); setElapsed(0); triggerToast(`Hook #${idx + 1} seleccionado`); }}
                  className="w-full text-left p-2.5 rounded-xl border text-xs leading-relaxed transition flex gap-2 items-start"
                  style={{
                    borderColor: selectedHook === idx ? BRAND.prussianBlue : BRAND.alabasterGrey,
                    backgroundColor: selectedHook === idx ? BRAND.offWhite : BRAND.pureWhite,
                    fontWeight: selectedHook === idx ? '600' : '400'
                  }}>
                  <span className="font-bold shrink-0" style={{ color: BRAND.duskBlue }}>#{idx + 1}</span>
                  <span>{h}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Paleta */}
          <div className="rounded-2xl p-5 border shadow-sm" style={{ backgroundColor: BRAND.pureWhite, borderColor: BRAND.alabasterGrey }}>
            <h3 className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: BRAND.duskBlue }}>Paleta Oficial</h3>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { color: BRAND.prussianBlue, label: 'Azul Prusiano',   text: '#fff' },
                { color: BRAND.duskBlue,     label: 'Azul Crepúsculo', text: '#fff' },
                { color: BRAND.alabasterGrey,label: 'Gris Alabastro',  text: BRAND.prussianBlue },
                { color: BRAND.offWhite,     label: 'Blanco Roto',     text: BRAND.prussianBlue },
                { color: BRAND.pureWhite,    label: 'Blanco Puro',     text: BRAND.prussianBlue },
              ].map(({ color, label, text }) => (
                <div key={color} onClick={() => copyToClipboard(color)} title={`Copiar ${label}`}
                  className="h-9 rounded-lg cursor-pointer flex items-center justify-center text-[9px] font-bold hover:scale-105 transition border"
                  style={{ backgroundColor: color, color: text, borderColor: BRAND.alabasterGrey }}>
                  HEX
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-center" style={{ color: BRAND.duskBlue }}>Clic para copiar el código HEX.</p>
          </div>

        </aside>

        {/* RIGHT: content */}
        <section className="lg:col-span-8 flex flex-col gap-5">

          {/* Tabs */}
          <div className="flex border-b" style={{ borderColor: BRAND.alabasterGrey }}>
            {[
              { key: 'video',   label: 'Video & Storyboard',      icon: <Video className="w-4 h-4" /> },
              { key: 'content', label: 'Copys & Reels Verticales', icon: <FileText className="w-4 h-4" /> },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-2 px-5 py-2.5 font-bold text-sm tracking-wide uppercase transition border-b-2 -mb-px"
                style={{ color: activeTab === tab.key ? BRAND.prussianBlue : BRAND.duskBlue, borderColor: activeTab === tab.key ? BRAND.prussianBlue : 'transparent' }}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* ── TAB VIDEO ── */}
          {activeTab === 'video' && (
            <div className="flex flex-col gap-5">

              {/* Player */}
              <div className="rounded-2xl overflow-hidden border shadow-lg" style={{ backgroundColor: BRAND.prussianBlue, borderColor: BRAND.duskBlue }}>
                <div ref={playerRef} onClick={() => setIsPlaying(!isPlaying)}
                  className="relative w-full aspect-video flex flex-col items-center justify-center p-6 md:p-10 text-center select-none cursor-pointer"
                  style={{ background: `radial-gradient(circle, ${BRAND.duskBlue} 0%, ${BRAND.prussianBlue} 90%)` }}>

                  <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />

                  <div className="absolute top-4 left-4 flex items-center gap-2 opacity-80">
                    <span className="text-xs font-extrabold tracking-widest text-white uppercase">{pymeName} IA</span>
                  </div>
                  <div className="absolute top-4 right-4 text-[10px] font-mono px-2 py-1 rounded bg-black/30 text-white">
                    Escena {currentSceneIdx + 1}/8 · {elapsed.toFixed(1)}s
                  </div>

                  <div className="flex flex-col items-center gap-4 max-w-xl">
                    {currentSceneIdx === 0 && (
                      <div className="space-y-3">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold text-white uppercase bg-white/20">
                          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                          {pymeName} AUTOMATIZACIONES
                        </span>
                        <h2 className="text-xl md:text-2xl font-extrabold text-white leading-tight">{hooksList[selectedHook]}</h2>
                      </div>
                    )}
                    {currentSceneIdx === 1 && (
                      <div className="space-y-3 w-full">
                        <h3 className="text-[10px] font-bold tracking-widest uppercase text-white/90">EL CAOS COTIDIANO EN TU PyME</h3>
                        <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-white">
                          {['📞 WhatsApps', '📑 Facturas AFIP', '📊 Excel Manual', '📦 Stock', '📱 Sin respuesta', '⏱️ Tiempo perdido'].map(t => (
                            <div key={t} className="p-2.5 rounded-lg bg-red-950/40 border border-red-500/30">{t}</div>
                          ))}
                        </div>
                        <p className="text-sm font-semibold text-red-300">{CAMPAIGN_TONES[tone].scripts[1].copy}</p>
                      </div>
                    )}
                    {currentSceneIdx === 2 && (
                      <div className="space-y-3">
                        <div className="text-5xl font-black text-white">365 días</div>
                        <div className="text-lg font-bold text-white/90">= 1.095 Horas Perdidas al Año</div>
                        <p className="text-sm text-white">{CAMPAIGN_TONES[tone].scripts[2].copy}</p>
                      </div>
                    )}
                    {currentSceneIdx === 3 && (
                      <div className="space-y-4 w-full">
                        <span className="text-xs font-bold tracking-wider text-green-300 uppercase">La Solución Clientum</span>
                        <div className="flex items-center justify-center gap-2 text-xs font-bold text-white flex-wrap">
                          {['WhatsApp', 'IA', 'CRM', 'ERP'].map((item, i, arr) => (
                            <div key={item} className="flex items-center gap-2">
                              <div className={`px-3 py-1.5 rounded border ${i === 1 ? 'bg-white/20 border-white' : 'bg-white/10 border-white/20'}`}>{item}</div>
                              {i < arr.length - 1 && <span className="opacity-50">→</span>}
                            </div>
                          ))}
                        </div>
                        <p className="text-sm font-bold text-white">{CAMPAIGN_TONES[tone].scripts[3].copy}</p>
                      </div>
                    )}
                    {currentSceneIdx === 4 && (
                      <div className="w-full max-w-xs bg-black/40 p-4 rounded-2xl border border-white/10 space-y-2">
                        <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-xs text-white font-bold">Bot Clientum IA · 24/7</span>
                        </div>
                        <div className="space-y-2 text-left">
                          <div className="bg-white/10 text-white p-2 rounded-lg rounded-tl-none text-[11px] max-w-[80%]">¿Qué precio tiene el plan básico?</div>
                          <div className="p-2 rounded-lg rounded-tr-none text-[11px] max-w-[80%] ml-auto text-right text-white" style={{ backgroundColor: BRAND.duskBlue }}>El plan básico vale ${priceBasic}/mes.</div>
                        </div>
                      </div>
                    )}
                    {currentSceneIdx === 5 && (
                      <div className="space-y-3">
                        <h3 className="text-[10px] font-bold tracking-widest text-white uppercase">Sincronización Tecnológica</h3>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {['n8n', 'WooCommerce', 'Dolibarr ERP', 'Gemini IA', 'Evolution API', 'Supabase'].map(t => (
                            <span key={t} className="px-2.5 py-1 bg-white/15 rounded-md text-[10px] font-bold text-white border border-white/10">{t}</span>
                          ))}
                        </div>
                        <p className="text-sm text-white font-medium">{CAMPAIGN_TONES[tone].scripts[5].copy}</p>
                      </div>
                    )}
                    {currentSceneIdx === 6 && (
                      <div className="bg-white/10 p-4 rounded-2xl border border-white/10 max-w-sm space-y-2">
                        <div className="text-yellow-400">★★★★★</div>
                        <p className="text-xs italic text-white">{CAMPAIGN_TONES[tone].scripts[6].copy}</p>
                        <span className="block text-[10px] uppercase font-bold text-white/60">— Distribuidora Patagónica, Neuquén</span>
                      </div>
                    )}
                    {currentSceneIdx === 7 && (
                      <div className="space-y-3">
                        <h2 className="text-2xl font-black text-white">¡Automatizá hoy mismo!</h2>
                        <p className="text-xs text-white/80">{CAMPAIGN_TONES[tone].scripts[7].copy}</p>
                        <div className="inline-block px-4 py-2 bg-white text-[#031E43] text-xs font-extrabold rounded-full">📲 WhatsApp: {pymePhone}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 w-full cursor-pointer relative bg-white/10"
                  onClick={e => { const r = e.currentTarget.getBoundingClientRect(); setElapsed(((e.clientX - r.left) / r.width) * totalDuration); }}>
                  <div className="h-full bg-white transition-all duration-100" style={{ width: `${(elapsed / totalDuration) * 100}%` }} />
                  {sceneTimes.slice(1).map((t, i) => (
                    <div key={i} className="absolute top-0 w-0.5 h-full bg-black/30" style={{ left: `${(t / totalDuration) * 100}%` }} />
                  ))}
                </div>

                {/* Controls */}
                <div className="px-5 py-3 flex items-center justify-between gap-4 text-white">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setIsPlaying(!isPlaying)} className="p-2 rounded-full hover:bg-white/10 transition">
                      {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                    </button>
                    <button onClick={() => { setElapsed(0); setIsPlaying(false); }} className="p-2 rounded-full hover:bg-white/10 transition">
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono opacity-80">0:{Math.floor(elapsed).toString().padStart(2,'0')} / 0:{totalDuration}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {sceneDurations.map((_, idx) => (
                      <button key={idx} onClick={() => handleSceneDot(idx)}
                        className="w-2 h-2 rounded-full transition-all"
                        style={{ backgroundColor: currentSceneIdx === idx ? '#fff' : 'rgba(255,255,255,0.3)', transform: currentSceneIdx === idx ? 'scale(1.3)' : 'scale(1)' }} />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handlePrevScene} className="text-xs font-bold px-3 py-1 rounded hover:bg-white/10 border border-white/10">Anterior</button>
                    <button onClick={handleNextScene} className="text-xs font-bold px-3 py-1 rounded hover:bg-white/10 border border-white/10">Siguiente</button>
                  </div>
                </div>
              </div>

              {/* Storyboard */}
              <div className="rounded-2xl border p-5" style={{ backgroundColor: BRAND.pureWhite, borderColor: BRAND.alabasterGrey }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4" style={{ color: BRAND.duskBlue }} />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Guion &amp; Storyboard</h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded bg-[#DDDFE2]/40 uppercase" style={{ color: BRAND.duskBlue }}>
                    {totalDuration}s
                  </span>
                </div>
                <div className="space-y-2">
                  {BASE_SCENES.map((scene, idx) => {
                    const active  = currentSceneIdx === idx;
                    const script  = CAMPAIGN_TONES[tone].scripts[idx] || { visual: '', copy: '' };
                    return (
                      <div key={scene.id} onClick={() => handleSceneDot(idx)}
                        className="p-3 rounded-xl border cursor-pointer grid md:grid-cols-12 gap-3 items-start transition-all"
                        style={{ borderColor: active ? BRAND.prussianBlue : BRAND.alabasterGrey, backgroundColor: active ? BRAND.offWhite : BRAND.pureWhite }}>
                        <div className="md:col-span-3 flex items-center gap-2">
                          <span className="text-base">{scene.icon}</span>
                          <div>
                            <h4 className="text-[10px] font-bold uppercase" style={{ color: active ? BRAND.prussianBlue : BRAND.duskBlue }}>
                              Sc {idx + 1} · {scene.title}
                            </h4>
                            <span className="text-[9px] opacity-60 font-mono">
                              0:{sceneTimes[idx].toString().padStart(2,'0')}–0:{(sceneTimes[idx]+sceneDurations[idx]).toString().padStart(2,'0')}s
                            </span>
                          </div>
                        </div>
                        <div className="md:col-span-4 text-[10px] space-y-0.5">
                          <span className="block font-bold text-[9px] uppercase tracking-wider opacity-50">Visual / B-Roll</span>
                          <p style={{ color: BRAND.duskBlue }}>{script.visual}</p>
                        </div>
                        <div className="md:col-span-5 text-[10px] space-y-0.5">
                          <span className="block font-bold text-[9px] uppercase tracking-wider opacity-50">Locución</span>
                          <p className="font-semibold italic" style={{ color: BRAND.prussianBlue }}>
                            "{idx === 0 ? hooksList[selectedHook] : script.copy}"
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB CONTENT ── */}
          {activeTab === 'content' && (
            <div className="grid md:grid-cols-12 gap-5">

              {/* Simulador móvil */}
              <div className="md:col-span-5 flex flex-col items-center">
                <div className="w-full max-w-[240px] rounded-[32px] p-3 border-4 shadow-xl relative aspect-[9/16] flex flex-col justify-between overflow-hidden text-white"
                  style={{ backgroundColor: BRAND.prussianBlue, borderColor: BRAND.duskBlue }}>
                  <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-14 h-3.5 bg-black rounded-full z-20" />
                  <div className="z-10 flex items-center justify-between pt-4 px-2">
                    <span className="text-[9px] font-bold tracking-widest opacity-85">@clientum.ar</span>
                    <span className="text-[8px] bg-red-500 font-extrabold px-1.5 py-0.5 rounded">REEL</span>
                  </div>
                  <div className="z-10 flex-1 flex flex-col justify-center px-4 py-6 text-center">
                    <span className="text-[9px] font-bold tracking-wider uppercase opacity-75">Escena {currentSceneIdx + 1}</span>
                    <h4 className="text-sm font-black leading-tight mt-2">
                      {currentSceneIdx === 0 ? hooksList[selectedHook] : (CAMPAIGN_TONES[tone].scripts[currentSceneIdx]?.copy || '')}
                    </h4>
                  </div>
                  <div className="z-10 bg-black/40 p-2.5 rounded-2xl mx-1 mb-2 text-left">
                    <span className="text-[8px] font-extrabold">clientum.ar</span>
                    <p className="text-[7px] opacity-90 line-clamp-2 mt-0.5">{generatedCaption}</p>
                  </div>
                </div>
                <p className="text-[10px] mt-2 text-center" style={{ color: BRAND.duskBlue }}>
                  Usá los controles del reproductor para cambiar el slide.
                </p>
              </div>

              {/* Caption + estrategia */}
              <div className="md:col-span-7 flex flex-col gap-5">
                <div className="rounded-2xl border p-5" style={{ backgroundColor: BRAND.pureWhite, borderColor: BRAND.alabasterGrey }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" style={{ color: BRAND.duskBlue }} />
                      <h3 className="text-xs font-bold uppercase tracking-wider">Caption para Redes</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => copyToClipboard(generatedCaption)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold hover:bg-[#FDFDFB] transition"
                        style={{ borderColor: BRAND.alabasterGrey, color: BRAND.prussianBlue }}>
                        <Copy className="w-3 h-3" /> Copiar
                      </button>
                      <button onClick={handleDownloadPack}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold hover:bg-[#FDFDFB] transition"
                        style={{ borderColor: BRAND.prussianBlue, color: BRAND.prussianBlue }}>
                        <Download className="w-3 h-3" /> .TXT
                      </button>
                      <button onClick={handleDownloadReelHTML}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition hover:opacity-90"
                        style={{ backgroundColor: BRAND.prussianBlue }}>
                        <Download className="w-3 h-3" /> .HTML
                      </button>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl text-xs leading-relaxed font-mono whitespace-pre-wrap border max-h-60 overflow-y-auto"
                    style={{ backgroundColor: BRAND.offWhite, borderColor: BRAND.alabasterGrey, color: BRAND.prussianBlue }}>
                    {generatedCaption}
                  </div>
                  <div className="mt-3 pt-3 border-t space-y-1" style={{ borderColor: BRAND.alabasterGrey }}>
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Hashtags:</span>
                    <p className="text-[11px] font-medium" style={{ color: BRAND.duskBlue }}>
                      #AutomatizacionIA #PyMEArgentina #WhatsAppBusiness #Clientum #CRM #ERP
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border p-5" style={{ backgroundColor: BRAND.pureWhite, borderColor: BRAND.alabasterGrey }}>
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-3">Estrategia de Conversión Local</h4>
                  <div className="space-y-2.5">
                    {[
                      { title: "1. Precio Fijo en Pesos", body: "Sin sorpresas cambiarias ni impuestos de tarjeta extranjeros — a diferencia de Zapier o Salesforce." },
                      { title: "2. Soporte Local de Extremo a Extremo", body: "Setup en WhatsApp, adaptado a AFIP y sistemas locales." },
                      { title: "3. Automatización de Distribuidoras", body: "Stock desincronizado en WooCommerce → principal cuello en mayoristas de Neuquén y Río Negro." },
                    ].map(item => (
                      <div key={item.title} className="p-3 rounded-lg border text-xs" style={{ borderColor: BRAND.alabasterGrey, backgroundColor: BRAND.offWhite }}>
                        <strong className="block font-bold mb-0.5" style={{ color: BRAND.prussianBlue }}>{item.title}</strong>
                        <span style={{ color: BRAND.duskBlue }}>{item.body}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

        </section>
      </div>
    </div>
  );
}

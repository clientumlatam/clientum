import { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Copy,
  Sparkles,
  MessageSquare,
  Video,
  FileText,
  Sliders,
  FileCheck,
  CheckCircle,
  Download
} from 'lucide-react';
import { color as brandColor } from '@/brand';
import { ClientumLogo } from '@/components/ui/logo';

const BRAND = {
  prussianBlue: brandColor.prussianBlue,
  duskBlue:     brandColor.duskBlue,
  offWhite:     brandColor.offWhite,
  pureWhite:    brandColor.pureWhite,
  alabasterGrey:brandColor.alabaster,
};

const BASE_SCENES = [
  { id: 0, title: "Apertura de marca", duration: 5, icon: "◆" },
  { id: 1, title: "El caos administrativo", duration: 7, icon: "📞" },
  { id: 2, title: "El costo real (Stats)", duration: 6, icon: "📊" },
  { id: 3, title: "La solución integrada", duration: 7, icon: "🔄" },
  { id: 4, title: "Bot de WhatsApp Activo", duration: 5, icon: "🤖" },
  { id: 5, title: "Stack de tecnología", duration: 5, icon: "🌐" },
  { id: 6, title: "Prueba social y confianza", duration: 5, icon: "★" },
  { id: 7, title: "Llamado a la acción (CTA)", duration: 5, icon: "🚀" }
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

export default function Studio() {
  const [activeTab, setActiveTab] = useState('video');
  const [tone, setTone] = useState('estandar');

  const [pymeName, setPymeName] = useState('Clientum');
  const [pymePhone, setPymePhone] = useState('+54 9 298 451-0883');
  const [priceBasic, setPriceBasic] = useState('180.000');
  const [priceFull, setPriceFull] = useState('350.000');
  const [selectedHook, setSelectedHook] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const playerRef = useRef<HTMLDivElement>(null);

  const [toast, setToast] = useState({ show: false, message: '' });

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
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      triggerToast('¡Copiado con éxito al portapapeles!');
    } catch {
      triggerToast('Error al copiar el texto.');
    }
    document.body.removeChild(textArea);
  };

  const sceneDurations = tone === 'express' ? [2, 3, 3, 3, 1, 1, 1, 1] : BASE_SCENES.map(s => s.duration);
  const totalDuration = sceneDurations.reduce((a, b) => a + b, 0);

  const sceneTimes: number[] = [];
  let accum = 0;
  sceneDurations.forEach(d => {
    sceneTimes.push(accum);
    accum += d;
  });

  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const updateTimer = (now: number) => {
      if (isPlaying) {
        const delta = (now - lastTime) / 1000;
        setElapsed(prev => {
          const next = prev + delta;
          return next >= totalDuration ? 0 : next;
        });
      }
      lastTime = now;
      animationFrameId = requestAnimationFrame(updateTimer);
    };

    animationFrameId = requestAnimationFrame(updateTimer);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, totalDuration]);

  let currentSceneIdx = 0;
  for (let i = sceneTimes.length - 1; i >= 0; i--) {
    if (elapsed >= sceneTimes[i]) {
      currentSceneIdx = i;
      break;
    }
  }

  const handlePrevScene = () => {
    const prevIdx = currentSceneIdx > 0 ? currentSceneIdx - 1 : sceneTimes.length - 1;
    setElapsed(sceneTimes[prevIdx]);
  };

  const handleNextScene = () => {
    const nextIdx = currentSceneIdx < sceneTimes.length - 1 ? currentSceneIdx + 1 : 0;
    setElapsed(sceneTimes[nextIdx]);
  };

  const handleSceneDotClick = (idx: number) => {
    setElapsed(sceneTimes[idx]);
  };

  const generatedCaption = `Si tu negocio todavía depende de vos para responder cada mensaje, procesar cada pedido y cargar cada factura... estás trabajando para el negocio, no al revés.

${pymeName} automatiza eso con Inteligencia Artificial real.
→ Bot de WhatsApp activo 24/7
→ CRM + ERP integrado (WooCommerce, AFIP, stock)
→ Sin plataformas caras de licenciamiento en dólares
→ Configuración a medida en menos de 30 días

Planes desde $${priceBasic}/mes. ¡Setup e implementación única disponible!

Pedí tu diagnóstico gratuito sin costo hoy mismo 👇
📲 Escribinos directamente por WhatsApp al ${pymePhone} o visitá clientum.com.ar`;

  const handleDownloadPack = () => {
    const activeScript = CAMPAIGN_TONES[tone].scripts;
    const dateStr = new Date().toLocaleDateString('es-AR');

    const fileContent = `======================================================================
CLIENTUM STUDIO - PACK DE CAMPAÑA AUTOMÁTICO
Generado el ${dateStr} - Tono: ${CAMPAIGN_TONES[tone].name}
======================================================================

1. DATOS DE CONFIGURACIÓN DE TU NEGOCIO:
----------------------------------------------------------------------
* Nombre del Negocio: ${pymeName}
* WhatsApp de Contacto: ${pymePhone}
* Precio Plan Básico: $${priceBasic}/mes
* Precio Plan Más Elegido: $${priceFull}/mes
* Hook Activo para Video: "${hooksList[selectedHook]}"

======================================================================
2. GUION & STORYBOARD COMPLETO (Duración: ${totalDuration}s)
======================================================================
${BASE_SCENES.map((scene, idx) => {
  const sceneScript = activeScript[idx] || { visual: '', copy: '' };
  const actualCopy = idx === 0 ? hooksList[selectedHook] : sceneScript.copy;
  const startTime = sceneTimes[idx];
  const endTime = sceneTimes[idx] + sceneDurations[idx];
  return `[ESCENA ${idx + 1}]: ${scene.title}
Tiempos: 0:${startTime.toString().padStart(2, '0')}s a 0:${endTime.toString().padStart(2, '0')}s
----------------------------------------------------------------------
- Acción Visual / B-Roll Sugerido:
  ${sceneScript.visual}

- Texto en pantalla / Locución:
  "${actualCopy}"

`;
}).join('\n')}
======================================================================
3. COPY/CAPTION SUGERIDO PARA REDES SOCIALES
======================================================================
${generatedCaption}

Hashtags recomendados:
#AutomatizacionIA #PyMEArgentina #WhatsAppBusiness #n8n #Patagonia #Clientum #EstrategiaDigital #CRM #ERP

======================================================================
Generado con el Panel de Control de Clientum Studio 2026.
clientum.com.ar - Tu PyME merece trabajar con IA. No sin ella.
======================================================================`;

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Campaña_Clientum_${pymeName.replace(/\s+/g, '_')}_${tone}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    triggerToast('¡Pack de campaña descargado correctamente!');
  };

  return (
    <div className="min-h-screen font-sans transition-colors duration-300" style={{ backgroundColor: BRAND.offWhite, color: BRAND.prussianBlue }}>

      {/* HEADER */}
      <header className="border-b px-4 py-4 md:px-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4" style={{ backgroundColor: BRAND.pureWhite, borderColor: BRAND.alabasterGrey }}>
        <div className="flex items-center gap-3">
          <a href="/" aria-label="Volver al inicio">
            <ClientumLogo className="w-10 h-10 shadow-sm" />
          </a>
          <div>
            <h1 className="text-2xl font-bold tracking-tight uppercase" style={{ color: BRAND.prussianBlue }}>
              Clientum Studio
            </h1>
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: BRAND.duskBlue }}>
              Estrategia, Video &amp; Copys con Identidad de Marca
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg p-1.5 border" style={{ backgroundColor: BRAND.offWhite, borderColor: BRAND.alabasterGrey }}>
            <span className="text-xs font-bold px-2 uppercase" style={{ color: BRAND.duskBlue }}>Tono del Script:</span>
            <select
              value={tone}
              onChange={(e) => { setTone(e.target.value); setElapsed(0); }}
              className="text-xs font-semibold bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer pr-4"
              style={{ color: BRAND.prussianBlue }}
            >
              <option value="estandar">Estándar (Corporativo)</option>
              <option value="dramatico">Dramático (Impacto)</option>
              <option value="express">Express (15 Segundos)</option>
            </select>
          </div>

          <button
            onClick={handleDownloadPack}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold tracking-wider uppercase text-white shadow-md transition hover:scale-[1.02] active:scale-[0.98]"
            style={{ backgroundColor: BRAND.prussianBlue }}
          >
            <Download className="w-4 h-4" />
            Descargar Pack (.TXT)
          </button>
        </div>
      </header>

      {/* TOAST */}
      {toast.show && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold text-white" style={{ backgroundColor: BRAND.prussianBlue, borderColor: BRAND.duskBlue }}>
          <CheckCircle className="w-4 h-4 text-green-400" />
          {toast.message}
        </div>
      )}

      <main className="max-w-7xl mx-auto p-4 md:p-8 grid lg:grid-cols-12 gap-8">

        {/* PANEL IZQUIERDO */}
        <section className="lg:col-span-4 flex flex-col gap-6">

          {/* Configuración de marca */}
          <div className="rounded-2xl p-6 border shadow-sm" style={{ backgroundColor: BRAND.pureWhite, borderColor: BRAND.alabasterGrey }}>
            <div className="flex items-center gap-2 mb-4">
              <Sliders className="w-5 h-5" style={{ color: BRAND.duskBlue }} />
              <h2 className="text-sm font-bold uppercase tracking-wider">Configurar Datos de Marca</h2>
            </div>
            <p className="text-xs mb-4" style={{ color: BRAND.duskBlue }}>
              Modificá estos campos para actualizar dinámicamente el reproductor, el guion, los captions y las métricas.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase mb-1" style={{ color: BRAND.duskBlue }}>Nombre del Negocio</label>
                <input type="text" value={pymeName} onChange={(e) => setPymeName(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border focus:outline-none focus:ring-1 transition"
                  style={{ borderColor: BRAND.alabasterGrey, color: BRAND.prussianBlue, backgroundColor: BRAND.offWhite }} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase mb-1" style={{ color: BRAND.duskBlue }}>WhatsApp de Contacto</label>
                <input type="text" value={pymePhone} onChange={(e) => setPymePhone(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border focus:outline-none focus:ring-1 transition"
                  style={{ borderColor: BRAND.alabasterGrey, color: BRAND.prussianBlue, backgroundColor: BRAND.offWhite }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1" style={{ color: BRAND.duskBlue }}>Plan Básico ($)</label>
                  <input type="text" value={priceBasic} onChange={(e) => setPriceBasic(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-lg border focus:outline-none focus:ring-1 transition"
                    style={{ borderColor: BRAND.alabasterGrey, color: BRAND.prussianBlue, backgroundColor: BRAND.offWhite }} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1" style={{ color: BRAND.duskBlue }}>Plan Más Elegido ($)</label>
                  <input type="text" value={priceFull} onChange={(e) => setPriceFull(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-lg border focus:outline-none focus:ring-1 transition"
                    style={{ borderColor: BRAND.alabasterGrey, color: BRAND.prussianBlue, backgroundColor: BRAND.offWhite }} />
                </div>
              </div>
            </div>
          </div>

          {/* Hooks */}
          <div className="rounded-2xl p-6 border shadow-sm" style={{ backgroundColor: BRAND.pureWhite, borderColor: BRAND.alabasterGrey }}>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5" style={{ color: BRAND.duskBlue }} />
              <h2 className="text-sm font-bold uppercase tracking-wider">Variaciones de Hooks (Reels)</h2>
            </div>
            <p className="text-xs mb-3" style={{ color: BRAND.duskBlue }}>
              Hacé clic en una variante para reemplazar la escena de apertura:
            </p>
            <div className="space-y-2">
              {hooksList.map((h, idx) => (
                <button
                  key={idx}
                  onClick={() => { setSelectedHook(idx); setElapsed(0); triggerToast(`Hook #${idx + 1} seleccionado`); }}
                  className="w-full text-left p-3 rounded-xl border text-xs leading-relaxed transition flex gap-2 items-start"
                  style={{
                    borderColor: selectedHook === idx ? BRAND.prussianBlue : BRAND.alabasterGrey,
                    backgroundColor: selectedHook === idx ? BRAND.offWhite : BRAND.pureWhite,
                    fontWeight: selectedHook === idx ? '600' : '400'
                  }}
                >
                  <span className="font-bold shrink-0" style={{ color: BRAND.duskBlue }}>#{idx + 1}</span>
                  <span>{h}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Paleta */}
          <div className="rounded-2xl p-6 border shadow-sm" style={{ backgroundColor: BRAND.pureWhite, borderColor: BRAND.alabasterGrey }}>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: BRAND.duskBlue }}>Paleta Oficial de Clientum</h3>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { color: BRAND.prussianBlue, label: 'Azul Prusiano', textColor: '#fff' },
                { color: BRAND.duskBlue, label: 'Azul Crepúsculo', textColor: '#fff' },
                { color: BRAND.alabasterGrey, label: 'Gris Alabastro', textColor: BRAND.prussianBlue },
                { color: BRAND.offWhite, label: 'Blanco Roto', textColor: BRAND.prussianBlue },
                { color: BRAND.pureWhite, label: 'Blanco Puro', textColor: BRAND.prussianBlue }
              ].map(({ color, label, textColor }) => (
                <div
                  key={color}
                  onClick={() => copyToClipboard(color)}
                  className="h-10 rounded-lg cursor-pointer flex items-center justify-center text-[9px] font-bold shadow-sm hover:scale-105 transition border"
                  style={{ backgroundColor: color, color: textColor, borderColor: BRAND.alabasterGrey }}
                  title={`Copiar ${label}`}
                >
                  HEX
                </div>
              ))}
            </div>
            <div className="mt-2 text-[10px] text-center" style={{ color: BRAND.duskBlue }}>
              Hacé clic sobre cualquier color para copiar su código HEX oficial.
            </div>
          </div>

        </section>

        {/* PANEL DERECHO */}
        <section className="lg:col-span-8 flex flex-col gap-6">

          {/* Tabs */}
          <div className="flex border-b" style={{ borderColor: BRAND.alabasterGrey }}>
            {[
              { key: 'video', label: 'Video & Storyboard', icon: <Video className="w-4 h-4" /> },
              { key: 'content', label: 'Copys & Reels Verticales', icon: <FileText className="w-4 h-4" /> }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-2 px-6 py-3 font-bold text-sm tracking-wide uppercase transition border-b-2 -mb-px"
                style={{
                  color: activeTab === tab.key ? BRAND.prussianBlue : BRAND.duskBlue,
                  borderColor: activeTab === tab.key ? BRAND.prussianBlue : 'transparent'
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* TAB: VIDEO */}
          {activeTab === 'video' && (
            <div className="flex flex-col gap-6">

              {/* Reproductor */}
              <div className="rounded-2xl overflow-hidden border shadow-lg" style={{ backgroundColor: BRAND.prussianBlue, borderColor: BRAND.duskBlue }}>

                <div
                  ref={playerRef}
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="relative w-full aspect-video flex flex-col items-center justify-center p-6 md:p-12 text-center select-none cursor-pointer overflow-hidden"
                  style={{ background: `radial-gradient(circle, ${BRAND.duskBlue} 0%, ${BRAND.prussianBlue} 90%)` }}
                >
                  <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]"></div>

                  <div className="absolute top-4 left-4 flex items-center gap-2 opacity-85">
                    <ClientumLogo className="w-6 h-6" />
                    <span className="text-xs font-extrabold tracking-widest text-white uppercase">{pymeName} IA</span>
                  </div>

                  <div className="absolute top-4 right-4 text-[10px] font-mono px-2 py-1 rounded bg-black bg-opacity-30 text-white">
                    Escena {currentSceneIdx + 1}/8 · Tiempo: {elapsed.toFixed(1)}s
                  </div>

                  <div className="flex flex-col items-center gap-4 max-w-xl transition-all duration-300">

                    {currentSceneIdx === 0 && (
                      <div className="space-y-3">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider text-white uppercase bg-white bg-opacity-20">
                          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                          {pymeName} AUTOMATIZACIONES
                        </span>
                        <h2 className="text-xl md:text-3xl font-extrabold text-white leading-tight">
                          {hooksList[selectedHook]}
                        </h2>
                        <p className="text-xs text-white opacity-75">[B-Roll: Fondo corporativo profundo con partículas flotantes]</p>
                      </div>
                    )}

                    {currentSceneIdx === 1 && (
                      <div className="space-y-4 w-full">
                        <h3 className="text-xs font-bold tracking-widest uppercase text-white opacity-90">EL CAOS COTIDIANO EN TU PyME</h3>
                        <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-white">
                          {['📞 Contestar WhatsApps', '📑 Facturas AFIP', '📊 Excels Manuales', '📦 Control de Stock', '📱 Mensajes sin Responder', '⏱️ Horas Perdidas'].map(t => (
                            <div key={t} className="p-3 rounded-lg bg-red-950 bg-opacity-40 border border-red-500 border-opacity-30">{t}</div>
                          ))}
                        </div>
                        <p className="text-sm font-semibold text-red-300">{CAMPAIGN_TONES[tone].scripts[1].copy}</p>
                      </div>
                    )}

                    {currentSceneIdx === 2 && (
                      <div className="space-y-3">
                        <div className="text-5xl font-black text-white leading-none">365 días</div>
                        <div className="text-lg font-bold text-white opacity-90">= 1.095 Horas Perdidas al Año</div>
                        <p className="text-sm leading-relaxed text-white max-w-md">{CAMPAIGN_TONES[tone].scripts[2].copy}</p>
                      </div>
                    )}

                    {currentSceneIdx === 3 && (
                      <div className="space-y-4 w-full">
                        <span className="text-xs font-bold tracking-wider text-green-300 uppercase">La Solución Clientum</span>
                        <div className="flex items-center justify-center gap-2 text-xs font-bold text-white">
                          {['WhatsApp', 'IA', 'CRM', 'ERP'].map((item, i, arr) => (
                            <div key={item} className="flex items-center gap-2">
                              <div className={`px-3 py-2 rounded border ${i === 1 ? 'bg-white bg-opacity-20 border-white' : 'bg-white bg-opacity-10 border-white border-opacity-20'}`}>{item}</div>
                              {i < arr.length - 1 && <span className="text-white opacity-50">→</span>}
                            </div>
                          ))}
                        </div>
                        <p className="text-md font-bold text-white">{CAMPAIGN_TONES[tone].scripts[3].copy}</p>
                      </div>
                    )}

                    {currentSceneIdx === 4 && (
                      <div className="space-y-3 w-full max-w-sm bg-black bg-opacity-40 p-4 rounded-2xl border border-white border-opacity-10">
                        <div className="flex items-center gap-2 border-b border-white border-opacity-10 pb-2 mb-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                          <span className="text-xs text-white font-bold">Bot Clientum IA · Activo 24/7</span>
                        </div>
                        <div className="space-y-2 text-left">
                          <div className="bg-white bg-opacity-10 text-white p-2.5 rounded-lg rounded-tl-none text-[11px] max-w-[85%]">
                            Hola! ¿Qué precio tiene el plan básico?
                          </div>
                          <div className="p-2.5 rounded-lg rounded-tr-none text-[11px] max-w-[85%] ml-auto text-right text-white" style={{ backgroundColor: BRAND.duskBlue }}>
                            ¡Hola! El plan básico tiene un valor de ${priceBasic}/mes. Podés gestionarlo directamente acá.
                          </div>
                        </div>
                        <p className="text-xs text-white opacity-80 pt-2 font-medium">{CAMPAIGN_TONES[tone].scripts[4].copy}</p>
                      </div>
                    )}

                    {currentSceneIdx === 5 && (
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold tracking-widest text-white uppercase">Sincronización Tecnológica Robusta</h3>
                        <div className="flex flex-wrap gap-2 justify-center max-w-md">
                          {['n8n Workflows', 'WooCommerce', 'Dolibarr ERP', 'Gemini IA', 'Evolution API', 'Supabase'].map(tech => (
                            <span key={tech} className="px-3 py-1 bg-white bg-opacity-15 rounded-md text-[10px] font-bold text-white border border-white border-opacity-10">{tech}</span>
                          ))}
                        </div>
                        <p className="text-sm text-white font-medium">{CAMPAIGN_TONES[tone].scripts[5].copy}</p>
                      </div>
                    )}

                    {currentSceneIdx === 6 && (
                      <div className="space-y-2 bg-white bg-opacity-10 p-5 rounded-2xl border border-white border-opacity-10 max-w-md">
                        <div className="text-yellow-400 text-lg">★★★★★</div>
                        <p className="text-xs italic text-white leading-relaxed">{CAMPAIGN_TONES[tone].scripts[6].copy}</p>
                        <span className="block text-[10px] uppercase font-bold text-white opacity-60">— Distribuidora Patagónica, Neuquén</span>
                      </div>
                    )}

                    {currentSceneIdx === 7 && (
                      <div className="space-y-4">
                        <h2 className="text-2xl font-black text-white">¡Automatizá hoy mismo!</h2>
                        <p className="text-xs text-white opacity-80 leading-relaxed max-w-xs mx-auto">{CAMPAIGN_TONES[tone].scripts[7].copy}</p>
                        <div className="inline-block px-4 py-2 bg-white text-[#031E43] text-xs font-extrabold rounded-full shadow-md uppercase tracking-wider">
                          📲 WhatsApp: {pymePhone}
                        </div>
                      </div>
                    )}

                  </div>
                </div>

                {/* Barra de progreso */}
                <div
                  className="h-1.5 w-full cursor-pointer relative"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pct = (e.clientX - rect.left) / rect.width;
                    setElapsed(pct * totalDuration);
                  }}
                >
                  <div className="h-full transition-all duration-100" style={{ width: `${(elapsed / totalDuration) * 100}%`, backgroundColor: BRAND.pureWhite }}></div>
                  {sceneTimes.slice(1).map((t, idx) => (
                    <div key={idx} className="absolute top-0 w-0.5 h-full bg-black bg-opacity-30" style={{ left: `${(t / totalDuration) * 100}%` }}></div>
                  ))}
                </div>

                {/* Controles */}
                <div className="px-6 py-4 flex items-center justify-between gap-4 text-white">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setIsPlaying(!isPlaying)} className="p-2.5 rounded-full hover:bg-white hover:bg-opacity-10 transition">
                      {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                    </button>
                    <button onClick={() => { setElapsed(0); setIsPlaying(false); }} className="p-2.5 rounded-full hover:bg-white hover:bg-opacity-10 transition" title="Reiniciar">
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <div className="text-xs font-mono opacity-80">
                      0:{Math.floor(elapsed).toString().padStart(2, '0')} / 0:{totalDuration}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {sceneDurations.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSceneDotClick(idx)}
                        className="w-2.5 h-2.5 rounded-full transition-all"
                        style={{
                          backgroundColor: currentSceneIdx === idx ? BRAND.pureWhite : 'rgba(255,255,255,0.3)',
                          transform: currentSceneIdx === idx ? 'scale(1.2)' : 'scale(1)'
                        }}
                        title={`Escena ${idx + 1}`}
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={handlePrevScene} className="text-xs font-bold px-3 py-1.5 rounded hover:bg-white hover:bg-opacity-10 transition border border-white border-opacity-10">Anterior</button>
                    <button onClick={handleNextScene} className="text-xs font-bold px-3 py-1.5 rounded hover:bg-white hover:bg-opacity-10 transition border border-white border-opacity-10">Siguiente</button>
                  </div>
                </div>

              </div>

              {/* Storyboard */}
              <div className="rounded-2xl border p-6" style={{ backgroundColor: BRAND.pureWhite, borderColor: BRAND.alabasterGrey }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-5 h-5" style={{ color: BRAND.duskBlue }} />
                    <h3 className="text-sm font-bold uppercase tracking-wider">Estructura del Guion &amp; Storyboard</h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded bg-[#DDDFE2]/40 uppercase" style={{ color: BRAND.duskBlue }}>
                    Campaña de {totalDuration}s
                  </span>
                </div>
                <div className="space-y-3">
                  {BASE_SCENES.map((scene, idx) => {
                    const isActive = currentSceneIdx === idx;
                    const sceneScript = CAMPAIGN_TONES[tone].scripts[idx] || { visual: '', copy: '' };
                    return (
                      <div
                        key={scene.id}
                        onClick={() => handleSceneDotClick(idx)}
                        className="p-4 rounded-xl border transition-all cursor-pointer grid md:grid-cols-12 gap-4 items-start"
                        style={{
                          borderColor: isActive ? BRAND.prussianBlue : BRAND.alabasterGrey,
                          backgroundColor: isActive ? BRAND.offWhite : BRAND.pureWhite,
                          boxShadow: isActive ? '0 4px 12px rgba(3,30,67,0.05)' : 'none'
                        }}
                      >
                        <div className="md:col-span-3 flex items-center gap-2">
                          <span className="text-lg">{scene.icon}</span>
                          <div>
                            <h4 className="text-xs font-bold uppercase" style={{ color: isActive ? BRAND.prussianBlue : BRAND.duskBlue }}>
                              Sc {idx + 1} · {scene.title}
                            </h4>
                            <span className="text-[10px] opacity-60 font-mono">
                              0:{(sceneTimes[idx]).toString().padStart(2, '0')} - 0:{(sceneTimes[idx] + sceneDurations[idx]).toString().padStart(2, '0')}s
                            </span>
                          </div>
                        </div>
                        <div className="md:col-span-4 text-xs space-y-1">
                          <span className="block font-bold text-[9px] uppercase tracking-wider opacity-50">Acción Visual / B-Roll</span>
                          <p style={{ color: BRAND.duskBlue }}>{sceneScript.visual}</p>
                        </div>
                        <div className="md:col-span-5 text-xs space-y-1">
                          <span className="block font-bold text-[9px] uppercase tracking-wider opacity-50">Texto en pantalla / Locución</span>
                          <p className="font-semibold italic" style={{ color: BRAND.prussianBlue }}>
                            "{idx === 0 ? hooksList[selectedHook] : sceneScript.copy}"
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* TAB: CONTENT */}
          {activeTab === 'content' && (
            <div className="grid md:grid-cols-12 gap-6">

              {/* Simulador móvil */}
              <div className="md:col-span-5 flex flex-col items-center">
                <div className="w-full max-w-[260px] rounded-[36px] p-3 border-4 shadow-xl relative aspect-[9/16] flex flex-col justify-between overflow-hidden text-white" style={{ backgroundColor: BRAND.prussianBlue, borderColor: BRAND.duskBlue }}>
                  <div className="absolute top-2.5 left-1/2 transform -translate-x-1/2 w-16 h-4 bg-black rounded-full z-20"></div>
                  <div className="z-10 flex items-center justify-between pt-4 px-2">
                    <span className="text-[10px] font-bold tracking-widest text-white opacity-85">@clientum.ar</span>
                    <span className="text-[9px] bg-red-500 text-white font-extrabold px-1.5 py-0.5 rounded">REEL</span>
                  </div>
                  <div className="z-10 flex-1 flex flex-col justify-center px-4 py-8 text-center">
                    <span className="text-[10px] font-bold tracking-wider uppercase opacity-75" style={{ color: BRAND.alabasterGrey }}>
                      Escena {currentSceneIdx + 1} del Reel
                    </span>
                    <h4 className="text-md font-black leading-tight mt-2 text-white">
                      {currentSceneIdx === 0 ? hooksList[selectedHook] : (CAMPAIGN_TONES[tone].scripts[currentSceneIdx]?.copy || "Automatización con IA")}
                    </h4>
                    <p className="text-[10px] mt-2 opacity-80" style={{ color: BRAND.alabasterGrey }}>
                      Visual: {CAMPAIGN_TONES[tone].scripts[currentSceneIdx]?.visual}
                    </p>
                  </div>
                  <div className="z-10 bg-black bg-opacity-40 p-3 rounded-2xl mx-1 mb-2 text-left space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <ClientumLogo className="w-5 h-5 rounded-full" />
                      <span className="text-[9px] font-extrabold text-white">clientum.ar</span>
                    </div>
                    <p className="text-[8px] opacity-90 line-clamp-2 text-white">{generatedCaption}</p>
                  </div>
                </div>
                <span className="text-[10px] mt-3 font-semibold text-center" style={{ color: BRAND.duskBlue }}>
                  Usá los controles del reproductor para cambiar el slide del Reel.
                </span>
              </div>

              {/* Caption y estrategia */}
              <div className="md:col-span-7 flex flex-col gap-6">

                <div className="rounded-2xl border p-6" style={{ backgroundColor: BRAND.pureWhite, borderColor: BRAND.alabasterGrey }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" style={{ color: BRAND.duskBlue }} />
                      <h3 className="text-sm font-bold uppercase tracking-wider">Caption para Redes</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(generatedCaption)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold hover:bg-[#FDFDFB] transition"
                        style={{ borderColor: BRAND.alabasterGrey, color: BRAND.prussianBlue }}
                      >
                        <Copy className="w-3.5 h-3.5" /> Copiar
                      </button>
                      <button
                        onClick={handleDownloadPack}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold hover:bg-[#FDFDFB] transition"
                        style={{ borderColor: BRAND.prussianBlue, color: BRAND.prussianBlue }}
                      >
                        <Download className="w-3.5 h-3.5" /> Descargar (.TXT)
                      </button>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl text-xs leading-relaxed font-mono whitespace-pre-wrap border max-h-72 overflow-y-auto" style={{ backgroundColor: BRAND.offWhite, borderColor: BRAND.alabasterGrey, color: BRAND.prussianBlue }}>
                    {generatedCaption}
                  </div>
                  <div className="mt-4 pt-4 border-t space-y-2" style={{ borderColor: BRAND.alabasterGrey }}>
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Hashtags Estratégicos:</span>
                    <div className="text-[11px] font-medium leading-relaxed" style={{ color: BRAND.duskBlue }}>
                      #AutomatizacionIA #PyMEArgentina #WhatsAppBusiness #n8n #Patagonia #Clientum #EstrategiaDigital #CRM #ERP
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border p-6" style={{ backgroundColor: BRAND.pureWhite, borderColor: BRAND.alabasterGrey }}>
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-3">Estrategia de Conversión y Distribución</h4>
                  <p className="text-xs mb-4" style={{ color: BRAND.duskBlue }}>
                    Estrategias recomendadas para maximizar conversiones en mercados locales y provinciales de la Patagonia:
                  </p>
                  <div className="space-y-3">
                    {[
                      { title: "1. El Gancho del 'Precio Fijo en Pesos'", body: "Destacar que, a diferencia de herramientas de USA como Zapier o Salesforce, Clientum cobra en pesos fijos sin sorpresas cambiarias ni impuestos de tarjeta extranjeros." },
                      { title: "2. Soporte Local de Extremo a Extremo", body: "Enfatizar la cercanía de setup, el soporte directo por WhatsApp y la adaptación ágil a sistemas locales de facturación como AFIP." },
                      { title: "3. Automatización de Distribuidoras", body: "El stock desincronizado de los catálogos de WhatsApp es el principal cuello de botella en mayoristas de Neuquén y Río Negro. La integración con WooCommerce de Clientum lo soluciona de forma definitiva." }
                    ].map(item => (
                      <div key={item.title} className="p-3 rounded-lg border text-xs" style={{ borderColor: BRAND.alabasterGrey, backgroundColor: BRAND.offWhite }}>
                        <strong className="block font-bold mb-1" style={{ color: BRAND.prussianBlue }}>{item.title}</strong>
                        {item.body}
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

        </section>
      </main>

      <footer className="mt-12 border-t px-4 py-6 text-center text-xs font-medium" style={{ backgroundColor: BRAND.pureWhite, borderColor: BRAND.alabasterGrey, color: BRAND.duskBlue }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center justify-center gap-2">
            <ClientumLogo className="w-5 h-5" />
            <span>© 2026 {pymeName} IA. Todos los derechos reservados.</span>
          </div>
          <div className="flex items-center justify-center gap-4 text-[11px]">
            <a href="/" className="hover:underline">Inicio</a>
            <span>·</span>
            <a href="/contacto" className="hover:underline">Contacto</a>
          </div>
        </div>
      </footer>

    </div>
  );
}

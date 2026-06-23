import { useState, useEffect, useRef } from "react";

type Tab = "intro" | "ecosystem" | "arch" | "roadmap";

/* ── Section header — same pattern as Overview SH ── */
function SH({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-0.5 h-4 bg-[#031E43] rounded-full flex-shrink-0" />
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#3B506D" }}>{label}</p>
    </div>
  );
}

/* ── KPI card — same pattern as Overview ── */
function KpiCard({ icon, accent, label, value, sub }: {
  icon: string; accent: string; label: string; value: string; sub: string;
}) {
  return (
    <div className="bg-[#FFFFFF] border rounded-2xl overflow-hidden shadow-sm" style={{ borderColor: "#DDDFE2" }}>
      <div className="h-1 rounded-t-none" style={{ background: accent }} />
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#3B506D" }}>{label}</span>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-lg"
            style={{ background: `${accent}15` }}>
            <span>{icon}</span>
          </div>
        </div>
        <div className="text-3xl font-extrabold" style={{ color: "#031E43" }}>{value}</div>
        <div className="text-xs mt-2" style={{ color: "#3B506D" }}>{sub}</div>
      </div>
    </div>
  );
}

/* ── Animated bar chart ── */
const REPOS = [
  { name: "Odoo + Ingadhoc", legal: 98, ai: 42, accent: "#031E43" },
  { name: "Twenty CRM",      legal: 20, ai: 95, accent: "#3B506D" },
  { name: "NocoBase",        legal: 35, ai: 82, accent: "#6366F1" },
  { name: "idurar ERP",      legal: 50, ai: 68, accent: "#F59E0B" },
  { name: "Grocy",           legal: 15, ai: 72, accent: "#DDDFE2" },
];

function BarChart() {
  const [shown, setShown] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(e => { if (e[0].isIntersecting) setShown(true); }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="space-y-4">
      {REPOS.map(r => (
        <div key={r.name}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold" style={{ color: "#031E43" }}>{r.name}</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] w-20 text-right font-mono" style={{ color: "#3B506D" }}>Contable</span>
              <div className="flex-1 h-2 rounded-full" style={{ background: "#DDDFE2" }}>
                <div className="h-2 rounded-full transition-all duration-700"
                  style={{ width: shown ? `${r.legal}%` : "0%", background: r.accent, transitionDelay: "0.1s" }} />
              </div>
              <span className="text-[10px] w-7 font-mono" style={{ color: "#3B506D" }}>{r.legal}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] w-20 text-right font-mono" style={{ color: "#3B506D" }}>IA-Ready</span>
              <div className="flex-1 h-2 rounded-full" style={{ background: "#DDDFE2" }}>
                <div className="h-2 rounded-full transition-all duration-700"
                  style={{ width: shown ? `${r.ai}%` : "0%", background: "#10B981", transitionDelay: "0.2s" }} />
              </div>
              <span className="text-[10px] w-7 font-mono" style={{ color: "#3B506D" }}>{r.ai}%</span>
            </div>
          </div>
        </div>
      ))}
      <div className="flex items-center gap-5 pt-2 border-t" style={{ borderColor: "#DDDFE2" }}>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 rounded-sm" style={{ background: "#031E43" }} />
          <span className="text-[10px]" style={{ color: "#3B506D" }}>Profundidad Contable</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 rounded-sm" style={{ background: "#10B981" }} />
          <span className="text-[10px]" style={{ color: "#3B506D" }}>Facilidad para IA</span>
        </div>
      </div>
    </div>
  );
}

const ROADMAP = [
  { step: "01", title: "Diagnóstico",     accent: "#031E43", icon: "ti-search",         items: ["Auditoría de procesos manuales", "Identificación de cuellos de botella", "Evaluación del stack tecnológico"] },
  { step: "02", title: "Implementación",  accent: "#3B506D", icon: "ti-settings",       items: ["Deploy Odoo CE + Ingadhoc", "Configuración AFIP / CAE", "Setup Evolution API + WhatsApp"] },
  { step: "03", title: "Integración",     accent: "#10B981", icon: "ti-plug-connected", items: ["FastAPI Wrapper sobre Odoo XML-RPC", "Conexión del agente IA (Groq/OpenRouter)", "Cloudflare Tunnel para acceso seguro"] },
  { step: "04", title: "Autonomía",       accent: "#F59E0B", icon: "ti-bolt",           items: ["Agentes operando 24/7", "Conciliación y reportes automáticos", "Monitoreo y alertas proactivas"] },
];

export default function EstrategiaPage() {
  const [tab, setTab] = useState<Tab>("intro");

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "intro",     label: "Inicio",       icon: "ti-home" },
    { id: "ecosystem", label: "Ecosistema",   icon: "ti-chart-bar" },
    { id: "arch",      label: "Arquitectura", icon: "ti-sitemap" },
    { id: "roadmap",   label: "Hoja de Ruta", icon: "ti-map" },
  ];

  return (
    <div className="overflow-y-auto h-full flex flex-col">

      {/* ── Tab bar — same sticky pattern as Research ── */}
      <div className="sticky top-0 z-20 flex-shrink-0 border-b" style={{ background: "#FFFFFF", borderColor: "#DDDFE2" }}>
        <div className="flex items-center gap-1 px-6 pt-3">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-t-lg transition-all border border-b-0"
              style={tab === t.id
                ? { background: "#FDFDFB", borderColor: "#DDDFE2", color: "#031E43", borderBottomColor: "#FDFDFB" }
                : { background: "transparent", borderColor: "transparent", color: "#3B506D" }}>
              <i className={`ti ${t.icon} text-sm`} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-8">

        {/* ══ INICIO ══ */}
        {tab === "intro" && (
          <>
            <div>
              <SH label="Visión Estratégica" />
              <div className="mb-4">
                <h2 className="text-xl font-extrabold mb-1" style={{ color: "#031E43" }}>
                  Agentes Autónomos para la PyME Argentina
                </h2>
                <p className="text-sm" style={{ color: "#3B506D" }}>
                  Arquitectura híbrida que combina cumplimiento legal AFIP con inteligencia LLM — operación 24/7 sin intervención humana.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard icon="⚡" accent="#031E43" label="Eficiencia Operativa"   value="95% Autonomía"   sub="En conciliación y reportes financieros automáticos." />
                <KpiCard icon="🇦🇷" accent="#10B981" label="Localización"           value="100% AFIP Ready" sub="Integración con Ingadhoc y Factura Electrónica." />
                <KpiCard icon="🛠️" accent="#F59E0B" label="Costo de IA"            value="-40% Tokens"     sub="Esquemas JSON limpios en sistemas API-First." />
              </div>
            </div>

            <div>
              <SH label="Contexto" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    title: "El Problema",
                    accent: "#EF4444",
                    items: [
                      "Las PyMEs operan con software legacy que no habla con agentes IA",
                      "Odoo es indispensable para AFIP pero su API XML-RPC es difícil para LLMs",
                      "Sin un Middleware, los agentes no pueden actuar sobre datos contables reales",
                    ],
                    dot: "#EF4444",
                  },
                  {
                    title: "La Solución",
                    accent: "#10B981",
                    items: [
                      "FastAPI Wrapper que expone endpoints JSON simples sobre Odoo XML-RPC",
                      "Cloudflare Tunnel para que el agente remoto acceda al ERP local con seguridad",
                      "Twenty CRM como capa comercial ágil, AI-Native, complementando el núcleo legal",
                    ],
                    dot: "#10B981",
                  },
                ].map(c => (
                  <div key={c.title} className="bg-[#FFFFFF] border rounded-2xl overflow-hidden shadow-sm" style={{ borderColor: "#DDDFE2" }}>
                    <div className="h-1" style={{ background: c.accent }} />
                    <div className="p-5">
                      <h3 className="text-sm font-bold mb-3" style={{ color: "#031E43" }}>{c.title}</h3>
                      <ul className="space-y-2">
                        {c.items.map(item => (
                          <li key={item} className="flex items-start gap-2 text-xs" style={{ color: "#3B506D" }}>
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.dot }} />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ══ ECOSISTEMA ══ */}
        {tab === "ecosystem" && (
          <>
            <div>
              <SH label="Análisis de Repositorios Open Source" />
              <h2 className="text-xl font-extrabold mb-1" style={{ color: "#031E43" }}>Ecosistema Evaluado</h2>
              <p className="text-sm mb-5" style={{ color: "#3B506D" }}>
                Comparamos profundidad contable/legal frente a compatibilidad nativa con agentes de IA.
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                <div className="lg:col-span-3 bg-[#FFFFFF] border rounded-2xl overflow-hidden shadow-sm" style={{ borderColor: "#DDDFE2" }}>
                  <div className="h-1 bg-[#031E43]" />
                  <div className="p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: "#3B506D" }}>Comparativa Técnica</p>
                    <BarChart />
                  </div>
                </div>

                <div className="lg:col-span-2 flex flex-col gap-3">
                  {[
                    { title: "Legal Core: Odoo + Ingadhoc", accent: "#031E43", desc: "Indispensable para Argentina — Factura E, Libros de IVA, Remitos R. Requiere Middleware para simplificar sus llamadas XML-RPC al agente." },
                    { title: "Agile Brain: Twenty / NocoBase", accent: "#3B506D", desc: "Sistemas API-First diseñados para IA. Son el cerebro comercial y de automatización rápida de la PyME." },
                    { title: "Nicho: Grocy / idurar", accent: "#DDDFE2", desc: "Soluciones ligeras para control de insumos, logística simplificada y casos de bajo recurso." },
                  ].map(c => (
                    <div key={c.title} className="bg-[#FFFFFF] border rounded-2xl overflow-hidden shadow-sm" style={{ borderColor: "#DDDFE2" }}>
                      <div className="h-1" style={{ background: c.accent }} />
                      <div className="p-4">
                        <h4 className="text-xs font-bold mb-1" style={{ color: "#031E43" }}>{c.title}</h4>
                        <p className="text-xs leading-relaxed" style={{ color: "#3B506D" }}>{c.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <SH label="Detalle por Repositorio" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { name: "Odoo / Adhoc",  lang: "Python · XML-RPC",      accent: "#031E43", pros: ["Facturación CAE", "Remitos R", "Retenciones"], cons: ["API compleja para IA"] },
                  { name: "Twenty HQ",     lang: "TypeScript · GraphQL",  accent: "#3B506D", pros: ["JSON Nativo", "AI-Ready", "GraphQL/REST"],    cons: ["Sin soporte AFIP"] },
                  { name: "NocoBase",      lang: "Node.js · Headless",    accent: "#6366F1", pros: ["Bases a medida", "RBAC Granular"],            cons: ["Configuración inicial"] },
                  { name: "Grocy",         lang: "PHP · REST",            accent: "#F59E0B", pros: ["Consumo mínimo", "Inventarios simples"],      cons: ["Funcionalidad limitada"] },
                ].map(r => (
                  <div key={r.name} className="bg-[#FFFFFF] border rounded-2xl overflow-hidden shadow-sm" style={{ borderColor: "#DDDFE2" }}>
                    <div className="h-1" style={{ background: r.accent }} />
                    <div className="p-4">
                      <h5 className="text-xs font-bold mb-0.5" style={{ color: "#031E43" }}>{r.name}</h5>
                      <p className="text-[10px] font-mono mb-3" style={{ color: "#3B506D" }}>{r.lang}</p>
                      <ul className="space-y-1">
                        {r.pros.map(p => <li key={p} className="text-[10px]" style={{ color: "#10B981" }}>✓ {p}</li>)}
                        {r.cons.map(c => <li key={c} className="text-[10px]" style={{ color: "#EF4444" }}>✗ {c}</li>)}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ══ ARQUITECTURA ══ */}
        {tab === "arch" && (
          <>
            <div>
              <SH label="Diagrama de Integración" />
              <h2 className="text-xl font-extrabold mb-1" style={{ color: "#031E43" }}>Arquitectura del Middleware</h2>
              <p className="text-sm mb-5" style={{ color: "#3B506D" }}>
                El FastAPI Wrapper traduce la inteligencia del LLM en acciones contables reales sin exponer el ERP al exterior.
              </p>

              {/* Architecture diagram */}
              <div className="bg-[#FDFDFB] border rounded-2xl p-6 mb-5" style={{ borderColor: "#DDDFE2" }}>
                <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-0">
                  {/* Agent */}
                  <div className="bg-[#FFFFFF] border-2 rounded-2xl p-5 text-center w-44 flex-shrink-0" style={{ borderColor: "#031E43" }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: "rgba(3,30,67,0.08)" }}>
                      <i className="ti ti-brain text-xl" style={{ color: "#031E43" }} />
                    </div>
                    <p className="text-xs font-bold" style={{ color: "#031E43" }}>Agente de IA</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: "#3B506D" }}>Groq / OpenRouter</p>
                    <div className="mt-2 text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: "rgba(3,30,67,0.06)", color: "#031E43" }}>Emite JSON</div>
                  </div>

                  {/* Arrow */}
                  <div className="flex items-center md:flex-col justify-center mx-3 my-2 md:my-0">
                    <div className="hidden md:block w-10 h-px" style={{ background: "#DDDFE2" }} />
                    <span className="text-[9px] font-bold uppercase tracking-wider mx-2" style={{ color: "#3B506D" }}>HTTPS</span>
                    <div className="hidden md:block w-10 h-px" style={{ background: "#DDDFE2" }} />
                    <div className="md:hidden text-lg" style={{ color: "#DDDFE2" }}>↓</div>
                  </div>

                  {/* FastAPI */}
                  <div className="border-2 rounded-2xl p-5 text-center w-44 flex-shrink-0" style={{ background: "#031E43", borderColor: "#031E43" }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: "rgba(255,255,255,0.12)" }}>
                      <i className="ti ti-bolt text-xl text-white" />
                    </div>
                    <p className="text-xs font-bold text-white">FastAPI Wrapper</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: "#DDDFE2" }}>Traductor Universal</p>
                    <div className="mt-2 text-[10px] font-mono px-2 py-0.5 rounded text-white" style={{ background: "rgba(255,255,255,0.12)" }}>/create_invoice</div>
                  </div>

                  {/* Arrow */}
                  <div className="flex items-center md:flex-col justify-center mx-3 my-2 md:my-0">
                    <div className="hidden md:block w-10 h-px" style={{ background: "#DDDFE2" }} />
                    <span className="text-[9px] font-bold uppercase tracking-wider mx-2" style={{ color: "#3B506D" }}>XML-RPC</span>
                    <div className="hidden md:block w-10 h-px" style={{ background: "#DDDFE2" }} />
                    <div className="md:hidden text-lg" style={{ color: "#DDDFE2" }}>↓</div>
                  </div>

                  {/* ERP */}
                  <div className="bg-[#FFFFFF] border-2 rounded-2xl p-5 text-center w-44 flex-shrink-0" style={{ borderColor: "#10B981" }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: "rgba(16,185,129,0.1)" }}>
                      <i className="ti ti-building-factory text-xl" style={{ color: "#10B981" }} />
                    </div>
                    <p className="text-xs font-bold" style={{ color: "#031E43" }}>Odoo CE + Ingadhoc</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: "#10B981" }}>ERP Local PyME</p>
                    <div className="mt-2 text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: "rgba(16,185,129,0.08)", color: "#10B981" }}>→ AFIP API</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <SH label="Canales y Eficiencia" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#FFFFFF] border rounded-2xl overflow-hidden shadow-sm" style={{ borderColor: "#DDDFE2" }}>
                  <div className="h-1 bg-[#031E43]" />
                  <div className="p-5">
                    <h3 className="text-sm font-bold mb-4" style={{ color: "#031E43" }}>Canales de Acción</h3>
                    <ul className="space-y-3">
                      {[
                        { tag: "API", accent: "#031E43", desc: "Evolution API para mensajería WhatsApp entrante/saliente" },
                        { tag: "TUN", accent: "#3B506D", desc: "Cloudflare Tunnel — sin abrir puertos, acceso seguro al ERP local" },
                        { tag: "DB",  accent: "#10B981", desc: "PostgreSQL directa para lectura de estado y auditoría de logs" },
                      ].map(c => (
                        <li key={c.tag} className="flex items-start gap-3 text-xs" style={{ color: "#3B506D" }}>
                          <span className="flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ background: c.accent }}>{c.tag}</span>
                          {c.desc}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="bg-[#FFFFFF] border rounded-2xl overflow-hidden shadow-sm" style={{ borderColor: "#DDDFE2" }}>
                  <div className="h-1 bg-[#10B981]" />
                  <div className="p-5">
                    <h3 className="text-sm font-bold mb-4" style={{ color: "#031E43" }}>Reducción de Tokens con API-First</h3>
                    <div className="space-y-4">
                      {[
                        { label: "Odoo XML-RPC directo", pct: 100, color: "#EF4444" },
                        { label: "FastAPI Wrapper JSON", pct: 60,  color: "#F59E0B" },
                        { label: "Twenty / NocoBase",    pct: 40,  color: "#10B981" },
                      ].map(r => (
                        <div key={r.label}>
                          <div className="flex justify-between text-xs mb-1" style={{ color: "#3B506D" }}>
                            <span>{r.label}</span>
                            <span className="font-mono">{r.pct}%</span>
                          </div>
                          <div className="h-2 rounded-full" style={{ background: "#DDDFE2" }}>
                            <div className="h-2 rounded-full" style={{ width: `${r.pct}%`, background: r.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] mt-4 italic" style={{ color: "#3B506D" }}>
                      API-First reduce el consumo de tokens un 60% respecto a XML-RPC directo.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ══ ROADMAP ══ */}
        {tab === "roadmap" && (
          <>
            <div>
              <SH label="Implementación Práctica" />
              <h2 className="text-xl font-extrabold mb-1" style={{ color: "#031E43" }}>Hoja de Ruta Estratégica</h2>
              <p className="text-sm mb-5" style={{ color: "#3B506D" }}>
                De la PyME manual a la operación autónoma en 4 etapas. Estimado: 6–12 semanas.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ROADMAP.map(r => (
                  <div key={r.step} className="bg-[#FFFFFF] border rounded-2xl overflow-hidden shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md" style={{ borderColor: "#DDDFE2" }}>
                    <div className="h-1" style={{ background: r.accent }} />
                    <div className="p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-xs flex-shrink-0" style={{ background: r.accent }}>
                          {r.step}
                        </div>
                        <div className="flex items-center gap-2">
                          <i className={`ti ${r.icon} text-sm`} style={{ color: r.accent }} />
                          <h3 className="text-sm font-bold" style={{ color: "#031E43" }}>{r.title}</h3>
                        </div>
                      </div>
                      <ul className="space-y-1.5">
                        {r.items.map(item => (
                          <li key={item} className="flex items-start gap-2 text-xs" style={{ color: "#3B506D" }}>
                            <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: r.accent }} />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div>
              <SH label="Cronograma Estimado" />
              <div className="bg-[#FFFFFF] border rounded-2xl overflow-hidden shadow-sm" style={{ borderColor: "#DDDFE2" }}>
                <div className="h-1 bg-[#031E43]" />
                <div className="p-5">
                  <div className="relative">
                    <div className="absolute top-3.5 left-4 right-4 h-px" style={{ background: "#DDDFE2" }} />
                    <div className="flex justify-between relative px-4">
                      {ROADMAP.map((r, i) => (
                        <div key={r.step} className="flex flex-col items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black z-10 text-white" style={{ background: r.accent }}>
                            {i + 1}
                          </div>
                          <p className="text-[10px] font-bold text-center" style={{ color: "#031E43" }}>{r.title}</p>
                          <p className="text-[9px] font-mono text-center" style={{ color: "#3B506D" }}>{["Sem 1–2", "Sem 3–5", "Sem 6–9", "Sem 10+"][i]}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Takeaway */}
            <div className="bg-[#FFFFFF] border rounded-2xl overflow-hidden shadow-sm" style={{ borderColor: "#DDDFE2" }}>
              <div className="h-1 bg-[#10B981]" />
              <div className="p-5 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(16,185,129,0.1)" }}>
                  <i className="ti ti-bulb text-sm" style={{ color: "#10B981" }} />
                </div>
                <div>
                  <h4 className="text-xs font-bold mb-1" style={{ color: "#031E43" }}>Takeaway Estratégico</h4>
                  <p className="text-xs leading-relaxed" style={{ color: "#3B506D" }}>
                    Para una PyME argentina que necesita AFIP: <strong style={{ color: "#031E43" }}>Odoo + Ingadhoc</strong> es el núcleo legal indispensable.
                    Para CRM ágil y automatización rápida: <strong style={{ color: "#031E43" }}>Twenty CRM</strong> o <strong style={{ color: "#031E43" }}>NocoBase</strong> son superiores.
                    El FastAPI Wrapper es el puente que los une — y Clientum orquesta todo desde arriba.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

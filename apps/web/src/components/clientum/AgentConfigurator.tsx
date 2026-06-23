import { useState } from "react";
import { motion } from "framer-motion";
import {
  AgentConfig,
  CatalogItem,
  FaqItem,
  GoalType,
  DEFAULT_CATALOG,
  DEFAULT_FAQS,
} from "@/lib/agent-types";

interface AgentConfiguratorProps {
  config: AgentConfig;
  onChangeConfig: (c: AgentConfig) => void;
  catalog: CatalogItem[];
  onChangeCatalog: (c: CatalogItem[]) => void;
  faqs: FaqItem[];
  onChangeFaqs: (f: FaqItem[]) => void;
}

const PRESETS = [
  {
    id: "clientum",
    label: "🤖 Clientum WhatsApp SaaS",
    config: {
      name: "Elena",
      persona: "Consultora de Automatización IA",
      greeting:
        "¡Hola! Soy Elena de Clientum. ¿En qué proceso de tu negocio puedo ayudarte a ahorrar tiempo hoy? 🚀",
      tone: "Consultivo, amigable y orientado a valor",
      businessName: "Clientum",
      businessIndustry: "SaaS / Automatización para PyMEs",
      businessDescription:
        "Plataforma de automatización IA para PyMEs argentinas: WhatsApp bot 24/7, facturación AFIP, CRM y ERP con Frappe.",
      goalType: "appointment" as GoalType,
      goalInstructions:
        "Mostrá el valor de automatizar WhatsApp con IA. Invitá a agendar un diagnóstico gratuito de 15 minutos. Pedí email y horario.",
    },
    catalog: DEFAULT_CATALOG,
    faqs: DEFAULT_FAQS,
  },
  {
    id: "ferreteria",
    label: "🔧 Ferretería / Distribuidora",
    config: {
      name: "Carlos",
      persona: "Asesor Comercial de Materiales",
      greeting:
        "Buenas! Soy Carlos de Robles Materiales. ¿Qué producto necesitás hoy — tenemos stock de pintura, cemento, herramientas y más! 🔨",
      tone: "Directo, amigable y eficiente",
      businessName: "Ferretería Robles",
      businessIndustry: "Comercio / Distribución de materiales",
      businessDescription:
        "Ferretería y distribuidora mayorista en zona sur. Stock permanente de pinturas, cementos, herramientas y materiales de construcción.",
      goalType: "close" as GoalType,
      goalInstructions:
        "Consultá qué producto necesita, verificá stock, cerrá el pedido con cantidad y forma de pago. Ofrecé delivery si compra más de $50.000.",
    },
    catalog: [
      {
        id: "p1",
        name: "Pintura Látex Tersuave 20L",
        price: "$42.000",
        description: "Interior/exterior, blanco mate, 20 litros.",
        usp: "Mejor calidad cubriente del mercado local.",
      },
      {
        id: "p2",
        name: "Cemento Holcim x50kg",
        price: "$8.500",
        description: "Portland compuesto, bolsa 50kg, entrega inmediata.",
        usp: "Stock siempre disponible, precio mayorista.",
      },
    ],
    faqs: [
      {
        id: "f1",
        question: "¿Hacen delivery?",
        answer:
          "Sí, entregamos en zona sur. Compras mayores a $50.000 tienen envío gratis.",
      },
      {
        id: "f2",
        question: "¿Aceptan transferencia?",
        answer: "Sí: transferencia, efectivo y tarjeta de débito.",
      },
    ],
  },
  {
    id: "farmacia",
    label: "💊 Farmacia / Salud",
    config: {
      name: "Sofía",
      persona: "Farmacéutica y Asesora de Salud",
      greeting:
        "¡Hola! Soy Sofía de Neo Farmacia. ¿En qué puedo ayudarte? Podés preguntarme sobre medicamentos, turno o stock 💊",
      tone: "Profesional, empático y claro",
      businessName: "Neo Farmacia",
      businessIndustry: "Salud / Farmacia",
      businessDescription:
        "Farmacia de barrio con servicio de asesoramiento farmacéutico, preparados magistrales, turno de guardia y delivery.",
      goalType: "appointment" as GoalType,
      goalInstructions:
        "Ayudá con consultas de stock y precios. Para medicamentos con receta, derivá a consulta con farmacéutico. Ofrecé turno de asesoramiento.",
    },
    catalog: [
      {
        id: "med1",
        name: "Ibuprofeno 400mg x20",
        price: "$3.200",
        description: "Antiinflamatorio, sin receta.",
        usp: "Genérico de marca. Siempre en stock.",
      },
    ],
    faqs: [
      {
        id: "f1",
        question: "¿Tienen turno de guardia?",
        answer: "Sí, 24hs los 365 días.",
      },
      {
        id: "f2",
        question: "¿Hacen delivery de medicamentos?",
        answer: "Sí, zona centro y barrios aledaños. Consultá disponibilidad.",
      },
    ],
  },
];

export function AgentConfigurator({
  config,
  onChangeConfig,
  catalog,
  onChangeCatalog,
  faqs,
  onChangeFaqs,
}: AgentConfiguratorProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "catalog" | "faqs">(
    "profile"
  );
  const [activePreset, setActivePreset] = useState("clientum");

  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newUsp, setNewUsp] = useState("");
  const [newQ, setNewQ] = useState("");
  const [newA, setNewA] = useState("");

  function applyPreset(p: (typeof PRESETS)[0]) {
    setActivePreset(p.id);
    onChangeConfig(p.config);
    onChangeCatalog(p.catalog);
    onChangeFaqs(p.faqs);
  }

  function set(field: keyof AgentConfig, val: string) {
    onChangeConfig({ ...config, [field]: val });
  }

  function addCatalog(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newPrice.trim()) return;
    onChangeCatalog([
      ...catalog,
      {
        id: "item-" + Date.now(),
        name: newName.trim(),
        price: newPrice.trim(),
        description: newDesc.trim(),
        usp: newUsp.trim(),
      },
    ]);
    setNewName("");
    setNewPrice("");
    setNewDesc("");
    setNewUsp("");
  }

  function addFaq(e: React.FormEvent) {
    e.preventDefault();
    if (!newQ.trim() || !newA.trim()) return;
    onChangeFaqs([
      ...faqs,
      { id: "faq-" + Date.now(), question: newQ.trim(), answer: newA.trim() },
    ]);
    setNewQ("");
    setNewA("");
  }

  const inputCls =
    "w-full px-3.5 py-2 rounded-xl text-white bg-navy-3 border border-white/10 focus:outline-none focus:border-cl-accent focus:ring-1 focus:ring-cl-accent/20 text-sm placeholder:text-white/30";
  const labelCls =
    "block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5";

  const tabs: { key: "profile" | "catalog" | "faqs"; icon: string; label: string }[] = [
    { key: "profile", icon: "ti-robot", label: "Perfil del Agente" },
    { key: "catalog", icon: "ti-tag", label: `Catálogo (${catalog.length})` },
    { key: "faqs", icon: "ti-help-circle", label: `FAQs (${faqs.length})` },
  ];

  return (
    <div className="bg-navy-card border border-white/5 rounded-2xl overflow-hidden">
      <div className="bg-white/2 border-b border-white/5 p-4">
        <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <i className="ti ti-sparkles text-cl-accent" /> Plantillas rápidas
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p)}
              className={`p-2.5 text-left rounded-xl transition text-xs font-medium border ${
                activePreset === p.id
                  ? "border-cl-accent bg-cl-accent/10 text-cl-accent"
                  : "border-white/10 bg-white/3 text-white/60 hover:border-white/20"
              }`}
            >
              <div className="truncate font-bold">{p.label}</div>
              <div className="text-[10px] mt-0.5 opacity-60 truncate">
                {p.config.name} · {p.config.goalType.replace("_", " ").toUpperCase()}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex border-b border-white/5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-3 text-center text-xs font-bold border-b-2 transition flex items-center justify-center gap-1.5 ${
              activeTab === t.key
                ? "border-cl-accent text-cl-accent"
                : "border-transparent text-white/40 hover:text-white/70"
            }`}
          >
            <i className={`ti ${t.icon} text-sm`} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {activeTab === "profile" && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Nombre del Agente</label>
                <input className={inputCls} value={config.name} onChange={(e) => set("name", e.target.value)} placeholder="Elena" />
              </div>
              <div>
                <label className={labelCls}>Rol / Persona</label>
                <input className={inputCls} value={config.persona} onChange={(e) => set("persona", e.target.value)} placeholder="Asesora Comercial" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Nombre del Negocio</label>
                <input className={inputCls} value={config.businessName} onChange={(e) => set("businessName", e.target.value)} placeholder="Mi Empresa S.A." />
              </div>
              <div>
                <label className={labelCls}>Rubro / Industria</label>
                <input className={inputCls} value={config.businessIndustry} onChange={(e) => set("businessIndustry", e.target.value)} placeholder="Ferretería, Farmacia, SaaS..." />
              </div>
            </div>
            <div>
              <label className={labelCls}>Descripción del negocio</label>
              <textarea
                rows={2}
                className={inputCls}
                value={config.businessDescription}
                onChange={(e) => set("businessDescription", e.target.value)}
                placeholder="Qué hace tu empresa, a quién atiende, ventajas principales..."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-white/5">
              <div>
                <label className={labelCls}>Objetivo de conversión</label>
                <select
                  className={inputCls + " cursor-pointer"}
                  value={config.goalType}
                  onChange={(e) => set("goalType", e.target.value)}
                >
                  <option value="lead_capture">📧 Captura de contacto</option>
                  <option value="close">💰 Cerrar venta directa</option>
                  <option value="appointment">📅 Agendar turno / llamada</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Tono del agente</label>
                <input className={inputCls} value={config.tone} onChange={(e) => set("tone", e.target.value)} placeholder="Consultivo, amigable, profesional..." />
              </div>
            </div>
            <div>
              <label className={labelCls}>Instrucciones de cierre</label>
              <textarea
                rows={2}
                className={inputCls}
                value={config.goalInstructions}
                onChange={(e) => set("goalInstructions", e.target.value)}
                placeholder="Estrategia específica para lograr el objetivo..."
              />
            </div>
            <div>
              <label className={labelCls}>Mensaje de bienvenida</label>
              <textarea
                rows={2}
                className={inputCls}
                value={config.greeting}
                onChange={(e) => set("greeting", e.target.value)}
                placeholder="Primer mensaje que envía el bot al cliente..."
              />
            </div>
          </motion.div>
        )}

        {activeTab === "catalog" && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <form onSubmit={addCatalog} className="p-4 bg-white/3 border border-white/8 rounded-xl space-y-3">
              <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                <i className="ti ti-folder-plus text-cl-accent" /> Agregar producto / servicio
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="md:col-span-2">
                  <input className={inputCls} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre del producto" required />
                </div>
                <input className={inputCls} value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="Precio (ej: $42.000)" required />
              </div>
              <input className={inputCls} value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Descripción breve" />
              <input className={inputCls} value={newUsp} onChange={(e) => setNewUsp(e.target.value)} placeholder="Ventaja diferencial (USP)" />
              <div className="flex justify-end">
                <button type="submit" className="px-4 py-2 bg-cl-accent text-navy rounded-xl text-xs font-black hover:bg-cl-accent-hover transition flex items-center gap-1.5">
                  <i className="ti ti-plus" /> Agregar
                </button>
              </div>
            </form>

            <div className="space-y-2">
              {catalog.length === 0 && (
                <div className="p-8 border border-dashed border-white/10 rounded-xl text-center text-white/30 text-xs">
                  Sin productos cargados. Agregá uno arriba o elegí una plantilla.
                </div>
              )}
              {catalog.map((item) => (
                <div key={item.id} className="p-3.5 bg-white/3 border border-white/8 rounded-xl flex justify-between items-start hover:border-white/15 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{item.name}</span>
                      <span className="px-2 py-0.5 bg-cl-accent/10 text-cl-accent text-[10px] font-black rounded-full">{item.price}</span>
                    </div>
                    {item.description && <p className="text-xs text-white/50">{item.description}</p>}
                    {item.usp && (
                      <div className="text-[10px] text-yellow-400/80 bg-yellow-400/5 border border-yellow-400/10 rounded px-2 py-0.5 inline-block">
                        USP: {item.usp}
                      </div>
                    )}
                  </div>
                  <button onClick={() => onChangeCatalog(catalog.filter((c) => c.id !== item.id))} className="p-1 text-white/30 hover:text-red-400 transition">
                    <i className="ti ti-trash text-sm" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === "faqs" && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <form onSubmit={addFaq} className="p-4 bg-white/3 border border-white/8 rounded-xl space-y-3">
              <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                <i className="ti ti-help-circle text-cl-accent" /> Agregar pregunta frecuente
              </div>
              <input className={inputCls} value={newQ} onChange={(e) => setNewQ(e.target.value)} placeholder="Pregunta (ej: ¿Tienen delivery?)" required />
              <textarea rows={2} className={inputCls} value={newA} onChange={(e) => setNewA(e.target.value)} placeholder="Respuesta que dará el agente..." required />
              <div className="flex justify-end">
                <button type="submit" className="px-4 py-2 bg-cl-accent text-navy rounded-xl text-xs font-black hover:bg-cl-accent-hover transition flex items-center gap-1.5">
                  <i className="ti ti-plus" /> Agregar FAQ
                </button>
              </div>
            </form>

            <div className="space-y-2">
              {faqs.length === 0 && (
                <div className="p-8 border border-dashed border-white/10 rounded-xl text-center text-white/30 text-xs">
                  Sin FAQs cargadas. El agente usará solo el contexto general.
                </div>
              )}
              {faqs.map((faq) => (
                <div key={faq.id} className="p-3.5 bg-white/3 border border-white/8 rounded-xl flex justify-between items-start hover:border-white/15 transition">
                  <div className="space-y-1.5 flex-1">
                    <p className="text-xs font-bold text-white">Q: {faq.question}</p>
                    <p className="text-xs text-white/50 bg-white/3 rounded-lg p-2 border border-white/5">A: {faq.answer}</p>
                  </div>
                  <button onClick={() => onChangeFaqs(faqs.filter((f) => f.id !== faq.id))} className="p-1 ml-3 text-white/30 hover:text-red-400 transition flex-shrink-0">
                    <i className="ti ti-trash text-sm" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

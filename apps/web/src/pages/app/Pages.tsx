import { useState } from "react";

type BlockType =
  | "hero"
  | "features"
  | "testimonials"
  | "cta"
  | "faq"
  | "contact"
  | "pricing"
  | "gallery"
  | "text"
  | "video";

type Block = {
  id: string;
  type: BlockType;
  data: Record<string, string>;
};

type Page = {
  id: string;
  name: string;
  slug: string;
  status: "published" | "draft";
  views: number;
  updatedAt: string;
  thumbnail: string;
};

const BLOCK_TYPES: { type: BlockType; label: string; icon: string; description: string }[] = [
  { type: "hero", label: "Hero", icon: "ti-layout-navbar", description: "Encabezado principal con título y botón" },
  { type: "features", label: "Características", icon: "ti-layout-grid", description: "Grilla de features con íconos" },
  { type: "testimonials", label: "Testimonios", icon: "ti-quote", description: "Reseñas de clientes" },
  { type: "pricing", label: "Precios", icon: "ti-currency-dollar", description: "Cards de planes y precios" },
  { type: "faq", label: "FAQ", icon: "ti-help-circle", description: "Preguntas frecuentes" },
  { type: "cta", label: "Llamada a acción", icon: "ti-speakerphone", description: "Sección con botón destacado" },
  { type: "contact", label: "Contacto", icon: "ti-mail", description: "Formulario de contacto" },
  { type: "gallery", label: "Galería", icon: "ti-photo", description: "Grilla de imágenes" },
  { type: "text", label: "Texto", icon: "ti-text-size", description: "Bloque de texto libre" },
  { type: "video", label: "Video", icon: "ti-player-play", description: "Embed de video" },
];

const DEMO_PAGES: Page[] = [
  {
    id: "1",
    name: "Landing Principal",
    slug: "/landing",
    status: "published",
    views: 1243,
    updatedAt: "Hace 2 horas",
    thumbnail: "bg-gradient-to-br from-emerald-500/30 to-teal-600/20",
  },
  {
    id: "2",
    name: "Página de Precios",
    slug: "/precios",
    status: "published",
    views: 867,
    updatedAt: "Hace 1 día",
    thumbnail: "bg-gradient-to-br from-blue-500/30 to-indigo-600/20",
  },
  {
    id: "3",
    name: "Sobre Nosotros",
    slug: "/nosotros",
    status: "draft",
    views: 0,
    updatedAt: "Hace 3 días",
    thumbnail: "bg-gradient-to-br from-purple-500/30 to-pink-600/20",
  },
];

const DEFAULT_BLOCK_DATA: Record<BlockType, Record<string, string>> = {
  hero: { title: "Tu título principal aquí", subtitle: "Describí tu propuesta de valor en una línea", cta: "Empezar ahora", ctaSecondary: "Ver demo" },
  features: { title: "¿Por qué elegirnos?", item1: "Ventaja 1", item2: "Ventaja 2", item3: "Ventaja 3" },
  testimonials: { title: "Lo que dicen nuestros clientes", author1: "María García", text1: "Excelente servicio, muy recomendable." },
  cta: { title: "¿Listo para empezar?", subtitle: "Sumate hoy y transformá tu negocio", cta: "Contactar ahora" },
  faq: { title: "Preguntas frecuentes", q1: "¿Cómo funciona?", a1: "Es muy simple, solo necesitás..." },
  contact: { title: "Contactanos", subtitle: "Respondemos en menos de 24 horas" },
  pricing: { title: "Planes y precios", subtitle: "Elegí el plan que mejor se adapte a tu negocio" },
  gallery: { title: "Galería" },
  text: { content: "Escribí tu texto aquí. Podés usar **negritas** y otros formatos." },
  video: { url: "https://youtube.com/watch?v=..." },
};

function BlockPreview({ block }: { block: Block }) {
  const data = block.data;
  switch (block.type) {
    case "hero":
      return (
        <div className="bg-gradient-to-br from-cl-accent/10 to-navy p-6 text-center rounded-lg">
          <h2 className="text-white font-bold text-lg mb-1">{data.title}</h2>
          <p className="text-cool-steel text-xs mb-3">{data.subtitle}</p>
          <div className="flex gap-2 justify-center">
            <span className="bg-cl-accent text-navy font-bold text-xs px-4 py-1.5 rounded-lg">{data.cta}</span>
            <span className="border border-silver/30 text-cool-steel text-xs px-4 py-1.5 rounded-lg">{data.ctaSecondary}</span>
          </div>
        </div>
      );
    case "features":
      return (
        <div className="p-4">
          <p className="text-silver text-xs font-bold text-center mb-3">{data.title}</p>
          <div className="grid grid-cols-3 gap-2">
            {[data.item1, data.item2, data.item3].map((item, i) => (
              <div key={i} className="bg-silver/10 rounded-lg p-2 text-center text-[10px] text-cool-steel">{item}</div>
            ))}
          </div>
        </div>
      );
    case "cta":
      return (
        <div className="bg-cl-accent/10 border border-cl-accent/20 p-4 text-center rounded-lg">
          <p className="text-white font-bold text-sm mb-1">{data.title}</p>
          <p className="text-cool-steel text-xs mb-3">{data.subtitle}</p>
          <span className="bg-cl-accent text-navy font-bold text-xs px-4 py-1.5 rounded-lg">{data.cta}</span>
        </div>
      );
    case "faq":
      return (
        <div className="p-4">
          <p className="text-silver text-xs font-bold mb-2">{data.title}</p>
          <div className="bg-silver/10 rounded-lg p-2 text-[10px] text-cool-steel">
            <p className="font-semibold text-cool-steel">↳ {data.q1}</p>
            <p className="mt-1 text-cool-steel/55">{data.a1}</p>
          </div>
        </div>
      );
    default:
      return (
        <div className="p-4 text-center text-cool-steel/55 text-xs">
          <i className={`ti ${BLOCK_TYPES.find((b) => b.type === block.type)?.icon ?? "ti-layout"} text-xl block mb-1`} />
          {BLOCK_TYPES.find((b) => b.type === block.type)?.label}
        </div>
      );
  }
}

export default function PagesPage() {
  const [view, setView] = useState<"list" | "editor">("list");
  const [blocks, setBlocks] = useState<Block[]>([
    { id: "1", type: "hero", data: DEFAULT_BLOCK_DATA.hero },
    { id: "2", type: "features", data: DEFAULT_BLOCK_DATA.features },
    { id: "3", type: "cta", data: DEFAULT_BLOCK_DATA.cta },
  ]);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [pageName, setPageName] = useState("Nueva página");
  const [pageSlug, setPageSlug] = useState("/mi-pagina");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<"blocks" | "settings">("blocks");

  function addBlock(type: BlockType) {
    const newBlock: Block = {
      id: Date.now().toString(),
      type,
      data: { ...DEFAULT_BLOCK_DATA[type] },
    };
    setBlocks((prev) => [...prev, newBlock]);
    setSelectedBlock(newBlock);
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (selectedBlock?.id === id) setSelectedBlock(null);
  }

  function updateBlockData(id: string, key: string, value: string) {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, data: { ...b.data, [key]: value } } : b))
    );
    if (selectedBlock?.id === id) {
      setSelectedBlock((prev) => prev ? { ...prev, data: { ...prev.data, [key]: value } } : null);
    }
  }

  function moveBlock(id: string, dir: "up" | "down") {
    const idx = blocks.findIndex((b) => b.id === id);
    if (dir === "up" && idx === 0) return;
    if (dir === "down" && idx === blocks.length - 1) return;
    const newBlocks = [...blocks];
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    [newBlocks[idx], newBlocks[swapIdx]] = [newBlocks[swapIdx], newBlocks[idx]];
    setBlocks(newBlocks);
  }

  if (view === "editor") {
    return (
      <div className="flex h-full">
        <div className="w-60 bg-navy-2 border-r border-silver/15 flex flex-col flex-shrink-0">
          <div className="flex border-b border-silver/15">
            <button
              onClick={() => setActivePanel("blocks")}
              className={`flex-1 text-xs font-semibold py-3 transition-all ${activePanel === "blocks" ? "text-cl-accent border-b-2 border-cl-accent" : "text-cool-steel hover:text-white"}`}
            >
              Bloques
            </button>
            <button
              onClick={() => setActivePanel("settings")}
              className={`flex-1 text-xs font-semibold py-3 transition-all ${activePanel === "settings" ? "text-cl-accent border-b-2 border-cl-accent" : "text-cool-steel hover:text-white"}`}
            >
              Ajustes
            </button>
          </div>

          {activePanel === "blocks" ? (
            <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
              <p className="text-[10px] font-bold text-cool-steel/40 uppercase tracking-wider px-2 mb-2">Agregar bloque</p>
              {BLOCK_TYPES.map((bt) => (
                <button
                  key={bt.type}
                  onClick={() => addBlock(bt.type)}
                  className="w-full flex items-center gap-2.5 px-2 py-2 text-xs text-cool-steel hover:text-white hover:bg-silver/10 rounded-lg transition-all text-left group"
                >
                  <i className={`ti ${bt.icon} text-base`} />
                  <div>
                    <div className="font-semibold">{bt.label}</div>
                    <div className="text-cool-steel/45 text-[10px]">{bt.description}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto py-4 px-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-cool-steel mb-1.5 block">Nombre de la página</label>
                <input
                  value={pageName}
                  onChange={(e) => setPageName(e.target.value)}
                  className="w-full bg-silver/10 border border-silver/20 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cl-accent"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-cool-steel mb-1.5 block">URL (slug)</label>
                <input
                  value={pageSlug}
                  onChange={(e) => setPageSlug(e.target.value)}
                  className="w-full bg-silver/10 border border-silver/20 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none focus:border-cl-accent"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-cool-steel mb-1.5 block">Tema</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {["bg-navy", "bg-white", "bg-[#031E43]", "bg-emerald-950", "bg-blue-950", "bg-purple-950"].map((c) => (
                    <button key={c} className={`h-8 ${c} rounded-lg border-2 border-transparent hover:border-cl-accent transition-all`} />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-cool-steel mb-2 block">SEO</label>
                <input className="w-full bg-silver/10 border border-silver/20 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-cl-accent mb-2" placeholder="Meta título..." />
                <textarea className="w-full bg-silver/10 border border-silver/20 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-cl-accent h-16 resize-none" placeholder="Meta descripción..." />
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="border-b border-silver/15 px-4 py-3 flex items-center gap-3 bg-navy-2 flex-shrink-0">
            <button onClick={() => setView("list")} className="text-cool-steel hover:text-white transition-all">
              <i className="ti ti-arrow-left text-lg" />
            </button>
            <input
              value={pageName}
              onChange={(e) => setPageName(e.target.value)}
              className="bg-transparent text-white font-bold outline-none border-b border-transparent hover:border-silver/30 focus:border-cl-accent transition-all"
            />
            <span className="text-xs text-cool-steel/55 font-mono">{pageSlug}</span>
            <div className="ml-auto flex gap-2">
              <button className="text-sm text-cool-steel hover:text-white bg-silver/10 hover:bg-silver/15 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5">
                <i className="ti ti-devices text-base" />
              </button>
              <button
                onClick={() => setView("list")}
                className="text-sm bg-cl-accent text-navy font-bold px-4 py-1.5 rounded-lg hover:bg-cl-accent/90 transition-all flex items-center gap-1.5"
              >
                <i className="ti ti-cloud-upload text-base" /> Publicar
              </button>
            </div>
          </div>

          <div className="flex flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-2xl mx-auto space-y-2">
                {blocks.map((block, idx) => (
                  <div
                    key={block.id}
                    onClick={() => setSelectedBlock(block)}
                    className={`relative border rounded-xl overflow-hidden cursor-pointer transition-all group ${
                      selectedBlock?.id === block.id
                        ? "border-cl-accent ring-1 ring-cl-accent/30"
                        : "border-silver/20 hover:border-silver/30"
                    }`}
                    draggable
                    onDragStart={() => setDraggingId(block.id)}
                    onDragEnd={() => setDraggingId(null)}
                  >
                    <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={(e) => { e.stopPropagation(); moveBlock(block.id, "up"); }} className="w-6 h-6 bg-navy/80 rounded flex items-center justify-center text-cool-steel hover:text-white">
                        <i className="ti ti-arrow-up text-xs" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); moveBlock(block.id, "down"); }} className="w-6 h-6 bg-navy/80 rounded flex items-center justify-center text-cool-steel hover:text-white">
                        <i className="ti ti-arrow-down text-xs" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }} className="w-6 h-6 bg-navy/80 rounded flex items-center justify-center text-red-400/70 hover:text-red-400">
                        <i className="ti ti-trash text-xs" />
                      </button>
                    </div>
                    <BlockPreview block={block} />
                  </div>
                ))}

                <button
                  onClick={() => setActivePanel("blocks")}
                  className="w-full border-2 border-dashed border-silver/20 hover:border-cl-accent/30 rounded-xl p-6 flex items-center justify-center gap-2 text-cool-steel/40 hover:text-cl-accent transition-all text-sm"
                >
                  <i className="ti ti-plus text-lg" /> Agregar bloque
                </button>
              </div>
            </div>

            {selectedBlock && (
              <div className="w-64 border-l border-silver/15 bg-navy-2 flex flex-col flex-shrink-0">
                <div className="px-4 py-3 border-b border-silver/15 flex items-center justify-between">
                  <p className="text-xs font-bold text-cool-steel uppercase tracking-wider">
                    {BLOCK_TYPES.find((b) => b.type === selectedBlock.type)?.label}
                  </p>
                  <button onClick={() => setSelectedBlock(null)} className="text-cool-steel/55 hover:text-white transition-all">
                    <i className="ti ti-x text-sm" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {Object.entries(selectedBlock.data).map(([key, val]) => (
                    <div key={key}>
                      <label className="text-[10px] font-bold text-cool-steel/55 uppercase tracking-wider mb-1 block">{key}</label>
                      {val.length > 60 ? (
                        <textarea
                          value={val}
                          onChange={(e) => updateBlockData(selectedBlock.id, key, e.target.value)}
                          className="w-full bg-silver/10 border border-silver/20 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-cl-accent resize-none h-16"
                        />
                      ) : (
                        <input
                          value={val}
                          onChange={(e) => updateBlockData(selectedBlock.id, key, e.target.value)}
                          className="w-full bg-silver/10 border border-silver/20 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-cl-accent"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-white">Páginas</h2>
          <p className="text-sm text-cool-steel">Creá y publicá páginas web para tu negocio</p>
        </div>
        <button
          onClick={() => setView("editor")}
          className="flex items-center gap-2 bg-cl-accent text-navy font-bold px-4 py-2 rounded-lg text-sm hover:bg-cl-accent/90 transition-all"
        >
          <i className="ti ti-plus text-base" /> Nueva página
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DEMO_PAGES.map((page) => (
          <div
            key={page.id}
            className="bg-navy-2 border border-silver/20 hover:border-cl-accent/30 rounded-xl overflow-hidden transition-all group"
          >
            <div className={`h-32 ${page.thumbnail} flex items-center justify-center`}>
              <i className="ti ti-layout text-cool-steel/40 text-4xl" />
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-white text-sm">{page.name}</h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    page.status === "published"
                      ? "bg-cl-accent/20 text-cl-accent"
                      : "bg-silver/15 text-cool-steel"
                  }`}
                >
                  {page.status === "published" ? "Publicada" : "Borrador"}
                </span>
              </div>
              <p className="text-xs text-cool-steel/55 font-mono mb-2">{page.slug}</p>
              <div className="flex items-center gap-3 text-xs text-cool-steel/45 mb-3">
                {page.status === "published" && (
                  <span><i className="ti ti-eye mr-1" />{page.views.toLocaleString()} vistas</span>
                )}
                <span><i className="ti ti-clock mr-1" />{page.updatedAt}</span>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <button
                  onClick={() => setView("editor")}
                  className="flex-1 text-xs text-silver hover:text-white bg-silver/10 hover:bg-silver/15 px-3 py-1.5 rounded-lg transition-all"
                >
                  <i className="ti ti-pencil mr-1" /> Editar
                </button>
                <button className="flex-1 text-xs text-cl-accent hover:text-cl-accent/80 bg-cl-accent/10 hover:bg-cl-accent/20 px-3 py-1.5 rounded-lg transition-all">
                  <i className="ti ti-external-link mr-1" /> Ver
                </button>
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={() => setView("editor")}
          className="border-2 border-dashed border-silver/20 hover:border-cl-accent/30 rounded-xl min-h-[220px] flex flex-col items-center justify-center gap-3 text-cool-steel/55 hover:text-cl-accent transition-all"
        >
          <i className="ti ti-plus text-3xl" />
          <span className="text-sm font-semibold">Nueva página</span>
        </button>
      </div>
    </div>
  );
}

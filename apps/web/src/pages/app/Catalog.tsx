import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

/* ─── Types ─────────────────────────────────────────── */
interface CatalogConfig {
  id?: string;
  token?: string;
  active?: boolean;
  productsUrl?: string;
  brandName?: string;
  brandSubtitle?: string;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  heroImage?: string;
  heroBadge?: string;
  heroTitle?: string;
  heroTitleAccent?: string;
  heroDescription?: string;
  catalogTitle?: string;
  catalogSubtitle?: string;
  searchPlaceholder?: string;
  currency?: string;
  whatsapp?: string;
  instagram?: string;
  facebook?: string;
  mapsUrl?: string;
  address?: string;
  hours?: string;
  footerDesc?: string;
  featuresJson?: string;
  faqJson?: string;
  resellerJson?: string;
}

interface Feature { emoji: string; title: string; desc: string; }
interface FAQ { q: string; a: string; }

async function apiFetch(url: string, opts?: RequestInit) {
  const r = await fetch(url, { credentials: "include", ...opts });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

const TABS = ["Marca", "Hero", "Catálogo", "Contacto", "Ventajas", "FAQ"] as const;
type Tab = typeof TABS[number];

/* ═══════════════════════════════════════════════════
   CATALOG PAGE
═══════════════════════════════════════════════════ */
export default function CatalogPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("Marca");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const { data, isLoading, error } = useQuery<{ config: CatalogConfig | null }>({
    queryKey: ["catalog-config"],
    queryFn: () => apiFetch("/api/catalog/config"),
    retry: false,
    staleTime: 60_000,
  });

  const cfg = data?.config ?? {};
  const publicUrl = cfg.token
    ? `${window.location.origin}/catalogo/${cfg.token}`
    : null;

  const saveMutation = useMutation({
    mutationFn: (body: Partial<CatalogConfig>) =>
      apiFetch("/api/catalog/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog-config"] });
      showToast("Cambios guardados");
    },
    onError: () => showToast("Error al guardar", false),
  });

  function save(fields: Partial<CatalogConfig>) {
    saveMutation.mutate(fields);
  }

  const copyUrl = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-cl-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if ((error as Error)?.message === "401") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <i className="ti ti-lock text-4xl text-white/10" />
        <p className="text-sm font-bold text-cool-steel">Sesión requerida</p>
        <p className="text-xs text-cool-steel/55">Iniciá sesión para configurar tu catálogo digital.</p>
        <a href="/api/login" className="px-5 py-2 bg-cl-accent text-navy text-xs font-bold rounded-lg no-underline hover:bg-cl-accent/90 transition">
          Iniciar sesión →
        </a>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <i className="ti ti-lock text-4xl text-cool-steel/40" />
        <p className="text-cool-steel text-sm">Iniciá sesión para gestionar tu catálogo</p>
        <a href="/api/auth/login" className="bg-cl-accent text-navy font-bold text-sm px-4 py-2 rounded-xl no-underline">
          Iniciar sesión →
        </a>
      </div>
    );
  }

  return (
    <section className="p-6 space-y-5 overflow-y-auto h-full">

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-xl ${toast.ok ? "bg-cl-accent text-navy" : "bg-red-500 text-white"}`}>
          {toast.msg}
        </div>
      )}

      {/* ── Header card: URL pública + estado ── */}
      <div className="bg-navy-card border border-silver/15 rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-cool-steel/55 uppercase tracking-widest mb-1">URL pública del catálogo</p>
          {publicUrl ? (
            <div className="flex items-center gap-2 bg-navy rounded-lg px-3 py-2 border border-silver/20">
              <i className="ti ti-link text-cl-accent text-sm flex-shrink-0" />
              <span className="text-xs text-silver truncate">{publicUrl}</span>
            </div>
          ) : (
            <p className="text-xs text-cool-steel/55 italic">Guardá tu catálogo para generar la URL</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {publicUrl && (
            <>
              <button onClick={copyUrl}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${copied ? "bg-cl-accent text-navy" : "bg-silver/10 text-silver hover:bg-silver/15"}`}>
                <i className={`ti ${copied ? "ti-check" : "ti-copy"}`} />
                {copied ? "¡Copiado!" : "Copiar URL"}
              </button>
              <a href={publicUrl} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-cl-blue/10 text-cl-blue hover:bg-cl-blue/20 transition-all no-underline">
                <i className="ti ti-external-link" /> Ver
              </a>
            </>
          )}
          <button onClick={() => setAiOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-all">
            <i className="ti ti-sparkles" /> Generar con IA
          </button>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-silver/10 text-xs">
            <span className={`w-2 h-2 rounded-full ${cfg.active ? "bg-cl-accent animate-pulse" : "bg-red-400"}`} />
            <span className={cfg.active ? "text-cl-accent font-semibold" : "text-red-400 font-semibold"}>
              {cfg.active ? "Publicado" : "Inactivo"}
            </span>
            <button onClick={() => save({ active: !cfg.active })}
              className="ml-1 text-[10px] text-cool-steel hover:text-white transition-colors">
              Cambiar
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-navy-card border border-silver/15 rounded-xl p-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 text-[11px] font-bold py-2 px-3 rounded-lg transition-all ${tab === t ? "bg-cl-accent text-navy" : "text-cool-steel hover:text-white"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {tab === "Marca" && <TabMarca cfg={cfg} onSave={save} saving={saveMutation.isPending} />}
      {tab === "Hero"  && <TabHero  cfg={cfg} onSave={save} saving={saveMutation.isPending} />}
      {tab === "Catálogo" && <TabCatalogo cfg={cfg} onSave={save} saving={saveMutation.isPending} />}
      {tab === "Contacto" && <TabContacto cfg={cfg} onSave={save} saving={saveMutation.isPending} />}
      {tab === "Ventajas" && <TabVentajas cfg={cfg} onSave={save} saving={saveMutation.isPending} />}
      {tab === "FAQ"   && <TabFAQ     cfg={cfg} onSave={save} saving={saveMutation.isPending} />}

      {/* ── AI Modal ── */}
      {aiOpen && <AIGenerateModal onClose={() => setAiOpen(false)} onApply={save} onToast={showToast} />}

    </section>
  );
}

/* ═══════════════════════════════════════════════════
   TABS
═══════════════════════════════════════════════════ */

function TabMarca({ cfg, onSave, saving }: { cfg: CatalogConfig; onSave: (f: Partial<CatalogConfig>) => void; saving: boolean }) {
  const [f, setF] = useState({ brandName: cfg.brandName ?? "", brandSubtitle: cfg.brandSubtitle ?? "", logoUrl: cfg.logoUrl ?? "", primaryColor: cfg.primaryColor ?? "#002266", secondaryColor: cfg.secondaryColor ?? "#0052CC" });
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        const res = await fetch("/api/catalog/upload-image", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl, filename: file.name }),
        });
        if (!res.ok) { showToast("Error al subir el logo", false); return; }
        const json = await res.json() as { url: string };
        if (!json.url) { showToast("Error al subir el logo", false); return; }
        setF(p => ({ ...p, logoUrl: json.url }));
      } catch { showToast("Error de conexión al subir el logo", false); }
      finally { setUploading(false); }
    };
    reader.readAsDataURL(file);
  }

  return (
    <Card title="🏪 Marca" onSave={() => onSave(f)} saving={saving}>
      <Row label="Nombre de la marca">
        <Input value={f.brandName} onChange={v => setF(p => ({ ...p, brandName: v }))} placeholder="Ej: Ferretería Central" />
      </Row>
      <Row label="Slogan / subtítulo">
        <Input value={f.brandSubtitle} onChange={v => setF(p => ({ ...p, brandSubtitle: v }))} placeholder="Ej: Distribuidora mayorista desde 1985" />
      </Row>
      <Row label="Logo">
        <div className="flex items-center gap-3">
          {f.logoUrl && <img src={f.logoUrl} alt="logo" className="w-12 h-12 object-contain rounded-lg bg-silver/10 p-1 border border-silver/20" />}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="px-4 py-2 bg-silver/10 hover:bg-silver/15 text-xs font-semibold text-silver rounded-lg transition-all">
            {uploading ? "Subiendo..." : "Subir imagen"}
          </button>
          {f.logoUrl && <Input value={f.logoUrl} onChange={v => setF(p => ({ ...p, logoUrl: v }))} placeholder="https://..." />}
        </div>
      </Row>
      <Row label="Colores de marca">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-cool-steel cursor-pointer">
            <input type="color" value={f.primaryColor} onChange={e => setF(p => ({ ...p, primaryColor: e.target.value }))} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
            Principal
          </label>
          <label className="flex items-center gap-2 text-xs text-cool-steel cursor-pointer">
            <input type="color" value={f.secondaryColor} onChange={e => setF(p => ({ ...p, secondaryColor: e.target.value }))} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
            Secundario
          </label>
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 rounded" style={{ background: f.primaryColor }} />
            <span className="w-4 h-4 rounded" style={{ background: f.secondaryColor }} />
            <span className="text-[10px] text-cool-steel/55 ml-1">preview</span>
          </div>
        </div>
      </Row>
    </Card>
  );
}

function TabHero({ cfg, onSave, saving }: { cfg: CatalogConfig; onSave: (f: Partial<CatalogConfig>) => void; saving: boolean }) {
  const [f, setF] = useState({
    heroBadge: cfg.heroBadge ?? "",
    heroTitle: cfg.heroTitle ?? "",
    heroTitleAccent: cfg.heroTitleAccent ?? "",
    heroDescription: cfg.heroDescription ?? "",
    heroImage: cfg.heroImage ?? "",
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleHeroImg(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch("/api/catalog/upload-image", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl: reader.result, filename: file.name }),
        });
        if (!res.ok) { showToast("Error al subir la imagen", false); return; }
        const json = await res.json() as { url: string };
        if (!json.url) { showToast("Error al subir la imagen", false); return; }
        setF(p => ({ ...p, heroImage: json.url }));
      } catch { showToast("Error de conexión al subir la imagen", false); }
      finally { setUploading(false); }
    };
    reader.readAsDataURL(file);
  }

  return (
    <Card title="🎬 Hero" onSave={() => onSave(f)} saving={saving}>
      <Row label="Badge (etiqueta pequeña)">
        <Input value={f.heroBadge} onChange={v => setF(p => ({ ...p, heroBadge: v }))} placeholder="Ej: Distribuidora Mayorista" />
      </Row>
      <Row label="Título principal">
        <Input value={f.heroTitle} onChange={v => setF(p => ({ ...p, heroTitle: v }))} placeholder="Ej: Todo para tu negocio" />
      </Row>
      <Row label="Título acento (color)">
        <Input value={f.heroTitleAccent} onChange={v => setF(p => ({ ...p, heroTitleAccent: v }))} placeholder="Ej: al mejor precio." />
      </Row>
      <Row label="Descripción hero">
        <Textarea value={f.heroDescription} onChange={v => setF(p => ({ ...p, heroDescription: v }))} placeholder="1-2 oraciones persuasivas..." />
      </Row>
      <Row label="Imagen hero">
        <div className="flex items-center gap-3">
          {f.heroImage && <img src={f.heroImage} alt="hero" className="w-16 h-10 object-cover rounded-lg bg-silver/10 border border-silver/20" />}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleHeroImg} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="px-4 py-2 bg-silver/10 hover:bg-silver/15 text-xs font-semibold text-silver rounded-lg transition-all">
            {uploading ? "Subiendo..." : "Subir imagen"}
          </button>
          <Input value={f.heroImage} onChange={v => setF(p => ({ ...p, heroImage: v }))} placeholder="https://... o ruta /uploads/..." />
        </div>
      </Row>
      {/* Preview */}
      {(f.heroTitle || f.heroBadge) && (
        <div className="mt-4 rounded-xl overflow-hidden border border-silver/20">
          <div className="p-6 text-center" style={{ background: "linear-gradient(135deg, #0a1628 0%, #0d2040 100%)" }}>
            {f.heroBadge && <span className="text-[10px] font-bold bg-cl-accent/20 text-cl-accent px-2 py-1 rounded-full uppercase tracking-wider">{f.heroBadge}</span>}
            <h2 className="text-xl font-extrabold text-white mt-2 leading-tight">
              {f.heroTitle} <span className="text-cl-accent">{f.heroTitleAccent}</span>
            </h2>
            {f.heroDescription && <p className="text-xs text-cool-steel mt-2">{f.heroDescription}</p>}
          </div>
        </div>
      )}
    </Card>
  );
}

function TabCatalogo({ cfg, onSave, saving }: { cfg: CatalogConfig; onSave: (f: Partial<CatalogConfig>) => void; saving: boolean }) {
  const [f, setF] = useState({
    productsUrl: cfg.productsUrl ?? "",
    catalogTitle: cfg.catalogTitle ?? "Nuestro Catálogo",
    catalogSubtitle: cfg.catalogSubtitle ?? "Explorá nuestros productos por categoría.",
    searchPlaceholder: cfg.searchPlaceholder ?? "¿Qué producto buscás?",
    currency: cfg.currency ?? "$",
  });
  return (
    <Card title="🛒 Catálogo" onSave={() => onSave(f)} saving={saving}>
      <Row label="URL de Google Sheets (CSV público)">
        <Input value={f.productsUrl} onChange={v => setF(p => ({ ...p, productsUrl: v }))}
          placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv" />
        <p className="text-[10px] text-cool-steel/55 mt-1">Archivo → Publicar en la web → CSV. Las columnas: nombre, precio, descripcion, imagen, categoria, destacado.</p>
      </Row>
      <Row label="Título sección catálogo">
        <Input value={f.catalogTitle} onChange={v => setF(p => ({ ...p, catalogTitle: v }))} placeholder="Nuestro Catálogo" />
      </Row>
      <Row label="Subtítulo catálogo">
        <Input value={f.catalogSubtitle} onChange={v => setF(p => ({ ...p, catalogSubtitle: v }))} placeholder="Explorá nuestros productos por categoría." />
      </Row>
      <Row label="Placeholder del buscador">
        <Input value={f.searchPlaceholder} onChange={v => setF(p => ({ ...p, searchPlaceholder: v }))} placeholder="¿Qué producto buscás?" />
      </Row>
      <Row label="Moneda">
        <div className="flex gap-2">
          {["$", "USD", "€", "R$"].map(c => (
            <button key={c} onClick={() => setF(p => ({ ...p, currency: c }))}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${f.currency === c ? "bg-cl-accent text-navy" : "bg-silver/10 text-cool-steel hover:bg-silver/15"}`}>
              {c}
            </button>
          ))}
        </div>
      </Row>
    </Card>
  );
}

function TabContacto({ cfg, onSave, saving }: { cfg: CatalogConfig; onSave: (f: Partial<CatalogConfig>) => void; saving: boolean }) {
  const [f, setF] = useState({
    whatsapp: cfg.whatsapp ?? "",
    instagram: cfg.instagram ?? "",
    facebook: cfg.facebook ?? "",
    mapsUrl: cfg.mapsUrl ?? "",
    address: cfg.address ?? "",
    hours: cfg.hours ?? "",
    footerDesc: cfg.footerDesc ?? "",
  });
  return (
    <Card title="📍 Contacto & Footer" onSave={() => onSave(f)} saving={saving}>
      <Row label="WhatsApp (solo números, con código de país)">
        <Input value={f.whatsapp} onChange={v => setF(p => ({ ...p, whatsapp: v }))} placeholder="5492984510883" />
      </Row>
      <Row label="Instagram">
        <Input value={f.instagram} onChange={v => setF(p => ({ ...p, instagram: v }))} placeholder="@tunegocio" />
      </Row>
      <Row label="Facebook">
        <Input value={f.facebook} onChange={v => setF(p => ({ ...p, facebook: v }))} placeholder="facebook.com/tunegocio" />
      </Row>
      <Row label="URL Google Maps">
        <Input value={f.mapsUrl} onChange={v => setF(p => ({ ...p, mapsUrl: v }))} placeholder="https://maps.app.goo.gl/..." />
      </Row>
      <Row label="Dirección">
        <Input value={f.address} onChange={v => setF(p => ({ ...p, address: v }))} placeholder="Av. Corrientes 1234, CABA" />
      </Row>
      <Row label="Horario de atención">
        <Input value={f.hours} onChange={v => setF(p => ({ ...p, hours: v }))} placeholder="Lun–Vie 9–18hs · Sáb 9–13hs" />
      </Row>
      <Row label="Descripción footer">
        <Textarea value={f.footerDesc} onChange={v => setF(p => ({ ...p, footerDesc: v }))} placeholder="Breve descripción del negocio para el pie de página..." />
      </Row>
    </Card>
  );
}

function TabVentajas({ cfg, onSave, saving }: { cfg: CatalogConfig; onSave: (f: Partial<CatalogConfig>) => void; saving: boolean }) {
  const parse = (s: string): Feature[] => { try { return JSON.parse(s); } catch { return []; } };
  const [features, setFeatures] = useState<Feature[]>(parse(cfg.featuresJson ?? "[]"));

  function update(i: number, field: keyof Feature, val: string) {
    setFeatures(prev => prev.map((f, idx) => idx === i ? { ...f, [field]: val } : f));
  }

  function addFeature() {
    setFeatures(prev => [...prev, { emoji: "✅", title: "", desc: "" }]);
  }

  function remove(i: number) {
    setFeatures(prev => prev.filter((_, idx) => idx !== i));
  }

  return (
    <Card title="✨ Ventajas del negocio" onSave={() => onSave({ featuresJson: JSON.stringify(features) })} saving={saving}>
      <p className="text-xs text-cool-steel mb-4">Mostrá 3 beneficios clave que aparecen en el catálogo (envío gratis, garantía, atención, etc.)</p>
      <div className="space-y-3">
        {features.map((f, i) => (
          <div key={i} className="bg-navy rounded-xl p-4 border border-silver/15 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cool-steel">Ventaja {i + 1}</span>
              <button onClick={() => remove(i)} className="text-[10px] text-red-400/60 hover:text-red-400 transition-colors">Eliminar</button>
            </div>
            <div className="grid grid-cols-[64px_1fr_1fr] gap-2">
              <Input value={f.emoji} onChange={v => update(i, "emoji", v)} placeholder="✅" />
              <Input value={f.title} onChange={v => update(i, "title", v)} placeholder="Título (ej: Envío gratis)" />
              <Input value={f.desc} onChange={v => update(i, "desc", v)} placeholder="Descripción corta" />
            </div>
          </div>
        ))}
      </div>
      <button onClick={addFeature}
        className="mt-3 w-full border border-dashed border-silver/20 rounded-xl py-2.5 text-xs font-bold text-cool-steel hover:text-cl-accent hover:border-cl-accent/30 transition-all">
        <i className="ti ti-plus mr-1" /> Agregar ventaja
      </button>
    </Card>
  );
}

function TabFAQ({ cfg, onSave, saving }: { cfg: CatalogConfig; onSave: (f: Partial<CatalogConfig>) => void; saving: boolean }) {
  const parse = (s: string): FAQ[] => { try { return JSON.parse(s); } catch { return []; } };
  const [faqs, setFaqs] = useState<FAQ[]>(parse(cfg.faqJson ?? "[]"));

  function update(i: number, field: keyof FAQ, val: string) {
    setFaqs(prev => prev.map((f, idx) => idx === i ? { ...f, [field]: val } : f));
  }

  function remove(i: number) {
    setFaqs(prev => prev.filter((_, idx) => idx !== i));
  }

  return (
    <Card title="❓ Preguntas frecuentes" onSave={() => onSave({ faqJson: JSON.stringify(faqs) })} saving={saving}>
      <p className="text-xs text-cool-steel mb-4">El catálogo muestra un accordion con estas preguntas. Ideal para responder dudas antes de que el cliente pregunte por WhatsApp.</p>
      <div className="space-y-3">
        {faqs.map((f, i) => (
          <div key={i} className="bg-navy rounded-xl p-4 border border-silver/15 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cool-steel">Pregunta {i + 1}</span>
              <button onClick={() => remove(i)} className="text-[10px] text-red-400/60 hover:text-red-400 transition-colors">Eliminar</button>
            </div>
            <Input value={f.q} onChange={v => update(i, "q", v)} placeholder="¿Hacen envíos a todo el país?" />
            <Textarea value={f.a} onChange={v => update(i, "a", v)} placeholder="Sí, enviamos a todo el país por Andreani y OCA..." />
          </div>
        ))}
      </div>
      <button onClick={() => setFaqs(prev => [...prev, { q: "", a: "" }])}
        className="mt-3 w-full border border-dashed border-silver/20 rounded-xl py-2.5 text-xs font-bold text-cool-steel hover:text-cl-accent hover:border-cl-accent/30 transition-all">
        <i className="ti ti-plus mr-1" /> Agregar pregunta
      </button>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════
   AI GENERATE MODAL
═══════════════════════════════════════════════════ */
function AIGenerateModal({ onClose, onApply, onToast }: {
  onClose: () => void;
  onApply: (f: Partial<CatalogConfig>) => void;
  onToast: (msg: string, ok?: boolean) => void;
}) {
  const [form, setForm] = useState({ businessName: "", businessType: "ferretería", description: "" });
  const [loading, setLoading] = useState(false);

  const TYPES = ["ferretería", "restaurante", "ropa y moda", "electrónica", "farmacia", "pet shop", "librería", "joyería", "otro"];

  async function generate() {
    if (!form.businessName || !form.description) return;
    setLoading(true);
    try {
      const res = await fetch("/api/catalog/ai-generate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json() as { generated?: Record<string, unknown>; error?: string };
      if (!res.ok || !data.generated) {
        onToast(data.error ?? "Error al generar", false);
        return;
      }
      const g = data.generated as {
        brandSubtitle?: string; heroBadge?: string; heroTitle?: string;
        heroTitleAccent?: string; heroDescription?: string; catalogTitle?: string;
        catalogSubtitle?: string; searchPlaceholder?: string; footerDesc?: string;
        features?: Feature[]; faqs?: FAQ[];
      };
      onApply({
        brandSubtitle: g.brandSubtitle ?? "",
        heroBadge: g.heroBadge ?? "",
        heroTitle: g.heroTitle ?? "",
        heroTitleAccent: g.heroTitleAccent ?? "",
        heroDescription: g.heroDescription ?? "",
        catalogTitle: g.catalogTitle ?? "",
        catalogSubtitle: g.catalogSubtitle ?? "",
        searchPlaceholder: g.searchPlaceholder ?? "",
        footerDesc: g.footerDesc ?? "",
        featuresJson: JSON.stringify(g.features ?? []),
        faqJson: JSON.stringify(g.faqs ?? []),
      });
      onToast("Contenido generado y guardado");
      onClose();
    } catch {
      onToast("Error de conexión", false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-navy-card border border-silver/20 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <i className="ti ti-sparkles text-purple-400" /> Generar con IA
          </h3>
          <button onClick={onClose} className="text-cool-steel hover:text-white transition-colors">
            <i className="ti ti-x" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-cool-steel uppercase tracking-wider block mb-1.5">Nombre del negocio</label>
            <input value={form.businessName} onChange={e => setForm(p => ({ ...p, businessName: e.target.value }))}
              placeholder="Ferretería Central" className="w-full bg-navy border border-silver/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-cl-accent/50" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-cool-steel uppercase tracking-wider block mb-1.5">Tipo de negocio</label>
            <div className="flex flex-wrap gap-2">
              {TYPES.map(t => (
                <button key={t} onClick={() => setForm(p => ({ ...p, businessType: t }))}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${form.businessType === t ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-silver/10 text-cool-steel hover:bg-silver/15"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-cool-steel uppercase tracking-wider block mb-1.5">Descripción (qué vendés, qué te hace especial)</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={3} placeholder="Ej: Distribuidora mayorista de materiales de construcción, más de 2000 productos, envíos a todo el país, precios desde fábrica..."
              className="w-full bg-navy border border-silver/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-cl-accent/50 resize-none" />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-xs font-bold bg-silver/10 text-cool-steel hover:bg-silver/15 transition-all">
            Cancelar
          </button>
          <button onClick={generate} disabled={loading || !form.businessName || !form.description}
            className="flex-1 py-2 rounded-xl text-xs font-bold bg-purple-500 text-white hover:bg-purple-600 transition-all disabled:opacity-40">
            {loading ? <><i className="ti ti-loader-2 animate-spin mr-1" /> Generando...</> : <><i className="ti ti-sparkles mr-1" /> Generar</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Shared components ─────────────────────────── */
function Card({ title, children, onSave, saving }: { title: string; children: React.ReactNode; onSave: () => void; saving: boolean }) {
  return (
    <div className="bg-navy-card border border-silver/15 rounded-2xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">{title}</h3>
        <button onClick={onSave} disabled={saving}
          className="flex items-center gap-2 bg-cl-accent text-navy font-bold text-xs px-4 py-2 rounded-xl hover:bg-cl-accent-hover disabled:opacity-50 transition-all">
          {saving ? <><i className="ti ti-loader-2 animate-spin" /> Guardando...</> : <><i className="ti ti-device-floppy" /> Guardar</>}
        </button>
      </div>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-bold text-cool-steel uppercase tracking-wider block mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full bg-navy border border-silver/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-cl-accent/50" />
  );
}

function Textarea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
      className="w-full bg-navy border border-silver/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-cl-accent/50 resize-none" />
  );
}

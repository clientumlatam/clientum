import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";

interface PlaceResult {
  id: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  rating: number;
  reviews: number;
  status: string;
  source?: "google" | "openstreetmap";
}

const RUBROS = [
  "Restaurante", "Pizzería", "Parrilla / Asadero", "Café / Cafetería", "Heladería",
  "Peluquería / Barbería", "Estética / Spa", "Clínica / Consultorio", "Farmacia",
  "Ferretería", "Librería / Papelería", "Kiosco / Almacén", "Supermercado",
  "Gimnasio / CrossFit", "Yoga / Pilates", "Veterinaria", "Óptica", "Joyería",
  "Zapatería", "Ropa / Indumentaria", "Mueblería", "Agencia de autos",
  "Taller mecánico", "Lavadero de autos", "Inmobiliaria", "Estudio contable",
  "Estudio jurídico", "Agencia de seguros", "Hotel / Hostel", "Panadería / Confitería",
  "Sushi / Japonés", "Bar / Cervecería", "Kiosco de ropa", "Otro (personalizado)",
];

const CITIES = [
  "Neuquén Capital", "Cipolletti", "Plottier", "Centenario", "Zapala",
  "San Martín de los Andes", "Bariloche", "Buenos Aires", "Córdoba",
  "Rosario", "Mendoza", "Mar del Plata", "La Plata", "Salta",
  "Tucumán", "Santa Fe", "Resistencia", "Posadas", "Otra ciudad",
];

const MAX_OPTIONS = [10, 20, 40, 60];

const STATUS_MAP: Record<string, { label: string; color: string; icon: string }> = {
  OPERATIONAL:        { label: "Abierto",      color: "text-emerald-600 bg-emerald-50",  icon: "ti-circle-check" },
  CLOSED_TEMPORARILY: { label: "Cerrado temp.", color: "text-amber-600 bg-amber-50",     icon: "ti-clock-pause" },
  CLOSED_PERMANENTLY: { label: "Cerrado",      color: "text-red-500 bg-red-50",          icon: "ti-circle-x" },
  UNKNOWN:            { label: "Desconocido",  color: "text-[#3B506D] bg-[#DDDFE2]/40",     icon: "ti-help-circle" },
};

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <i
          key={i}
          className={`ti text-xs ${
            i < full ? "ti-star-filled text-amber-400" :
            i === full && half ? "ti-star-half-filled text-amber-400" :
            "ti-star text-[#DDDFE2]"
          }`}
        />
      ))}
    </span>
  );
}

function exportCSV(rows: PlaceResult[]) {
  const header = "Nombre,Dirección,Teléfono,Sitio web,Calificación,Reseñas,Estado";
  const lines = rows.map((r) =>
    [r.name, r.address, r.phone, r.website, r.rating, r.reviews,
      STATUS_MAP[r.status]?.label ?? r.status]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `leads-prospector-${Date.now()}.csv`;
  a.click();
}

async function apiFetch(url: string, opts?: RequestInit) {
  const r = await fetch(url, { credentials: "include", ...opts });
  if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
  return r.json();
}

export default function ProspectorPage() {
  const [rubro, setRubro] = useState("Restaurante");
  const [customRubro, setCustomRubro] = useState("");
  const [city, setCity] = useState("Neuquén Capital");
  const [customCity, setCustomCity] = useState("");
  const [maxResults, setMaxResults] = useState(20);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const [importFeedback, setImportFeedback] = useState<{ imported: number; duplicates: number } | null>(null);

  const isCustomRubro = rubro === "Otro (personalizado)";
  const isCustomCity  = city  === "Otra ciudad";
  const finalQuery    = isCustomRubro ? customRubro : rubro;
  const finalCity     = isCustomCity  ? customCity  : city;

  const { mutate, data, isPending, error } = useMutation<
    { results: PlaceResult[]; demo: boolean; source: string; total: number },
    Error
  >({
    mutationFn: () =>
      apiFetch("/api/prospector/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: finalQuery, location: finalCity, maxResults }),
      }),
    onSuccess: () => { setSelected(new Set()); setImportFeedback(null); },
  });

  const importMutation = useMutation<
    { imported: number; duplicates: number; total: number },
    Error,
    PlaceResult[]
  >({
    mutationFn: (leads) =>
      apiFetch("/api/prospector/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads }),
      }),
    onSuccess: (res, leads) => {
      setImportedIds((prev) => new Set([...prev, ...leads.map((l) => l.id)]));
      setSelected(new Set());
      setImportFeedback({ imported: res.imported, duplicates: res.duplicates });
      setTimeout(() => setImportFeedback(null), 5000);
    },
  });

  const results    = data?.results ?? [];
  const dataSource = data?.source ?? "openstreetmap";

  const withPhone   = results.filter((r) => r.phone).length;
  const withWebsite = results.filter((r) => r.website).length;
  const avgRating   = results.length
    ? (results.reduce((s, r) => s + r.rating, 0) / results.length).toFixed(1)
    : "—";

  function toggleAll() {
    if (selected.size === results.length) setSelected(new Set());
    else setSelected(new Set(results.map((r) => r.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleImportSelected() {
    const toImport = results.filter((r) => selected.has(r.id) && !importedIds.has(r.id));
    if (toImport.length === 0) return;
    importMutation.mutate(toImport);
  }

  function handleImportOne(r: PlaceResult) {
    if (importedIds.has(r.id) || importMutation.isPending) return;
    importMutation.mutate([r]);
  }

  const errMsg = (error as Error)?.message ?? "";
  const isUnauth = errMsg.includes("401");

  return (
    <div className="p-6 space-y-6 max-w-6xl">

      {/* ── Encabezado ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-[#031E43]">Prospector de Leads</h2>
          <p className="text-sm text-[#3B506D] mt-0.5">
            Buscá negocios reales por rubro y ciudad, e importalos directo al CRM
          </p>
        </div>
        {results.length > 0 && (
          <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border ${
            dataSource === "google"
              ? "bg-blue-50 border-blue-200 text-blue-700"
              : "bg-emerald-50 border-emerald-200 text-emerald-700"
          }`}>
            <i className={`ti ${dataSource === "google" ? "ti-brand-google-maps" : "ti-map"} text-sm`} />
            {dataSource === "google" ? "Google Maps" : "OpenStreetMap — gratis"}
          </div>
        )}
      </div>

      {/* ── Formulario de búsqueda ── */}
      <div className="bg-white border border-[#DDDFE2] rounded-2xl p-5 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">

          {/* Rubro */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#031E43]">Tipo de negocio</label>
            <select
              value={rubro}
              onChange={(e) => setRubro(e.target.value)}
              className="w-full border border-[#DDDFE2] rounded-lg px-3 py-2 text-sm text-[#031E43] bg-white focus:outline-none focus:border-[#031E43] transition-colors"
            >
              {RUBROS.map((r) => <option key={r}>{r}</option>)}
            </select>
            {isCustomRubro && (
              <input
                value={customRubro}
                onChange={(e) => setCustomRubro(e.target.value)}
                placeholder="Ej: estudio fotográfico"
                className="w-full border border-[#DDDFE2] rounded-lg px-3 py-2 text-sm text-[#031E43] focus:outline-none focus:border-[#031E43] mt-1"
              />
            )}
          </div>

          {/* Ciudad */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#031E43]">Ciudad / Zona</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full border border-[#DDDFE2] rounded-lg px-3 py-2 text-sm text-[#031E43] bg-white focus:outline-none focus:border-[#031E43] transition-colors"
            >
              {CITIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            {isCustomCity && (
              <input
                value={customCity}
                onChange={(e) => setCustomCity(e.target.value)}
                placeholder="Ej: Villa Crespo, CABA"
                className="w-full border border-[#DDDFE2] rounded-lg px-3 py-2 text-sm text-[#031E43] focus:outline-none focus:border-[#031E43] mt-1"
              />
            )}
          </div>

          {/* Resultados máximos */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#031E43]">Máx. resultados</label>
            <select
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              className="w-full border border-[#DDDFE2] rounded-lg px-3 py-2 text-sm text-[#031E43] bg-white focus:outline-none focus:border-[#031E43] transition-colors"
            >
              {MAX_OPTIONS.map((n) => <option key={n} value={n}>{n} negocios</option>)}
            </select>
          </div>

          {/* Botón */}
          <button
            onClick={() => mutate()}
            disabled={isPending || (!finalQuery.trim())}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#031E43] text-white text-sm font-bold rounded-lg hover:bg-[#3B506D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <i className="ti ti-loader-2 animate-spin text-base" />
                Buscando…
              </>
            ) : (
              <>
                <i className="ti ti-map-search text-base" />
                Buscar leads
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Feedback de importación ── */}
      {importFeedback && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3 text-sm">
          <i className="ti ti-circle-check text-lg text-emerald-500 flex-shrink-0" />
          <span className="flex-1">
            <strong>{importFeedback.imported} lead{importFeedback.imported !== 1 ? "s" : ""}</strong> guardado{importFeedback.imported !== 1 ? "s" : ""} en el CRM
            {importFeedback.duplicates > 0 && (
              <span className="text-emerald-600"> · {importFeedback.duplicates} ya existía{importFeedback.duplicates !== 1 ? "n" : ""}</span>
            )}
            {importFeedback.imported > 0 && (
              <span> — <Link href="/app/crm" className="font-semibold underline underline-offset-2 hover:text-emerald-900">Ver en Kanban CRM →</Link></span>
            )}
          </span>
          <button onClick={() => setImportFeedback(null)} className="text-emerald-400 hover:text-emerald-600">
            <i className="ti ti-x text-sm" />
          </button>
        </div>
      )}
      {importMutation.error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <i className="ti ti-alert-triangle text-base flex-shrink-0" />
          Error al importar: {(importMutation.error as Error).message}
        </div>
      )}

      {/* ── Error de búsqueda ── */}
      {error && !isUnauth && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <i className="ti ti-alert-triangle text-base flex-shrink-0" />
          <span>{errMsg.replace(/^\d+: /, "")}</span>
        </div>
      )}

      {/* ── Stats ── */}
      {results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Negocios encontrados", value: results.length, icon: "ti-building-store", color: "text-[#031E43]" },
            { label: "Con teléfono",         value: withPhone,       icon: "ti-phone",          color: "text-emerald-600" },
            { label: "Con sitio web",         value: withWebsite,     icon: "ti-world",          color: "text-blue-600" },
            { label: "Calificación promedio", value: avgRating,       icon: "ti-star-filled",    color: "text-amber-500" },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-[#DDDFE2] rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <i className={`ti ${s.icon} text-base ${s.color}`} />
                <span className="text-xs text-[#3B506D] font-medium">{s.label}</span>
              </div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Tabla de resultados ── */}
      {results.length > 0 && (
        <div className="bg-white border border-[#DDDFE2] rounded-2xl shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-[#DDDFE2] bg-[#FDFDFB] flex-wrap">
            <label className="flex items-center gap-2 text-sm font-semibold text-[#031E43] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selected.size === results.length}
                onChange={toggleAll}
                className="rounded border-[#DDDFE2] accent-[#031E43]"
              />
              {selected.size > 0 ? `${selected.size} seleccionados` : "Seleccionar todos"}
            </label>
            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <button
                  onClick={handleImportSelected}
                  disabled={importMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#031E43] text-white text-xs font-bold rounded-lg hover:bg-[#3B506D] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {importMutation.isPending ? (
                    <><i className="ti ti-loader-2 animate-spin text-sm" /> Importando…</>
                  ) : (
                    <><i className="ti ti-database-import text-sm" /> Importar {selected.size} al CRM</>
                  )}
                </button>
              )}
              <button
                onClick={() => exportCSV(results)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-[#DDDFE2] text-[#3B506D] text-xs font-semibold rounded-lg hover:bg-[#DDDFE2] transition-colors"
              >
                <i className="ti ti-file-csv text-sm" />
                Exportar CSV
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#DDDFE2] bg-[#FDFDFB]">
                  <th className="w-10 px-4 py-3" />
                  <th className="px-4 py-3 text-left text-xs font-bold text-[#3B506D] uppercase tracking-wider">Negocio</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-[#3B506D] uppercase tracking-wider">Dirección</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-[#3B506D] uppercase tracking-wider">Teléfono</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-[#3B506D] uppercase tracking-wider">Web</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-[#3B506D] uppercase tracking-wider">Rating</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-[#3B506D] uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDDFE2]">
                {results.map((r) => {
                  const isImported = importedIds.has(r.id);
                  const isChecked  = selected.has(r.id);
                  const statusInfo = STATUS_MAP[r.status] ?? STATUS_MAP.UNKNOWN;
                  return (
                    <tr
                      key={r.id}
                      className={`transition-colors ${isChecked ? "bg-blue-50/60" : "hover:bg-[#FDFDFB]"}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleOne(r.id)}
                          disabled={isImported}
                          className="rounded border-[#DDDFE2] accent-[#031E43]"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#031E43] max-w-[180px] truncate" title={r.name}>
                          {r.name}
                        </div>
                        {isImported && (
                          <span className="text-[10px] text-emerald-600 font-semibold">
                            <i className="ti ti-check text-xs" /> En CRM
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#3B506D] max-w-[200px]">
                        <span className="truncate block text-xs" title={r.address}>{r.address || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        {r.phone ? (
                          <a
                            href={`tel:${r.phone}`}
                            className="text-[#031E43] text-xs font-medium hover:text-[#3B506D] whitespace-nowrap"
                          >
                            {r.phone}
                          </a>
                        ) : (
                          <span className="text-[#DDDFE2] text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {r.website ? (
                          <a
                            href={r.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 text-xs hover:underline flex items-center gap-1 max-w-[120px] truncate"
                            title={r.website}
                          >
                            <i className="ti ti-external-link text-xs flex-shrink-0" />
                            <span className="truncate">{r.website.replace(/^https?:\/\/(www\.)?/, "")}</span>
                          </a>
                        ) : (
                          <span className="text-[#DDDFE2] text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <Stars rating={r.rating} />
                          <span className="text-[10px] text-[#3B506D]">
                            {r.rating > 0 ? r.rating.toFixed(1) : "—"}
                            {r.reviews > 0 && <span className="text-[#3B506D]/70"> ({r.reviews})</span>}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusInfo.color}`}>
                          <i className={`ti ${statusInfo.icon} text-xs`} />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleImportOne(r)}
                          disabled={isImported || importMutation.isPending}
                          title={isImported ? "Ya importado al CRM" : "Agregar al CRM"}
                          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                            isImported
                              ? "bg-emerald-50 text-emerald-500 cursor-default"
                              : "text-[#3B506D] hover:bg-[#031E43] hover:text-white disabled:opacity-40"
                          }`}
                        >
                          <i className={`ti ${isImported ? "ti-check" : "ti-user-plus"} text-sm`} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!isPending && !error && results.length === 0 && (
        <div className="bg-white border border-[#DDDFE2] rounded-2xl p-16 text-center shadow-sm">
          <div className="w-16 h-16 bg-[#031E43]/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <i className="ti ti-map-search text-3xl text-[#031E43]/40" />
          </div>
          <p className="text-base font-semibold text-[#031E43]">Buscá tu primer rubro</p>
          <p className="text-sm text-[#3B506D] mt-1 max-w-xs mx-auto">
            Elegí un tipo de negocio y ciudad, hacé clic en <strong>Buscar leads</strong> y conseguís prospectos listos para importar al CRM.
          </p>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import FinanzasPage from "./Finanzas";

async function apiFetch(url: string, opts?: RequestInit) {
  const r = await fetch(url, { credentials: "include", ...opts });
  if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
  return r.json();
}

interface AfipStatus {
  hasAccess: boolean;
  configured: boolean;
  tokenVivo: boolean;
  plan: string;
  cuit: string | null;
  razonSocial: string | null;
  puntoVenta: number | null;
  environment: string;
}

interface AfipComprobante {
  id: number;
  tipo: number;
  numero: number;
  puntoVenta: number;
  fecha: string;
  cae: string | null;
  caeFchVto: string | null;
  docNro: string;
  impTotal: string;
  impIva: string;
  concepto: number;
  status: string;
  descripcion: string | null;
  createdAt: string;
}

const TIPO_LABELS: Record<number, string> = {
  1: "Factura A", 6: "Factura B", 11: "Factura C",
  2: "Nota de Débito A", 7: "Nota de Débito B", 12: "Nota de Débito C",
  3: "Nota de Crédito A", 8: "Nota de Crédito B", 13: "Nota de Crédito C",
};

function fmtArs(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

function padPV(pv: number, nro: number) {
  return `${String(pv).padStart(4, "0")}-${String(nro).padStart(8, "0")}`;
}

function AfipPanel() {
  const qc = useQueryClient();
  const [showCert, setShowCert] = useState(false);
  const [emitiendo, setEmitiendo] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [form, setForm] = useState({ cuit: "", razonSocial: "", puntoVenta: "", certPem: "", privateKeyPem: "", environment: "homologacion" });
  const [factForm, setFactForm] = useState({ tipo: "11", concepto: "2", docTipo: "99", docNro: "0", impTotal: "", impNeto: "", impIva: "0", descripcion: "" });

  const showToast = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const { data: status, isLoading } = useQuery<AfipStatus>({
    queryKey: ["afip-status"],
    queryFn: () => apiFetch("/api/afip/status"),
  });

  const { data: comprobantesData } = useQuery<{ comprobantes: AfipComprobante[]; total: number }>({
    queryKey: ["afip-comprobantes"],
    queryFn: () => apiFetch("/api/afip/comprobantes"),
    enabled: !!status?.hasAccess,
  });

  useEffect(() => {
    if (status) {
      setForm(f => ({
        ...f,
        cuit: status.cuit ?? "",
        razonSocial: status.razonSocial ?? "",
        puntoVenta: String(status.puntoVenta ?? ""),
        environment: status.environment ?? "homologacion",
      }));
    }
  }, [status]);

  const configureMut = useMutation({
    mutationFn: (data: typeof form) => apiFetch("/api/afip/configure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, puntoVenta: Number(data.puntoVenta) }),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["afip-status"] }); showToast("ok", "Configuración guardada"); setShowCert(false); },
    onError: (e: Error) => showToast("err", e.message),
  });

  const testMut = useMutation({
    mutationFn: () => apiFetch("/api/afip/test-connection", { method: "POST" }),
    onSuccess: (d: { ok: boolean; message: string }) => showToast("ok", d.message),
    onError: (e: Error) => showToast("err", e.message),
  });

  const refreshTokenMut = useMutation({
    mutationFn: () => apiFetch("/api/afip/refresh-token", { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["afip-status"] }); showToast("ok", "Token AFIP renovado"); },
    onError: (e: Error) => showToast("err", e.message),
  });

  const caesMut = useMutation({
    mutationFn: (d: typeof factForm) => apiFetch("/api/afip/solicitar-cae", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...d, impTotal: Number(d.impTotal), impNeto: Number(d.impNeto || d.impTotal), impIva: Number(d.impIva) }),
    }),
    onSuccess: (d: { ok: boolean; cae: string; numero: number }) => {
      qc.invalidateQueries({ queryKey: ["afip-comprobantes"] });
      showToast("ok", `CAE obtenido: ${d.cae} — Comprobante N° ${d.numero}`);
      setEmitiendo(false);
      setFactForm({ tipo: "11", concepto: "2", docTipo: "99", docNro: "0", impTotal: "", impNeto: "", impIva: "0", descripcion: "" });
    },
    onError: (e: Error) => showToast("err", e.message),
  });

  if (isLoading) return <div className="flex justify-center py-16"><i className="ti ti-loader-2 animate-spin text-2xl text-cool-steel/30" /></div>;

  if (!status?.hasAccess) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <div className="bg-navy-2 border border-silver/20 rounded-2xl p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-amber-400/10 rounded-2xl flex items-center justify-center mx-auto">
            <i className="ti ti-building-government text-3xl text-amber-400" />
          </div>
          <h3 className="text-lg font-bold text-white">Facturación Electrónica AFIP</h3>
          <p className="text-sm text-cool-steel">La integración con AFIP (WSAA + WSFE) está disponible en los planes <strong className="text-white">Business</strong> y <strong className="text-white">Enterprise</strong>.</p>
          <a href="/app/cuenta" className="inline-flex items-center gap-2 bg-cl-accent text-navy font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-cl-accent/90 transition-all">
            <i className="ti ti-arrow-up-circle" /> Actualizar plan
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {toast && (
        <div className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm ${toast.type === "ok" ? "bg-cl-accent/10 border border-cl-accent/30 text-cl-accent" : "bg-red-500/10 border border-red-500/30 text-red-400"}`}>
          <i className={`ti ${toast.type === "ok" ? "ti-circle-check" : "ti-alert-triangle"} text-base flex-shrink-0`} />
          <span className="flex-1">{toast.msg}</span>
          <button onClick={() => setToast(null)}><i className="ti ti-x text-sm" /></button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            label: "Estado de conexión",
            value: status.configured ? (status.tokenVivo ? "Token activo" : "Sin token") : "No configurado",
            icon: status.configured && status.tokenVivo ? "ti-circle-check" : "ti-alert-circle",
            color: status.configured && status.tokenVivo ? "text-cl-accent" : "text-amber-400",
            bg: status.configured && status.tokenVivo ? "bg-cl-accent/10" : "bg-amber-400/10",
          },
          {
            label: "Ambiente",
            value: status.environment === "produccion" ? "Producción" : "Homologación (prueba)",
            icon: status.environment === "produccion" ? "ti-world" : "ti-flask",
            color: status.environment === "produccion" ? "text-emerald-400" : "text-blue-400",
            bg: status.environment === "produccion" ? "bg-emerald-400/10" : "bg-blue-400/10",
          },
          {
            label: "Comprobantes emitidos",
            value: String(comprobantesData?.total ?? 0),
            icon: "ti-file-invoice",
            color: "text-violet-400",
            bg: "bg-violet-400/10",
          },
        ].map(s => (
          <div key={s.label} className="bg-navy-2 border border-silver/20 rounded-xl p-5">
            <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>
              <i className={`ti ${s.icon} text-xl ${s.color}`} />
            </div>
            <p className="text-lg font-bold text-white">{s.value}</p>
            <p className="text-xs text-cool-steel mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-navy-2 border border-silver/20 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-silver/15">
          <div>
            <h3 className="font-bold text-white flex items-center gap-2"><i className="ti ti-settings text-cl-accent" /> Configuración AFIP</h3>
            {status.cuit && <p className="text-xs text-cool-steel mt-0.5">CUIT: {status.cuit} — Pto. Venta: {status.puntoVenta}</p>}
          </div>
          <div className="flex items-center gap-2">
            {status.configured && (
              <button onClick={() => testMut.mutate()} disabled={testMut.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cool-steel border border-silver/20 rounded-lg hover:bg-silver/10 transition-all disabled:opacity-50">
                {testMut.isPending ? <i className="ti ti-loader-2 animate-spin text-sm" /> : <i className="ti ti-plug-connected text-sm" />}
                Probar conexión
              </button>
            )}
            <button onClick={() => setShowCert(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-cl-accent text-navy rounded-lg hover:bg-cl-accent/90 transition-all">
              <i className={`ti ${showCert ? "ti-x" : "ti-edit"} text-sm`} />
              {showCert ? "Cancelar" : status.configured ? "Editar" : "Configurar"}
            </button>
          </div>
        </div>

        {showCert && (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-cool-steel block mb-1">CUIT *</label>
                <input value={form.cuit} onChange={e => setForm(f => ({ ...f, cuit: e.target.value }))} placeholder="20123456789" className="w-full bg-deep-space/20 border border-silver/20 rounded-lg px-3 py-2 text-white text-sm placeholder-cool-steel/30 outline-none focus:border-cl-accent" />
              </div>
              <div>
                <label className="text-xs font-bold text-cool-steel block mb-1">Razón Social</label>
                <input value={form.razonSocial} onChange={e => setForm(f => ({ ...f, razonSocial: e.target.value }))} placeholder="Mi Empresa SRL" className="w-full bg-deep-space/20 border border-silver/20 rounded-lg px-3 py-2 text-white text-sm placeholder-cool-steel/30 outline-none focus:border-cl-accent" />
              </div>
              <div>
                <label className="text-xs font-bold text-cool-steel block mb-1">Punto de Venta *</label>
                <input value={form.puntoVenta} onChange={e => setForm(f => ({ ...f, puntoVenta: e.target.value }))} placeholder="1" type="number" className="w-full bg-deep-space/20 border border-silver/20 rounded-lg px-3 py-2 text-white text-sm placeholder-cool-steel/30 outline-none focus:border-cl-accent" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-cool-steel block mb-1">Ambiente</label>
              <div className="flex gap-3">
                {[{ v: "homologacion", l: "Homologación (prueba)" }, { v: "produccion", l: "Producción" }].map(opt => (
                  <button key={opt.v} onClick={() => setForm(f => ({ ...f, environment: opt.v }))}
                    className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg border transition-all ${form.environment === opt.v ? "bg-cl-accent/10 border-cl-accent text-cl-accent font-semibold" : "border-silver/20 text-cool-steel hover:border-silver/40"}`}>
                    <i className={`ti ${opt.v === "produccion" ? "ti-world" : "ti-flask"} text-sm`} />
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-cool-steel block mb-1">Certificado X.509 (PEM)</label>
              <textarea value={form.certPem} onChange={e => setForm(f => ({ ...f, certPem: e.target.value }))} rows={4} placeholder="-----BEGIN CERTIFICATE-----&#10;MIIEpAIBAAKCAQEA...&#10;-----END CERTIFICATE-----" className="w-full bg-deep-space/20 border border-silver/20 rounded-lg px-3 py-2 text-white text-xs font-mono placeholder-cool-steel/30 outline-none focus:border-cl-accent resize-none" />
              <p className="text-[10px] text-cool-steel/55 mt-1">Obtenelo desde el portal de AFIP → Administración de Certificados Digitales</p>
            </div>
            <div>
              <label className="text-xs font-bold text-cool-steel block mb-1">Clave Privada RSA (PEM)</label>
              <textarea value={form.privateKeyPem} onChange={e => setForm(f => ({ ...f, privateKeyPem: e.target.value }))} rows={4} placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;MIIEowIBAAKCAQEA...&#10;-----END RSA PRIVATE KEY-----" className="w-full bg-deep-space/20 border border-silver/20 rounded-lg px-3 py-2 text-white text-xs font-mono placeholder-cool-steel/30 outline-none focus:border-cl-accent resize-none" />
              <p className="text-[10px] text-cool-steel/55 mt-1">La clave privada nunca sale del servidor — se usa solo para firmar el LoginTicketRequest localmente.</p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button onClick={() => configureMut.mutate(form)} disabled={configureMut.isPending || !form.cuit || !form.puntoVenta}
                className="flex items-center gap-1.5 px-4 py-2 bg-cl-accent text-navy text-sm font-bold rounded-lg hover:bg-cl-accent/90 transition-all disabled:opacity-50">
                {configureMut.isPending ? <><i className="ti ti-loader-2 animate-spin text-sm" /> Guardando…</> : <><i className="ti ti-device-floppy text-sm" /> Guardar configuración</>}
              </button>
              {status.configured && (
                <button onClick={() => refreshTokenMut.mutate()} disabled={refreshTokenMut.isPending}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-cool-steel border border-silver/20 rounded-lg hover:bg-silver/10 transition-all disabled:opacity-50">
                  {refreshTokenMut.isPending ? <i className="ti ti-loader-2 animate-spin text-sm" /> : <i className="ti ti-refresh text-sm" />}
                  Renovar token
                </button>
              )}
            </div>
          </div>
        )}

        {!showCert && status.configured && (
          <div className="px-5 py-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {[
              { label: "CUIT", value: status.cuit ?? "—" },
              { label: "Razón Social", value: status.razonSocial ?? "—" },
              { label: "Punto de Venta", value: String(status.puntoVenta ?? "—") },
              { label: "Ambiente", value: status.environment === "produccion" ? "Producción" : "Homologación" },
            ].map(f => (
              <div key={f.label}>
                <p className="text-[10px] font-bold text-cool-steel/55 uppercase tracking-wider mb-0.5">{f.label}</p>
                <p className="text-white font-semibold">{f.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {status.configured && (
        <div className="bg-navy-2 border border-silver/20 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-silver/15">
            <h3 className="font-bold text-white flex items-center gap-2"><i className="ti ti-file-invoice text-violet-400" /> Comprobantes emitidos</h3>
            <button onClick={() => setEmitiendo(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-lg hover:bg-violet-500/20 transition-all">
              <i className={`ti ${emitiendo ? "ti-x" : "ti-plus"} text-sm`} />
              {emitiendo ? "Cancelar" : "Emitir comprobante"}
            </button>
          </div>

          {emitiendo && (
            <div className="p-5 border-b border-silver/15 space-y-4">
              <h4 className="text-sm font-bold text-white">Solicitar CAE</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-bold text-cool-steel block mb-1">Tipo de comprobante</label>
                  <select value={factForm.tipo} onChange={e => setFactForm(f => ({ ...f, tipo: e.target.value }))} className="w-full bg-deep-space/20 border border-silver/20 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cl-accent">
                    {Object.entries(TIPO_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-cool-steel block mb-1">Concepto</label>
                  <select value={factForm.concepto} onChange={e => setFactForm(f => ({ ...f, concepto: e.target.value }))} className="w-full bg-deep-space/20 border border-silver/20 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cl-accent">
                    <option value="1">1 — Productos</option>
                    <option value="2">2 — Servicios</option>
                    <option value="3">3 — Ambos</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-cool-steel block mb-1">Tipo Doc receptor</label>
                  <select value={factForm.docTipo} onChange={e => setFactForm(f => ({ ...f, docTipo: e.target.value }))} className="w-full bg-deep-space/20 border border-silver/20 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cl-accent">
                    <option value="99">99 — Consumidor Final</option>
                    <option value="80">80 — CUIT</option>
                    <option value="96">96 — DNI</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-cool-steel block mb-1">Nro. doc receptor</label>
                  <input value={factForm.docNro} onChange={e => setFactForm(f => ({ ...f, docNro: e.target.value }))} placeholder="0" className="w-full bg-deep-space/20 border border-silver/20 rounded-lg px-3 py-2 text-white text-sm placeholder-cool-steel/30 outline-none focus:border-cl-accent" />
                </div>
                <div>
                  <label className="text-xs font-bold text-cool-steel block mb-1">Importe Total *</label>
                  <input value={factForm.impTotal} onChange={e => setFactForm(f => ({ ...f, impTotal: e.target.value }))} type="number" placeholder="12100.00" className="w-full bg-deep-space/20 border border-silver/20 rounded-lg px-3 py-2 text-white text-sm placeholder-cool-steel/30 outline-none focus:border-cl-accent" />
                </div>
                <div>
                  <label className="text-xs font-bold text-cool-steel block mb-1">Importe Neto Gravado</label>
                  <input value={factForm.impNeto} onChange={e => setFactForm(f => ({ ...f, impNeto: e.target.value }))} type="number" placeholder="10000.00" className="w-full bg-deep-space/20 border border-silver/20 rounded-lg px-3 py-2 text-white text-sm placeholder-cool-steel/30 outline-none focus:border-cl-accent" />
                </div>
                <div>
                  <label className="text-xs font-bold text-cool-steel block mb-1">IVA</label>
                  <input value={factForm.impIva} onChange={e => setFactForm(f => ({ ...f, impIva: e.target.value }))} type="number" placeholder="2100.00" className="w-full bg-deep-space/20 border border-silver/20 rounded-lg px-3 py-2 text-white text-sm placeholder-cool-steel/30 outline-none focus:border-cl-accent" />
                </div>
                <div>
                  <label className="text-xs font-bold text-cool-steel block mb-1">Descripción (opcional)</label>
                  <input value={factForm.descripcion} onChange={e => setFactForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Servicios Junio 2026" className="w-full bg-deep-space/20 border border-silver/20 rounded-lg px-3 py-2 text-white text-sm placeholder-cool-steel/30 outline-none focus:border-cl-accent" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => caesMut.mutate(factForm)} disabled={caesMut.isPending || !factForm.impTotal}
                  className="flex items-center gap-1.5 px-4 py-2 bg-violet-500 text-white text-sm font-bold rounded-lg hover:bg-violet-600 transition-all disabled:opacity-50">
                  {caesMut.isPending ? <><i className="ti ti-loader-2 animate-spin text-sm" /> Consultando AFIP…</> : <><i className="ti ti-send text-sm" /> Solicitar CAE</>}
                </button>
                <p className="text-xs text-cool-steel/55">Se enviará la solicitud al web service WSFE de AFIP</p>
              </div>
            </div>
          )}

          {!comprobantesData?.comprobantes?.length ? (
            <div className="px-5 py-12 text-center">
              <i className="ti ti-file-invoice text-4xl text-cool-steel/20 block mb-3" />
              <p className="text-sm text-cool-steel/55">Todavía no se emitieron comprobantes en este ambiente</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-deep-space/10 sticky top-0">
                  <tr>
                    {["N° Comprobante", "Tipo", "Fecha", "CAE", "Total", "Estado"].map(h => (
                      <th key={h} className="px-5 py-3 text-[10px] font-bold text-cool-steel/45 uppercase tracking-wider text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-silver/10">
                  {comprobantesData.comprobantes.map(c => (
                    <tr key={c.id} className="hover:bg-deep-space/10 transition-colors">
                      <td className="px-5 py-3 font-mono text-cl-accent text-xs">{padPV(c.puntoVenta, c.numero)}</td>
                      <td className="px-5 py-3 text-silver">{TIPO_LABELS[c.tipo] ?? `Tipo ${c.tipo}`}</td>
                      <td className="px-5 py-3 text-cool-steel">{c.fecha}</td>
                      <td className="px-5 py-3 font-mono text-xs text-emerald-400">{c.cae ? c.cae.slice(0, 10) + "…" : "—"}</td>
                      <td className="px-5 py-3 font-mono font-semibold text-white">{fmtArs(Number(c.impTotal))}</td>
                      <td className="px-5 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.status === "emitida" ? "bg-cl-accent/20 text-cl-accent" : "bg-red-400/20 text-red-400"}`}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type AccTab = "dashboard" | "diario" | "cuentas" | "pyg" | "balance" | "afip" | "finanzas";

type JournalEntry = {
  id: string;
  date: string;
  number: string;
  description: string;
  reference: string;
  lines: { account: string; accountCode: string; debit: number; credit: number }[];
  status: "borrador" | "publicado" | "anulado";
};

type Account = {
  code: string;
  name: string;
  type: "activo" | "pasivo" | "patrimonio" | "ingreso" | "gasto";
  subtype: string;
  balance: number;
  children?: Account[];
};

const JOURNAL: JournalEntry[] = [
  {
    id: "1", date: "2026-06-13", number: "AS-0089", description: "Cobro de factura FA-00123 — Inmobiliaria Palermo", reference: "FA-00123", status: "publicado",
    lines: [
      { account: "Banco Cuenta Corriente", accountCode: "1.1.02", debit: 320000, credit: 0 },
      { account: "Cuentas por Cobrar", accountCode: "1.1.04", debit: 0, credit: 320000 },
    ],
  },
  {
    id: "2", date: "2026-06-12", number: "AS-0088", description: "Pago de servicios cloud — AWS", reference: "OC-0029", status: "publicado",
    lines: [
      { account: "Gastos de Tecnología", accountCode: "5.1.03", debit: 72000, credit: 0 },
      { account: "Banco Cuenta Corriente", accountCode: "1.1.02", debit: 0, credit: 72000 },
    ],
  },
  {
    id: "3", date: "2026-06-12", number: "AS-0087", description: "Facturación mensual — Electrónica XYZ", reference: "FB-00089", status: "publicado",
    lines: [
      { account: "Cuentas por Cobrar", accountCode: "1.1.04", debit: 55000, credit: 0 },
      { account: "Ingresos por Servicios", accountCode: "4.1.01", debit: 0, credit: 45455 },
      { account: "IVA Débito Fiscal", accountCode: "2.1.05", debit: 0, credit: 9545 },
    ],
  },
  {
    id: "4", date: "2026-06-10", number: "AS-0086", description: "Pago de sueldos Junio", reference: "RRHH-06", status: "publicado",
    lines: [
      { account: "Sueldos y Jornales", accountCode: "5.2.01", debit: 480000, credit: 0 },
      { account: "Banco Cuenta Corriente", accountCode: "1.1.02", debit: 0, credit: 403200 },
      { account: "Retenciones AFIP", accountCode: "2.1.06", debit: 0, credit: 76800 },
    ],
  },
  {
    id: "5", date: "2026-06-09", number: "AS-0085", description: "Venta plan Enterprise — Ferretería Central", reference: "FA-00122", status: "publicado",
    lines: [
      { account: "Cuentas por Cobrar", accountCode: "1.1.04", debit: 95000, credit: 0 },
      { account: "Ingresos por Servicios", accountCode: "4.1.01", debit: 0, credit: 78512 },
      { account: "IVA Débito Fiscal", accountCode: "2.1.05", debit: 0, credit: 16488 },
    ],
  },
  {
    id: "6", date: "2026-06-08", number: "AS-0084", description: "Alquiler oficina Junio", reference: "ALQJUN", status: "publicado",
    lines: [
      { account: "Gastos de Alquiler", accountCode: "5.1.01", debit: 95000, credit: 0 },
      { account: "Banco Cuenta Corriente", accountCode: "1.1.02", debit: 0, credit: 95000 },
    ],
  },
  {
    id: "7", date: "2026-06-05", number: "AS-0083", description: "Compra materiales — Papelera Norte", reference: "OC-0030", status: "publicado",
    lines: [
      { account: "Gastos de Insumos", accountCode: "5.1.05", debit: 28000, credit: 0 },
      { account: "Cuentas por Pagar", accountCode: "2.1.02", debit: 0, credit: 28000 },
    ],
  },
  {
    id: "8", date: "2026-06-14", number: "AS-0090", description: "Asiento de ajuste provisión incobrables", reference: "ADJ-006", status: "borrador",
    lines: [
      { account: "Pérdidas por Incobrables", accountCode: "5.3.01", debit: 42000, credit: 0 },
      { account: "Provisión Incobrables", accountCode: "1.1.05", debit: 0, credit: 42000 },
    ],
  },
];

const CHART_OF_ACCOUNTS: Account[] = [
  {
    code: "1", name: "ACTIVO", type: "activo", subtype: "Grupo", balance: 2_847_500,
    children: [
      {
        code: "1.1", name: "Activo Corriente", type: "activo", subtype: "Subgrupo", balance: 2_147_500,
        children: [
          { code: "1.1.01", name: "Caja y equivalentes", type: "activo", subtype: "Detalle", balance: 145_000 },
          { code: "1.1.02", name: "Banco Cuenta Corriente", type: "activo", subtype: "Detalle", balance: 1_285_300 },
          { code: "1.1.03", name: "Banco Caja de Ahorro", type: "activo", subtype: "Detalle", balance: 342_200 },
          { code: "1.1.04", name: "Cuentas por Cobrar", type: "activo", subtype: "Detalle", balance: 375_000 },
          { code: "1.1.05", name: "Provisión Incobrables", type: "activo", subtype: "Detalle", balance: -42_000 },
          { code: "1.1.06", name: "IVA Crédito Fiscal", type: "activo", subtype: "Detalle", balance: 42_000 },
        ],
      },
      {
        code: "1.2", name: "Activo No Corriente", type: "activo", subtype: "Subgrupo", balance: 700_000,
        children: [
          { code: "1.2.01", name: "Equipamiento tecnológico", type: "activo", subtype: "Detalle", balance: 850_000 },
          { code: "1.2.02", name: "Amortización acumulada", type: "activo", subtype: "Detalle", balance: -150_000 },
        ],
      },
    ],
  },
  {
    code: "2", name: "PASIVO", type: "pasivo", subtype: "Grupo", balance: 782_000,
    children: [
      {
        code: "2.1", name: "Pasivo Corriente", type: "pasivo", subtype: "Subgrupo", balance: 782_000,
        children: [
          { code: "2.1.01", name: "Proveedores a pagar", type: "pasivo", subtype: "Detalle", balance: 145_000 },
          { code: "2.1.02", name: "Cuentas por Pagar", type: "pasivo", subtype: "Detalle", balance: 28_000 },
          { code: "2.1.03", name: "Sueldos a pagar", type: "pasivo", subtype: "Detalle", balance: 76_800 },
          { code: "2.1.04", name: "Préstamo bancario CP", type: "pasivo", subtype: "Detalle", balance: 500_000 },
          { code: "2.1.05", name: "IVA Débito Fiscal", type: "pasivo", subtype: "Detalle", balance: 26_033 },
          { code: "2.1.06", name: "Retenciones AFIP", type: "pasivo", subtype: "Detalle", balance: 6_167 },
        ],
      },
    ],
  },
  {
    code: "3", name: "PATRIMONIO NETO", type: "patrimonio", subtype: "Grupo", balance: 2_065_500,
    children: [
      { code: "3.1.01", name: "Capital Social", type: "patrimonio", subtype: "Detalle", balance: 1_500_000 },
      { code: "3.1.02", name: "Resultado del ejercicio", type: "patrimonio", subtype: "Detalle", balance: 565_500 },
    ],
  },
  {
    code: "4", name: "INGRESOS", type: "ingreso", subtype: "Grupo", balance: 1_285_000,
    children: [
      { code: "4.1.01", name: "Ingresos por Servicios SaaS", type: "ingreso", subtype: "Detalle", balance: 1_050_000 },
      { code: "4.1.02", name: "Ingresos por Implementación", type: "ingreso", subtype: "Detalle", balance: 195_000 },
      { code: "4.1.03", name: "Ingresos por Capacitación", type: "ingreso", subtype: "Detalle", balance: 40_000 },
    ],
  },
  {
    code: "5", name: "GASTOS", type: "gasto", subtype: "Grupo", balance: 719_500,
    children: [
      { code: "5.1.01", name: "Alquiler y expensas", type: "gasto", subtype: "Detalle", balance: 95_000 },
      { code: "5.1.02", name: "Servicios públicos", type: "gasto", subtype: "Detalle", balance: 18_500 },
      { code: "5.1.03", name: "Tecnología y cloud", type: "gasto", subtype: "Detalle", balance: 72_000 },
      { code: "5.1.04", name: "Marketing y publicidad", type: "gasto", subtype: "Detalle", balance: 54_000 },
      { code: "5.1.05", name: "Insumos y materiales", type: "gasto", subtype: "Detalle", balance: 28_000 },
      { code: "5.2.01", name: "Sueldos y Jornales", type: "gasto", subtype: "Detalle", balance: 480_000 },
      { code: "5.2.02", name: "Cargas sociales", type: "gasto", subtype: "Detalle", balance: 144_000 },
      { code: "5.3.01", name: "Pérdidas por incobrables", type: "gasto", subtype: "Detalle", balance: 42_000 },
    ],
  },
];

const TYPE_COLORS: Record<string, { color: string; bg: string; dot: string }> = {
  activo:     { color: "text-blue-400",   bg: "bg-blue-400/10",   dot: "bg-blue-400" },
  pasivo:     { color: "text-red-400",    bg: "bg-red-400/10",    dot: "bg-red-400" },
  patrimonio: { color: "text-purple-400", bg: "bg-purple-400/10", dot: "bg-purple-400" },
  ingreso:    { color: "text-cl-accent",  bg: "bg-cl-accent/10",  dot: "bg-cl-accent" },
  gasto:      { color: "text-orange-400", bg: "bg-orange-400/10", dot: "bg-orange-400" },
};

const STATUS_STYLE: Record<string, string> = {
  publicado: "bg-cl-accent/20 text-cl-accent",
  borrador:  "bg-yellow-400/20 text-yellow-400",
  anulado:   "bg-red-400/20 text-red-400",
};

function fmt(n: number) {
  return `$${Math.abs(n).toLocaleString("es-AR")}`;
}

type OpenNodes = Record<string, boolean>;

function AccountRow({ acc, depth = 0, open, setOpen }: { acc: Account; depth?: number; open: OpenNodes; setOpen: (v: OpenNodes) => void }) {
  const hasChildren = acc.children && acc.children.length > 0;
  const isOpen = open[acc.code];
  const tc = TYPE_COLORS[acc.type];

  return (
    <>
      <tr
        className={`border-b border-silver/15 hover:bg-deep-space/10 transition-colors ${depth === 0 ? "bg-deep-space/10" : ""}`}
        onClick={() => hasChildren && setOpen({ ...open, [acc.code]: !isOpen })}
        style={{ cursor: hasChildren ? "pointer" : "default" }}
      >
        <td className="px-4 py-2.5" style={{ paddingLeft: `${16 + depth * 24}px` }}>
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <i className={`ti ${isOpen ? "ti-chevron-down" : "ti-chevron-right"} text-xs text-cool-steel/55`} />
            ) : (
              <div className="w-3 h-3 flex-shrink-0" />
            )}
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${tc.dot}`} />
            <span className={`text-xs font-mono text-cool-steel/55 ${depth === 0 ? "font-bold" : ""}`}>{acc.code}</span>
          </div>
        </td>
        <td className="px-4 py-2.5">
          <span className={`text-sm ${depth === 0 ? "font-bold text-white" : depth === 1 ? "font-semibold text-silver" : "text-cool-steel"}`}>
            {acc.name}
          </span>
        </td>
        <td className="px-4 py-2.5">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tc.bg} ${tc.color}`}>
            {acc.type.charAt(0).toUpperCase() + acc.type.slice(1)}
          </span>
        </td>
        <td className={`px-4 py-2.5 text-right font-mono text-sm font-semibold ${acc.balance < 0 ? "text-red-400" : depth === 0 ? "text-white font-bold" : "text-silver"}`}>
          {acc.balance < 0 ? `-${fmt(acc.balance)}` : fmt(acc.balance)}
        </td>
      </tr>
      {hasChildren && isOpen && acc.children!.map(child => (
        <AccountRow key={child.code} acc={child} depth={depth + 1} open={open} setOpen={setOpen} />
      ))}
    </>
  );
}

export default function AccountingPage() {
  const [tab, setTab] = useState<AccTab>("dashboard");
  const [search, setSearch] = useState("");
  const [openNodes, setOpenNodes] = useState<OpenNodes>({ "1": true, "2": true, "3": true, "4": true, "5": true });
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  const tabs: { id: AccTab; label: string; icon: string }[] = [
    { id: "dashboard",  label: "Resumen",       icon: "ti-chart-area-line" },
    { id: "diario",     label: "Libro Diario",  icon: "ti-notebook" },
    { id: "cuentas",    label: "Plan de Cuentas", icon: "ti-sitemap" },
    { id: "pyg",        label: "P&L",           icon: "ti-trending-up" },
    { id: "balance",    label: "Balance",        icon: "ti-scale" },
    { id: "afip",       label: "AFIP",           icon: "ti-building-government" },
    { id: "finanzas",   label: "Finanzas",       icon: "ti-cash" },
  ];

  const ingresos = 1_285_000;
  const gastos = 719_500;
  const resultado = ingresos - gastos;
  const efectivo = 1_285_300 + 342_200 + 145_000;
  const cxc = 375_000;

  const PYG_ROWS = [
    { label: "Ingresos por Servicios SaaS", value: 1_050_000, indent: 1 },
    { label: "Implementación", value: 195_000, indent: 1 },
    { label: "Capacitación", value: 40_000, indent: 1 },
    { label: "TOTAL INGRESOS", value: ingresos, indent: 0, isTotal: true, positive: true },
    { label: "", value: 0, indent: 0, divider: true },
    { label: "Alquiler y expensas", value: -95_000, indent: 1 },
    { label: "Servicios públicos", value: -18_500, indent: 1 },
    { label: "Tecnología y cloud", value: -72_000, indent: 1 },
    { label: "Marketing y publicidad", value: -54_000, indent: 1 },
    { label: "Insumos y materiales", value: -28_000, indent: 1 },
    { label: "Sueldos y cargas sociales", value: -624_000, indent: 1 },
    { label: "Pérdidas por incobrables", value: -42_000, indent: 1 },
    { label: "TOTAL GASTOS", value: -gastos, indent: 0, isTotal: true, positive: false },
    { label: "", value: 0, indent: 0, divider: true },
    { label: "RESULTADO NETO", value: resultado, indent: 0, isTotal: true, highlight: true },
  ] as { label: string; value: number; indent: number; isTotal?: boolean; positive?: boolean; highlight?: boolean; divider?: boolean }[];

  const BALANCE_ASSETS = [
    { label: "Caja y Bancos", value: efectivo },
    { label: "Cuentas por Cobrar (neto)", value: cxc - 42_000 },
    { label: "IVA Crédito Fiscal", value: 42_000 },
    { label: "Equipamiento (neto)", value: 700_000 },
  ];
  const totalActivo = BALANCE_ASSETS.reduce((s, r) => s + r.value, 0);

  const BALANCE_LIAB = [
    { label: "Proveedores y acreedores", value: 173_000 },
    { label: "Sueldos y retenciones", value: 82_967 },
    { label: "Préstamo bancario CP", value: 500_000 },
    { label: "IVA Débito Fiscal", value: 26_033 },
  ];
  const totalPasivo = BALANCE_LIAB.reduce((s, r) => s + r.value, 0);

  const BALANCE_EQ = [
    { label: "Capital Social", value: 1_500_000 },
    { label: "Resultado del ejercicio", value: resultado },
  ];
  const totalPatrimonio = BALANCE_EQ.reduce((s, r) => s + r.value, 0);

  const filteredJournal = JOURNAL.filter(e =>
    !search || e.description.toLowerCase().includes(search.toLowerCase()) || e.number.includes(search) || e.reference.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-silver/15 px-6 py-3 flex items-center gap-2 bg-navy-2 flex-shrink-0">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${tab === t.id ? "bg-cl-accent/10 text-cl-accent" : "text-cool-steel hover:text-white"}`}>
            <i className={`ti ${t.icon} text-base`} />{t.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {tab === "diario" && (
            <div className="flex items-center gap-2 bg-silver/10 border border-silver/20 rounded-lg px-3 py-1.5">
              <i className="ti ti-search text-sm text-cool-steel/55" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar asiento..." className="bg-transparent text-sm text-white outline-none w-40 placeholder-white/30" />
            </div>
          )}
          <button className="flex items-center gap-2 text-sm bg-cl-accent text-navy font-bold px-4 py-1.5 rounded-lg hover:bg-cl-accent/90 transition-all">
            <i className="ti ti-plus" /> Nuevo asiento
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "dashboard" && (
          <div className="p-6 space-y-6 max-w-5xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Ingresos del mes",    value: fmt(ingresos),  sub: "Junio 2026", icon: "ti-trending-up",      color: "text-cl-accent",  bg: "bg-cl-accent/10" },
                { label: "Gastos del mes",       value: fmt(gastos),    sub: "Junio 2026", icon: "ti-trending-down",    color: "text-red-400",    bg: "bg-red-400/10" },
                { label: "Resultado neto",       value: fmt(resultado), sub: `Margen ${Math.round(resultado/ingresos*100)}%`, icon: "ti-scale", color: "text-purple-400", bg: "bg-purple-400/10" },
                { label: "Efectivo disponible",  value: fmt(efectivo),  sub: "Caja + Bancos", icon: "ti-cash",          color: "text-blue-400",   bg: "bg-blue-400/10" },
              ].map(s => (
                <div key={s.label} className="bg-navy-2 border border-silver/20 rounded-xl p-5">
                  <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>
                    <i className={`ti ${s.icon} text-xl ${s.color}`} />
                  </div>
                  <p className="text-xl font-bold text-white">{s.value}</p>
                  <p className="text-xs text-cool-steel mt-0.5">{s.label}</p>
                  <p className="text-[10px] text-cool-steel/40">{s.sub}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-navy-2 border border-silver/20 rounded-xl p-5">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                  <i className="ti ti-trending-up text-cl-accent" /> Composición de ingresos
                </h3>
                {[
                  { label: "SaaS mensual/anual", value: 1_050_000, pct: 82 },
                  { label: "Implementación", value: 195_000, pct: 15 },
                  { label: "Capacitación", value: 40_000, pct: 3 },
                ].map(r => (
                  <div key={r.label} className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-cool-steel">{r.label}</span>
                      <span className="text-white font-semibold">{fmt(r.value)} <span className="text-cool-steel/55">({r.pct}%)</span></span>
                    </div>
                    <div className="bg-silver/10 rounded-full h-1.5">
                      <div className="h-1.5 bg-cl-accent rounded-full" style={{ width: `${r.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-navy-2 border border-silver/20 rounded-xl p-5">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                  <i className="ti ti-trending-down text-red-400" /> Composición de gastos
                </h3>
                {[
                  { label: "Sueldos y cargas sociales", value: 624_000, pct: 87, color: "bg-red-400" },
                  { label: "Alquiler y servicios", value: 113_500, pct: 16, color: "bg-orange-400" },
                  { label: "Tecnología y cloud", value: 72_000, pct: 10, color: "bg-yellow-400" },
                  { label: "Otros gastos", value: 94_000, pct: 13, color: "bg-white/30" },
                ].map(r => (
                  <div key={r.label} className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-cool-steel">{r.label}</span>
                      <span className="text-white font-semibold">{fmt(r.value)}</span>
                    </div>
                    <div className="bg-silver/10 rounded-full h-1.5">
                      <div className={`h-1.5 ${r.color} rounded-full`} style={{ width: `${Math.min(r.pct, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-navy-2 border border-silver/20 rounded-xl p-5">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <i className="ti ti-notebook text-blue-400" /> Últimos asientos
              </h3>
              <div className="space-y-2">
                {JOURNAL.slice(0, 4).map(entry => (
                  <div key={entry.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-deep-space/15 transition-colors">
                    <span className="text-xs font-mono text-cl-accent w-18 flex-shrink-0">{entry.number}</span>
                    <span className="text-sm text-silver flex-1 min-w-0 truncate">{entry.description}</span>
                    <span className="text-xs text-cool-steel/55 flex-shrink-0">{entry.date}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_STYLE[entry.status]}`}>{entry.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "diario" && (
          <div>
            <div className="hidden md:grid grid-cols-[auto_auto_1fr_auto_auto_auto] items-center gap-0 sticky top-0 bg-navy-2 border-b border-silver/15 z-10">
              {["N°", "Fecha", "Descripción", "Referencia", "Estado", ""].map(h => (
                <div key={h} className="px-5 py-3 text-[10px] font-bold text-cool-steel/45 uppercase tracking-wider">{h}</div>
              ))}
            </div>
            <div className="divide-y divide-silver/10">
              {filteredJournal.map(entry => (
                <div key={entry.id}>
                  <div
                    className="grid md:grid-cols-[auto_auto_1fr_auto_auto_auto] items-center gap-0 hover:bg-deep-space/10 cursor-pointer transition-colors group"
                    onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                  >
                    <div className="px-5 py-3 font-mono text-xs text-cl-accent whitespace-nowrap">{entry.number}</div>
                    <div className="px-5 py-3 text-xs text-cool-steel whitespace-nowrap">{entry.date}</div>
                    <div className="px-5 py-3 text-sm text-silver min-w-0 truncate">{entry.description}</div>
                    <div className="px-5 py-3 text-xs text-cool-steel/55">{entry.reference}</div>
                    <div className="px-5 py-3"><span className={`text-[10px] font-bold px-2 py-1 rounded-full ${STATUS_STYLE[entry.status]}`}>{entry.status}</span></div>
                    <div className="px-5 py-3">
                      <i className={`ti ${expandedEntry === entry.id ? "ti-chevron-up" : "ti-chevron-down"} text-sm text-cool-steel/40 group-hover:text-cool-steel transition-colors`} />
                    </div>
                  </div>
                  {expandedEntry === entry.id && (
                    <div className="px-5 pb-4 bg-deep-space/10">
                      <table className="w-full text-xs">
                        <thead>
                          <tr>
                            {["Código", "Cuenta", "Debe", "Haber"].map(h => (
                              <th key={h} className="text-left py-2 text-cool-steel/45 font-semibold uppercase tracking-wider text-[10px]">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {entry.lines.map((line, i) => (
                            <tr key={i} className="border-t border-silver/15">
                              <td className="py-2 font-mono text-cool-steel/55">{line.accountCode}</td>
                              <td className="py-2 text-silver pl-4">{line.account}</td>
                              <td className="py-2 text-right font-mono text-blue-400">{line.debit > 0 ? fmt(line.debit) : ""}</td>
                              <td className="py-2 text-right font-mono text-orange-400">{line.credit > 0 ? fmt(line.credit) : ""}</td>
                            </tr>
                          ))}
                          <tr className="border-t border-silver/20">
                            <td colSpan={2} className="py-2 text-right font-bold text-cool-steel/55 text-[10px] uppercase tracking-wider">TOTALES</td>
                            <td className="py-2 text-right font-bold font-mono text-blue-400">{fmt(entry.lines.reduce((s, l) => s + l.debit, 0))}</td>
                            <td className="py-2 text-right font-bold font-mono text-orange-400">{fmt(entry.lines.reduce((s, l) => s + l.credit, 0))}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "cuentas" && (
          <div>
            <table className="w-full text-sm">
              <thead className="bg-navy-2 sticky top-0">
                <tr>
                  {["Código", "Cuenta", "Tipo", "Saldo"].map(h => (
                    <th key={h} className={`px-4 py-3 text-[10px] font-bold text-cool-steel/45 uppercase tracking-wider ${h === "Saldo" ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CHART_OF_ACCOUNTS.map(acc => (
                  <AccountRow key={acc.code} acc={acc} depth={0} open={openNodes} setOpen={setOpenNodes} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "pyg" && (
          <div className="p-6 max-w-2xl mx-auto">
            <div className="bg-navy-2 border border-silver/20 rounded-xl overflow-hidden">
              <div className="bg-deep-space/15 px-6 py-4 border-b border-silver/15">
                <h3 className="font-bold text-white">Estado de Resultados</h3>
                <p className="text-xs text-cool-steel">Período: Junio 2026</p>
              </div>
              <div className="divide-y divide-silver/10">
                {PYG_ROWS.map((row, i) => {
                  if (row.divider) return <div key={i} className="h-px bg-silver/10 my-1" />;
                  const isNeg = row.value < 0;
                  return (
                    <div key={i} className={`flex items-center justify-between px-6 py-2.5 ${row.highlight ? "bg-cl-accent/5 border-l-2 border-cl-accent" : row.isTotal ? "bg-deep-space/10" : ""}`}
                      style={{ paddingLeft: row.indent > 0 ? `${24 + row.indent * 16}px` : undefined }}>
                      <span className={`text-sm ${row.isTotal ? "font-bold text-white" : "text-cool-steel"}`}>{row.label}</span>
                      <span className={`text-sm font-mono font-semibold ${row.highlight ? "text-cl-accent text-base font-bold" : isNeg ? "text-red-400" : row.isTotal ? "text-white" : "text-silver"}`}>
                        {row.value === 0 ? "" : (isNeg ? `-${fmt(row.value)}` : fmt(row.value))}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="px-6 py-4 bg-cl-accent/5 border-t border-cl-accent/20 flex items-center justify-between">
                <span className="text-sm text-cool-steel">Margen neto</span>
                <span className="text-2xl font-black text-cl-accent">{Math.round(resultado / ingresos * 100)}%</span>
              </div>
            </div>
          </div>
        )}

        {tab === "balance" && (
          <div className="p-6 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-navy-2 border border-silver/20 rounded-xl overflow-hidden">
                <div className="bg-blue-400/5 px-5 py-3 border-b border-silver/15">
                  <h3 className="font-bold text-blue-400 flex items-center gap-2"><i className="ti ti-building-bank" /> ACTIVO</h3>
                </div>
                <div className="divide-y divide-silver/10">
                  {BALANCE_ASSETS.map(r => (
                    <div key={r.label} className="flex items-center justify-between px-5 py-3">
                      <span className="text-sm text-cool-steel">{r.label}</span>
                      <span className="text-sm font-mono font-semibold text-blue-300">{fmt(r.value)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-5 py-3 bg-blue-400/5">
                    <span className="font-bold text-white">TOTAL ACTIVO</span>
                    <span className="font-bold font-mono text-blue-400 text-base">{fmt(totalActivo)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-navy-2 border border-silver/20 rounded-xl overflow-hidden">
                  <div className="bg-red-400/5 px-5 py-3 border-b border-silver/15">
                    <h3 className="font-bold text-red-400 flex items-center gap-2"><i className="ti ti-receipt" /> PASIVO</h3>
                  </div>
                  <div className="divide-y divide-silver/10">
                    {BALANCE_LIAB.map(r => (
                      <div key={r.label} className="flex items-center justify-between px-5 py-3">
                        <span className="text-sm text-cool-steel">{r.label}</span>
                        <span className="text-sm font-mono font-semibold text-red-300">{fmt(r.value)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between px-5 py-3 bg-red-400/5">
                      <span className="font-bold text-white">TOTAL PASIVO</span>
                      <span className="font-bold font-mono text-red-400">{fmt(totalPasivo)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-navy-2 border border-silver/20 rounded-xl overflow-hidden">
                  <div className="bg-purple-400/5 px-5 py-3 border-b border-silver/15">
                    <h3 className="font-bold text-purple-400 flex items-center gap-2"><i className="ti ti-shield-dollar" /> PATRIMONIO NETO</h3>
                  </div>
                  <div className="divide-y divide-silver/10">
                    {BALANCE_EQ.map(r => (
                      <div key={r.label} className="flex items-center justify-between px-5 py-3">
                        <span className="text-sm text-cool-steel">{r.label}</span>
                        <span className={`text-sm font-mono font-semibold ${r.value >= 0 ? "text-purple-300" : "text-red-400"}`}>{r.value >= 0 ? fmt(r.value) : `-${fmt(r.value)}`}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between px-5 py-3 bg-purple-400/5">
                      <span className="font-bold text-white">TOTAL PATRIMONIO</span>
                      <span className="font-bold font-mono text-purple-400">{fmt(totalPatrimonio)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-cl-accent/5 border border-cl-accent/20 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-cool-steel">Ecuación contable</p>
                    <p className="text-sm text-cool-steel font-mono mt-0.5">Activo = Pasivo + Patrimonio</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold font-mono ${totalActivo === totalPasivo + totalPatrimonio ? "text-cl-accent" : "text-red-400"}`}>
                      {fmt(totalActivo)} = {fmt(totalPasivo + totalPatrimonio)}
                    </p>
                    <p className={`text-xs font-bold ${totalActivo === totalPasivo + totalPatrimonio ? "text-cl-accent" : "text-red-400"}`}>
                      {totalActivo === totalPasivo + totalPatrimonio ? "✓ Balance cuadrado" : "✗ Descuadrado"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {tab === "afip" && (
          <AfipPanel />
        )}
        {tab === "finanzas" && (
          <div className="flex-1 -m-6 overflow-auto">
            <FinanzasPage />
          </div>
        )}
      </div>
    </div>
  );
}

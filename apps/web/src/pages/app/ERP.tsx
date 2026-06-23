import { useState } from "react";
import FiscalReceipt, { FiscalInvoice } from "@/components/FiscalReceipt";

type ERPTab = "cotizaciones" | "facturas" | "compras" | "inventario";

type QuoteStatus = "borrador" | "enviada" | "aceptada" | "rechazada" | "vencida";
type InvoiceStatus = "pendiente" | "pagada" | "vencida" | "cancelada";
type PurchaseStatus = "solicitada" | "aprobada" | "recibida" | "cancelada";

type Quote = { id: string; number: string; client: string; date: string; validUntil: string; total: number; status: QuoteStatus; items: number };
type Invoice = { id: string; number: string; client: string; date: string; dueDate: string; total: number; status: InvoiceStatus; type: "A" | "B" | "C" };
type Purchase = { id: string; number: string; supplier: string; date: string; expectedDate: string; total: number; status: PurchaseStatus; items: number };
type StockItem = { id: string; sku: string; name: string; category: string; price: number; cost: number; stock: number; minStock: number; unit: string };

const QUOTES: Quote[] = [
  { id: "1", number: "COT-0047", client: "Clínica del Sur", date: "2026-06-10", validUntil: "2026-07-10", total: 180000, status: "enviada", items: 3 },
  { id: "2", number: "COT-0046", client: "Ferretería Central", date: "2026-06-08", validUntil: "2026-07-08", total: 95000, status: "aceptada", items: 2 },
  { id: "3", number: "COT-0045", client: "Grupo Textil SA", date: "2026-06-05", validUntil: "2026-07-05", total: 720000, status: "borrador", items: 5 },
  { id: "4", number: "COT-0044", client: "Academia Fit", date: "2026-05-28", validUntil: "2026-06-28", total: 78000, status: "vencida", items: 1 },
  { id: "5", number: "COT-0043", client: "Estudio Torres", date: "2026-05-20", validUntil: "2026-06-20", total: 210000, status: "rechazada", items: 4 },
];

const INVOICES: Invoice[] = [
  { id: "1", number: "FA-00123", client: "Inmobiliaria Palermo", date: "2026-06-01", dueDate: "2026-07-01", total: 320000, status: "pendiente", type: "A" },
  { id: "2", number: "FB-00089", client: "Electrónica XYZ", date: "2026-05-15", dueDate: "2026-06-15", total: 55000, status: "pagada", type: "B" },
  { id: "3", number: "FA-00122", client: "Ferretería Central", date: "2026-05-10", dueDate: "2026-06-10", total: 95000, status: "pagada", type: "A" },
  { id: "4", number: "FB-00088", client: "Restaurante Nuestro", date: "2026-04-30", dueDate: "2026-05-30", total: 42000, status: "vencida", type: "B" },
  { id: "5", number: "FC-00012", client: "Cliente Particular", date: "2026-06-10", dueDate: "2026-06-10", total: 18000, status: "pendiente", type: "C" },
];

const PURCHASES: Purchase[] = [
  { id: "1", number: "OC-0031", supplier: "Tech Supplies SA", date: "2026-06-10", expectedDate: "2026-06-20", total: 145000, status: "aprobada", items: 4 },
  { id: "2", number: "OC-0030", supplier: "Papelera Norte", date: "2026-06-05", expectedDate: "2026-06-12", total: 28000, status: "recibida", items: 8 },
  { id: "3", number: "OC-0029", supplier: "Cloud Servers SRL", date: "2026-05-30", expectedDate: "2026-06-05", total: 72000, status: "recibida", items: 2 },
  { id: "4", number: "OC-0028", supplier: "Marketing Tools Co", date: "2026-06-12", expectedDate: "2026-06-25", total: 56000, status: "solicitada", items: 3 },
];

const STOCK: StockItem[] = [
  { id: "1", sku: "SVC-CHATBOT-M", name: "Chatbot IA — Plan Mensual", category: "Servicio", price: 180000, cost: 12000, stock: 999, minStock: 1, unit: "licencia" },
  { id: "2", sku: "SVC-CHATBOT-A", name: "Chatbot IA — Plan Anual", category: "Servicio", price: 1728000, cost: 100000, stock: 999, minStock: 1, unit: "licencia" },
  { id: "3", sku: "HW-CAM-01", name: "Cámara IP 4K", category: "Hardware", price: 85000, cost: 52000, stock: 8, minStock: 3, unit: "unidad" },
  { id: "4", sku: "HW-ROUTER-01", name: "Router WiFi 6 Dual Band", category: "Hardware", price: 62000, cost: 38000, stock: 2, minStock: 5, unit: "unidad" },
  { id: "5", sku: "SVC-SETUP-01", name: "Instalación y configuración", category: "Servicio", price: 45000, cost: 15000, stock: 999, minStock: 1, unit: "hora" },
  { id: "6", sku: "HW-SERVER-01", name: "Servidor NAS 4TB", category: "Hardware", price: 320000, cost: 195000, stock: 0, minStock: 1, unit: "unidad" },
];

const QUOTE_STATUS: Record<QuoteStatus, { label: string; color: string }> = {
  borrador: { label: "Borrador", color: "bg-silver/15 text-cool-steel" },
  enviada: { label: "Enviada", color: "bg-blue-400/20 text-blue-400" },
  aceptada: { label: "Aceptada", color: "bg-cl-accent/20 text-cl-accent" },
  rechazada: { label: "Rechazada", color: "bg-red-400/20 text-red-400" },
  vencida: { label: "Vencida", color: "bg-orange-400/20 text-orange-400" },
};

const INVOICE_STATUS: Record<InvoiceStatus, { label: string; color: string }> = {
  pendiente: { label: "Pendiente", color: "bg-yellow-400/20 text-yellow-400" },
  pagada: { label: "Pagada", color: "bg-cl-accent/20 text-cl-accent" },
  vencida: { label: "Vencida", color: "bg-red-400/20 text-red-400" },
  cancelada: { label: "Cancelada", color: "bg-silver/15 text-cool-steel/55" },
};

const PURCHASE_STATUS: Record<PurchaseStatus, { label: string; color: string }> = {
  solicitada: { label: "Solicitada", color: "bg-silver/15 text-cool-steel" },
  aprobada: { label: "Aprobada", color: "bg-blue-400/20 text-blue-400" },
  recibida: { label: "Recibida", color: "bg-cl-accent/20 text-cl-accent" },
  cancelada: { label: "Cancelada", color: "bg-red-400/20 text-red-400" },
};

function invoiceToFiscal(inv: Invoice, idx: number): FiscalInvoice {
  const cuits = ["20-12345678-9", "20-98765432-1", "30-45678901-2", "20-11223344-5", "00-00000000-0"];
  return {
    invoiceType: inv.type,
    invoiceNumber: inv.number,
    date: inv.date,
    pointOfSale: "0001",
    cuitEmisor: "30-71234567-8",
    contactName: inv.client,
    cuitReceptor: cuits[idx % cuits.length],
    amount: inv.total,
    cae: `7${String(idx + 1).padStart(13, "4")}`,
    caeVencimiento: inv.dueDate,
  };
}

export default function ERPPage() {
  const [tab, setTab] = useState<ERPTab>("cotizaciones");
  const [search, setSearch] = useState("");
  const [receipt, setReceipt] = useState<FiscalInvoice | null>(null);

  const tabs: { id: ERPTab; label: string; icon: string }[] = [
    { id: "cotizaciones", label: "Cotizaciones", icon: "ti-file-description" },
    { id: "facturas", label: "Facturas", icon: "ti-receipt" },
    { id: "compras", label: "Compras", icon: "ti-shopping-cart" },
    { id: "inventario", label: "Inventario", icon: "ti-box" },
  ];

  const pendingInvoices = INVOICES.filter(i => i.status === "pendiente").reduce((s, i) => s + i.total, 0);
  const paidThisMonth = INVOICES.filter(i => i.status === "pagada").reduce((s, i) => s + i.total, 0);
  const overdueInvoices = INVOICES.filter(i => i.status === "vencida").reduce((s, i) => s + i.total, 0);
  const stockAlerts = STOCK.filter(s => s.stock <= s.minStock).length;

  return (
    <div className="flex flex-col h-full">
      {receipt && <FiscalReceipt invoice={receipt} onClose={() => setReceipt(null)} />}

      <div className="border-b border-silver/15 px-6 py-3 flex items-center gap-2 bg-navy-2 flex-shrink-0">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${tab === t.id ? "bg-cl-accent/10 text-cl-accent" : "text-cool-steel hover:text-white"}`}>
            <i className={`ti ${t.icon} text-base`} />{t.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-2 bg-silver/10 border border-silver/20 rounded-lg px-3 py-1.5">
            <i className="ti ti-search text-sm text-cool-steel/55" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="bg-transparent text-sm text-white outline-none w-36 placeholder-white/30" />
          </div>
          <button className="flex items-center gap-2 text-sm bg-cl-accent text-navy font-bold px-4 py-1.5 rounded-lg hover:bg-cl-accent/90 transition-all">
            <i className="ti ti-plus" /> Nuevo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-silver/15 flex-shrink-0">
        {[
          { label: "Por cobrar", value: `$${(pendingInvoices / 1000).toFixed(0)}K`, sub: `${INVOICES.filter(i => i.status === "pendiente").length} facturas`, icon: "ti-clock", color: "text-yellow-400", bg: "bg-yellow-400/10" },
          { label: "Cobrado este mes", value: `$${(paidThisMonth / 1000).toFixed(0)}K`, sub: `${INVOICES.filter(i => i.status === "pagada").length} facturas`, icon: "ti-check", color: "text-cl-accent", bg: "bg-cl-accent/10" },
          { label: "Vencido", value: `$${(overdueInvoices / 1000).toFixed(0)}K`, sub: `${INVOICES.filter(i => i.status === "vencida").length} facturas`, icon: "ti-alert-triangle", color: "text-red-400", bg: "bg-red-400/10" },
          { label: "Alertas de stock", value: stockAlerts.toString(), sub: "productos bajo mínimo", icon: "ti-package-off", color: "text-orange-400", bg: "bg-orange-400/10" },
        ].map(s => (
          <div key={s.label} className="bg-navy-2 border border-silver/20 rounded-xl p-4 flex items-center gap-3">
            <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
              <i className={`ti ${s.icon} text-lg ${s.color}`} />
            </div>
            <div>
              <p className="text-lg font-bold text-white">{s.value}</p>
              <p className="text-[10px] text-cool-steel/55">{s.label}</p>
              <p className="text-[10px] text-cool-steel/40">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "cotizaciones" && (
          <table className="w-full text-sm">
            <thead className="bg-navy-2 sticky top-0">
              <tr>
                {["Número", "Cliente", "Fecha", "Vence", "Items", "Total", "Estado", ""].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[10px] font-bold text-cool-steel/45 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {QUOTES.filter(q => !search || q.client.toLowerCase().includes(search.toLowerCase()) || q.number.includes(search)).map(q => (
                <tr key={q.id} className="border-t border-silver/15 hover:bg-deep-space/10 group transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-cl-accent">{q.number}</td>
                  <td className="px-5 py-3 font-semibold text-white">{q.client}</td>
                  <td className="px-5 py-3 text-cool-steel text-xs">{q.date}</td>
                  <td className="px-5 py-3 text-cool-steel text-xs">{q.validUntil}</td>
                  <td className="px-5 py-3 text-cool-steel text-xs text-center">{q.items}</td>
                  <td className="px-5 py-3 font-bold text-white">${q.total.toLocaleString("es-AR")}</td>
                  <td className="px-5 py-3"><span className={`text-xs font-bold px-2 py-1 rounded-full ${QUOTE_STATUS[q.status].color}`}>{QUOTE_STATUS[q.status].label}</span></td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button className="w-7 h-7 bg-silver/10 hover:bg-silver/15 text-cool-steel hover:text-white rounded-lg flex items-center justify-center transition-all"><i className="ti ti-eye text-xs" /></button>
                      <button className="w-7 h-7 bg-silver/10 hover:bg-silver/15 text-cool-steel hover:text-white rounded-lg flex items-center justify-center transition-all"><i className="ti ti-pencil text-xs" /></button>
                      <button className="w-7 h-7 bg-silver/10 hover:bg-silver/15 text-cool-steel hover:text-white rounded-lg flex items-center justify-center transition-all"><i className="ti ti-download text-xs" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "facturas" && (
          <table className="w-full text-sm">
            <thead className="bg-navy-2 sticky top-0">
              <tr>
                {["Número", "Tipo", "Cliente", "Emitida", "Vence", "Total", "Estado", ""].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[10px] font-bold text-cool-steel/45 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {INVOICES.filter(i => !search || i.client.toLowerCase().includes(search.toLowerCase()) || i.number.includes(search)).map((inv, idx) => (
                <tr key={inv.id} className="border-t border-silver/15 hover:bg-deep-space/10 group transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-cl-accent">{inv.number}</td>
                  <td className="px-5 py-3"><span className="w-6 h-6 bg-blue-500/20 text-blue-400 rounded font-bold text-xs flex items-center justify-center">{inv.type}</span></td>
                  <td className="px-5 py-3 font-semibold text-white">{inv.client}</td>
                  <td className="px-5 py-3 text-cool-steel text-xs">{inv.date}</td>
                  <td className={`px-5 py-3 text-xs font-semibold ${inv.status === "vencida" ? "text-red-400" : "text-cool-steel"}`}>{inv.dueDate}</td>
                  <td className="px-5 py-3 font-bold text-white">${inv.total.toLocaleString("es-AR")}</td>
                  <td className="px-5 py-3"><span className={`text-xs font-bold px-2 py-1 rounded-full ${INVOICE_STATUS[inv.status].color}`}>{INVOICE_STATUS[inv.status].label}</span></td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => setReceipt(invoiceToFiscal(inv, idx))}
                        title="Ver comprobante AFIP"
                        className="w-7 h-7 bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 rounded-lg flex items-center justify-center transition-all"
                      >
                        <i className="ti ti-receipt-2 text-xs" />
                      </button>
                      <button className="w-7 h-7 bg-silver/10 hover:bg-silver/15 text-cool-steel hover:text-white rounded-lg flex items-center justify-center transition-all"><i className="ti ti-download text-xs" /></button>
                      {inv.status === "pendiente" && <button className="w-7 h-7 bg-cl-accent/10 hover:bg-cl-accent/20 text-cl-accent rounded-lg flex items-center justify-center transition-all"><i className="ti ti-check text-xs" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "compras" && (
          <table className="w-full text-sm">
            <thead className="bg-navy-2 sticky top-0">
              <tr>
                {["Orden", "Proveedor", "Fecha", "Entrega estimada", "Items", "Total", "Estado", ""].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[10px] font-bold text-cool-steel/45 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PURCHASES.filter(p => !search || p.supplier.toLowerCase().includes(search.toLowerCase()) || p.number.includes(search)).map(po => (
                <tr key={po.id} className="border-t border-silver/15 hover:bg-deep-space/10 group transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-cl-accent">{po.number}</td>
                  <td className="px-5 py-3 font-semibold text-white">{po.supplier}</td>
                  <td className="px-5 py-3 text-cool-steel text-xs">{po.date}</td>
                  <td className="px-5 py-3 text-cool-steel text-xs">{po.expectedDate}</td>
                  <td className="px-5 py-3 text-cool-steel text-xs text-center">{po.items}</td>
                  <td className="px-5 py-3 font-bold text-white">${po.total.toLocaleString("es-AR")}</td>
                  <td className="px-5 py-3"><span className={`text-xs font-bold px-2 py-1 rounded-full ${PURCHASE_STATUS[po.status].color}`}>{PURCHASE_STATUS[po.status].label}</span></td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button className="w-7 h-7 bg-silver/10 hover:bg-silver/15 text-cool-steel hover:text-white rounded-lg flex items-center justify-center transition-all"><i className="ti ti-eye text-xs" /></button>
                      <button className="w-7 h-7 bg-silver/10 hover:bg-silver/15 text-cool-steel hover:text-white rounded-lg flex items-center justify-center transition-all"><i className="ti ti-pencil text-xs" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "inventario" && (
          <table className="w-full text-sm">
            <thead className="bg-navy-2 sticky top-0">
              <tr>
                {["SKU", "Producto", "Categoría", "Precio venta", "Costo", "Margen", "Stock", "Estado", ""].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[10px] font-bold text-cool-steel/45 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STOCK.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.sku.toLowerCase().includes(search.toLowerCase())).map(item => {
                const margin = Math.round((item.price - item.cost) / item.price * 100);
                const stockOk = item.stock > item.minStock;
                const stockLow = item.stock > 0 && item.stock <= item.minStock;
                const stockOut = item.stock === 0;
                return (
                  <tr key={item.id} className="border-t border-silver/15 hover:bg-deep-space/10 group transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-cool-steel">{item.sku}</td>
                    <td className="px-5 py-3 font-semibold text-white">{item.name}</td>
                    <td className="px-5 py-3"><span className="text-xs bg-silver/10 text-cool-steel px-2 py-0.5 rounded">{item.category}</span></td>
                    <td className="px-5 py-3 font-bold text-cl-accent">${item.price.toLocaleString("es-AR")}</td>
                    <td className="px-5 py-3 text-cool-steel text-xs">${item.cost.toLocaleString("es-AR")}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-bold ${margin > 40 ? "text-cl-accent" : margin > 20 ? "text-yellow-400" : "text-red-400"}`}>{margin}%</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`font-bold text-sm ${stockOut ? "text-red-400" : stockLow ? "text-yellow-400" : "text-white"}`}>
                        {item.stock} <span className="text-xs font-normal text-cool-steel/55">{item.unit}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${stockOut ? "bg-red-400/20 text-red-400" : stockLow ? "bg-yellow-400/20 text-yellow-400" : "bg-cl-accent/10 text-cl-accent"}`}>
                        {stockOut ? "Sin stock" : stockLow ? "Stock bajo" : "OK"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button className="w-7 h-7 bg-silver/10 hover:bg-silver/15 text-cool-steel hover:text-white rounded-lg flex items-center justify-center transition-all"><i className="ti ti-pencil text-xs" /></button>
                        {(stockOut || stockLow) && <button className="w-7 h-7 bg-orange-400/10 hover:bg-orange-400/20 text-orange-400 rounded-lg flex items-center justify-center transition-all"><i className="ti ti-shopping-cart text-xs" /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

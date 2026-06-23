import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface OrderItem {
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface Order {
  id: string;
  orderNumber: string;
  contactName: string;
  phoneNumber: string;
  status: string;
  totalAmount: number;
  currency: string;
  items: OrderItem[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_STYLES: Record<string, { label: string; cls: string; icon: string }> = {
  pending:    { label: "Pendiente",       cls: "bg-yellow-500/10 text-yellow-400",  icon: "ti-clock" },
  confirmed:  { label: "Confirmado",      cls: "bg-cl-blue/10 text-cl-blue",        icon: "ti-circle-check" },
  preparing:  { label: "Preparando",      cls: "bg-purple-500/10 text-purple-400",  icon: "ti-tools-kitchen-2" },
  shipped:    { label: "En camino",       cls: "bg-orange-500/10 text-orange-400",  icon: "ti-truck" },
  delivered:  { label: "Entregado",       cls: "bg-cl-accent/10 text-cl-accent",    icon: "ti-package" },
  cancelled:  { label: "Cancelado",       cls: "bg-red-500/10 text-red-400",        icon: "ti-x" },
};

async function apiFetch(url: string, opts?: RequestInit) {
  const r = await fetch(url, { credentials: "include", ...opts });
  if (!r.ok) throw new Error(`${r.status}:${await r.text()}`);
  return r.json();
}

function fmt(dt: string) {
  return new Date(dt).toLocaleString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function fmtARS(n: number, currency = "ARS") {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency, minimumFractionDigits: 0 }).format(n);
}

export default function OrdersPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");

  const { data, isLoading, error } = useQuery<{ orders: Order[] }>({
    queryKey: ["orders", filter],
    queryFn: () => apiFetch(`/api/orders${filter !== "all" ? `?status=${filter}` : ""}`),
    retry: (failCount, err) => {
      const msg = (err as Error)?.message ?? "";
      if (msg.startsWith("401") || msg.startsWith("403")) return false;
      return failCount < 2;
    },
  });

  const orders = data?.orders ?? [];

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch(`/api/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });

  const errMsg = (error as Error)?.message ?? "";
  const isUnauth = errMsg.includes("401") || errMsg.toLowerCase().includes("unauthorized") || errMsg.toLowerCase().includes("not authenticated");
  const isUpgrade = errMsg.includes("403") || errMsg.includes("plan");

  const total = orders.reduce((s, o) => s + (o.totalAmount ?? 0), 0);
  const pending = orders.filter((o) => o.status === "pending").length;
  const active = orders.filter((o) => ["confirmed", "preparing", "shipped"].includes(o.status)).length;

  return (
    <section className="p-8 space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-navy-card border border-silver/15 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-cl-accent/10 text-cl-accent rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
            <i className="ti ti-shopping-bag" />
          </div>
          <div>
            <p className="text-xs font-bold text-cool-steel uppercase tracking-wider">Total pedidos</p>
            <p className="text-2xl font-extrabold text-white mt-0.5">{orders.length}</p>
          </div>
        </div>
        <div className="bg-navy-card border border-silver/15 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-500/10 text-yellow-400 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
            <i className="ti ti-clock" />
          </div>
          <div>
            <p className="text-xs font-bold text-cool-steel uppercase tracking-wider">Pendientes / Activos</p>
            <p className="text-2xl font-extrabold text-white mt-0.5">{pending} / {active}</p>
          </div>
        </div>
        <div className="bg-navy-card border border-silver/15 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-cl-accent/10 text-cl-accent rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
            <i className="ti ti-cash" />
          </div>
          <div>
            <p className="text-xs font-bold text-cool-steel uppercase tracking-wider">Facturación total</p>
            <p className="text-xl font-extrabold text-white mt-0.5">{fmtARS(total)}</p>
          </div>
        </div>
      </div>

      <div className="bg-navy-card border border-silver/15 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-silver/15">
          <div>
            <h3 className="text-sm font-bold text-white">Pedidos por WhatsApp</h3>
            <p className="text-xs text-cool-steel mt-0.5">Pedidos creados y gestionados por el bot</p>
          </div>
          <div className="flex gap-1">
            {["all", "pending", "confirmed", "preparing", "shipped", "delivered"].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition ${filter === s ? "bg-cl-accent/10 text-cl-accent" : "text-cool-steel hover:text-white hover:bg-silver/10"}`}
              >
                {s === "all" ? "Todos" : STATUS_STYLES[s]?.label ?? s}
              </button>
            ))}
          </div>
        </div>

        {isUnauth ? (
          <div className="p-12 text-center">
            <i className="ti ti-lock text-4xl text-white/10 block mb-3" />
            <p className="text-sm font-bold text-cool-steel">Sesión requerida</p>
            <p className="text-xs text-cool-steel/55 mt-1">Iniciá sesión para ver y gestionar tus pedidos.</p>
            <a href="/api/login" className="inline-block mt-4 px-5 py-2 bg-cl-accent text-navy text-xs font-bold rounded-lg no-underline hover:bg-cl-accent/90 transition">
              Iniciar sesión →
            </a>
          </div>
        ) : isUpgrade ? (
          <div className="p-12 text-center">
            <i className="ti ti-lock text-4xl text-white/10 block mb-3" />
            <p className="text-sm font-bold text-cool-steel">Disponible desde plan Starter</p>
            <p className="text-xs text-cool-steel/55 mt-1">Recibí y gestioná pedidos por WhatsApp con actualizaciones de estado automáticas.</p>
            <a href="/app/cuenta" className="inline-block mt-4 px-5 py-2 bg-cl-accent text-navy text-xs font-bold rounded-lg no-underline hover:bg-cl-accent/90 transition">
              Ver planes →
            </a>
          </div>
        ) : isLoading ? (
          <div className="p-12 text-center text-cool-steel text-sm">Cargando pedidos...</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <i className="ti ti-shopping-bag-x text-4xl text-white/10 block mb-3" />
            <p className="text-sm text-cool-steel">No hay pedidos{filter !== "all" ? " con ese estado" : " aún"}.</p>
            <p className="text-xs text-cool-steel/55 mt-1">Los pedidos se crean cuando tus clientes los hacen vía WhatsApp.</p>
          </div>
        ) : (
          <div className="divide-y divide-silver/10">
            {orders.map((o) => {
              const s = STATUS_STYLES[o.status] ?? STATUS_STYLES.pending;
              return (
                <div key={o.id} className="flex items-start gap-4 px-6 py-4 hover:bg-deep-space/10 transition">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${s.cls}`}>
                    <i className={`ti ${s.icon} text-lg`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white">#{o.orderNumber}</p>
                      <span className="text-xs text-cool-steel">·</span>
                      <p className="text-sm text-silver">{o.contactName}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[11px] text-cool-steel"><i className="ti ti-phone mr-1" />{o.phoneNumber}</span>
                      <span className="text-[11px] text-cool-steel"><i className="ti ti-clock mr-1" />{fmt(o.createdAt)}</span>
                    </div>
                    {Array.isArray(o.items) && o.items.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {o.items.slice(0, 4).map((item, i) => (
                          <span key={i} className="text-[10px] bg-silver/10 text-cool-steel px-2 py-0.5 rounded">
                            {item.quantity}x {item.productName}
                          </span>
                        ))}
                        {o.items.length > 4 && <span className="text-[10px] text-cool-steel/55">+{o.items.length - 4} más</span>}
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
                    <p className="text-sm font-bold text-white">{fmtARS(o.totalAmount ?? 0, o.currency)}</p>
                    <select
                      value={o.status}
                      onChange={(e) => updateStatus.mutate({ id: o.id, status: e.target.value })}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-full border-0 cursor-pointer ${s.cls} bg-transparent`}
                    >
                      {Object.entries(STATUS_STYLES).map(([k, v]) => (
                        <option key={k} value={k} className="bg-navy text-white">{v.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

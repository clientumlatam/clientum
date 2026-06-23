import { useEffect, useState, useCallback } from "react";
import { useParams, useSearch, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Clock, Package, Truck, XCircle, ChevronLeft, RefreshCcw, ShoppingBag } from "lucide-react";

interface OrderItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes: string;
}

interface OrderData {
  order: {
    id: string;
    orderNumber: string;
    status: string;
    contactName: string;
    totalAmount: number;
    currency: string;
    notes: string;
    channel: string;
    createdAt: string;
  };
  items: OrderItem[];
  brand: {
    brandName: string;
    primaryColor: string;
    logoUrl: string;
    whatsapp: string;
    catalogToken: string;
  };
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string; description: string; done: boolean }> = {
  pending: {
    label: "Pendiente",
    icon: <Clock size={28} />,
    color: "#d97706",
    bg: "#fef3c7",
    description: "Tu pedido fue recibido y está esperando confirmación.",
    done: false,
  },
  confirmed: {
    label: "Confirmado",
    icon: <CheckCircle size={28} />,
    color: "#16a34a",
    bg: "#dcfce7",
    description: "¡Tu pedido fue confirmado! Estamos trabajando en él.",
    done: false,
  },
  preparing: {
    label: "En preparación",
    icon: <Package size={28} />,
    color: "#2563eb",
    bg: "#dbeafe",
    description: "Tu pedido está siendo preparado.",
    done: false,
  },
  shipped: {
    label: "En camino",
    icon: <Truck size={28} />,
    color: "#7c3aed",
    bg: "#ede9fe",
    description: "Tu pedido está en camino.",
    done: false,
  },
  delivered: {
    label: "Entregado",
    icon: <CheckCircle size={28} />,
    color: "#16a34a",
    bg: "#dcfce7",
    description: "¡Tu pedido fue entregado! Gracias por tu compra.",
    done: true,
  },
  cancelled: {
    label: "Cancelado",
    icon: <XCircle size={28} />,
    color: "#dc2626",
    bg: "#fee2e2",
    description: "Tu pedido fue cancelado.",
    done: true,
  },
};

const TIMELINE_STEPS = ["pending", "confirmed", "preparing", "shipped", "delivered"];

export default function PedidoStatus() {
  const { orderId } = useParams<{ orderId: string }>();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const paymentResult = params.get("payment");

  const [data, setData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [polling, setPolling] = useState(true);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      const res = await fetch(`/api/catalog/order/${orderId}`);
      if (!res.ok) {
        setError("No se encontró el pedido.");
        setPolling(false);
        return;
      }
      const json = (await res.json()) as OrderData;
      setData(json);
      setLastUpdated(new Date());
      const st = json.order.status;
      if (st === "delivered" || st === "cancelled") {
        setPolling(false);
      }
    } catch {
      setError("Error al consultar el pedido.");
      setPolling(false);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(fetchOrder, 5000);
    return () => clearInterval(interval);
  }, [polling, fetchOrder]);

  const primary = data?.brand.primaryColor ?? "#002266";
  const status = data?.order.status ?? "pending";
  const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["pending"];
  const currentStep = TIMELINE_STEPS.indexOf(status);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFDFB] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#DDDFE2] mx-auto mb-4" style={{ borderTopColor: primary }} />
          <p className="text-[#3B506D] font-medium">Cargando estado del pedido…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#FDFDFB] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <XCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#031E43] mb-2">Pedido no encontrado</h2>
          <p className="text-[#3B506D] text-sm mb-6">{error ?? "No se pudo cargar el pedido."}</p>
          <a href="/" className="inline-block px-6 py-2 rounded-xl text-white font-semibold text-sm" style={{ background: primary }}>
            Ir al inicio
          </a>
        </div>
      </div>
    );
  }

  const { order, items, brand } = data;
  const isCancelled = order.status === "cancelled";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDFDFB] to-[#DDDFE2]">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          {brand.catalogToken ? (
            <Link href={`/catalogo/${brand.catalogToken}`} className="flex items-center gap-1.5 text-[#3B506D] hover:text-[#031E43] text-sm font-medium transition-colors">
              <ChevronLeft size={16} />
              Volver al catálogo
            </Link>
          ) : (
            <a href="/" className="flex items-center gap-1.5 text-[#3B506D] hover:text-[#031E43] text-sm font-medium transition-colors">
              <ChevronLeft size={16} />
              Inicio
            </a>
          )}
          <button
            onClick={() => { setPolling(true); fetchOrder(); }}
            className="flex items-center gap-1.5 text-[#3B506D]/70 hover:text-[#3B506D] text-xs transition-colors"
          >
            <RefreshCcw size={13} />
            Actualizar
          </button>
        </div>

        {/* Brand + Order Number */}
        <div className="text-center">
          {brand.logoUrl && (
            <img src={brand.logoUrl} alt={brand.brandName} className="h-10 object-contain mx-auto mb-2" />
          )}
          <h1 className="text-2xl font-black text-[#031E43] mb-0.5">{brand.brandName || "Mi Pedido"}</h1>
          <p className="text-[#3B506D]/70 text-sm font-mono">#{order.orderNumber}</p>
        </div>

        {/* Payment result banner */}
        <AnimatePresence>
          {paymentResult === "success" && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-4 flex items-center gap-3 text-sm font-semibold"
              style={{ background: "#dcfce7", color: "#15803d" }}
            >
              <CheckCircle size={20} />
              ¡Pago recibido! Tu pedido está siendo confirmado.
            </motion.div>
          )}
          {paymentResult === "pending" && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-4 flex items-center gap-3 text-sm font-semibold"
              style={{ background: "#fef3c7", color: "#b45309" }}
            >
              <Clock size={20} />
              Tu pago está siendo procesado. Te avisaremos cuando se confirme.
            </motion.div>
          )}
          {paymentResult === "failure" && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-4 flex items-center gap-3 text-sm font-semibold"
              style={{ background: "#fee2e2", color: "#dc2626" }}
            >
              <XCircle size={20} />
              El pago no pudo procesarse. Podés intentar de nuevo o contactar al vendedor.
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status Card */}
        <motion.div
          key={order.status}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="p-6 text-center" style={{ background: statusCfg.bg }}>
            <div className="flex justify-center mb-3" style={{ color: statusCfg.color }}>
              {statusCfg.icon}
            </div>
            <p className="text-xl font-black mb-1" style={{ color: statusCfg.color }}>
              {statusCfg.label}
            </p>
            <p className="text-sm" style={{ color: statusCfg.color, opacity: 0.8 }}>
              {statusCfg.description}
            </p>
          </div>

          {/* Timeline — only for non-cancelled */}
          {!isCancelled && (
            <div className="px-6 py-5">
              <div className="flex items-center justify-between relative">
                <div className="absolute top-3 left-6 right-6 h-0.5 bg-[#DDDFE2]/40" />
                <div
                  className="absolute top-3 left-6 h-0.5 transition-all duration-700"
                  style={{
                    background: primary,
                    width: currentStep < 0 ? "0%" : `${(Math.min(currentStep, TIMELINE_STEPS.length - 1) / (TIMELINE_STEPS.length - 1)) * 100}%`,
                  }}
                />
                {TIMELINE_STEPS.map((step, idx) => {
                  const done = idx <= currentStep;
                  const active = idx === currentStep;
                  return (
                    <div key={step} className="relative flex flex-col items-center gap-1 z-10">
                      <div
                        className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300"
                        style={{
                          background: done ? primary : "#FDFDFB",
                          borderColor: done ? primary : "#DDDFE2",
                          boxShadow: active ? `0 0 0 3px ${primary}30` : "none",
                        }}
                      >
                        {done && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <span className="text-[9px] text-[#3B506D]/70 font-semibold uppercase tracking-wide leading-tight text-center max-w-[42px]">
                        {STATUS_CONFIG[step]?.label ?? step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>

        {/* Order items */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag size={16} style={{ color: primary }} />
            <h2 className="font-bold text-[#031E43] text-sm">Detalle del pedido</h2>
          </div>
          <div className="space-y-2.5">
            {items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[#031E43] font-semibold text-sm truncate">{item.productName}</p>
                  {item.notes && <p className="text-[#3B506D]/70 text-xs">{item.notes}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[#3B506D] text-xs">{item.quantity}× ${item.unitPrice.toLocaleString("es-AR")}</p>
                  <p className="text-[#031E43] font-bold text-sm">${item.totalPrice.toLocaleString("es-AR")}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-[#DDDFE2] mt-4 pt-3 flex justify-between items-center">
            <span className="font-bold text-[#031E43] text-sm">Total</span>
            <span className="font-black text-lg" style={{ color: primary }}>
              {order.currency} {order.totalAmount.toLocaleString("es-AR")}
            </span>
          </div>
          {order.notes && (
            <div className="mt-3 bg-[#FDFDFB] rounded-xl p-3">
              <p className="text-[#3B506D]/70 text-xs font-semibold mb-0.5">Notas</p>
              <p className="text-[#3B506D] text-sm">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Contact info */}
        <div className="bg-white rounded-2xl shadow-sm px-5 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0" style={{ background: primary }}>
            {order.contactName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-[#031E43] text-sm">{order.contactName}</p>
            <p className="text-[#3B506D]/70 text-xs">
              Pedido realizado el {new Date(order.createdAt).toLocaleString("es-AR", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>

        {/* Polling indicator */}
        {polling && (
          <div className="flex items-center justify-center gap-2 text-[#3B506D]/70 text-xs">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: primary }} />
            Actualizando estado automáticamente…
          </div>
        )}
        {lastUpdated && !polling && (
          <p className="text-center text-[#3B506D]/70 text-xs">
            Última actualización: {lastUpdated.toLocaleTimeString("es-AR")}
          </p>
        )}

      </div>
    </div>
  );
}

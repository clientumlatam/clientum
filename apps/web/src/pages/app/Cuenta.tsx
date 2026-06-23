import { useState, useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";

type PlanKey = "free" | "starter" | "pro" | "business" | "enterprise";

interface PlanFeatures {
  name: string;
  price: string;
  badge: string;
  contacts: number;
  integrations: number;
  reports: number;
  chatbot: boolean;
  erp: boolean;
  prioritySupport: boolean;
  features: string[];
}

interface SettingsData {
  user: { id: string; email: string | null; firstName: string | null; lastName: string | null; profileImageUrl: string | null };
  subscription: { plan: PlanKey; status: string; currentPeriodEnd: string | null; trialDaysLeft: number | null };
  planFeatures: PlanFeatures;
  allPlans: Record<PlanKey, PlanFeatures>;
}

interface PaymentEvent {
  id: string;
  plan: string;
  status: string;
  amount: number | null;
  description: string | null;
  mpPaymentId: string | null;
  createdAt: string;
}

const PLAN_ORDER: PlanKey[] = ["free", "starter", "pro", "business", "enterprise"];
const WA_URL = "https://wa.me/5492984510883";

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}

const PLAN_ACCENT: Record<PlanKey, string> = {
  free: "#6b7280",
  starter: "#031E43",
  pro: "#2dd8a0",
  business: "#f59e0b",
  enterprise: "#a855f7",
};

export default function CuentaPage() {
  const { isAuthenticated, isLoading: authLoading, login } = useAuth();
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<PlanKey | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [events, setEvents] = useState<PaymentEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [cancelled, setCancelled] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const paymentStatus = urlParams.get("payment") ?? "";
  const paymentPlan = urlParams.get("plan") ?? "";

  useEffect(() => {
    if (!authLoading && !isAuthenticated) login();
  }, [authLoading, isAuthenticated, login]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/settings", { credentials: "include" })
      .then(r => r.json())
      .then((d: SettingsData) => { setSettings(d); setLoading(false); })
      .catch(() => setLoading(false));
    fetch("/api/payments/history", { credentials: "include" })
      .then(r => r.json())
      .then((d: { events: PaymentEvent[] }) => { setEvents(d.events ?? []); setHistoryLoading(false); })
      .catch(() => setHistoryLoading(false));
  }, [isAuthenticated]);

  const handleUpgrade = async (planId: PlanKey) => {
    setCheckoutLoading(planId);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/payments/preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ planId }),
      });
      const data = await res.json() as { initPoint?: string; sandboxInitPoint?: string; error?: string };
      if (!res.ok || data.error) { setCheckoutError(data.error ?? "Error al procesar el pago"); return; }
      const url = import.meta.env.DEV ? (data.sandboxInitPoint || data.initPoint) : data.initPoint;
      if (url) window.location.href = url;
    } catch { setCheckoutError("Error de conexión. Intentá de nuevo."); }
    finally { setCheckoutLoading(null); }
  };

  const handleCancel = async () => {
    if (!confirm("¿Seguro que querés cancelar? Tu plan pasará a Free al final del período.")) return;
    setCancelLoading(true);
    try {
      const res = await fetch("/api/payments/cancel", { method: "POST", credentials: "include" });
      const data = await res.json() as { ok?: boolean; message?: string; error?: string };
      if (data.ok) { setCancelled(true); }
      else { alert(data.error ?? "Error al cancelar"); }
    } catch { alert("Error de conexión."); }
    finally { setCancelLoading(false); }
  };

  if (authLoading || loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-cl-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!settings) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-cool-steel">Error al cargar la configuración.</p>
      </div>
    );
  }

  const plan = settings.subscription.plan;
  const isTrialing = settings.subscription.status === "trialing";
  const isExpired = settings.subscription.status === "expired";
  const trialDaysLeft = settings.subscription.trialDaysLeft;

  const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
    approved: { label: "Aprobado", cls: "text-cl-accent bg-cl-accent/10" },
    pending:  { label: "Pendiente", cls: "text-yellow-400 bg-yellow-400/10" },
    rejected: { label: "Rechazado", cls: "text-red-400 bg-red-400/10" },
    refunded: { label: "Reembolsado", cls: "text-blue-400 bg-blue-400/10" },
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Payment success/failure banner */}
      {paymentStatus === "success" && (
        <div className="bg-cl-accent/10 border border-cl-accent/30 rounded-xl px-5 py-4 flex items-center gap-3">
          <i className="ti ti-circle-check text-2xl text-cl-accent" />
          <div>
            <p className="font-bold text-cl-accent text-sm">¡Pago exitoso!</p>
            <p className="text-cool-steel text-xs mt-0.5">Tu plan {paymentPlan} fue activado. Puede demorar unos minutos en reflejarse.</p>
          </div>
        </div>
      )}
      {paymentStatus === "failure" && (
        <div className="bg-red-400/10 border border-red-400/20 rounded-xl px-5 py-4 flex items-center gap-3">
          <i className="ti ti-circle-x text-2xl text-red-400" />
          <p className="text-red-400 text-sm">El pago no pudo procesarse. Podés intentar de nuevo o contactar soporte.</p>
        </div>
      )}

      {/* Checkout error */}
      {checkoutError && (
        <div className="bg-red-400/10 border border-red-400/20 rounded-xl px-5 py-3 flex items-center justify-between">
          <span className="text-red-400 text-sm flex items-center gap-2"><i className="ti ti-alert-circle" /> {checkoutError}</span>
          <button onClick={() => setCheckoutError(null)} className="text-red-400/60 hover:text-red-400 text-lg">×</button>
        </div>
      )}

      {/* Trial / expired alerts */}
      {isExpired && (
        <div className="bg-red-400/10 border border-red-400/20 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <i className="ti ti-lock text-xl text-red-400" />
            <div>
              <p className="font-bold text-red-300 text-sm">Tu prueba gratuita expiró</p>
              <p className="text-cool-steel text-xs mt-0.5">Suscribite a un plan para seguir usando todas las funciones.</p>
            </div>
          </div>
          <button onClick={() => handleUpgrade("starter")} className="shrink-0 bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors">
            Ver planes
          </button>
        </div>
      )}
      {isTrialing && !isExpired && (
        <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <i className="ti ti-clock text-xl text-yellow-400" />
            <div>
              <p className="font-bold text-yellow-300 text-sm">
                Prueba gratis — {trialDaysLeft === 0 ? "último día" : `${trialDaysLeft} día${trialDaysLeft !== 1 ? "s" : ""} restante${trialDaysLeft !== 1 ? "s" : ""}`}
              </p>
              <p className="text-cool-steel text-xs mt-0.5">Acceso completo hasta el {formatDate(settings.subscription.currentPeriodEnd)}.</p>
            </div>
          </div>
          <button onClick={() => handleUpgrade("starter")} className="shrink-0 bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors">
            Suscribirme
          </button>
        </div>
      )}

      {/* Plan actual card */}
      <div className="bg-navy-2 border border-silver/20 rounded-xl p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${PLAN_ACCENT[plan]}20` }}>
          <i className="ti ti-star text-2xl" style={{ color: PLAN_ACCENT[plan] }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-cool-steel text-xs uppercase tracking-widest font-bold">Plan actual</p>
          <p className="text-white font-bold text-xl">{settings.planFeatures.name}</p>
          {settings.subscription.currentPeriodEnd && (
            <p className="text-cool-steel/70 text-xs mt-0.5">Renueva el {formatDate(settings.subscription.currentPeriodEnd)}</p>
          )}
        </div>
        {settings.subscription.currentPeriodEnd && !cancelled && (
          <button onClick={handleCancel} disabled={cancelLoading}
            className="text-red-400/60 hover:text-red-400 text-xs underline disabled:opacity-50 flex-shrink-0 transition-colors">
            {cancelLoading ? "Cancelando..." : "Cancelar suscripción"}
          </button>
        )}
        {cancelled && (
          <span className="text-xs text-cl-accent bg-cl-accent/10 px-3 py-1.5 rounded-lg flex-shrink-0">Cancelación procesada</span>
        )}
      </div>

      {/* Plan cards */}
      <div>
        <h2 className="text-white font-bold text-lg mb-4">Elegí tu plan</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {(["starter", "pro", "business", "enterprise"] as PlanKey[]).map((planId) => {
            const p = settings.allPlans[planId];
            const isCurrent = plan === planId;
            const isHigher = PLAN_ORDER.indexOf(planId) > PLAN_ORDER.indexOf(plan);
            const accent = PLAN_ACCENT[planId];
            return (
              <div key={planId}
                className={`relative rounded-xl p-5 border-2 flex flex-col transition-all ${
                  isCurrent ? "border-cl-accent bg-cl-accent/5" : "border-silver/20 bg-navy-2 hover:border-silver/40"
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold bg-cl-accent text-navy whitespace-nowrap">
                    Plan actual
                  </div>
                )}
                {p.badge && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold bg-cl-blue text-white whitespace-nowrap">
                    {p.badge}
                  </div>
                )}
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: `${accent}20` }}>
                  <i className="ti ti-star text-base" style={{ color: accent }} />
                </div>
                <h3 className="font-bold text-white text-base mb-0.5">{p.name}</h3>
                <p className="text-cool-steel text-sm mb-4">{p.price}</p>
                <ul className="space-y-2 mb-5 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="text-xs text-cool-steel flex items-start gap-1.5">
                      <span style={{ color: accent }} className="flex-shrink-0 mt-0.5">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <div className="text-center text-xs text-cl-accent font-semibold py-2 border border-cl-accent/30 rounded-lg">
                    ✓ Plan activo
                  </div>
                ) : planId === "enterprise" ? (
                  <a href={WA_URL} target="_blank" rel="noreferrer"
                    className="block text-center py-2.5 rounded-lg text-xs font-bold border border-silver/25 text-cool-steel hover:border-silver/50 hover:text-white transition-all">
                    Consultar precio →
                  </a>
                ) : isHigher ? (
                  <button onClick={() => handleUpgrade(planId)} disabled={checkoutLoading === planId}
                    className="w-full py-2.5 rounded-lg text-xs font-bold text-navy transition-all disabled:opacity-60"
                    style={{ background: checkoutLoading === planId ? "#9ca3af" : accent }}>
                    {checkoutLoading === planId ? "Procesando..." : `Contratar ${p.name}`}
                  </button>
                ) : (
                  <div className="text-center text-xs text-cool-steel/50 py-2">Plan inferior</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Historial de pagos */}
      <div>
        <h2 className="text-white font-bold text-lg mb-4">Historial de pagos</h2>
        <div className="bg-navy-2 border border-silver/20 rounded-xl overflow-hidden">
          {historyLoading ? (
            <div className="p-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-cl-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center">
              <i className="ti ti-receipt-off text-3xl text-cool-steel/40 mb-2 block" />
              <p className="text-cool-steel text-sm">No hay pagos registrados aún.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-silver/15">
                    {["Fecha", "Plan", "Monto", "Estado", "ID MercadoPago"].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-cool-steel/60">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-silver/10">
                  {events.map(e => {
                    const st = STATUS_LABEL[e.status];
                    return (
                      <tr key={e.id} className="hover:bg-deep-space/40 transition-colors">
                        <td className="px-5 py-3 text-cool-steel text-xs">{new Date(e.createdAt).toLocaleDateString("es-AR")}</td>
                        <td className="px-5 py-3 text-silver font-medium capitalize">{e.description || e.plan}</td>
                        <td className="px-5 py-3 text-silver">{e.amount ? `$${e.amount.toLocaleString("es-AR")} ARS` : "—"}</td>
                        <td className="px-5 py-3">
                          {st ? (
                            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${st.cls}`}>{st.label}</span>
                          ) : (
                            <span className="text-cool-steel/60 text-xs">{e.status}</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-cool-steel/50 text-xs font-mono">{e.mpPaymentId ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Footer soporte */}
      <div className="bg-navy-2 border border-silver/20 rounded-xl p-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-silver text-sm font-semibold">¿Tenés dudas sobre tu suscripción?</p>
          <p className="text-cool-steel/70 text-xs mt-0.5">Nuestro equipo te ayuda por WhatsApp de lunes a viernes.</p>
        </div>
        <a href={WA_URL} target="_blank" rel="noreferrer"
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold text-white transition-all"
          style={{ background: "#25D366" }}>
          <i className="ti ti-brand-whatsapp" /> Hablar con soporte
        </a>
      </div>
    </div>
  );
}

import { useState, useMemo } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { toast } from "sonner";

const P = "#031E43";
const D = "#3B506D";
const A = "#DDDFE2";
const G = "#10B981";
const B = "#3B6FED";

function SH({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-0.5 h-4 rounded-full flex-shrink-0" style={{ background: P }} />
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: D }}>{label}</p>
    </div>
  );
}

/* ── Tier definitions ── */
const TIERS = [
  {
    id: "referidor",
    nivel: "01",
    icon: "ti-link",
    title: "Referidor",
    subtitle: "Recomendá y cobrá",
    color: D,
    stat: "15%",
    statLabel: "comisión mensual recurrente",
    perks: [
      "Link de referido único y rastreable",
      "Panel en tiempo real de conversiones",
      "Cobro automático vía transferencia bancaria",
      "Sin límite de referidos activos",
    ],
    req: "Sin requisitos — solo registrarte",
  },
  {
    id: "reseller",
    nivel: "02",
    icon: "ti-star",
    title: "Reseller",
    subtitle: "Comprás y revendés",
    color: B,
    stat: "30%",
    statLabel: "descuento sobre lista oficial",
    perks: [
      "Acceso a precio mayorista de todas las licencias",
      "Panel de gestión de clientes propios",
      "Material de ventas y propuestas en PDF",
      "Capacitación de 2 horas incluida",
    ],
    req: "Al menos 3 clientes referidos activos",
  },
  {
    id: "whitelabel",
    nivel: "03",
    icon: "ti-award",
    title: "White Label",
    subtitle: "Tu propia marca",
    color: G,
    stat: "WL",
    statLabel: "dominio y logo personalizados",
    perks: [
      "Plataforma Clientum bajo tu dominio propio",
      "Logo, colores e identidad corporativa",
      "Soporte dedicado de onboarding técnico",
      "Acceso a API privada y webhooks",
    ],
    req: "Mínimo 10 clientes activos o evaluación previa",
  },
];

/* ── Partner registration form ── */
function RegisterForm({
  tier,
  onClose,
}: {
  tier: typeof TIERS[number];
  onClose: () => void;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      toast.success("Solicitud enviada correctamente", {
        description: "El equipo Clientum te contactará en menos de 24 horas hábiles.",
      });
    }, 1200);
  }

  if (submitted) {
    return (
      <div className="text-center py-10 space-y-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: `${G}15` }}>
          <i className="ti ti-circle-check text-3xl" style={{ color: G }} />
        </div>
        <h3 className="text-lg font-bold" style={{ color: P }}>¡Solicitud enviada!</h3>
        <p className="text-sm" style={{ color: D }}>Te contactamos por WhatsApp en menos de 24 horas hábiles para completar la validación y activar tu acceso.</p>
        <button
          onClick={onClose}
          className="mt-4 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: P }}
        >
          Cerrar
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-bold block mb-1.5" style={{ color: D }}>Nombre completo *</label>
          <input required type="text" placeholder="Ej: Lucía Fernández"
            className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none"
            style={{ borderColor: A, color: P }}
          />
        </div>
        <div>
          <label className="text-[11px] font-bold block mb-1.5" style={{ color: D }}>Empresa / Negocio *</label>
          <input required type="text" placeholder="Ej: Agencia Digital Sur"
            className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none"
            style={{ borderColor: A, color: P }}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-bold block mb-1.5" style={{ color: D }}>WhatsApp *</label>
          <input required type="tel" placeholder="+54 9..."
            className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none"
            style={{ borderColor: A, color: P }}
          />
        </div>
        <div>
          <label className="text-[11px] font-bold block mb-1.5" style={{ color: D }}>Email *</label>
          <input required type="email" placeholder="hola@empresa.com"
            className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none"
            style={{ borderColor: A, color: P }}
          />
        </div>
      </div>
      <div>
        <label className="text-[11px] font-bold block mb-1.5" style={{ color: D }}>¿Por qué querés ser {tier.title}?</label>
        <textarea placeholder="Contanos brevemente tu propuesta o cartera de clientes..."
          className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none min-h-[80px]"
          style={{ borderColor: A, color: P }}
        />
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose}
          className="flex-1 border rounded-xl py-2.5 text-sm font-semibold transition-all hover:opacity-80"
          style={{ borderColor: A, color: D }}
        >
          Cancelar
        </button>
        <button type="submit" disabled={loading}
          className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition-all hover:opacity-90 flex items-center justify-center gap-2"
          style={{ background: tier.color, opacity: loading ? 0.7 : 1 }}
        >
          {loading && <i className="ti ti-loader animate-spin text-sm" />}
          {loading ? "Enviando..." : `Aplicar como ${tier.title}`}
        </button>
      </div>
    </form>
  );
}

/* ── Commission stats (demo) ── */
const DEMO_STATS = [
  { label: "Referidos activos", value: "3", icon: "ti-users", color: B },
  { label: "Comisión acumulada", value: "$126.000", icon: "ti-coin", color: G },
  { label: "Comisión este mes", value: "$42.000", icon: "ti-trending-up", color: "#8B5CF6" },
  { label: "Próximo pago", value: "30 jun", icon: "ti-calendar-due", color: "#F59E0B" },
];

const DEMO_REFERRALS = [
  { empresa: "Distribuidora Vega", plan: "Pro", estado: "Activo", comision: "$14.000", fecha: "03/06" },
  { empresa: "Óptica Visión Total", plan: "Business", estado: "Activo", comision: "$22.000", fecha: "10/06" },
  { empresa: "Taller El Gaucho", plan: "Starter", estado: "Activo", comision: "$6.000", fecha: "14/06" },
];

/* ── Main component ── */
export default function PartnersPage() {
  const { user } = useAuth();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refCode = useMemo(() => {
    const base = user?.email
      ? user.email.split("@")[0].replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 12)
      : "tuusuario";
    return `clm-ref-${base}`;
  }, [user]);

  const refLink = `https://clientum.com.ar/?ref=${refCode}`;

  function copyLink() {
    navigator.clipboard.writeText(refLink).then(() => {
      setCopied(true);
      toast.success("Link copiado al portapapeles");
      setTimeout(() => setCopied(false), 2500);
    });
  }

  const activeTier = TIERS.find((t) => t.id === activeModal);

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">

      {/* ── Hero banner ── */}
      <div
        className="rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
        style={{ background: `linear-gradient(135deg, ${P} 0%, #0A2558 100%)` }}
      >
        <div className="space-y-2">
          <span className="inline-block text-[10px] font-mono font-bold uppercase tracking-widest text-white/50 bg-white/10 px-3 py-1 rounded-full">
            Programa de Alianzas
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white font-sora">
            Hacé crecer tu negocio con Clientum
          </h1>
          <p className="text-sm text-white/60 max-w-lg">
            Recomendá, revendé o integrá nuestras soluciones. Generá ingresos recurrentes en pesos sin inversión inicial.
          </p>
        </div>
        <div className="flex-shrink-0 bg-white/10 border border-white/15 rounded-2xl p-4 text-center min-w-[160px]">
          <span className="block text-3xl font-extrabold font-mono text-white">15-30%</span>
          <span className="text-[10px] text-white/50 uppercase tracking-wider block mt-1">comisión mensual</span>
        </div>
      </div>

      {/* ── Referral link box ── */}
      <div>
        <SH label="Tu link de referido" />
        <div className="bg-white border rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4" style={{ borderColor: A }}>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: D }}>Link único y rastreable</p>
            <div className="flex items-center gap-2 bg-[#FAFAFA] border rounded-xl px-4 py-2.5" style={{ borderColor: A }}>
              <i className="ti ti-link text-sm flex-shrink-0" style={{ color: B }} />
              <span className="text-xs font-mono truncate flex-1" style={{ color: P }}>{refLink}</span>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={copyLink}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all"
              style={{
                borderColor: copied ? `${G}40` : A,
                color: copied ? G : D,
                background: copied ? `${G}08` : "white",
              }}
            >
              <i className={`ti ${copied ? "ti-circle-check" : "ti-copy"} text-sm`} />
              {copied ? "¡Copiado!" : "Copiar"}
            </button>
            <a
              href={`https://wa.me/?text=Te%20recomiendo%20Clientum%20para%20automatizar%20tu%20PyME%20con%20IA.%20Probalo%20gratis%3A%20${encodeURIComponent(refLink)}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 no-underline"
              style={{ background: G }}
            >
              <i className="ti ti-brand-whatsapp text-sm" />
              Compartir
            </a>
          </div>
        </div>
      </div>

      {/* ── Commission stats ── */}
      <div>
        <SH label="Mis comisiones (demo)" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {DEMO_STATS.map((s) => (
            <div key={s.label} className="bg-white border rounded-2xl overflow-hidden shadow-sm" style={{ borderColor: A }}>
              <div className="h-1" style={{ background: s.color }} />
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: D }}>{s.label}</span>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${s.color}12` }}>
                    <i className={`ti ${s.icon} text-xs`} style={{ color: s.color }} />
                  </div>
                </div>
                <p className="text-2xl font-extrabold" style={{ color: P }}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Referrals table */}
        <div className="bg-white border rounded-2xl overflow-hidden shadow-sm" style={{ borderColor: A }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: A }}>
            <p className="text-xs font-bold" style={{ color: P }}>Mis referidos activos</p>
            <span className="text-[10px] font-mono text-white px-2 py-0.5 rounded-full" style={{ background: G }}>
              {DEMO_REFERRALS.length} activos
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b" style={{ borderColor: A, background: "#FAFAFA" }}>
                  {["Empresa", "Plan", "Estado", "Comisión/mes", "Desde"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left font-bold uppercase tracking-wider" style={{ color: D, fontSize: "10px" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: A }}>
                {DEMO_REFERRALS.map((r) => (
                  <tr key={r.empresa} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-5 py-3 font-semibold" style={{ color: P }}>{r.empresa}</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: B }}>
                        {r.plan}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: G }} />
                        <span style={{ color: G }} className="font-semibold">{r.estado}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono font-bold" style={{ color: G }}>{r.comision}</td>
                    <td className="px-5 py-3 font-mono" style={{ color: D }}>{r.fecha}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Partner tiers ── */}
      <div>
        <SH label="Niveles del programa" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TIERS.map((tier) => (
            <div key={tier.id} className="bg-white border rounded-2xl overflow-hidden shadow-sm flex flex-col" style={{ borderColor: A }}>
              <div className="h-1.5" style={{ background: tier.color }} />
              <div className="p-6 flex flex-col flex-1 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${tier.color}15` }}>
                    <i className={`ti ${tier.icon} text-xl`} style={{ color: tier.color }} />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono uppercase tracking-widest block" style={{ color: D }}>
                      Nivel {tier.nivel}
                    </span>
                    <h3 className="text-base font-extrabold" style={{ color: P }}>{tier.title}</h3>
                  </div>
                </div>

                <div className="rounded-xl p-4 text-center border" style={{ borderColor: A, background: "#FAFAFA" }}>
                  <span className="block text-3xl font-mono font-extrabold" style={{ color: tier.color }}>{tier.stat}</span>
                  <span className="text-[10px] uppercase tracking-wider block mt-1" style={{ color: D }}>{tier.statLabel}</span>
                </div>

                <ul className="space-y-2 flex-1">
                  {tier.perks.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-xs" style={{ color: D }}>
                      <i className="ti ti-circle-check text-sm flex-shrink-0 mt-0.5" style={{ color: G }} />
                      {p}
                    </li>
                  ))}
                </ul>

                <div className="text-[10px] px-3 py-2 rounded-lg" style={{ background: `${tier.color}08`, color: D, borderLeft: `2px solid ${tier.color}` }}>
                  <strong style={{ color: tier.color }}>Requisito:</strong> {tier.req}
                </div>

                <button
                  onClick={() => setActiveModal(tier.id)}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                  style={{ background: tier.color }}
                >
                  Aplicar como {tier.title}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FAQ quick ── */}
      <div>
        <SH label="Preguntas frecuentes" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { q: "¿Cuándo y cómo cobro mis comisiones?", a: "Se liquidan el último día hábil de cada mes vía transferencia bancaria en ARS. Recibirás un resumen detallado por WhatsApp." },
            { q: "¿Las comisiones son sobre el primer pago o recurrentes?", a: "Son 100% recurrentes. Mientras tu referido siga activo, vos seguís cobrando cada mes." },
            { q: "¿Puedo ser Referidor y Reseller al mismo tiempo?", a: "Sí. Una vez que cumplís los requisitos del nivel superior podés combinar beneficios de ambos niveles." },
            { q: "¿Hay un límite de referidos que puedo traer?", a: "No hay ningún límite. Cuantos más referidos activos tengas, mayor será tu ingreso mensual recurrente." },
          ].map((item) => (
            <div key={item.q} className="bg-white border rounded-2xl p-5 space-y-2" style={{ borderColor: A }}>
              <p className="text-xs font-bold" style={{ color: P }}>{item.q}</p>
              <p className="text-xs leading-relaxed" style={{ color: D }}>{item.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Contact CTA ── */}
      <div
        className="rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4"
        style={{ background: `${B}08`, border: `1px solid ${B}20` }}
      >
        <div>
          <p className="text-sm font-bold" style={{ color: P }}>¿Tenés preguntas antes de aplicar?</p>
          <p className="text-xs mt-1" style={{ color: D }}>Hablá con el equipo de alianzas directamente por WhatsApp.</p>
        </div>
        <a
          href="https://wa.me/5492984510883?text=Hola%2C%20me%20interesa%20el%20programa%20de%20partners%20de%20Clientum"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 no-underline flex-shrink-0"
          style={{ background: G }}
        >
          <i className="ti ti-brand-whatsapp text-base" />
          Hablar con el equipo
        </a>
      </div>

      {/* ── Registration modal ── */}
      {activeTier && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(3,30,67,0.6)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setActiveModal(null); }}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: A }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${activeTier.color}15` }}>
                  <i className={`ti ${activeTier.icon} text-lg`} style={{ color: activeTier.color }} />
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: D }}>Nivel {activeTier.nivel}</p>
                  <h2 className="text-base font-extrabold" style={{ color: P }}>Aplicar como {activeTier.title}</h2>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#DDDFE2]/40 transition-colors"
              >
                <i className="ti ti-x text-sm" style={{ color: D }} />
              </button>
            </div>
            <div className="p-6">
              <RegisterForm tier={activeTier} onClose={() => setActiveModal(null)} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

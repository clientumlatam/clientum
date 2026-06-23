import { useState, useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";

type PlanKey = "free" | "starter" | "pro" | "business" | "enterprise";

const WA_URL = "https://wa.me/5492984510883";

const AI_RATE_BY_PLAN: Record<PlanKey, number> = {
  free: 0.70,
  starter: 0.91,
  pro: 0.97,
  business: 0.97,
  enterprise: 0.99,
};

const PLAN_NAMES: Record<PlanKey, string> = {
  free: "Free", starter: "Starter", pro: "Pro", business: "Business", enterprise: "Enterprise",
};

const PLAN_ACCENT: Record<PlanKey, string> = {
  free: "#6b7280", starter: "#031E43", pro: "#2dd8a0", business: "#f59e0b", enterprise: "#a855f7",
};

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR").format(Math.round(n));
}

export default function ROIPage() {
  const { isAuthenticated } = useAuth();
  const [plan, setPlan] = useState<PlanKey>("free");

  const [convs, setConvs] = useState(300);
  const [minsPerConv, setMinsPerConv] = useState(15);
  const [hourlyRate, setHourlyRate] = useState(15000);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/settings", { credentials: "include" })
      .then(r => r.json())
      .then((d: { subscription: { plan: PlanKey } }) => { if (d?.subscription?.plan) setPlan(d.subscription.plan); })
      .catch(() => {});
  }, [isAuthenticated]);

  const aiRate = AI_RATE_BY_PLAN[plan];
  const totalHours = (convs * minsPerConv) / 60;
  const aiHours = totalHours * aiRate;
  const savedARS = aiHours * hourlyRate;
  const proRate = 0.97;
  const proSavedARS = totalHours * proRate * hourlyRate;
  const proGain = proSavedARS - savedARS;

  const comparePlans: { key: PlanKey; rate: number }[] = [
    { key: "free", rate: 0.70 },
    { key: "starter", rate: 0.91 },
    { key: "pro", rate: 0.97 },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="bg-navy-2 border border-silver/20 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-cl-accent/10 flex items-center justify-center">
            <i className="ti ti-trending-up text-xl text-cl-accent" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">Calculadora de ahorro ROI</h2>
            <p className="text-cool-steel text-sm">Cuánto te ahorra la IA de Clientum cada mes</p>
          </div>
        </div>
      </div>

      {/* Sliders */}
      <div className="bg-navy-2 border border-silver/20 rounded-xl p-6 space-y-6">
        <h3 className="text-white font-semibold text-sm">Configurá tu escenario</h3>

        {/* Slider: conversaciones */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-cool-steel">Conversaciones / mes</span>
            <span className="font-bold text-white">{convs}</span>
          </div>
          <input type="range" min="10" max="1500" value={convs} step="10"
            onChange={e => setConvs(Number(e.target.value))}
            className="w-full accent-cl-accent" />
          <div className="flex justify-between text-xs text-cool-steel/55 mt-1"><span>10</span><span>1.500</span></div>
        </div>

        {/* Slider: minutos */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-cool-steel">Minutos por consulta (sin IA)</span>
            <span className="font-bold text-white">{minsPerConv} min</span>
          </div>
          <input type="range" min="3" max="60" value={minsPerConv} step="1"
            onChange={e => setMinsPerConv(Number(e.target.value))}
            className="w-full accent-cl-accent" />
          <div className="flex justify-between text-xs text-cool-steel/55 mt-1"><span>3 min</span><span>60 min</span></div>
        </div>

        {/* Slider: valor hora */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-cool-steel">Valor hora de tu tiempo (ARS)</span>
            <span className="font-bold text-white">$ {fmt(hourlyRate)}</span>
          </div>
          <input type="range" min="3000" max="150000" value={hourlyRate} step="1000"
            onChange={e => setHourlyRate(Number(e.target.value))}
            className="w-full accent-cl-accent" />
          <div className="flex justify-between text-xs text-cool-steel/55 mt-1"><span>$ 3.000</span><span>$ 150.000</span></div>
        </div>
      </div>

      {/* Resultado con tu plan */}
      <div className="bg-navy-2 border border-cl-accent/30 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-cool-steel text-sm">Tu plan actual</p>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-cl-accent/10 text-cl-accent">
            {PLAN_NAMES[plan]} — {Math.round(aiRate * 100)}% resolución IA
          </span>
        </div>

        <div className="space-y-2 border-b border-silver/20 pb-4">
          <div className="flex items-center justify-between py-1.5">
            <span className="text-cool-steel text-sm">Horas totales sin IA</span>
            <span className="text-white font-semibold">{totalHours.toFixed(1)} hs</span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-cool-steel text-sm">Horas resueltas por IA ({Math.round(aiRate * 100)}%)</span>
            <span className="text-white font-semibold">{aiHours.toFixed(1)} hs</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-white font-bold text-base">Ahorro mensual estimado</span>
          <span className="text-3xl font-extrabold text-cl-accent">$ {fmt(savedARS)}</span>
        </div>

        {plan !== "pro" && plan !== "business" && plan !== "enterprise" && proGain > 0 && (
          <div className="bg-cl-accent/5 border border-cl-accent/20 rounded-lg px-4 py-3 flex items-center justify-between gap-3 flex-wrap mt-2">
            <div>
              <p className="text-cl-accent text-sm font-semibold">Con Plan Pro (97% resolución)</p>
              <p className="text-cool-steel text-xs mt-0.5">
                Ahorrarías <strong className="text-white">$ {fmt(proSavedARS)}</strong> (+$ {fmt(proGain)} adicional/mes)
              </p>
            </div>
            <a href="/app/cuenta"
              className="flex-shrink-0 text-xs font-bold px-4 py-2 rounded-lg text-navy bg-cl-accent hover:bg-cl-accent/90 transition-colors">
              Ver planes →
            </a>
          </div>
        )}
      </div>

      {/* Comparativa de planes */}
      <div>
        <h3 className="text-white font-semibold text-sm mb-3">Comparativa por plan</h3>
        <div className="grid grid-cols-3 gap-4">
          {comparePlans.map(p => {
            const pSaved = (convs * minsPerConv / 60) * p.rate * hourlyRate;
            const isCurrent = plan === p.key || (p.key === "pro" && (plan === "business" || plan === "enterprise"));
            const accent = PLAN_ACCENT[p.key];
            return (
              <div key={p.key}
                className={`bg-navy-2 rounded-xl p-5 border-2 text-center transition-all ${isCurrent ? "border-cl-accent" : "border-silver/20"}`}>
                {isCurrent && <div className="text-[10px] font-bold text-cl-accent mb-1 uppercase tracking-widest">Tu plan</div>}
                <div className="font-bold text-sm mb-1" style={{ color: accent }}>{PLAN_NAMES[p.key]}</div>
                <div className="text-xs text-cool-steel mb-3">IA: {Math.round(p.rate * 100)}%</div>
                <div className="text-xl font-extrabold text-cl-accent">$ {fmt(pSaved)}</div>
                <div className="text-xs text-cool-steel mt-1">ahorro / mes</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-navy-2 border border-silver/20 rounded-xl p-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-silver text-sm font-semibold">¿Querés maximizar tu ahorro?</p>
          <p className="text-cool-steel text-xs mt-0.5">Nuestro equipo te ayuda a elegir el plan ideal para tu negocio.</p>
        </div>
        <a href={WA_URL} target="_blank" rel="noreferrer"
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold text-white"
          style={{ background: "#25D366" }}>
          <i className="ti ti-brand-whatsapp" /> Hablar con asesor
        </a>
      </div>
    </div>
  );
}

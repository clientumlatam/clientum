import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type MatchType = "contains" | "exact" | "starts_with" | "regex";

interface Flow {
  id: string;
  name: string;
  active: boolean;
  triggerKeywords: string;
  matchType: MatchType;
  nodes: unknown[];
  priority: number;
  triggeredCount: number;
  createdAt: string;
  updatedAt: string;
}

const MATCH_LABELS: Record<MatchType, string> = {
  contains: "Contiene",
  exact: "Exacto",
  starts_with: "Empieza con",
  regex: "Regex",
};

async function apiFetch(url: string, opts?: RequestInit) {
  const r = await fetch(url, { credentials: "include", ...opts });
  if (!r.ok) throw new Error(`${r.status}:${await r.text()}`);
  return r.json();
}

export default function FlowsPage() {
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");
  const [newKeywords, setNewKeywords] = useState("");
  const [newMatchType, setNewMatchType] = useState<MatchType>("contains");
  const [creating, setCreating] = useState(false);

  const { data: flows = [], isLoading, error } = useQuery<Flow[]>({
    queryKey: ["flows"],
    queryFn: () => apiFetch("/api/flows"),
    retry: (failCount, err) => {
      const msg = (err as Error)?.message ?? "";
      if (msg.startsWith("401") || msg.startsWith("403")) return false;
      return failCount < 2;
    },
  });

  const createFlow = useMutation({
    mutationFn: (body: object) =>
      apiFetch("/api/flows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["flows"] }); setCreating(false); setNewName(""); setNewKeywords(""); },
  });

  const toggleFlow = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiFetch(`/api/flows/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flows"] }),
  });

  const deleteFlow = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/flows/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flows"] }),
  });

  const activeCount = flows.filter((f) => f.active).length;
  const totalTriggers = flows.reduce((s, f) => s + (f.triggeredCount ?? 0), 0);
  const topFlows = [...flows].sort((a, b) => (b.triggeredCount ?? 0) - (a.triggeredCount ?? 0)).slice(0, 5);
  const maxTriggers = topFlows[0]?.triggeredCount ?? 1;

  return (
    <section className="p-8 space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Flows totales" value={flows.length.toString()} icon="ti-git-branch" color="accent" />
        <StatCard label="Flows activos" value={activeCount.toString()} icon="ti-player-play" color="green" />
        <StatCard label="Disparos totales" value={totalTriggers.toString()} icon="ti-bolt" color="gray" />
      </div>

      {flows.length > 0 && (
        <div className="bg-navy-card border border-silver/15 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-silver uppercase tracking-wider mb-4 flex items-center gap-2">
            <i className="ti ti-chart-bar text-cl-accent" /> Top flows por disparos
          </h3>
          {topFlows.every(f => (f.triggeredCount ?? 0) === 0) ? (
            <p className="text-xs text-cool-steel/55 text-center py-4">
              Todavía no hay disparos registrados. Los flows se disparan automáticamente cuando un contacto envía una palabra clave.
            </p>
          ) : (
            <div className="space-y-3">
              {topFlows.map((f) => {
                const pct = maxTriggers > 0 ? Math.round(((f.triggeredCount ?? 0) / maxTriggers) * 100) : 0;
                return (
                  <div key={f.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${f.active ? "bg-cl-accent" : "bg-white/20"}`} />
                        <span className="text-xs font-semibold text-silver truncate max-w-[200px]">{f.name}</span>
                      </div>
                      <span className="text-xs font-black text-white tabular-nums">{f.triggeredCount ?? 0}</span>
                    </div>
                    <div className="h-2 bg-silver/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${f.active ? "bg-cl-accent" : "bg-white/20"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="bg-navy-card border border-silver/15 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-silver/15">
          <div>
            <h3 className="text-sm font-bold text-white">Flows de Conversación</h3>
            <p className="text-xs text-cool-steel mt-0.5">Respuestas automáticas disparadas por palabras clave</p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cl-accent text-navy text-xs font-bold rounded-lg hover:bg-cl-accent/90 transition"
          >
            <i className="ti ti-plus" /> Nuevo flow
          </button>
        </div>

        {creating && (
          <div className="px-6 py-4 bg-cl-accent/5 border-b border-cl-accent/10">
            <p className="text-xs font-bold text-cl-accent mb-3 uppercase tracking-wider">Crear nuevo flow</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                className="bg-navy border border-silver/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-cl-accent/50"
                placeholder="Nombre del flow"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <input
                className="bg-navy border border-silver/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-cl-accent/50"
                placeholder="Palabras clave (ej: precio, hola)"
                value={newKeywords}
                onChange={(e) => setNewKeywords(e.target.value)}
              />
              <select
                className="bg-navy border border-silver/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cl-accent/50"
                value={newMatchType}
                onChange={(e) => setNewMatchType(e.target.value as MatchType)}
              >
                {(Object.entries(MATCH_LABELS) as [MatchType, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => createFlow.mutate({ name: newName || "Nuevo flow", triggerKeywords: newKeywords, matchType: newMatchType })}
                disabled={createFlow.isPending}
                className="px-4 py-1.5 bg-cl-accent text-navy text-xs font-bold rounded-lg hover:bg-cl-accent/90 transition disabled:opacity-50"
              >
                {createFlow.isPending ? "Creando..." : "Crear"}
              </button>
              <button
                onClick={() => setCreating(false)}
                className="px-4 py-1.5 text-cool-steel hover:text-white text-xs font-semibold rounded-lg hover:bg-silver/10 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {(error as Error)?.message?.startsWith("401") ? (
          <div className="p-12 text-center">
            <i className="ti ti-lock text-4xl text-white/10 block mb-3" />
            <p className="text-sm font-bold text-cool-steel">Sesión requerida</p>
            <p className="text-xs text-cool-steel/55 mt-1">Iniciá sesión para ver y gestionar tus flows de conversación.</p>
            <a href="/api/login" className="inline-block mt-4 px-5 py-2 bg-cl-accent text-navy text-xs font-bold rounded-lg no-underline hover:bg-cl-accent/90 transition">
              Iniciar sesión →
            </a>
          </div>
        ) : isLoading ? (
          <div className="p-12 text-center text-cool-steel text-sm">Cargando flows...</div>
        ) : flows.length === 0 ? (
          <div className="p-12 text-center">
            <i className="ti ti-git-branch text-4xl text-white/10 block mb-3" />
            <p className="text-sm text-cool-steel">No hay flows todavía.</p>
            <p className="text-xs text-cool-steel/55 mt-1">Creá el primero con el botón de arriba.</p>
          </div>
        ) : (
          <div className="divide-y divide-silver/10">
            {flows.map((f) => (
              <div key={f.id} className="flex items-center gap-4 px-6 py-4 hover:bg-deep-space/10 transition">
                <button
                  onClick={() => toggleFlow.mutate({ id: f.id, active: !f.active })}
                  className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 relative ${f.active ? "bg-cl-accent" : "bg-silver/15"}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow ${f.active ? "left-5" : "left-1"}`} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{f.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    {f.triggerKeywords && (
                      <span className="text-[10px] bg-silver/10 text-cool-steel px-2 py-0.5 rounded">
                        <i className="ti ti-key mr-1" />{f.triggerKeywords}
                      </span>
                    )}
                    <span className="text-[10px] bg-cl-blue/10 text-cl-blue px-2 py-0.5 rounded">
                      {MATCH_LABELS[f.matchType as MatchType] ?? f.matchType}
                    </span>
                    <span className="text-[10px] text-cool-steel/55">Prioridad: {f.priority}</span>
                    <span className="text-[10px] text-cool-steel/55">{Array.isArray(f.nodes) ? f.nodes.length : 0} nodos</span>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${f.active ? "bg-cl-accent/10 text-cl-accent" : "bg-silver/10 text-cool-steel"}`}>
                  {f.active ? "Activo" : "Inactivo"}
                </span>
                <button
                  onClick={() => { if (confirm(`¿Eliminar "${f.name}"?`)) deleteFlow.mutate(f.id); }}
                  className="text-cool-steel/40 hover:text-red-400 transition p-1"
                >
                  <i className="ti ti-trash text-sm" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-navy-card border border-silver/15 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-silver uppercase tracking-wider mb-3 flex items-center gap-2">
          <i className="ti ti-info-circle text-cl-blue" /> ¿Cómo funcionan los flows?
        </h3>
        <div className="grid md:grid-cols-3 gap-4 text-xs text-cool-steel">
          <div className="bg-navy-3/50 rounded-xl p-4">
            <p className="font-bold text-white mb-1">1. Trigger por keyword</p>
            <p>Cuando un contacto envía un mensaje que coincide con las palabras clave, el flow se activa automáticamente.</p>
          </div>
          <div className="bg-navy-3/50 rounded-xl p-4">
            <p className="font-bold text-white mb-1">2. Nodos de respuesta</p>
            <p>Cada flow puede tener múltiples nodos: mensajes de texto, imágenes, botones o condiciones de bifurcación.</p>
          </div>
          <div className="bg-navy-3/50 rounded-xl p-4">
            <p className="font-bold text-white mb-1">3. Prioridad de ejecución</p>
            <p>Los flows con mayor prioridad se evalúan primero. Si ninguno coincide, el Agente IA responde normalmente.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: "accent" | "green" | "gray" }) {
  const cls = {
    accent: { icon: "bg-cl-accent/10 text-cl-accent", val: "text-white" },
    green: { icon: "bg-green-500/10 text-green-400", val: "text-green-400" },
    gray: { icon: "bg-silver/10 text-cool-steel", val: "text-cool-steel" },
  }[color];
  return (
    <div className="bg-navy-card border border-silver/15 rounded-2xl p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${cls.icon}`}>
        <i className={`ti ${icon}`} />
      </div>
      <div>
        <p className="text-xs font-bold text-cool-steel uppercase tracking-wider">{label}</p>
        <p className={`text-2xl font-extrabold mt-0.5 ${cls.val}`}>{value}</p>
      </div>
    </div>
  );
}

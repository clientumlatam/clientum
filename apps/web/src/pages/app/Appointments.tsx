import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Appointment {
  id: string;
  contactName: string;
  phoneNumber: string;
  service: string;
  notes: string | null;
  scheduledAt: string;
  status: "pending" | "confirmed" | "cancelled" | "done";
  reminderSentAt: string | null;
  createdAt: string;
}

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  pending:   { label: "Pendiente",   cls: "bg-yellow-500/10 text-yellow-400" },
  confirmed: { label: "Confirmado",  cls: "bg-cl-accent/10 text-cl-accent" },
  cancelled: { label: "Cancelado",   cls: "bg-red-500/10 text-red-400" },
  done:      { label: "Completado",  cls: "bg-silver/10 text-cool-steel" },
};

async function apiFetch(url: string, opts?: RequestInit) {
  const r = await fetch(url, { credentials: "include", ...opts });
  if (!r.ok) throw new Error(`${r.status}:${await r.text()}`);
  return r.json();
}

function fmt(dt: string) {
  return new Date(dt).toLocaleString("es-AR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AppointmentsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ contactName: "", phoneNumber: "", service: "", notes: "", scheduledAt: "" });

  const { data, isLoading, error } = useQuery<{ appointments: Appointment[] }>({
    queryKey: ["appointments", filter],
    queryFn: () => apiFetch(`/api/appointments${filter !== "all" ? `?status=${filter}` : ""}`),
    retry: (failCount, err) => {
      const msg = (err as Error)?.message ?? "";
      if (msg.startsWith("401") || msg.startsWith("403")) return false;
      return failCount < 2;
    },
  });

  const appointments = data?.appointments ?? [];

  const createAppt = useMutation({
    mutationFn: (body: object) =>
      apiFetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["appointments"] }); setCreating(false); setForm({ contactName: "", phoneNumber: "", service: "", notes: "", scheduledAt: "" }); },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });

  const counts = {
    all: appointments.length,
    pending: appointments.filter((a) => a.status === "pending").length,
    confirmed: appointments.filter((a) => a.status === "confirmed").length,
    done: appointments.filter((a) => a.status === "done").length,
  };

  const errMsg = (error as Error)?.message ?? "";
  const isUnauth = errMsg.includes("401") || errMsg.toLowerCase().includes("unauthorized") || errMsg.toLowerCase().includes("not authenticated");
  const isUpgrade = errMsg.includes("403") || errMsg.includes("plan");

  return (
    <section className="p-8 space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {[
          { k: "all", label: "Total", icon: "ti-calendar", color: "accent" },
          { k: "pending", label: "Pendientes", icon: "ti-clock", color: "yellow" },
          { k: "confirmed", label: "Confirmados", icon: "ti-circle-check", color: "green" },
          { k: "done", label: "Completados", icon: "ti-checks", color: "gray" },
        ].map(({ k, label, icon, color }) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`bg-navy-card border rounded-2xl p-5 flex items-center gap-4 transition-all text-left ${filter === k ? "border-cl-accent/30 bg-cl-accent/5" : "border-silver/15 hover:border-silver/20"}`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
              color === "accent" ? "bg-cl-accent/10 text-cl-accent" :
              color === "yellow" ? "bg-yellow-500/10 text-yellow-400" :
              color === "green" ? "bg-green-500/10 text-green-400" :
              "bg-silver/10 text-cool-steel"
            }`}>
              <i className={`ti ${icon}`} />
            </div>
            <div>
              <p className="text-xs font-bold text-cool-steel uppercase tracking-wider">{label}</p>
              <p className="text-2xl font-extrabold text-white mt-0.5">{counts[k as keyof typeof counts]}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="bg-navy-card border border-silver/15 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-silver/15">
          <div>
            <h3 className="text-sm font-bold text-white">Agenda de Turnos</h3>
            <p className="text-xs text-cool-steel mt-0.5">Turnos gestionados por el bot vía WhatsApp</p>
          </div>
          {!isUpgrade && (
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-2 px-4 py-2 bg-cl-accent text-navy text-xs font-bold rounded-lg hover:bg-cl-accent/90 transition"
            >
              <i className="ti ti-plus" /> Nuevo turno
            </button>
          )}
        </div>

        {creating && (
          <div className="px-6 py-4 bg-cl-accent/5 border-b border-cl-accent/10 space-y-3">
            <p className="text-xs font-bold text-cl-accent uppercase tracking-wider">Nuevo turno manual</p>
            <div className="grid md:grid-cols-2 gap-3">
              {[
                { key: "contactName", label: "Nombre del cliente", type: "text" },
                { key: "phoneNumber", label: "Teléfono (ej: 5491112345678)", type: "text" },
                { key: "service", label: "Servicio / descripción", type: "text" },
                { key: "scheduledAt", label: "Fecha y hora", type: "datetime-local" },
              ].map(({ key, label, type }) => (
                <div key={key}>
                  <label className="text-[10px] text-cool-steel uppercase tracking-wider block mb-1">{label}</label>
                  <input
                    type={type}
                    className="w-full bg-navy border border-silver/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-cl-accent/50"
                    value={(form as Record<string, string>)[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </div>
              ))}
            </div>
            <div>
              <label className="text-[10px] text-cool-steel uppercase tracking-wider block mb-1">Notas (opcional)</label>
              <textarea
                className="w-full bg-navy border border-silver/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-cl-accent/50 h-20 resize-none"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => createAppt.mutate({ ...form, scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined })}
                disabled={createAppt.isPending || !form.contactName || !form.scheduledAt}
                className="px-4 py-1.5 bg-cl-accent text-navy text-xs font-bold rounded-lg hover:bg-cl-accent/90 transition disabled:opacity-50"
              >
                {createAppt.isPending ? "Guardando..." : "Guardar turno"}
              </button>
              <button onClick={() => setCreating(false)} className="px-4 py-1.5 text-cool-steel hover:text-white text-xs font-semibold rounded-lg hover:bg-silver/10 transition">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {isUnauth ? (
          <div className="p-12 text-center">
            <i className="ti ti-lock text-4xl text-white/10 block mb-3" />
            <p className="text-sm font-bold text-cool-steel">Sesión requerida</p>
            <p className="text-xs text-cool-steel/55 mt-1">Iniciá sesión para ver y gestionar tus turnos.</p>
            <a href="/api/login" className="inline-block mt-4 px-5 py-2 bg-cl-accent text-navy text-xs font-bold rounded-lg no-underline hover:bg-cl-accent/90 transition">
              Iniciar sesión →
            </a>
          </div>
        ) : isUpgrade ? (
          <div className="p-12 text-center">
            <i className="ti ti-lock text-4xl text-white/10 block mb-3" />
            <p className="text-sm font-bold text-cool-steel">Disponible desde plan Starter</p>
            <p className="text-xs text-cool-steel/55 mt-1">Gestioná turnos y enviá recordatorios automáticos por WhatsApp.</p>
            <a href="/app/cuenta" className="inline-block mt-4 px-5 py-2 bg-cl-accent text-navy text-xs font-bold rounded-lg no-underline hover:bg-cl-accent/90 transition">
              Ver planes →
            </a>
          </div>
        ) : isLoading ? (
          <div className="p-12 text-center text-cool-steel text-sm">Cargando turnos...</div>
        ) : appointments.length === 0 ? (
          <div className="p-12 text-center">
            <i className="ti ti-calendar-off text-4xl text-white/10 block mb-3" />
            <p className="text-sm text-cool-steel">No hay turnos{filter !== "all" ? ` ${STATUS_STYLES[filter]?.label?.toLowerCase()}s` : " aún"}.</p>
          </div>
        ) : (
          <div className="divide-y divide-silver/10">
            {appointments.map((a) => {
              const s = STATUS_STYLES[a.status] ?? STATUS_STYLES.pending;
              return (
                <div key={a.id} className="flex items-center gap-4 px-6 py-4 hover:bg-deep-space/10 transition">
                  <div className="w-10 h-10 bg-cl-accent/10 text-cl-accent rounded-xl flex items-center justify-center flex-shrink-0">
                    <i className="ti ti-calendar-event text-lg" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{a.contactName}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[11px] text-cool-steel"><i className="ti ti-phone mr-1" />{a.phoneNumber}</span>
                      {a.service && <span className="text-[11px] text-cool-steel">{a.service}</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold text-white">{fmt(a.scheduledAt)}</p>
                    {a.reminderSentAt && <p className="text-[10px] text-cl-accent mt-0.5"><i className="ti ti-send mr-1" />Recordatorio enviado</p>}
                  </div>
                  <select
                    value={a.status}
                    onChange={(e) => updateStatus.mutate({ id: a.id, status: e.target.value })}
                    className={`text-[10px] font-bold px-3 py-1.5 rounded-full border-0 cursor-pointer ${s.cls} bg-transparent`}
                  >
                    {Object.entries(STATUS_STYLES).map(([k, v]) => (
                      <option key={k} value={k} className="bg-navy text-white">{v.label}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface Contact {
  id: string;
  phoneNumber: string;
  contactName: string | null;
  channel: string;
  leadStatus: string | null;
}

const LEAD_COLORS: Record<string, string> = {
  new: "bg-cl-blue/10 text-cl-blue",
  contacted: "bg-yellow-500/10 text-yellow-400",
  interested: "bg-purple-500/10 text-purple-400",
  converted: "bg-cl-accent/10 text-cl-accent",
  lost: "bg-red-500/10 text-red-400",
};

async function apiFetch(url: string, opts?: RequestInit) {
  const r = await fetch(url, { credentials: "include", ...opts });
  if (!r.ok) throw new Error(`${r.status}:${await r.text()}`);
  return r.json();
}

export default function BroadcastPage() {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);

  const { data, isLoading, error } = useQuery<{ contacts: Contact[] }>({
    queryKey: ["broadcast-contacts"],
    queryFn: () => apiFetch("/api/broadcast/contacts"),
    retry: (failCount, err) => {
      const msg = (err as Error)?.message ?? "";
      if (msg.startsWith("401") || msg.startsWith("403")) return false;
      return failCount < 2;
    },
  });

  const contacts = (data?.contacts ?? []).filter((c) => {
    const matchStatus = filterStatus === "all" || c.leadStatus === filterStatus;
    const matchSearch = !search || (c.contactName ?? "").toLowerCase().includes(search.toLowerCase()) || c.phoneNumber.includes(search);
    return matchStatus && matchSearch;
  });

  const sendBroadcast = useMutation({
    mutationFn: (body: object) =>
      apiFetch("/api/broadcast/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: (res) => {
      toast({ title: "Difusión enviada", description: `${res.sent ?? 0} mensajes enviados correctamente.` });
      setMessage("");
      setSelected(new Set());
      setSending(false);
    },
    onError: (e) => {
      toast({ title: "Error al enviar", description: (e as Error).message, variant: "destructive" });
      setSending(false);
    },
  });

  const errMsg = (error as Error)?.message ?? "";
  const isUnauth = errMsg.startsWith("401");
  const isUpgrade = errMsg.startsWith("403") || errMsg.includes("plan");

  const toggleAll = () => {
    if (selected.size === contacts.length) setSelected(new Set());
    else setSelected(new Set(contacts.map((c) => c.id)));
  };

  const handleSend = () => {
    if (!message.trim() || selected.size === 0) return;
    if (!confirm(`¿Enviar a ${selected.size} contacto(s)?\n\n"${message.slice(0, 80)}${message.length > 80 ? "…" : ""}"`)) return;
    setSending(true);
    sendBroadcast.mutate({
      recipientIds: Array.from(selected),
      message,
    });
  };

  return (
    <section className="p-8 space-y-6">
      {isUnauth ? (
        <div className="bg-navy-card border border-silver/15 rounded-2xl p-12 text-center">
          <i className="ti ti-lock text-5xl text-white/10 block mb-4" />
          <p className="text-base font-bold text-cool-steel mb-2">Sesión requerida</p>
          <p className="text-sm text-cool-steel/55 mb-6 max-w-md mx-auto">Iniciá sesión para acceder a Difusión Masiva y gestionar tus contactos de WhatsApp.</p>
          <a href="/api/login" className="inline-block px-6 py-2.5 bg-cl-accent text-navy text-sm font-bold rounded-lg no-underline hover:bg-cl-accent/90 transition">
            Iniciar sesión →
          </a>
        </div>
      ) : isUpgrade ? (
        <div className="bg-navy-card border border-silver/15 rounded-2xl p-12 text-center">
          <i className="ti ti-lock text-5xl text-white/10 block mb-4" />
          <p className="text-base font-bold text-cool-steel mb-2">Disponible desde plan Starter</p>
          <p className="text-sm text-cool-steel/55 mb-6 max-w-md mx-auto">Enviá mensajes masivos a todos tus contactos de WhatsApp con límites según tu plan.</p>
          <a href="/app/cuenta" className="inline-block px-6 py-2.5 bg-cl-accent text-navy text-sm font-bold rounded-lg no-underline hover:bg-cl-accent/90 transition">
            Ver planes →
          </a>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-navy-card border border-silver/15 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-cl-accent/10 text-cl-accent rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                <i className="ti ti-users" />
              </div>
              <div>
                <p className="text-xs font-bold text-cool-steel uppercase tracking-wider">Contactos WhatsApp</p>
                <p className="text-2xl font-extrabold text-white mt-0.5">{data?.contacts.length ?? 0}</p>
              </div>
            </div>
            <div className="bg-navy-card border border-silver/15 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-cl-blue/10 text-cl-blue rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                <i className="ti ti-checkbox" />
              </div>
              <div>
                <p className="text-xs font-bold text-cool-steel uppercase tracking-wider">Seleccionados</p>
                <p className="text-2xl font-extrabold text-white mt-0.5">{selected.size}</p>
              </div>
            </div>
            <div className="bg-navy-card border border-silver/15 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                <i className="ti ti-filter" />
              </div>
              <div>
                <p className="text-xs font-bold text-cool-steel uppercase tracking-wider">Filtrados</p>
                <p className="text-2xl font-extrabold text-white mt-0.5">{contacts.length}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_360px] gap-6">
            <div className="bg-navy-card border border-silver/15 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3 border-b border-silver/15">
                <input
                  type="text"
                  placeholder="Buscar contacto..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-navy border border-silver/20 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-cl-accent/50"
                />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-navy border border-silver/20 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cl-accent/50"
                >
                  <option value="all">Todos los estados</option>
                  <option value="new">Nuevo</option>
                  <option value="contacted">Contactado</option>
                  <option value="interested">Interesado</option>
                  <option value="converted">Convertido</option>
                  <option value="lost">Perdido</option>
                </select>
                <button
                  onClick={toggleAll}
                  className="px-3 py-1.5 text-xs font-semibold text-cool-steel hover:text-white bg-silver/10 hover:bg-silver/15 rounded-lg transition whitespace-nowrap"
                >
                  {selected.size === contacts.length && contacts.length > 0 ? "Deseleccionar todo" : "Seleccionar todo"}
                </button>
              </div>

              {isLoading ? (
                <div className="p-12 text-center text-cool-steel text-sm">Cargando contactos...</div>
              ) : contacts.length === 0 ? (
                <div className="p-12 text-center">
                  <i className="ti ti-users-group text-4xl text-white/10 block mb-3" />
                  <p className="text-sm text-cool-steel">No hay contactos de WhatsApp todavía.</p>
                </div>
              ) : (
                <div className="divide-y divide-silver/10 max-h-[500px] overflow-y-auto">
                  {contacts.map((c) => (
                    <label key={c.id} className={`flex items-center gap-4 px-5 py-3 cursor-pointer transition ${selected.has(c.id) ? "bg-cl-accent/5" : "hover:bg-deep-space/10"}`}>
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={(e) => {
                          const s = new Set(selected);
                          if (e.target.checked) s.add(c.id); else s.delete(c.id);
                          setSelected(s);
                        }}
                        className="w-4 h-4 accent-[#2dd8a0] flex-shrink-0"
                      />
                      <div className="w-8 h-8 bg-cl-accent/10 text-cl-accent rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {(c.contactName ?? c.phoneNumber).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{c.contactName ?? "Sin nombre"}</p>
                        <p className="text-[11px] text-cool-steel">{c.phoneNumber}</p>
                      </div>
                      {c.leadStatus && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${LEAD_COLORS[c.leadStatus] ?? "bg-silver/10 text-cool-steel"}`}>
                          {c.leadStatus}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-navy-card border border-silver/15 rounded-2xl p-6 flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-bold text-white mb-0.5">Redactar mensaje</h3>
                <p className="text-[11px] text-cool-steel">Se enviará por WhatsApp a cada contacto seleccionado.</p>
              </div>
              <textarea
                className="w-full flex-1 bg-navy border border-silver/20 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-cl-accent/50 resize-none min-h-[200px]"
                placeholder="Hola {nombre}, queríamos avisarte que…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <div className="flex items-center justify-between text-[11px] text-cool-steel">
                <span>{message.length} caracteres</span>
                <span>{selected.size} destinatario(s)</span>
              </div>
              {message.includes("{nombre}") && (
                <div className="flex items-start gap-2 bg-cl-accent/5 border border-cl-accent/10 rounded-xl px-3 py-2.5">
                  <i className="ti ti-info-circle text-cl-accent mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-cool-steel"><strong className="text-cl-accent">Variable detectada:</strong> {"{nombre}"} se reemplaza por el nombre del contacto al enviar.</p>
                </div>
              )}
              <button
                onClick={handleSend}
                disabled={!message.trim() || selected.size === 0 || sending}
                className="w-full py-3 bg-cl-accent text-navy text-sm font-bold rounded-xl hover:bg-cl-accent/90 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sending
                  ? <><i className="ti ti-loader-2 animate-spin" /> Enviando...</>
                  : <><i className="ti ti-send" /> Enviar a {selected.size} contacto(s)</>
                }
              </button>
              <div className="bg-silver/10 rounded-xl p-3 space-y-1.5">
                <p className="text-[10px] font-bold text-cool-steel uppercase tracking-wider">Límites por plan</p>
                {[["Starter", "100 msgs/envío"], ["Pro", "300 msgs/envío"], ["Business", "500 msgs/envío"], ["Enterprise", "1.000 msgs/envío"]].map(([plan, limit]) => (
                  <div key={plan} className="flex justify-between text-[11px]">
                    <span className="text-cool-steel">{plan}</span>
                    <span className="text-silver font-semibold">{limit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

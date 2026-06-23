import { useState } from "react";

const contacts = [
  { id: "1", name: "Carlos Robles", last: "¿Tienen pintura látex blanca?", time: "14:02", unread: 0 },
  { id: "2", name: "Lucia Méndez", last: "Necesito presupuesto urgente", time: "13:48", unread: 2 },
  { id: "3", name: "+54 9 341 000-0000", last: "Stock cemento Holcim", time: "13:12", unread: 0 },
];

type Msg = { from: "user" | "bot"; text: string };
const seedMessages: Msg[] = [
  { from: "user", text: "Hola, ¿tienen pintura látex blanca de 20L?" },
  { from: "bot", text: "¡Hola Carlos! Sí, tenemos Alba Sintético 20L a $ 38.500 y Tersuave Premium 20L a $ 42.000. ¿Te paso ficha técnica?" },
  { from: "user", text: "Pasame de la Tersuave" },
];

const trace = [
  { tag: "INTENT", text: "consulta_stock_producto · confianza 0.94" },
  { tag: "RAG", text: 'top-1: "Tersuave Premium 20L — pintura interior látex…" score=0.88' },
  { tag: "RAG", text: 'top-2: "Alba Sintético 20L — base blanca…" score=0.81' },
  { tag: "GUARD", text: "PII clean · prompt-injection clean" },
  { tag: "LLM", text: "Nemotron-30B · 412 tokens · 1.2s" },
];

export default function ChatSim() {
  const [activeId, setActiveId] = useState("1");
  const [messages, setMessages] = useState<Msg[]>(seedMessages);
  const [input, setInput] = useState("");
  const active = contacts.find((c) => c.id === activeId) ?? contacts[0];

  const send = () => {
    if (!input.trim()) return;
    setMessages((m) => [
      ...m,
      { from: "user", text: input },
      { from: "bot", text: "Procesando con RAG… te respondo en breve con stock y precio." },
    ]);
    setInput("");
  };

  return (
    <section className="p-8 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr_320px] gap-6 h-[600px]">
        <div className="bg-navy-card border border-silver/15 rounded-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-silver/15 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
            <i className="ti ti-users" /> Conversaciones de Prueba
          </div>
          <div className="flex-1 overflow-y-auto">
            {contacts.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`w-full text-left p-4 border-b border-silver/15 hover:bg-silver/10 transition-all ${
                  activeId === c.id ? "bg-silver/10" : ""
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-xs text-white">{c.name}</span>
                  <span className="text-[10px] text-cool-steel">{c.time}</span>
                </div>
                <p className="text-[11px] text-cool-steel truncate">{c.last}</p>
                {c.unread > 0 && (
                  <span className="inline-block mt-1 px-1.5 py-0.5 bg-cl-accent text-navy text-[9px] font-bold rounded-full">
                    {c.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-navy-card border border-silver/15 rounded-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-silver/15 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-xs text-white">{active.name}</h4>
              <p className="text-[10px] text-cl-accent">Modo: Bot con RAG Activo</p>
            </div>
            <span className="px-2 py-0.5 bg-cl-blue/15 text-cl-blue text-[9px] uppercase font-bold rounded">Simulador</span>
          </div>
          <div className="flex-1 p-4 overflow-y-auto space-y-3 flex flex-col">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[75%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                  m.from === "user"
                    ? "self-end bg-cl-accent text-navy rounded-br-sm"
                    : "self-start bg-navy-3 text-white rounded-bl-sm"
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-silver/15 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Escribe un mensaje en español..."
              className="flex-1 bg-navy-3 border border-silver/20 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-cl-accent text-white placeholder:text-cool-steel/55"
            />
            <button
              onClick={send}
              className="bg-cl-accent text-navy w-8 h-8 rounded-lg flex items-center justify-center hover:bg-cl-accent-hover transition-all"
            >
              <i className="ti ti-send" />
            </button>
          </div>
        </div>

        <div className="bg-navy-card border border-silver/15 rounded-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-silver/15 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
            <i className="ti ti-brain" /> Traza de Razonamiento
          </div>
          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs font-mono">
            {trace.map((t, i) => (
              <div key={i} className="space-y-1">
                <div className="text-[10px] font-bold text-cl-accent">[{t.tag}]</div>
                <div className="text-silver leading-relaxed">{t.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

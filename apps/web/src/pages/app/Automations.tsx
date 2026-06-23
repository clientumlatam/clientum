import { useState } from "react";

type TriggerType =
  | "form_submitted"
  | "table_row_created"
  | "table_row_updated"
  | "whatsapp_message"
  | "appointment_created"
  | "order_status_changed"
  | "schedule"
  | "webhook";

type ActionType =
  | "send_whatsapp"
  | "send_email"
  | "create_table_row"
  | "update_table_row"
  | "notify_slack"
  | "call_webhook"
  | "assign_tag"
  | "create_appointment";

type ConditionOperator = "equals" | "contains" | "greater_than" | "less_than" | "is_empty" | "not_empty";

type Condition = {
  id: string;
  field: string;
  operator: ConditionOperator;
  value: string;
};

type Action = {
  id: string;
  type: ActionType;
  config: Record<string, string>;
};

type Automation = {
  id: string;
  name: string;
  description: string;
  trigger: TriggerType;
  triggerConfig: Record<string, string>;
  conditions: Condition[];
  actions: Action[];
  enabled: boolean;
  runs: number;
  lastRun?: string;
};

const TRIGGERS: { type: TriggerType; label: string; icon: string; color: string; description: string }[] = [
  { type: "form_submitted", label: "Formulario enviado", icon: "ti-forms", color: "text-blue-400", description: "Cuando alguien completa un formulario" },
  { type: "table_row_created", label: "Fila creada en tabla", icon: "ti-table-plus", color: "text-emerald-400", description: "Al agregar un registro nuevo" },
  { type: "table_row_updated", label: "Fila actualizada", icon: "ti-table-options", color: "text-yellow-400", description: "Al modificar un registro existente" },
  { type: "whatsapp_message", label: "Mensaje de WhatsApp", icon: "ti-brand-whatsapp", color: "text-green-400", description: "Al recibir un mensaje de WhatsApp" },
  { type: "appointment_created", label: "Turno agendado", icon: "ti-calendar-plus", color: "text-purple-400", description: "Al crear un nuevo turno" },
  { type: "order_status_changed", label: "Estado de pedido cambia", icon: "ti-shopping-bag", color: "text-orange-400", description: "Al cambiar el estado de un pedido" },
  { type: "schedule", label: "Programado (cron)", icon: "ti-clock", color: "text-pink-400", description: "Ejecutar en horario fijo" },
  { type: "webhook", label: "Webhook entrante", icon: "ti-webhook", color: "text-teal-400", description: "Al recibir un HTTP POST externo" },
];

const ACTIONS: { type: ActionType; label: string; icon: string; color: string; description: string }[] = [
  { type: "send_whatsapp", label: "Enviar WhatsApp", icon: "ti-brand-whatsapp", color: "text-green-400", description: "Mandá un mensaje a un contacto" },
  { type: "send_email", label: "Enviar email", icon: "ti-mail", color: "text-blue-400", description: "Enviá un correo automático" },
  { type: "create_table_row", label: "Crear fila en tabla", icon: "ti-table-plus", color: "text-emerald-400", description: "Agregá un registro a una tabla" },
  { type: "update_table_row", label: "Actualizar tabla", icon: "ti-table-options", color: "text-yellow-400", description: "Modificá un registro existente" },
  { type: "notify_slack", label: "Notificar en Slack", icon: "ti-brand-slack", color: "text-purple-400", description: "Enviá un mensaje a un canal" },
  { type: "call_webhook", label: "Llamar webhook", icon: "ti-webhook", color: "text-teal-400", description: "Hacé un HTTP POST a una URL" },
  { type: "assign_tag", label: "Asignar etiqueta", icon: "ti-tag", color: "text-orange-400", description: "Etiquetá un contacto o registro" },
  { type: "create_appointment", label: "Crear turno", icon: "ti-calendar-plus", color: "text-pink-400", description: "Agendá un turno automáticamente" },
];

const DEMO_AUTOMATIONS: Automation[] = [
  {
    id: "1",
    name: "Bienvenida por WhatsApp",
    description: "Al recibir un formulario de contacto, enviá un mensaje de bienvenida por WhatsApp",
    trigger: "form_submitted",
    triggerConfig: { formId: "Formulario de Contacto" },
    conditions: [{ id: "c1", field: "teléfono", operator: "not_empty", value: "" }],
    actions: [
      { id: "a1", type: "send_whatsapp", config: { to: "{{teléfono}}", message: "¡Hola {{nombre}}! Recibimos tu consulta. Te respondemos en breve 🙌" } },
      { id: "a2", type: "create_table_row", config: { table: "Clientes", fields: "nombre, email, teléfono" } },
    ],
    enabled: true,
    runs: 47,
    lastRun: "Hace 2 horas",
  },
  {
    id: "2",
    name: "Recordatorio de turno",
    description: "24 horas antes de cada turno, notificá al cliente por WhatsApp",
    trigger: "schedule",
    triggerConfig: { cron: "Diario a las 9:00 AM" },
    conditions: [{ id: "c1", field: "estado", operator: "equals", value: "confirmado" }],
    actions: [
      { id: "a1", type: "send_whatsapp", config: { to: "{{cliente.teléfono}}", message: "Recordatorio: Tenés un turno mañana a las {{hora}} 📅" } },
    ],
    enabled: true,
    runs: 124,
    lastRun: "Hace 6 horas",
  },
  {
    id: "3",
    name: "Notificación de pedido enviado",
    description: "Cuando el estado de un pedido pasa a 'En camino', notificá al cliente",
    trigger: "order_status_changed",
    triggerConfig: { newStatus: "En camino" },
    conditions: [],
    actions: [
      { id: "a1", type: "send_whatsapp", config: { to: "{{cliente.teléfono}}", message: "Tu pedido #{{numero}} ya está en camino 🚚 Llegará entre las {{eta}}" } },
    ],
    enabled: false,
    runs: 31,
    lastRun: "Hace 3 días",
  },
];

const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  equals: "es igual a",
  contains: "contiene",
  greater_than: "es mayor que",
  less_than: "es menor que",
  is_empty: "está vacío",
  not_empty: "no está vacío",
};

type EditorStep = "trigger" | "conditions" | "actions" | "review";

function StepDot({ step, current, label }: { step: EditorStep; current: EditorStep; label: string }) {
  const STEPS: EditorStep[] = ["trigger", "conditions", "actions", "review"];
  const idx = STEPS.indexOf(step);
  const currentIdx = STEPS.indexOf(current);
  const done = idx < currentIdx;
  const active = idx === currentIdx;
  return (
    <div className="flex items-center gap-2">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${done ? "bg-cl-accent text-navy" : active ? "bg-cl-accent/20 text-cl-accent border border-cl-accent" : "bg-silver/15 text-cool-steel/55"}`}>
        {done ? <i className="ti ti-check text-sm" /> : idx + 1}
      </div>
      <span className={`text-xs font-semibold hidden sm:block ${active ? "text-white" : done ? "text-cl-accent" : "text-cool-steel/55"}`}>{label}</span>
    </div>
  );
}

export default function AutomationsPage() {
  const [view, setView] = useState<"list" | "editor" | "detail">("list");
  const [automations, setAutomations] = useState(DEMO_AUTOMATIONS);
  const [selected, setSelected] = useState<Automation | null>(null);
  const [editorStep, setEditorStep] = useState<EditorStep>("trigger");
  const [draftTrigger, setDraftTrigger] = useState<TriggerType | null>(null);
  const [draftActions, setDraftActions] = useState<ActionType[]>([]);
  const [draftConditions, setDraftConditions] = useState<Condition[]>([]);
  const [autoName, setAutoName] = useState("Nueva automatización");

  function toggleEnabled(id: string) {
    setAutomations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
  }

  function openEditor() {
    setDraftTrigger(null);
    setDraftActions([]);
    setDraftConditions([]);
    setAutoName("Nueva automatización");
    setEditorStep("trigger");
    setView("editor");
  }

  function addCondition() {
    setDraftConditions((prev) => [
      ...prev,
      { id: Date.now().toString(), field: "campo", operator: "equals", value: "" },
    ]);
  }

  function removeCondition(id: string) {
    setDraftConditions((prev) => prev.filter((c) => c.id !== id));
  }

  function updateCondition(id: string, patch: Partial<Condition>) {
    setDraftConditions((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function toggleAction(type: ActionType) {
    setDraftActions((prev) =>
      prev.includes(type) ? prev.filter((a) => a !== type) : [...prev, type]
    );
  }

  function saveAutomation() {
    const newAuto: Automation = {
      id: Date.now().toString(),
      name: autoName,
      description: `Cuando ${TRIGGERS.find((t) => t.type === draftTrigger)?.label.toLowerCase() ?? "trigger"}, ejecutar ${draftActions.length} acción${draftActions.length !== 1 ? "es" : ""}`,
      trigger: draftTrigger ?? "webhook",
      triggerConfig: {},
      conditions: draftConditions,
      actions: draftActions.map((type, i) => ({ id: String(i), type, config: {} })),
      enabled: true,
      runs: 0,
    };
    setAutomations((prev) => [newAuto, ...prev]);
    setView("list");
  }

  if (view === "detail" && selected) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <button onClick={() => setView("list")} className="flex items-center gap-2 text-sm text-cool-steel hover:text-white mb-6 transition-all">
          <i className="ti ti-arrow-left" /> Volver
        </button>
        <div className="flex items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">{selected.name}</h2>
            <p className="text-sm text-cool-steel">{selected.description}</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${selected.enabled ? "bg-cl-accent/20 text-cl-accent" : "bg-silver/10 text-cool-steel/55"}`}>
              {selected.enabled ? "Activa" : "Pausada"}
            </span>
            <button onClick={() => toggleEnabled(selected.id)} className="text-sm bg-silver/10 hover:bg-silver/15 text-cool-steel hover:text-white px-4 py-2 rounded-lg transition-all">
              {selected.enabled ? "Pausar" : "Activar"}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-navy-2 border border-silver/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <i className="ti ti-bolt text-cl-accent" />
              <h3 className="font-bold text-white text-sm">Disparador</h3>
            </div>
            <div className="flex items-center gap-3">
              {(() => {
                const t = TRIGGERS.find((x) => x.type === selected.trigger);
                return t ? (
                  <>
                    <div className="w-10 h-10 bg-silver/10 rounded-lg flex items-center justify-center">
                      <i className={`ti ${t.icon} text-xl ${t.color}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">{t.label}</p>
                      <p className="text-xs text-cool-steel">{t.description}</p>
                    </div>
                  </>
                ) : null;
              })()}
            </div>
          </div>

          {selected.conditions.length > 0 && (
            <div className="bg-navy-2 border border-silver/20 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <i className="ti ti-filter text-yellow-400" />
                <h3 className="font-bold text-white text-sm">Condiciones</h3>
              </div>
              <div className="space-y-2">
                {selected.conditions.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-2 text-sm">
                    {i > 0 && <span className="text-cool-steel/40 text-xs">Y</span>}
                    <span className="bg-silver/10 px-2 py-1 rounded text-silver font-mono text-xs">{c.field}</span>
                    <span className="text-cool-steel/55 text-xs">{OPERATOR_LABELS[c.operator]}</span>
                    {c.value && <span className="bg-cl-accent/10 text-cl-accent px-2 py-1 rounded text-xs font-mono">{c.value}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-navy-2 border border-silver/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <i className="ti ti-player-play text-cl-accent" />
              <h3 className="font-bold text-white text-sm">Acciones ({selected.actions.length})</h3>
            </div>
            <div className="space-y-3">
              {selected.actions.map((action, idx) => {
                const a = ACTIONS.find((x) => x.type === action.type);
                return a ? (
                  <div key={action.id} className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-5 h-5 rounded bg-silver/10 text-cool-steel/40 text-[10px] font-bold mt-0.5 flex-shrink-0">{idx + 1}</div>
                    <div className="w-8 h-8 bg-silver/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <i className={`ti ${a.icon} ${a.color} text-base`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm">{a.label}</p>
                      {Object.entries(action.config).map(([k, v]) => (
                        <p key={k} className="text-xs text-cool-steel font-mono truncate">{k}: {v}</p>
                      ))}
                    </div>
                  </div>
                ) : null;
              })}
            </div>
          </div>

          <div className="bg-navy-2 border border-silver/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <i className="ti ti-chart-bar text-purple-400" />
              <h3 className="font-bold text-white text-sm">Historial de ejecuciones</h3>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-silver/10 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-white">{selected.runs}</p>
                <p className="text-xs text-cool-steel/55">Ejecuciones totales</p>
              </div>
              <div className="bg-silver/10 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-cl-accent">{Math.round(selected.runs * 0.97)}</p>
                <p className="text-xs text-cool-steel/55">Exitosas</p>
              </div>
              <div className="bg-silver/10 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-400">{Math.round(selected.runs * 0.03)}</p>
                <p className="text-xs text-cool-steel/55">Con error</p>
              </div>
            </div>
            <div className="space-y-2">
              {[
                { time: "Hace 5 min", status: "ok", desc: "Formulario de Contacto enviado por María García" },
                { time: "Hace 1 hora", status: "ok", desc: "Formulario enviado por Carlos López" },
                { time: "Hace 3 horas", status: "error", desc: "Error: número de teléfono inválido" },
                { time: "Hace 5 horas", status: "ok", desc: "Formulario enviado por Ana Rodríguez" },
              ].map((log, i) => (
                <div key={i} className="flex items-center gap-3 text-xs py-1.5 border-b border-silver/15 last:border-0">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${log.status === "ok" ? "bg-cl-accent" : "bg-red-400"}`} />
                  <span className="text-cool-steel flex-1">{log.desc}</span>
                  <span className="text-cool-steel/45">{log.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === "editor") {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-silver/15 px-6 py-3 flex items-center gap-6 bg-navy-2 flex-shrink-0">
          <button onClick={() => setView("list")} className="text-cool-steel hover:text-white transition-all">
            <i className="ti ti-arrow-left text-lg" />
          </button>
          <input
            value={autoName}
            onChange={(e) => setAutoName(e.target.value)}
            className="bg-transparent text-white font-bold outline-none border-b border-transparent hover:border-silver/30 focus:border-cl-accent transition-all"
          />
          <div className="ml-auto flex items-center gap-4">
            <StepDot step="trigger" current={editorStep} label="Disparador" />
            <i className="ti ti-chevron-right text-cool-steel/40" />
            <StepDot step="conditions" current={editorStep} label="Condiciones" />
            <i className="ti ti-chevron-right text-cool-steel/40" />
            <StepDot step="actions" current={editorStep} label="Acciones" />
            <i className="ti ti-chevron-right text-cool-steel/40" />
            <StepDot step="review" current={editorStep} label="Revisar" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {editorStep === "trigger" && (
            <div className="max-w-3xl mx-auto">
              <h2 className="text-lg font-bold text-white mb-1">¿Qué dispara esta automatización?</h2>
              <p className="text-sm text-cool-steel mb-6">Elegí el evento que pone en marcha el flujo</p>
              <div className="grid grid-cols-2 gap-3">
                {TRIGGERS.map((t) => (
                  <button
                    key={t.type}
                    onClick={() => setDraftTrigger(t.type)}
                    className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                      draftTrigger === t.type
                        ? "border-cl-accent bg-cl-accent/10"
                        : "border-silver/20 bg-navy-2 hover:border-silver/30"
                    }`}
                  >
                    <div className="w-10 h-10 bg-silver/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <i className={`ti ${t.icon} text-xl ${t.color}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">{t.label}</p>
                      <p className="text-xs text-cool-steel">{t.description}</p>
                    </div>
                    {draftTrigger === t.type && (
                      <i className="ti ti-check text-cl-accent ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {editorStep === "conditions" && (
            <div className="max-w-2xl mx-auto">
              <h2 className="text-lg font-bold text-white mb-1">Condiciones (opcional)</h2>
              <p className="text-sm text-cool-steel mb-6">La automatización solo se ejecuta si se cumplen estas condiciones</p>
              <div className="space-y-3 mb-4">
                {draftConditions.map((c) => (
                  <div key={c.id} className="bg-navy-2 border border-silver/20 rounded-xl p-4 flex items-center gap-3">
                    <input
                      value={c.field}
                      onChange={(e) => updateCondition(c.id, { field: e.target.value })}
                      className="bg-silver/10 border border-silver/20 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-cl-accent w-32"
                      placeholder="campo"
                    />
                    <select
                      value={c.operator}
                      onChange={(e) => updateCondition(c.id, { operator: e.target.value as ConditionOperator })}
                      className="bg-silver/10 border border-silver/20 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-cl-accent"
                    >
                      {Object.entries(OPERATOR_LABELS).map(([op, label]) => (
                        <option key={op} value={op}>{label}</option>
                      ))}
                    </select>
                    {c.operator !== "is_empty" && c.operator !== "not_empty" && (
                      <input
                        value={c.value}
                        onChange={(e) => updateCondition(c.id, { value: e.target.value })}
                        className="flex-1 bg-silver/10 border border-silver/20 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-cl-accent"
                        placeholder="valor..."
                      />
                    )}
                    <button onClick={() => removeCondition(c.id)} className="text-cool-steel/40 hover:text-red-400 transition-all ml-auto">
                      <i className="ti ti-trash text-base" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addCondition}
                className="flex items-center gap-2 text-sm text-cool-steel hover:text-cl-accent border border-dashed border-silver/20 hover:border-cl-accent/30 rounded-xl px-4 py-3 w-full transition-all"
              >
                <i className="ti ti-plus" /> Agregar condición
              </button>
              {draftConditions.length === 0 && (
                <p className="text-center text-sm text-cool-steel/40 mt-6">Sin condiciones — la automatización se ejecuta siempre que ocurra el disparador</p>
              )}
            </div>
          )}

          {editorStep === "actions" && (
            <div className="max-w-3xl mx-auto">
              <h2 className="text-lg font-bold text-white mb-1">¿Qué debe hacer?</h2>
              <p className="text-sm text-cool-steel mb-6">Elegí una o más acciones a ejecutar en orden</p>
              <div className="grid grid-cols-2 gap-3">
                {ACTIONS.map((a) => (
                  <button
                    key={a.type}
                    onClick={() => toggleAction(a.type)}
                    className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                      draftActions.includes(a.type)
                        ? "border-cl-accent bg-cl-accent/10"
                        : "border-silver/20 bg-navy-2 hover:border-silver/30"
                    }`}
                  >
                    <div className="w-10 h-10 bg-silver/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <i className={`ti ${a.icon} text-xl ${a.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm">{a.label}</p>
                      <p className="text-xs text-cool-steel">{a.description}</p>
                    </div>
                    {draftActions.includes(a.type) && (
                      <div className="w-5 h-5 rounded-full bg-cl-accent flex items-center justify-center flex-shrink-0">
                        <span className="text-navy text-[10px] font-bold">{draftActions.indexOf(a.type) + 1}</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {editorStep === "review" && (
            <div className="max-w-2xl mx-auto">
              <h2 className="text-lg font-bold text-white mb-1">Revisión final</h2>
              <p className="text-sm text-cool-steel mb-6">Confirmá el flujo antes de activarlo</p>
              <div className="space-y-3">
                <div className="bg-navy-2 border border-silver/20 rounded-xl p-5">
                  <p className="text-xs font-bold text-cool-steel/55 uppercase tracking-wider mb-3">Nombre</p>
                  <input
                    value={autoName}
                    onChange={(e) => setAutoName(e.target.value)}
                    className="w-full bg-silver/10 border border-silver/20 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cl-accent"
                  />
                </div>
                <div className="bg-navy-2 border border-silver/20 rounded-xl p-5">
                  <p className="text-xs font-bold text-cool-steel/55 uppercase tracking-wider mb-3">Flujo</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    {(() => {
                      const t = TRIGGERS.find((x) => x.type === draftTrigger);
                      return t ? (
                        <div className="flex items-center gap-2 bg-silver/10 rounded-lg px-3 py-2 text-sm">
                          <i className={`ti ${t.icon} ${t.color}`} />
                          <span className="text-white font-semibold">{t.label}</span>
                        </div>
                      ) : null;
                    })()}
                    {draftConditions.length > 0 && (
                      <>
                        <i className="ti ti-arrow-right text-cool-steel/40" />
                        <div className="flex items-center gap-2 bg-yellow-500/10 rounded-lg px-3 py-2 text-sm">
                          <i className="ti ti-filter text-yellow-400" />
                          <span className="text-white font-semibold">{draftConditions.length} condición{draftConditions.length !== 1 ? "es" : ""}</span>
                        </div>
                      </>
                    )}
                    {draftActions.map((type) => {
                      const a = ACTIONS.find((x) => x.type === type);
                      return a ? (
                        <div key={type} className="flex items-center gap-2">
                          <i className="ti ti-arrow-right text-cool-steel/40" />
                          <div className="flex items-center gap-2 bg-cl-accent/10 rounded-lg px-3 py-2 text-sm">
                            <i className={`ti ${a.icon} ${a.color}`} />
                            <span className="text-white font-semibold">{a.label}</span>
                          </div>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-silver/15 px-6 py-4 flex items-center justify-between bg-navy-2 flex-shrink-0">
          <button
            onClick={() => {
              const steps: EditorStep[] = ["trigger", "conditions", "actions", "review"];
              const idx = steps.indexOf(editorStep);
              if (idx > 0) setEditorStep(steps[idx - 1]);
              else setView("list");
            }}
            className="flex items-center gap-2 text-sm text-cool-steel hover:text-white bg-silver/10 hover:bg-silver/15 px-4 py-2 rounded-lg transition-all"
          >
            <i className="ti ti-arrow-left" />
            {editorStep === "trigger" ? "Cancelar" : "Anterior"}
          </button>
          {editorStep !== "review" ? (
            <button
              onClick={() => {
                const steps: EditorStep[] = ["trigger", "conditions", "actions", "review"];
                const idx = steps.indexOf(editorStep);
                setEditorStep(steps[idx + 1]);
              }}
              disabled={editorStep === "trigger" && !draftTrigger}
              className="flex items-center gap-2 text-sm bg-cl-accent text-navy font-bold px-6 py-2 rounded-lg hover:bg-cl-accent/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente <i className="ti ti-arrow-right" />
            </button>
          ) : (
            <button
              onClick={saveAutomation}
              disabled={!draftTrigger || draftActions.length === 0}
              className="flex items-center gap-2 text-sm bg-cl-accent text-navy font-bold px-6 py-2 rounded-lg hover:bg-cl-accent/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <i className="ti ti-bolt" />
              Activar automatización
            </button>
          )}
        </div>
      </div>
    );
  }

  const activeCount = automations.filter((a) => a.enabled).length;
  const totalRuns = automations.reduce((sum, a) => sum + a.runs, 0);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-white">Automatizaciones</h2>
          <p className="text-sm text-cool-steel">Conectá módulos con triggers y acciones visuales</p>
        </div>
        <button
          onClick={openEditor}
          className="flex items-center gap-2 bg-cl-accent text-navy font-bold px-4 py-2 rounded-lg text-sm hover:bg-cl-accent/90 transition-all"
        >
          <i className="ti ti-plus text-base" /> Nueva automatización
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Activas", value: activeCount, icon: "ti-bolt", color: "text-cl-accent", bg: "bg-cl-accent/10" },
          { label: "Pausadas", value: automations.length - activeCount, icon: "ti-player-pause", color: "text-yellow-400", bg: "bg-yellow-400/10" },
          { label: "Ejecuciones totales", value: totalRuns.toLocaleString("es-AR"), icon: "ti-activity", color: "text-purple-400", bg: "bg-purple-400/10" },
        ].map((stat) => (
          <div key={stat.label} className="bg-navy-2 border border-silver/20 rounded-xl p-4 flex items-center gap-4">
            <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
              <i className={`ti ${stat.icon} text-xl ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-cool-steel">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {automations.map((auto) => {
          const trigger = TRIGGERS.find((t) => t.type === auto.trigger);
          return (
            <div
              key={auto.id}
              className="bg-navy-2 border border-silver/20 hover:border-cl-accent/20 rounded-xl p-5 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 bg-silver/10 rounded-lg flex items-center justify-center flex-shrink-0 ${!auto.enabled && "opacity-40"}`}>
                  <i className={`ti ${trigger?.icon ?? "ti-bolt"} text-xl ${trigger?.color ?? "text-cl-accent"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className={`font-bold text-sm ${auto.enabled ? "text-white" : "text-cool-steel"}`}>{auto.name}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${auto.enabled ? "bg-cl-accent/20 text-cl-accent" : "bg-silver/10 text-cool-steel/55"}`}>
                      {auto.enabled ? "Activa" : "Pausada"}
                    </span>
                  </div>
                  <p className="text-xs text-cool-steel mb-3">{auto.description}</p>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs text-cool-steel/55">
                      <i className="ti ti-bolt" />
                      <span>{trigger?.label}</span>
                    </div>
                    <span className="text-white/10">·</span>
                    <div className="flex items-center gap-1.5 text-xs text-cool-steel/55">
                      <i className="ti ti-player-play" />
                      <span>{auto.actions.length} acción{auto.actions.length !== 1 ? "es" : ""}</span>
                    </div>
                    <span className="text-white/10">·</span>
                    <div className="flex items-center gap-1.5 text-xs text-cool-steel/55">
                      <i className="ti ti-activity" />
                      <span>{auto.runs} ejecuciones</span>
                    </div>
                    {auto.lastRun && (
                      <>
                        <span className="text-white/10">·</span>
                        <div className="flex items-center gap-1.5 text-xs text-cool-steel/40">
                          <i className="ti ti-clock" />
                          <span>{auto.lastRun}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                  <button
                    onClick={() => { setSelected(auto); setView("detail"); }}
                    className="text-xs text-cool-steel hover:text-white bg-silver/10 hover:bg-silver/15 px-3 py-1.5 rounded-lg transition-all"
                  >
                    <i className="ti ti-eye mr-1" /> Ver
                  </button>
                  <button
                    onClick={() => toggleEnabled(auto.id)}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
                      auto.enabled
                        ? "text-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20"
                        : "text-cl-accent bg-cl-accent/10 hover:bg-cl-accent/20"
                    }`}
                  >
                    {auto.enabled ? <><i className="ti ti-player-pause mr-1" />Pausar</> : <><i className="ti ti-player-play mr-1" />Activar</>}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 bg-navy-2 border border-cl-accent/10 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <i className="ti ti-info-circle text-cl-accent text-xl flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-white text-sm mb-1">Variables disponibles</h3>
            <p className="text-xs text-cool-steel mb-3">Usá estas variables en tus mensajes y acciones con la sintaxis <code className="bg-silver/15 px-1 rounded">{"{{variable}}"}</code></p>
            <div className="flex flex-wrap gap-2">
              {["{{nombre}}", "{{email}}", "{{teléfono}}", "{{fecha}}", "{{hora}}", "{{pedido.numero}}", "{{pedido.total}}", "{{turno.fecha}}", "{{turno.servicio}}"].map((v) => (
                <span key={v} className="text-xs font-mono bg-cl-accent/10 text-cl-accent px-2 py-1 rounded">{v}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

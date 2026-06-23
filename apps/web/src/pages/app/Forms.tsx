import { useState } from "react";

type FieldType = "text" | "email" | "phone" | "number" | "select" | "textarea" | "checkbox" | "date" | "file";

type FormField = {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
};

type Form = {
  id: string;
  name: string;
  description: string;
  fields: FormField[];
  responses: number;
  status: "published" | "draft";
  createdAt: string;
};

const FIELD_TYPES: { type: FieldType; label: string; icon: string }[] = [
  { type: "text", label: "Texto corto", icon: "ti-forms" },
  { type: "textarea", label: "Texto largo", icon: "ti-text-size" },
  { type: "email", label: "Email", icon: "ti-mail" },
  { type: "phone", label: "Teléfono", icon: "ti-phone" },
  { type: "number", label: "Número", icon: "ti-hash" },
  { type: "select", label: "Opciones", icon: "ti-list" },
  { type: "checkbox", label: "Checkbox", icon: "ti-checkbox" },
  { type: "date", label: "Fecha", icon: "ti-calendar" },
  { type: "file", label: "Archivo", icon: "ti-paperclip" },
];

const DEMO_FORMS: Form[] = [
  {
    id: "1",
    name: "Formulario de Contacto",
    description: "Captura de leads del sitio web",
    responses: 47,
    status: "published",
    createdAt: "Hace 3 días",
    fields: [
      { id: "f1", type: "text", label: "Nombre completo", placeholder: "Tu nombre", required: true },
      { id: "f2", type: "email", label: "Email", placeholder: "tu@email.com", required: true },
      { id: "f3", type: "phone", label: "WhatsApp", placeholder: "+54 9 ...", required: false },
      { id: "f4", type: "select", label: "¿Qué te interesa?", required: true, options: ["Consulta general", "Presupuesto", "Soporte"] },
      { id: "f5", type: "textarea", label: "Mensaje", placeholder: "Contanos en qué podemos ayudarte...", required: false },
    ],
  },
  {
    id: "2",
    name: "Encuesta Post-Venta",
    description: "Satisfacción de clientes después de compra",
    responses: 23,
    status: "published",
    createdAt: "Hace 1 semana",
    fields: [
      { id: "f1", type: "text", label: "Nombre", placeholder: "Tu nombre", required: true },
      { id: "f2", type: "select", label: "¿Cómo calificarías tu experiencia?", required: true, options: ["Excelente", "Muy buena", "Buena", "Regular", "Mala"] },
      { id: "f3", type: "textarea", label: "Comentarios adicionales", placeholder: "Opcional...", required: false },
    ],
  },
];

export default function FormsPage() {
  const [view, setView] = useState<"list" | "editor" | "preview">("list");
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [formName, setFormName] = useState("Nuevo formulario");
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [previewForm, setPreviewForm] = useState<Form | null>(null);

  function newForm() {
    setFormName("Nuevo formulario");
    setFields([]);
    setView("editor");
  }

  function editForm(form: Form) {
    setSelectedForm(form);
    setFormName(form.name);
    setFields([...form.fields]);
    setView("editor");
  }

  function addField(type: FieldType) {
    const DEFAULTS: Record<FieldType, Partial<FormField>> = {
      text: { label: "Campo de texto", placeholder: "Ingresá tu respuesta..." },
      textarea: { label: "Comentarios", placeholder: "Escribí aquí..." },
      email: { label: "Email", placeholder: "tu@email.com" },
      phone: { label: "Teléfono", placeholder: "+54 9 ..." },
      number: { label: "Número", placeholder: "0" },
      select: { label: "Seleccioná una opción", options: ["Opción 1", "Opción 2", "Opción 3"] },
      checkbox: { label: "Acepto los términos" },
      date: { label: "Fecha" },
      file: { label: "Adjuntá un archivo" },
    };
    const newField: FormField = {
      id: Date.now().toString(),
      type,
      required: false,
      ...DEFAULTS[type],
    } as FormField;
    setFields((prev) => [...prev, newField]);
  }

  function removeField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }

  function updateField(id: string, patch: Partial<FormField>) {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function getInputEl(field: FormField) {
    switch (field.type) {
      case "textarea":
        return <textarea className="w-full bg-silver/10 border border-silver/20 rounded-lg px-3 py-2 text-sm text-silver placeholder-white/20 resize-none h-20" placeholder={field.placeholder} />;
      case "select":
        return (
          <select className="w-full bg-silver/10 border border-silver/20 rounded-lg px-3 py-2 text-sm text-silver">
            <option value="">Seleccioná...</option>
            {(field.options ?? []).map((o) => <option key={o}>{o}</option>)}
          </select>
        );
      case "checkbox":
        return (
          <label className="flex items-center gap-2 text-sm text-silver cursor-pointer">
            <input type="checkbox" className="rounded" />
            <span>{field.label}</span>
          </label>
        );
      case "file":
        return (
          <div className="border-2 border-dashed border-silver/20 rounded-lg px-4 py-6 text-center text-sm text-cool-steel/55">
            <i className="ti ti-cloud-upload text-2xl mb-1 block" />
            Arrastrá un archivo o hacé clic para subir
          </div>
        );
      default:
        return (
          <input
            type={field.type === "phone" ? "tel" : field.type === "number" ? "number" : field.type === "email" ? "email" : field.type === "date" ? "date" : "text"}
            className="w-full bg-silver/10 border border-silver/20 rounded-lg px-3 py-2 text-sm text-silver placeholder-white/20"
            placeholder={field.placeholder}
          />
        );
    }
  }

  if (view === "preview" && previewForm) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <button onClick={() => setView("list")} className="flex items-center gap-2 text-sm text-cool-steel hover:text-white mb-6 transition-all">
          <i className="ti ti-arrow-left" /> Volver
        </button>
        <div className="bg-navy-2 border border-silver/20 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-2">{previewForm.name}</h2>
          <p className="text-cool-steel text-sm mb-8">{previewForm.description}</p>
          <div className="space-y-5">
            {previewForm.fields.map((f) => (
              <div key={f.id}>
                {f.type !== "checkbox" && (
                  <label className="block text-sm font-semibold text-silver mb-1.5">
                    {f.label}
                    {f.required && <span className="text-red-400 ml-1">*</span>}
                  </label>
                )}
                {getInputEl(f)}
              </div>
            ))}
          </div>
          <button className="mt-8 w-full bg-cl-accent text-navy font-bold py-3 rounded-xl text-sm hover:bg-cl-accent/90 transition-all">
            Enviar formulario
          </button>
        </div>
      </div>
    );
  }

  if (view === "editor") {
    return (
      <div className="flex h-full">
        <div className="w-64 bg-navy-2 border-r border-silver/15 flex flex-col py-4 flex-shrink-0">
          <div className="px-4 mb-4">
            <p className="text-xs font-bold text-cool-steel/55 uppercase tracking-wider mb-3">Agregar campo</p>
          </div>
          <div className="px-3 space-y-1 overflow-y-auto flex-1">
            {FIELD_TYPES.map((ft) => (
              <button
                key={ft.type}
                onClick={() => addField(ft.type)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-cool-steel hover:text-white hover:bg-silver/10 rounded-lg transition-all text-left"
              >
                <i className={`ti ${ft.icon} text-base`} />
                {ft.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="border-b border-silver/15 px-6 py-3 flex items-center gap-4 bg-navy-2 flex-shrink-0">
            <button onClick={() => setView("list")} className="text-cool-steel hover:text-white transition-all">
              <i className="ti ti-arrow-left text-lg" />
            </button>
            <input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="bg-transparent text-white font-bold text-base outline-none border-b border-transparent hover:border-silver/30 focus:border-cl-accent transition-all"
            />
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => { setPreviewForm({ id: "new", name: formName, description: "", fields, responses: 0, status: "draft", createdAt: "Ahora" }); setView("preview"); }}
                className="flex items-center gap-2 text-sm text-cool-steel hover:text-white bg-silver/10 hover:bg-silver/15 px-4 py-2 rounded-lg transition-all"
              >
                <i className="ti ti-eye" /> Vista previa
              </button>
              <button
                onClick={() => setView("list")}
                className="flex items-center gap-2 text-sm bg-cl-accent text-navy font-bold px-4 py-2 rounded-lg hover:bg-cl-accent/90 transition-all"
              >
                <i className="ti ti-cloud-upload" /> Publicar
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {fields.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-cool-steel/40">
                <i className="ti ti-forms text-5xl mb-3" />
                <p className="text-sm">Agregá campos desde el panel izquierdo</p>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto space-y-3">
                {fields.map((field, idx) => (
                  <div
                    key={field.id}
                    className={`bg-navy-2 border rounded-xl p-4 transition-all ${draggingIdx === idx ? "border-cl-accent/40 opacity-60" : "border-silver/20 hover:border-silver/30"}`}
                    draggable
                    onDragStart={() => setDraggingIdx(idx)}
                    onDragEnd={() => setDraggingIdx(null)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <i className="ti ti-grip-vertical text-cool-steel/40 cursor-grab" />
                      <input
                        value={field.label}
                        onChange={(e) => updateField(field.id, { label: e.target.value })}
                        className="flex-1 bg-transparent text-sm font-semibold text-white outline-none border-b border-transparent hover:border-silver/30 focus:border-cl-accent transition-all"
                      />
                      <label className="flex items-center gap-1.5 text-xs text-cool-steel cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => updateField(field.id, { required: e.target.checked })}
                          className="rounded"
                        />
                        Requerido
                      </label>
                      <button onClick={() => removeField(field.id)} className="text-cool-steel/40 hover:text-red-400 transition-all">
                        <i className="ti ti-trash text-base" />
                      </button>
                    </div>
                    <div className="opacity-60 pointer-events-none">{getInputEl(field)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-white">Formularios</h2>
          <p className="text-sm text-cool-steel">Creá formularios embebibles para tu sitio web</p>
        </div>
        <button
          onClick={newForm}
          className="flex items-center gap-2 bg-cl-accent text-navy font-bold px-4 py-2 rounded-lg text-sm hover:bg-cl-accent/90 transition-all"
        >
          <i className="ti ti-plus text-base" /> Nuevo formulario
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DEMO_FORMS.map((form) => (
          <div
            key={form.id}
            className="bg-navy-2 border border-silver/20 hover:border-cl-accent/30 rounded-xl p-5 transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-cl-accent/10 rounded-lg flex items-center justify-center">
                <i className="ti ti-forms text-cl-accent text-xl" />
              </div>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  form.status === "published"
                    ? "bg-cl-accent/20 text-cl-accent"
                    : "bg-silver/15 text-cool-steel"
                }`}
              >
                {form.status === "published" ? "Publicado" : "Borrador"}
              </span>
            </div>
            <h3 className="font-bold text-white text-sm mb-1">{form.name}</h3>
            <p className="text-xs text-cool-steel mb-3">{form.description}</p>
            <div className="flex items-center gap-4 text-xs text-cool-steel/55 mb-4">
              <span><i className="ti ti-layout-list mr-1" />{form.fields.length} campos</span>
              <span><i className="ti ti-inbox mr-1" />{form.responses} respuestas</span>
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
              <button
                onClick={() => editForm(form)}
                className="flex-1 text-xs text-silver hover:text-white bg-silver/10 hover:bg-silver/15 px-3 py-1.5 rounded-lg transition-all"
              >
                <i className="ti ti-pencil mr-1" /> Editar
              </button>
              <button
                onClick={() => { setPreviewForm(form); setView("preview"); }}
                className="flex-1 text-xs text-cl-accent hover:text-cl-accent/80 bg-cl-accent/10 hover:bg-cl-accent/20 px-3 py-1.5 rounded-lg transition-all"
              >
                <i className="ti ti-eye mr-1" /> Preview
              </button>
            </div>
          </div>
        ))}

        <button
          onClick={newForm}
          className="border-2 border-dashed border-silver/20 hover:border-cl-accent/30 rounded-xl p-5 flex flex-col items-center justify-center gap-3 text-cool-steel/55 hover:text-cl-accent transition-all min-h-[200px]"
        >
          <i className="ti ti-plus text-3xl" />
          <span className="text-sm font-semibold">Nuevo formulario</span>
        </button>
      </div>

      <div className="mt-8 bg-navy-2 border border-silver/20 rounded-xl p-5">
        <h3 className="font-bold text-white text-sm mb-1 flex items-center gap-2">
          <i className="ti ti-code text-cl-accent" />
          Integrar en tu sitio
        </h3>
        <p className="text-xs text-cool-steel mb-3">Copiá este snippet y pegalo en el HTML de tu página</p>
        <div className="bg-black/30 rounded-lg p-3 font-mono text-xs text-cl-accent/80 select-all">
          {'<script src="https://clientum.com.ar/embed.js" data-form-id="TU_ID"></script>'}
        </div>
      </div>
    </div>
  );
}

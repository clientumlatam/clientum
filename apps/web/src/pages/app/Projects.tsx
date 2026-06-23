import { useState } from "react";

type Priority = "urgente" | "alta" | "media" | "baja";
type IssueStatus = "backlog" | "por_hacer" | "en_progreso" | "en_revision" | "completado" | "cancelado";

type Issue = {
  id: string;
  code: string;
  title: string;
  description: string;
  status: IssueStatus;
  priority: Priority;
  assignee: string;
  assigneeColor: string;
  project: string;
  sprint?: string;
  labels: string[];
  dueDate?: string;
  createdAt: string;
};

type Project = {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  issues: number;
  completed: number;
  members: number;
  status: "activo" | "pausado" | "completado";
};

const PRIORITIES: Record<Priority, { label: string; icon: string; color: string }> = {
  urgente: { label: "Urgente", icon: "ti-alert-circle", color: "text-red-400" },
  alta: { label: "Alta", icon: "ti-arrow-up", color: "text-orange-400" },
  media: { label: "Media", icon: "ti-minus", color: "text-yellow-400" },
  baja: { label: "Baja", icon: "ti-arrow-down", color: "text-blue-400" },
};

const STATUSES: Record<IssueStatus, { label: string; icon: string; color: string; bg: string }> = {
  backlog: { label: "Backlog", icon: "ti-circle", color: "text-cool-steel/55", bg: "bg-silver/10" },
  por_hacer: { label: "Por hacer", icon: "ti-circle-dashed", color: "text-cool-steel", bg: "bg-silver/15" },
  en_progreso: { label: "En progreso", icon: "ti-progress", color: "text-blue-400", bg: "bg-blue-400/10" },
  en_revision: { label: "En revisión", icon: "ti-eye", color: "text-yellow-400", bg: "bg-yellow-400/10" },
  completado: { label: "Completado", icon: "ti-circle-check", color: "text-cl-accent", bg: "bg-cl-accent/10" },
  cancelado: { label: "Cancelado", icon: "ti-circle-x", color: "text-cool-steel/40", bg: "bg-silver/10" },
};

const DEMO_PROJECTS: Project[] = [
  { id: "1", name: "Clientum v2", icon: "ti-rocket", color: "bg-cl-accent", description: "Nuevo dashboard con módulos ERP y CRM", issues: 47, completed: 23, members: 3, status: "activo" },
  { id: "2", name: "App Mobile", icon: "ti-device-mobile", color: "bg-blue-500", description: "Aplicación React Native para clientes PyMEs", issues: 28, completed: 5, members: 2, status: "activo" },
  { id: "3", name: "Integración Stripe", icon: "ti-credit-card", color: "bg-purple-500", description: "Pagos internacionales con Stripe", issues: 12, completed: 12, members: 1, status: "completado" },
  { id: "4", name: "Rediseño Landing", icon: "ti-palette", color: "bg-orange-500", description: "Nueva landing page con casos de uso", issues: 8, completed: 2, members: 2, status: "activo" },
];

const DEMO_ISSUES: Issue[] = [
  { id: "1", code: "CLT-47", title: "Implementar CRM con pipeline Kanban", description: "Crear módulo CRM con vista de pipeline drag-and-drop", status: "en_progreso", priority: "urgente", assignee: "MA", assigneeColor: "bg-blue-500", project: "1", sprint: "Sprint 3", labels: ["feature", "frontend"], dueDate: "2026-06-20", createdAt: "Hace 3 días" },
  { id: "2", code: "CLT-46", title: "Módulo de facturación electrónica", description: "Integrar AFIP para facturación electrónica argentina", status: "en_revision", priority: "alta", assignee: "CB", assigneeColor: "bg-purple-500", project: "1", sprint: "Sprint 3", labels: ["feature", "backend"], dueDate: "2026-06-25", createdAt: "Hace 5 días" },
  { id: "3", code: "CLT-45", title: "Fix: Chat no carga historial en mobile", description: "En iOS Safari el historial de chat no hace scroll correctamente", status: "por_hacer", priority: "alta", assignee: "MA", assigneeColor: "bg-blue-500", project: "1", sprint: "Sprint 3", labels: ["bug"], dueDate: "2026-06-18", createdAt: "Hace 1 día" },
  { id: "4", code: "CLT-44", title: "Automatizaciones: editor de condiciones avanzado", description: "Agregar soporte para condiciones con AND/OR anidados", status: "backlog", priority: "media", assignee: "AR", assigneeColor: "bg-orange-500", project: "1", labels: ["feature", "frontend"], createdAt: "Hace 1 semana" },
  { id: "5", code: "CLT-43", title: "Dashboard: métricas de conversión por canal", description: "Agregar gráfico de conversión WhatsApp vs Web vs Email", status: "completado", priority: "media", assignee: "CB", assigneeColor: "bg-purple-500", project: "1", sprint: "Sprint 2", labels: ["analytics"], createdAt: "Hace 2 semanas" },
  { id: "6", code: "CLT-42", title: "Exportar tabla de contactos a CSV", description: "Botón de exportación en la tabla de contactos del CRM", status: "completado", priority: "baja", assignee: "MA", assigneeColor: "bg-blue-500", project: "1", sprint: "Sprint 2", labels: ["feature"], createdAt: "Hace 2 semanas" },
  { id: "7", code: "APP-15", title: "Pantalla de login con Face ID", description: "Implementar autenticación biométrica en app mobile", status: "en_progreso", priority: "alta", assignee: "AR", assigneeColor: "bg-orange-500", project: "2", sprint: "Sprint 1", labels: ["feature", "auth"], dueDate: "2026-06-30", createdAt: "Hace 4 días" },
  { id: "8", code: "APP-14", title: "Push notifications para pedidos", description: "Notificaciones en tiempo real cuando hay nuevos pedidos", status: "por_hacer", priority: "urgente", assignee: "CB", assigneeColor: "bg-purple-500", project: "2", sprint: "Sprint 1", labels: ["feature"], dueDate: "2026-07-05", createdAt: "Hace 2 días" },
];

const LABEL_COLORS: Record<string, string> = {
  feature: "bg-blue-500/20 text-blue-300",
  bug: "bg-red-500/20 text-red-300",
  backend: "bg-purple-500/20 text-purple-300",
  frontend: "bg-teal-500/20 text-teal-300",
  analytics: "bg-yellow-500/20 text-yellow-300",
  auth: "bg-orange-500/20 text-orange-300",
};

type ViewMode = "lista" | "kanban" | "proyectos";

export default function ProjectsPage() {
  const [view, setView] = useState<ViewMode>("lista");
  const [selectedProject, setSelectedProject] = useState<string | null>("1");
  const [search, setSearch] = useState("");
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  const filteredIssues = DEMO_ISSUES.filter(i =>
    (!selectedProject || i.project === selectedProject) &&
    (!search || i.title.toLowerCase().includes(search.toLowerCase()) || i.code.toLowerCase().includes(search.toLowerCase()))
  );

  const activeProject = DEMO_PROJECTS.find(p => p.id === selectedProject);

  return (
    <div className="flex h-full">
      <div className="w-56 bg-navy-2 border-r border-silver/15 flex flex-col py-4 flex-shrink-0">
        <div className="px-4 mb-3 flex items-center justify-between">
          <p className="text-xs font-bold text-cool-steel/55 uppercase tracking-wider">Proyectos</p>
          <button className="text-cool-steel/55 hover:text-cl-accent transition-all"><i className="ti ti-plus text-sm" /></button>
        </div>
        <div className="px-3 space-y-0.5 flex-1 overflow-y-auto">
          <button onClick={() => setSelectedProject(null)} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-all ${!selectedProject ? "bg-cl-accent/10 text-cl-accent" : "text-cool-steel hover:text-white hover:bg-silver/10"}`}>
            <i className="ti ti-layout-grid text-base" />
            <span className="font-semibold">Todos</span>
            <span className="ml-auto text-[10px] text-cool-steel/40">{DEMO_ISSUES.length}</span>
          </button>
          {DEMO_PROJECTS.map(p => (
            <button key={p.id} onClick={() => setSelectedProject(p.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-all ${selectedProject === p.id ? "bg-cl-accent/10 text-cl-accent" : "text-cool-steel hover:text-white hover:bg-silver/10"}`}>
              <div className={`w-5 h-5 ${p.color} rounded flex items-center justify-center flex-shrink-0`}>
                <i className={`ti ${p.icon} text-xs text-white`} />
              </div>
              <span className="font-semibold truncate">{p.name}</span>
              <span className="ml-auto text-[10px] text-cool-steel/40">{p.issues}</span>
            </button>
          ))}
        </div>
        <div className="px-3 pt-3 border-t border-silver/15 mt-3">
          <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-cool-steel/55 hover:text-cl-accent hover:bg-cl-accent/5 rounded-lg transition-all">
            <i className="ti ti-plus" /> Nuevo proyecto
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-silver/15 px-6 py-3 flex items-center gap-3 bg-navy-2 flex-shrink-0">
          {activeProject && (
            <div className="flex items-center gap-2 mr-2">
              <div className={`w-6 h-6 ${activeProject.color} rounded flex items-center justify-center`}>
                <i className={`ti ${activeProject.icon} text-xs text-white`} />
              </div>
              <span className="font-bold text-white text-sm">{activeProject.name}</span>
            </div>
          )}
          {(["lista", "kanban", "proyectos"] as ViewMode[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all capitalize ${view === v ? "bg-cl-accent/10 text-cl-accent" : "text-cool-steel hover:text-white"}`}>
              <i className={`ti ${v === "lista" ? "ti-list" : v === "kanban" ? "ti-layout-kanban" : "ti-folder"} text-sm`} />
              {v === "lista" ? "Lista" : v === "kanban" ? "Kanban" : "Proyectos"}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-2 bg-silver/10 border border-silver/20 rounded-lg px-3 py-1.5">
              <i className="ti ti-search text-xs text-cool-steel/55" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar issue..." className="bg-transparent text-xs text-white outline-none w-32 placeholder-white/30" />
            </div>
            <button className="flex items-center gap-1.5 text-sm bg-cl-accent text-navy font-bold px-3 py-1.5 rounded-lg hover:bg-cl-accent/90 transition-all">
              <i className="ti ti-plus text-sm" /> Issue
            </button>
          </div>
        </div>

        {view === "proyectos" && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DEMO_PROJECTS.map(p => (
                <div key={p.id} onClick={() => { setSelectedProject(p.id); setView("lista"); }}
                  className="bg-navy-2 border border-silver/20 hover:border-cl-accent/30 rounded-xl p-5 cursor-pointer transition-all group">
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`w-10 h-10 ${p.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <i className={`ti ${p.icon} text-xl text-white`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white">{p.name}</h3>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${p.status === "activo" ? "bg-cl-accent/20 text-cl-accent" : p.status === "completado" ? "bg-silver/15 text-cool-steel" : "bg-yellow-400/20 text-yellow-400"}`}>
                          {p.status}
                        </span>
                      </div>
                      <p className="text-xs text-cool-steel">{p.description}</p>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-cool-steel/55 mb-1.5">
                      <span>Progreso</span>
                      <span>{Math.round(p.completed / p.issues * 100)}%</span>
                    </div>
                    <div className="bg-silver/10 rounded-full h-1.5">
                      <div className="h-1.5 bg-cl-accent rounded-full" style={{ width: `${p.completed / p.issues * 100}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-cool-steel/55">
                    <span><i className="ti ti-checks mr-1" />{p.completed}/{p.issues} issues</span>
                    <span><i className="ti ti-users mr-1" />{p.members} miembros</span>
                  </div>
                </div>
              ))}
              <button className="border-2 border-dashed border-silver/20 hover:border-cl-accent/30 rounded-xl p-5 flex flex-col items-center justify-center gap-3 text-cool-steel/55 hover:text-cl-accent transition-all min-h-[160px]">
                <i className="ti ti-plus text-3xl" />
                <span className="text-sm font-semibold">Nuevo proyecto</span>
              </button>
            </div>
          </div>
        )}

        {view === "lista" && (
          <div className="flex-1 overflow-y-auto">
            {(["en_progreso", "por_hacer", "en_revision", "backlog", "completado"] as IssueStatus[]).map(status => {
              const issues = filteredIssues.filter(i => i.status === status);
              if (issues.length === 0) return null;
              const s = STATUSES[status];
              return (
                <div key={status}>
                  <div className="sticky top-0 bg-navy-card2 px-6 py-2 flex items-center gap-2 border-b border-silver/15 z-10">
                    <i className={`ti ${s.icon} text-sm ${s.color}`} />
                    <span className={`text-xs font-bold ${s.color}`}>{s.label}</span>
                    <span className="text-xs text-cool-steel/40">{issues.length}</span>
                  </div>
                  {issues.map(issue => (
                    <div key={issue.id} onClick={() => setSelectedIssue(issue)}
                      className="px-6 py-3 flex items-center gap-4 border-b border-silver/15 hover:bg-deep-space/10 cursor-pointer group transition-colors">
                      <i className={`ti ${STATUSES[issue.status].icon} text-base ${STATUSES[issue.status].color} flex-shrink-0`} />
                      <i className={`ti ${PRIORITIES[issue.priority].icon} text-sm ${PRIORITIES[issue.priority].color} flex-shrink-0`} />
                      <span className="text-[10px] text-cool-steel/45 font-mono flex-shrink-0 w-14">{issue.code}</span>
                      <span className="text-sm text-silver flex-1 min-w-0 truncate group-hover:text-white transition-colors">{issue.title}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {issue.labels.map(l => (
                          <span key={l} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${LABEL_COLORS[l] ?? "bg-silver/15 text-cool-steel"}`}>{l}</span>
                        ))}
                        {issue.sprint && <span className="text-[10px] text-cool-steel/40 hidden lg:block">{issue.sprint}</span>}
                        {issue.dueDate && <span className="text-[10px] text-cool-steel/45 hidden lg:flex items-center gap-1"><i className="ti ti-calendar text-xs" />{issue.dueDate}</span>}
                        <div className={`w-6 h-6 ${issue.assigneeColor} rounded-full flex items-center justify-center text-[9px] font-bold text-white`}>
                          {issue.assignee}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {view === "kanban" && (
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex gap-4 p-6 h-full" style={{ minWidth: `${5 * 240}px` }}>
              {(["por_hacer", "en_progreso", "en_revision", "completado", "backlog"] as IssueStatus[]).map(status => {
                const issues = filteredIssues.filter(i => i.status === status);
                const s = STATUSES[status];
                return (
                  <div key={status} className="flex flex-col w-56 flex-shrink-0">
                    <div className="flex items-center gap-2 mb-3">
                      <i className={`ti ${s.icon} text-sm ${s.color}`} />
                      <span className={`text-xs font-bold ${s.color}`}>{s.label}</span>
                      <span className="ml-auto w-5 h-5 rounded-full bg-silver/15 flex items-center justify-center text-[10px] text-cool-steel font-bold">{issues.length}</span>
                    </div>
                    <div className="flex-1 space-y-2 overflow-y-auto">
                      {issues.map(issue => (
                        <div key={issue.id} onClick={() => setSelectedIssue(issue)}
                          className="bg-navy-2 border border-silver/20 hover:border-cl-accent/30 rounded-xl p-3 cursor-pointer transition-all">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="text-xs font-bold text-white leading-tight">{issue.title}</p>
                            <i className={`ti ${PRIORITIES[issue.priority].icon} text-sm ${PRIORITIES[issue.priority].color} flex-shrink-0 mt-0.5`} />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-cool-steel/45 font-mono">{issue.code}</span>
                            <div className={`w-5 h-5 ${issue.assigneeColor} rounded-full flex items-center justify-center text-[9px] font-bold text-white`}>
                              {issue.assignee}
                            </div>
                          </div>
                          {issue.labels.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {issue.labels.map(l => (
                                <span key={l} className={`text-[9px] font-semibold px-1 py-0.5 rounded ${LABEL_COLORS[l] ?? "bg-silver/15 text-cool-steel"}`}>{l}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      <button className="w-full border border-dashed border-silver/20 hover:border-cl-accent/20 rounded-xl py-2 text-xs text-cool-steel/40 hover:text-cl-accent/50 transition-all">
                        + Agregar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {selectedIssue && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedIssue(null)}>
          <div className="bg-navy-2 border border-silver/20 rounded-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-mono text-cool-steel/55">{selectedIssue.code}</span>
              <button onClick={() => setSelectedIssue(null)} className="ml-auto text-cool-steel/55 hover:text-white transition-all"><i className="ti ti-x" /></button>
            </div>
            <h3 className="font-bold text-white text-lg mb-2">{selectedIssue.title}</h3>
            <p className="text-sm text-cool-steel mb-5">{selectedIssue.description}</p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { label: "Estado", value: STATUSES[selectedIssue.status].label, icon: STATUSES[selectedIssue.status].icon, color: STATUSES[selectedIssue.status].color },
                { label: "Prioridad", value: PRIORITIES[selectedIssue.priority].label, icon: PRIORITIES[selectedIssue.priority].icon, color: PRIORITIES[selectedIssue.priority].color },
              ].map(s => (
                <div key={s.label} className="bg-silver/10 rounded-xl p-3">
                  <p className="text-[10px] text-cool-steel/55 mb-1 uppercase tracking-wider">{s.label}</p>
                  <div className="flex items-center gap-1.5">
                    <i className={`ti ${s.icon} text-sm ${s.color}`} />
                    <span className={`font-semibold text-sm ${s.color}`}>{s.value}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-5">
              {selectedIssue.labels.map(l => (
                <span key={l} className={`text-xs font-semibold px-2 py-1 rounded-lg ${LABEL_COLORS[l] ?? "bg-silver/15 text-cool-steel"}`}>{l}</span>
              ))}
            </div>
            <div className="border-t border-silver/15 pt-4 flex gap-2">
              <button className="flex-1 py-2 text-sm bg-cl-accent text-navy font-bold rounded-lg hover:bg-cl-accent/90 transition-all">
                <i className="ti ti-pencil mr-1" /> Editar issue
              </button>
              <button className="py-2 px-4 text-sm text-cool-steel bg-silver/10 hover:bg-silver/15 rounded-lg transition-all">
                <i className="ti ti-player-play" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import RRHHPage from "./RRHH";

type Role = "admin" | "manager" | "operator" | "viewer" | "custom";
type MemberStatus = "activo" | "inactivo" | "invitado";
type Department = "Tecnología" | "Ventas" | "Soporte" | "Operaciones" | "Dirección";

type Member = {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: Department;
  status: MemberStatus;
  avatar: string;
  joinDate: string;
  lastActive: string;
  permissions: string[];
};

type RoleDef = {
  id: Role;
  label: string;
  description: string;
  color: string;
  bg: string;
  count: number;
  permissions: { module: string; read: boolean; write: boolean; delete: boolean }[];
};

const ROLES: RoleDef[] = [
  {
    id: "admin",
    label: "Administrador",
    description: "Acceso total al sistema — gestión de usuarios, planes y configuración",
    color: "text-red-400",
    bg: "bg-red-400/10",
    count: 1,
    permissions: [
      { module: "CRM", read: true, write: true, delete: true },
      { module: "ERP", read: true, write: true, delete: true },
      { module: "Chatbot", read: true, write: true, delete: true },
      { module: "Equipo", read: true, write: true, delete: true },
      { module: "Facturación", read: true, write: true, delete: true },
    ],
  },
  {
    id: "manager",
    label: "Gerente",
    description: "Gestión operativa completa sin acceso a configuración del sistema",
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    count: 2,
    permissions: [
      { module: "CRM", read: true, write: true, delete: false },
      { module: "ERP", read: true, write: true, delete: false },
      { module: "Chatbot", read: true, write: true, delete: false },
      { module: "Equipo", read: true, write: false, delete: false },
      { module: "Facturación", read: true, write: true, delete: false },
    ],
  },
  {
    id: "operator",
    label: "Operador",
    description: "Gestión de operaciones del día a día — pedidos, turnos y chats",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    count: 3,
    permissions: [
      { module: "CRM", read: true, write: true, delete: false },
      { module: "ERP", read: true, write: false, delete: false },
      { module: "Chatbot", read: true, write: true, delete: false },
      { module: "Equipo", read: false, write: false, delete: false },
      { module: "Facturación", read: true, write: false, delete: false },
    ],
  },
  {
    id: "viewer",
    label: "Observador",
    description: "Solo lectura — puede ver reportes y analytics sin modificar datos",
    color: "text-cool-steel",
    bg: "bg-silver/10",
    count: 1,
    permissions: [
      { module: "CRM", read: true, write: false, delete: false },
      { module: "ERP", read: true, write: false, delete: false },
      { module: "Chatbot", read: true, write: false, delete: false },
      { module: "Equipo", read: false, write: false, delete: false },
      { module: "Facturación", read: true, write: false, delete: false },
    ],
  },
];

const MEMBERS: Member[] = [
  { id: "1", name: "Martín Álvarez", email: "martin@clientum.com.ar", role: "admin", department: "Dirección", status: "activo", avatar: "MA", joinDate: "2024-01-15", lastActive: "Ahora", permissions: ["all"] },
  { id: "2", name: "Carolina Benítez", email: "carolina@clientum.com.ar", role: "manager", department: "Ventas", status: "activo", avatar: "CB", joinDate: "2024-03-20", lastActive: "Hace 2 horas", permissions: ["crm", "erp", "chatbot"] },
  { id: "3", name: "Andrés Romero", email: "andres@clientum.com.ar", role: "operator", department: "Soporte", status: "activo", avatar: "AR", joinDate: "2024-06-01", lastActive: "Hace 1 día", permissions: ["chatbot", "orders"] },
  { id: "4", name: "Valeria Torres", email: "valeria@clientum.com.ar", role: "operator", department: "Operaciones", status: "activo", avatar: "VT", joinDate: "2025-01-10", lastActive: "Hace 3 horas", permissions: ["chatbot", "appointments"] },
  { id: "5", name: "Lucas Fernández", email: "lucas@clientum.com.ar", role: "manager", department: "Tecnología", status: "activo", avatar: "LF", joinDate: "2024-08-15", lastActive: "Hace 30 min", permissions: ["crm", "erp", "chatbot", "team"] },
  { id: "6", name: "Sofía Ruiz", email: "sofia@clientum.com.ar", role: "viewer", department: "Dirección", status: "activo", avatar: "SR", joinDate: "2025-03-01", lastActive: "Hace 2 días", permissions: ["read-all"] },
  { id: "7", name: "Pablo Gómez", email: "pablo.ext@gmail.com", role: "operator", department: "Soporte", status: "invitado", avatar: "PG", joinDate: "2026-06-10", lastActive: "Nunca", permissions: ["chatbot"] },
];

const AVATAR_COLORS = ["bg-blue-500", "bg-purple-500", "bg-orange-500", "bg-teal-500", "bg-indigo-500", "bg-pink-500", "bg-yellow-600"];
const DEPT_COLORS: Record<Department, string> = {
  "Tecnología": "bg-blue-500/20 text-blue-300",
  "Ventas": "bg-cl-accent/20 text-cl-accent",
  "Soporte": "bg-purple-500/20 text-purple-300",
  "Operaciones": "bg-orange-500/20 text-orange-300",
  "Dirección": "bg-red-500/20 text-red-300",
};

type TeamTab = "miembros" | "roles" | "departamentos" | "logs" | "rrhh";

export default function TeamPage() {
  const [tab, setTab] = useState<TeamTab>("miembros");
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<RoleDef | null>(null);
  const [inviteModal, setInviteModal] = useState(false);

  const departments: Department[] = ["Tecnología", "Ventas", "Soporte", "Operaciones", "Dirección"];
  const deptCounts = departments.map(d => ({ dept: d, count: MEMBERS.filter(m => m.department === d).length }));

  const LOG_ENTRIES = [
    { ts: "2026-06-13 19:42", user: "Martín Álvarez", action: "Cambió el plan de Pablo Gómez a Starter", type: "user" },
    { ts: "2026-06-13 18:30", user: "Carolina Benítez", action: "Creó cotización COT-0047 para Clínica del Sur", type: "crm" },
    { ts: "2026-06-13 17:15", user: "Andrés Romero", action: "Tomó control de conversación WhatsApp #1234", type: "chat" },
    { ts: "2026-06-13 16:00", user: "Valeria Torres", action: "Confirmó turno para el 14/06 - María García", type: "appointment" },
    { ts: "2026-06-13 14:45", user: "Lucas Fernández", action: "Actualizó configuración del chatbot IA", type: "config" },
    { ts: "2026-06-13 13:30", user: "Martín Álvarez", action: "Invitó a Pablo Gómez como Operador", type: "user" },
    { ts: "2026-06-13 12:00", user: "Carolina Benítez", action: "Exportó tabla de contactos a CSV", type: "data" },
    { ts: "2026-06-13 10:15", user: "Sofía Ruiz", action: "Accedió al panel de Analytics", type: "access" },
  ];

  const LOG_TYPE_COLORS: Record<string, string> = {
    user: "text-purple-400 bg-purple-400/10",
    crm: "text-blue-400 bg-blue-400/10",
    chat: "text-cl-accent bg-cl-accent/10",
    appointment: "text-yellow-400 bg-yellow-400/10",
    config: "text-orange-400 bg-orange-400/10",
    data: "text-teal-400 bg-teal-400/10",
    access: "text-cool-steel bg-silver/10",
  };

  const LOG_ICONS: Record<string, string> = {
    user: "ti-user-edit", crm: "ti-chart-bar", chat: "ti-messages",
    appointment: "ti-calendar", config: "ti-settings", data: "ti-download", access: "ti-eye",
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-silver/15 px-6 py-3 flex items-center gap-2 bg-navy-2 flex-shrink-0">
        {(["miembros", "roles", "departamentos", "logs", "rrhh"] as TeamTab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${tab === t ? "bg-cl-accent/10 text-cl-accent" : "text-cool-steel hover:text-white"}`}>
            <i className={`ti ${t === "miembros" ? "ti-users" : t === "roles" ? "ti-shield" : t === "departamentos" ? "ti-building" : t === "rrhh" ? "ti-id-badge" : "ti-history"} text-base`} />
            {t === "rrhh" ? "RRHH" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {tab === "miembros" && (
            <div className="flex items-center gap-2 bg-silver/10 border border-silver/20 rounded-lg px-3 py-1.5">
              <i className="ti ti-search text-sm text-cool-steel/55" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar miembro..." className="bg-transparent text-sm text-white outline-none w-36 placeholder-white/30" />
            </div>
          )}
          <button onClick={() => setInviteModal(true)} className="flex items-center gap-2 text-sm bg-cl-accent text-navy font-bold px-4 py-1.5 rounded-lg hover:bg-cl-accent/90 transition-all">
            <i className="ti ti-user-plus" /> Invitar
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {tab === "miembros" && (
          <div className="space-y-2">
            {MEMBERS.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase())).map((m, i) => {
              const role = ROLES.find(r => r.id === m.role)!;
              return (
                <div key={m.id} className="bg-navy-2 border border-silver/20 hover:border-cl-accent/20 rounded-xl p-4 flex items-center gap-4 group transition-all">
                  <div className={`w-10 h-10 ${AVATAR_COLORS[i % AVATAR_COLORS.length]} rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0`}>
                    {m.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-bold text-white text-sm">{m.name}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${role.bg} ${role.color}`}>{role.label}</span>
                      {m.status === "invitado" && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-400/20 text-yellow-400">Invitado</span>}
                    </div>
                    <p className="text-xs text-cool-steel">{m.email}</p>
                  </div>
                  <div className="hidden md:flex items-center gap-6 text-xs text-cool-steel/55">
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${DEPT_COLORS[m.department]}`}>{m.department}</span>
                    <span className="flex items-center gap-1"><i className="ti ti-clock text-xs" />{m.lastActive}</span>
                    <span className="flex items-center gap-1"><i className="ti ti-calendar-plus text-xs" />Desde {m.joinDate.slice(0, 7)}</span>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                    <button className="w-7 h-7 bg-silver/10 hover:bg-silver/15 text-cool-steel hover:text-white rounded-lg flex items-center justify-center transition-all"><i className="ti ti-pencil text-xs" /></button>
                    <button className="w-7 h-7 bg-silver/10 hover:bg-red-400/10 text-cool-steel hover:text-red-400 rounded-lg flex items-center justify-center transition-all"><i className="ti ti-user-off text-xs" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "roles" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {ROLES.map(role => (
              <div key={role.id} onClick={() => setSelectedRole(selectedRole?.id === role.id ? null : role)}
                className={`bg-navy-2 border rounded-xl p-5 cursor-pointer transition-all ${selectedRole?.id === role.id ? "border-cl-accent" : "border-silver/20 hover:border-cl-accent/30"}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${role.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <i className={`ti ti-shield text-xl ${role.color}`} />
                    </div>
                    <div>
                      <p className="font-bold text-white">{role.label}</p>
                      <p className="text-xs text-cool-steel">{role.count} miembro{role.count !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <button className="text-xs text-cool-steel hover:text-white bg-silver/10 hover:bg-silver/15 px-2 py-1 rounded-lg transition-all">
                    <i className="ti ti-pencil mr-1" />Editar
                  </button>
                </div>
                <p className="text-xs text-cool-steel mb-4">{role.description}</p>
                {selectedRole?.id === role.id && (
                  <div className="border-t border-silver/15 pt-4">
                    <p className="text-xs font-bold text-cool-steel/55 uppercase tracking-wider mb-3">Permisos por módulo</p>
                    <div className="space-y-2">
                      {role.permissions.map(perm => (
                        <div key={perm.module} className="flex items-center gap-3">
                          <span className="text-xs text-cool-steel w-24">{perm.module}</span>
                          <div className="flex gap-1.5">
                            {[
                              { label: "Ver", val: perm.read, icon: "ti-eye" },
                              { label: "Editar", val: perm.write, icon: "ti-pencil" },
                              { label: "Eliminar", val: perm.delete, icon: "ti-trash" },
                            ].map(p => (
                              <span key={p.label} className={`text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded font-semibold ${p.val ? "bg-cl-accent/20 text-cl-accent" : "bg-silver/10 text-cool-steel/40"}`}>
                                <i className={`ti ${p.icon} text-xs`} />{p.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <button className="border-2 border-dashed border-silver/20 hover:border-cl-accent/30 rounded-xl p-5 flex flex-col items-center justify-center gap-3 text-cool-steel/55 hover:text-cl-accent transition-all min-h-[160px]">
              <i className="ti ti-plus text-3xl" />
              <span className="text-sm font-semibold">Nuevo rol personalizado</span>
            </button>
          </div>
        )}

        {tab === "departamentos" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
              {deptCounts.map(({ dept, count }) => (
                <div key={dept} className="bg-navy-2 border border-silver/20 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-white mb-1">{count}</p>
                  <p className="text-xs text-cool-steel mb-2">{dept}</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${DEPT_COLORS[dept as Department]}`}>{dept}</span>
                </div>
              ))}
            </div>
            {departments.map(dept => {
              const members = MEMBERS.filter(m => m.department === dept);
              if (members.length === 0) return null;
              return (
                <div key={dept} className="bg-navy-2 border border-silver/20 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${DEPT_COLORS[dept as Department]}`}>{dept}</span>
                    <span className="text-xs text-cool-steel/55">{members.length} miembro{members.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {members.map((m, i) => {
                      const role = ROLES.find(r => r.id === m.role)!;
                      return (
                        <div key={m.id} className="flex items-center gap-2 bg-silver/10 rounded-lg px-3 py-2">
                          <div className={`w-7 h-7 ${AVATAR_COLORS[MEMBERS.indexOf(m) % AVATAR_COLORS.length]} rounded-full flex items-center justify-center text-xs font-bold text-white`}>
                            {m.avatar}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-white">{m.name.split(" ")[0]}</p>
                            <p className={`text-[10px] ${role.color}`}>{role.label}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "logs" && (
          <div className="max-w-3xl mx-auto space-y-2">
            <div className="flex items-center gap-3 mb-4">
              <p className="text-sm text-cool-steel">Registro de actividad del equipo en las últimas 24 horas</p>
              <button className="ml-auto flex items-center gap-1.5 text-xs text-cool-steel hover:text-white bg-silver/10 hover:bg-silver/15 px-3 py-1.5 rounded-lg transition-all">
                <i className="ti ti-download" />Exportar CSV
              </button>
            </div>
            {LOG_ENTRIES.map((log, i) => (
              <div key={i} className="bg-navy-2 border border-silver/15 rounded-xl p-4 flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${LOG_TYPE_COLORS[log.type]}`}>
                  <i className={`ti ${LOG_ICONS[log.type]} text-sm`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-silver">{log.action}</p>
                  <p className="text-xs text-cool-steel/70 mt-0.5 flex items-center gap-2">
                    <span className="font-semibold">{log.user}</span>
                    <span>·</span>
                    <span>{log.ts}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "rrhh" && (
          <div className="flex-1 -m-6 overflow-auto">
            <RRHHPage />
          </div>
        )}
      </div>

      {inviteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setInviteModal(false)}>
          <div className="bg-navy-2 border border-silver/20 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-white text-lg mb-4">Invitar miembro</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-cool-steel mb-1.5 block">Email</label>
                <input className="w-full bg-silver/10 border border-silver/20 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cl-accent placeholder-white/20" placeholder="correo@empresa.com" />
              </div>
              <div>
                <label className="text-xs font-semibold text-cool-steel mb-1.5 block">Rol</label>
                <select className="w-full bg-silver/10 border border-silver/20 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cl-accent">
                  {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-cool-steel mb-1.5 block">Departamento</label>
                <select className="w-full bg-silver/10 border border-silver/20 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cl-accent">
                  {["Tecnología", "Ventas", "Soporte", "Operaciones", "Dirección"].map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setInviteModal(false)} className="flex-1 py-2 text-sm text-cool-steel bg-silver/10 hover:bg-silver/15 rounded-lg transition-all">Cancelar</button>
              <button onClick={() => setInviteModal(false)} className="flex-1 py-2 text-sm bg-cl-accent text-navy font-bold rounded-lg hover:bg-cl-accent/90 transition-all">
                <i className="ti ti-send mr-1" />Enviar invitación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

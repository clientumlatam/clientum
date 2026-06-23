import { useState } from "react";

type HRTab = "empleados" | "liquidaciones" | "ausencias" | "organigrama";
type EmpStatus = "activo" | "inactivo" | "licencia";
type ContractType = "efectivo" | "plazo_fijo" | "pasantia" | "freelance";
type AbsenceType = "vacaciones" | "enfermedad" | "licencia" | "personal" | "maternidad";
type AbsenceStatus = "pendiente" | "aprobada" | "rechazada";

type Employee = {
  id: string;
  name: string;
  avatar: string;
  avatarColor: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  status: EmpStatus;
  contract: ContractType;
  startDate: string;
  salary: number;
  manager?: string;
  location: string;
};

type PayrollEntry = {
  id: string;
  period: string;
  employee: string;
  avatar: string;
  avatarColor: string;
  grossSalary: number;
  basico: number;
  adicionales: number;
  bonos: number;
  jubilacion: number;
  obraSocial: number;
  ganancias: number;
  otrosDesc: number;
  netSalary: number;
  status: "borrador" | "procesada" | "pagada";
};

type AbsenceRequest = {
  id: string;
  employee: string;
  avatar: string;
  avatarColor: string;
  type: AbsenceType;
  from: string;
  to: string;
  days: number;
  reason: string;
  status: AbsenceStatus;
  requestedAt: string;
};

const DEPT_COLORS: Record<string, string> = {
  "Dirección":    "bg-red-500/20 text-red-300",
  "Tecnología":   "bg-blue-500/20 text-blue-300",
  "Ventas":       "bg-cl-accent/20 text-cl-accent",
  "Soporte":      "bg-purple-500/20 text-purple-300",
  "Operaciones":  "bg-orange-500/20 text-orange-300",
  "Administración":"bg-yellow-500/20 text-yellow-300",
};

const CONTRACT_LABELS: Record<ContractType, { label: string; color: string }> = {
  efectivo:   { label: "Efectivo",    color: "bg-cl-accent/20 text-cl-accent" },
  plazo_fijo: { label: "Plazo fijo",  color: "bg-blue-400/20 text-blue-400" },
  pasantia:   { label: "Pasantía",    color: "bg-purple-400/20 text-purple-400" },
  freelance:  { label: "Freelance",   color: "bg-orange-400/20 text-orange-400" },
};

const ABSENCE_TYPES: Record<AbsenceType, { label: string; icon: string; color: string }> = {
  vacaciones:   { label: "Vacaciones",       icon: "ti-beach",        color: "text-cl-accent bg-cl-accent/10" },
  enfermedad:   { label: "Enfermedad",       icon: "ti-activity",     color: "text-red-400 bg-red-400/10" },
  licencia:     { label: "Licencia",         icon: "ti-calendar-off", color: "text-yellow-400 bg-yellow-400/10" },
  personal:     { label: "Personal",         icon: "ti-user",         color: "text-blue-400 bg-blue-400/10" },
  maternidad:   { label: "Maternidad/Pat.",  icon: "ti-baby-carriage", color: "text-pink-400 bg-pink-400/10" },
};

const ABSENCE_STATUS: Record<AbsenceStatus, { label: string; color: string }> = {
  pendiente: { label: "Pendiente",  color: "bg-yellow-400/20 text-yellow-400" },
  aprobada:  { label: "Aprobada",   color: "bg-cl-accent/20 text-cl-accent" },
  rechazada: { label: "Rechazada",  color: "bg-red-400/20 text-red-400" },
};

const EMPLOYEES: Employee[] = [
  { id:"1", name:"Martín Álvarez",    avatar:"MA", avatarColor:"bg-teal-500",   role:"Director General",        department:"Dirección",     email:"martin@clientum.com.ar",    phone:"11-4521-6789", status:"activo",  contract:"efectivo",   startDate:"2024-01-15", salary:650000,  location:"CABA" },
  { id:"2", name:"Carolina Benítez",  avatar:"CB", avatarColor:"bg-purple-500", role:"Gerente Comercial",       department:"Ventas",        email:"carolina@clientum.com.ar",  phone:"11-6234-8901", status:"activo",  contract:"efectivo",   startDate:"2024-03-20", salary:480000, manager:"Martín Álvarez", location:"CABA" },
  { id:"3", name:"Andrés Romero",     avatar:"AR", avatarColor:"bg-orange-500", role:"Agente de Soporte",       department:"Soporte",       email:"andres@clientum.com.ar",    phone:"351-234-5678", status:"activo",  contract:"efectivo",   startDate:"2024-06-01", salary:320000, manager:"Carolina Benítez", location:"Córdoba" },
  { id:"4", name:"Valeria Torres",    avatar:"VT", avatarColor:"bg-pink-500",   role:"Coordinadora de Ops.",    department:"Operaciones",   email:"valeria@clientum.com.ar",   phone:"2994-789012",  status:"activo",  contract:"efectivo",   startDate:"2025-01-10", salary:360000, manager:"Martín Álvarez", location:"Bariloche" },
  { id:"5", name:"Lucas Fernández",   avatar:"LF", avatarColor:"bg-blue-500",   role:"Desarrollador Full Stack",department:"Tecnología",    email:"lucas@clientum.com.ar",     phone:"11-5678-9012", status:"activo",  contract:"efectivo",   startDate:"2024-08-15", salary:520000, manager:"Martín Álvarez", location:"CABA" },
  { id:"6", name:"Sofía Ruiz",        avatar:"SR", avatarColor:"bg-indigo-500", role:"Analista Contable",       department:"Administración",email:"sofia@clientum.com.ar",     phone:"11-2345-6789", status:"activo",  contract:"efectivo",   startDate:"2025-03-01", salary:395000, manager:"Martín Álvarez", location:"CABA" },
  { id:"7", name:"Pablo Gómez",       avatar:"PG", avatarColor:"bg-yellow-600", role:"Agente de Soporte Jr.",   department:"Soporte",       email:"pablo.ext@gmail.com",       phone:"2984-123456",  status:"activo",  contract:"plazo_fijo", startDate:"2026-06-10", salary:220000, manager:"Andrés Romero", location:"Neuquén" },
  { id:"8", name:"Daniela Morales",   avatar:"DM", avatarColor:"bg-rose-500",   role:"Ejecutiva de Ventas",     department:"Ventas",        email:"daniela@clientum.com.ar",   phone:"11-9012-3456", status:"licencia",contract:"efectivo",   startDate:"2025-06-01", salary:410000, manager:"Carolina Benítez", location:"CABA" },
];

const PAYROLL: PayrollEntry[] = [
  { id:"1", period:"Junio 2026", employee:"Martín Álvarez",   avatar:"MA", avatarColor:"bg-teal-500",   grossSalary:812500, basico:650000, adicionales:97500, bonos:65000, jubilacion:88563, obraSocial:16250, ganancias:105625, otrosDesc:0,     netSalary:602063, status:"pagada" },
  { id:"2", period:"Junio 2026", employee:"Carolina Benítez", avatar:"CB", avatarColor:"bg-purple-500", grossSalary:600000, basico:480000, adicionales:72000, bonos:48000, jubilacion:65400, obraSocial:12000, ganancias:54000,  otrosDesc:0,     netSalary:468600, status:"pagada" },
  { id:"3", period:"Junio 2026", employee:"Lucas Fernández",  avatar:"LF", avatarColor:"bg-blue-500",   grossSalary:650000, basico:520000, adicionales:78000, bonos:52000, jubilacion:70850, obraSocial:13000, ganancias:58500,  otrosDesc:0,     netSalary:507650, status:"procesada" },
  { id:"4", period:"Junio 2026", employee:"Sofía Ruiz",       avatar:"SR", avatarColor:"bg-indigo-500", grossSalary:493750, basico:395000, adicionales:59250, bonos:39500, jubilacion:53799, obraSocial:9875,  ganancias:29625,  otrosDesc:0,     netSalary:400451, status:"procesada" },
  { id:"5", period:"Junio 2026", employee:"Valeria Torres",   avatar:"VT", avatarColor:"bg-pink-500",   grossSalary:450000, basico:360000, adicionales:54000, bonos:36000, jubilacion:49050, obraSocial:9000,  ganancias:27000,  otrosDesc:0,     netSalary:364950, status:"borrador" },
  { id:"6", period:"Junio 2026", employee:"Andrés Romero",    avatar:"AR", avatarColor:"bg-orange-500", grossSalary:400000, basico:320000, adicionales:48000, bonos:32000, jubilacion:43600, obraSocial:8000,  ganancias:0,      otrosDesc:0,     netSalary:348400, status:"borrador" },
  { id:"7", period:"Junio 2026", employee:"Pablo Gómez",      avatar:"PG", avatarColor:"bg-yellow-600", grossSalary:275000, basico:220000, adicionales:33000, bonos:22000, jubilacion:29975, obraSocial:5500,  ganancias:0,      otrosDesc:0,     netSalary:239525, status:"borrador" },
];

const ABSENCES: AbsenceRequest[] = [
  { id:"1", employee:"Lucas Fernández",  avatar:"LF", avatarColor:"bg-blue-500",   type:"vacaciones", from:"2026-07-07", to:"2026-07-18", days:10, reason:"Vacaciones de invierno", status:"aprobada",  requestedAt:"2026-06-01" },
  { id:"2", employee:"Andrés Romero",    avatar:"AR", avatarColor:"bg-orange-500", type:"enfermedad", from:"2026-06-12", to:"2026-06-13", days:2,  reason:"Certificado médico adjunto", status:"aprobada", requestedAt:"2026-06-12" },
  { id:"3", employee:"Daniela Morales",  avatar:"DM", avatarColor:"bg-rose-500",   type:"maternidad", from:"2026-06-01", to:"2026-08-26", days:90, reason:"Licencia por maternidad", status:"aprobada",  requestedAt:"2026-05-20" },
  { id:"4", employee:"Valeria Torres",   avatar:"VT", avatarColor:"bg-pink-500",   type:"personal",   from:"2026-06-20", to:"2026-06-20", days:1,  reason:"Trámite personal", status:"pendiente", requestedAt:"2026-06-13" },
  { id:"5", employee:"Pablo Gómez",      avatar:"PG", avatarColor:"bg-yellow-600", type:"vacaciones", from:"2026-07-14", to:"2026-07-18", days:5,  reason:"Vacaciones de invierno", status:"pendiente", requestedAt:"2026-06-13" },
  { id:"6", employee:"Carolina Benítez", avatar:"CB", avatarColor:"bg-purple-500", type:"licencia",   from:"2026-06-25", to:"2026-06-26", days:2,  reason:"Conferencia de ventas anual", status:"aprobada", requestedAt:"2026-06-05" },
];

const fmt = (n: number) => `$${n.toLocaleString("es-AR")}`;

const STATUS_EMP: Record<EmpStatus, { label: string; color: string; dot: string }> = {
  activo:   { label: "Activo",    color: "text-cl-accent",  dot: "bg-cl-accent" },
  inactivo: { label: "Inactivo",  color: "text-cool-steel/55",   dot: "bg-white/20" },
  licencia: { label: "Licencia",  color: "text-yellow-400", dot: "bg-yellow-400" },
};

type OrgNode = Employee & { reports: OrgNode[] };

export default function RRHHPage() {
  const [tab, setTab] = useState<HRTab>("empleados");
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("Todos");
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [expandedPayroll, setExpandedPayroll] = useState<string | null>(null);

  const departments = ["Todos", ...Array.from(new Set(EMPLOYEES.map(e => e.department)))];

  const filteredEmps = EMPLOYEES.filter(e =>
    (deptFilter === "Todos" || e.department === deptFilter) &&
    (!search || e.name.toLowerCase().includes(search.toLowerCase()) || e.role.toLowerCase().includes(search.toLowerCase()))
  );

  const totalBruto = PAYROLL.reduce((s, p) => s + p.grossSalary, 0);
  const totalNeto  = PAYROLL.reduce((s, p) => s + p.netSalary, 0);
  const totalCargas = PAYROLL.reduce((s, p) => s + p.jubilacion + p.obraSocial, 0);

  const tabs: { id: HRTab; label: string; icon: string }[] = [
    { id: "empleados",    label: "Empleados",     icon: "ti-users" },
    { id: "liquidaciones",label: "Liquidaciones", icon: "ti-cash" },
    { id: "ausencias",    label: "Ausencias",     icon: "ti-calendar-off" },
    { id: "organigrama",  label: "Organigrama",   icon: "ti-hierarchy" },
  ];

  /* ── Organigrama simple ── */
  const ceo = EMPLOYEES.find(e => !e.manager)!;
  const direct = EMPLOYEES.filter(e => e.manager === ceo.name);
  const buildReports = (mgr: Employee): OrgNode => ({
    ...mgr,
    reports: EMPLOYEES.filter(e => e.manager === mgr.name).map(buildReports),
  });
  const orgRoot = buildReports(ceo);

  return (
    <div className="flex flex-col h-full">
      {/* ── tabs ── */}
      <div className="border-b border-silver/15 px-6 py-3 flex items-center gap-2 bg-navy-2 flex-shrink-0">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${tab === t.id ? "bg-cl-accent/10 text-cl-accent" : "text-cool-steel hover:text-white"}`}>
            <i className={`ti ${t.icon} text-base`} />{t.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {tab === "empleados" && (
            <>
              <div className="flex gap-1 bg-silver/10 border border-silver/20 rounded-lg p-1">
                {departments.map(d => (
                  <button key={d} onClick={() => setDeptFilter(d)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${deptFilter === d ? "bg-cl-accent/20 text-cl-accent" : "text-cool-steel hover:text-white"}`}>
                    {d}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 bg-silver/10 border border-silver/20 rounded-lg px-3 py-1.5">
                <i className="ti ti-search text-xs text-cool-steel/55" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="bg-transparent text-xs text-white outline-none w-32 placeholder-white/30" />
              </div>
            </>
          )}
          <button className="flex items-center gap-1.5 text-sm bg-cl-accent text-navy font-bold px-4 py-1.5 rounded-lg hover:bg-cl-accent/90 transition-all">
            <i className="ti ti-plus" /> {tab === "empleados" ? "Nuevo empleado" : tab === "ausencias" ? "Solicitar" : "Nuevo"}
          </button>
        </div>
      </div>

      {/* ── KPIs bar ── */}
      {tab === "empleados" && (
        <div className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-silver/15 flex-shrink-0">
          {[
            { label: "Total empleados", value: EMPLOYEES.length,                                     icon: "ti-users",         color: "text-blue-400",   bg: "bg-blue-400/10" },
            { label: "Activos",         value: EMPLOYEES.filter(e => e.status === "activo").length,  icon: "ti-circle-check",  color: "text-cl-accent",  bg: "bg-cl-accent/10" },
            { label: "En licencia",     value: EMPLOYEES.filter(e => e.status === "licencia").length,icon: "ti-calendar-off",  color: "text-yellow-400", bg: "bg-yellow-400/10" },
            { label: "Masa salarial",   value: fmt(EMPLOYEES.reduce((s,e)=>s+e.salary,0)),           icon: "ti-cash",          color: "text-purple-400", bg: "bg-purple-400/10" },
          ].map(s => (
            <div key={s.label} className="bg-navy-2 border border-silver/20 rounded-xl p-4 flex items-center gap-3">
              <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <i className={`ti ${s.icon} text-lg ${s.color}`} />
              </div>
              <div>
                <p className="text-lg font-bold text-white">{s.value}</p>
                <p className="text-[10px] text-cool-steel/55">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "liquidaciones" && (
        <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-silver/15 flex-shrink-0">
          {[
            { label: "Total bruto",      value: fmt(totalBruto),  icon: "ti-trending-up",   color: "text-blue-400",   bg: "bg-blue-400/10" },
            { label: "Cargas sociales",  value: fmt(totalCargas), icon: "ti-building-bank", color: "text-orange-400", bg: "bg-orange-400/10" },
            { label: "Total neto a pagar", value: fmt(totalNeto), icon: "ti-cash",          color: "text-cl-accent",  bg: "bg-cl-accent/10" },
          ].map(s => (
            <div key={s.label} className="bg-navy-2 border border-silver/20 rounded-xl p-4 flex items-center gap-3">
              <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <i className={`ti ${s.icon} text-lg ${s.color}`} />
              </div>
              <div>
                <p className="text-lg font-bold text-white">{s.value}</p>
                <p className="text-[10px] text-cool-steel/55">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {/* ══ EMPLEADOS ══ */}
        {tab === "empleados" && (
          <div className="divide-y divide-silver/10">
            {filteredEmps.map(emp => {
              const st = STATUS_EMP[emp.status];
              const ct = CONTRACT_LABELS[emp.contract];
              return (
                <div key={emp.id} onClick={() => setSelectedEmp(emp)}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-deep-space/10 cursor-pointer group transition-colors">
                  <div className={`w-10 h-10 ${emp.avatarColor} rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0`}>
                    {emp.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-bold text-white/90 text-sm group-hover:text-white transition-colors">{emp.name}</p>
                      <div className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      <span className={`text-[10px] font-semibold ${st.color}`}>{st.label}</span>
                    </div>
                    <p className="text-xs text-cool-steel">{emp.role}</p>
                  </div>
                  <div className="hidden md:flex items-center gap-5 text-xs text-cool-steel/55 flex-shrink-0">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${DEPT_COLORS[emp.department] ?? "bg-silver/15 text-cool-steel"}`}>{emp.department}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ct.color}`}>{ct.label}</span>
                    <span className="hidden lg:block">{emp.location}</span>
                    <span className="font-semibold text-cool-steel">{fmt(emp.salary)}<span className="text-cool-steel/45">/mes</span></span>
                    <span className="flex items-center gap-1"><i className="ti ti-calendar text-xs" />Desde {emp.startDate.slice(0,7)}</span>
                  </div>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                    <button className="w-7 h-7 bg-silver/10 hover:bg-silver/15 text-cool-steel hover:text-white rounded-lg flex items-center justify-center transition-all"><i className="ti ti-pencil text-xs" /></button>
                    <button className="w-7 h-7 bg-cl-accent/5 hover:bg-cl-accent/10 text-cl-accent/60 hover:text-cl-accent rounded-lg flex items-center justify-center transition-all"><i className="ti ti-eye text-xs" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══ LIQUIDACIONES ══ */}
        {tab === "liquidaciones" && (
          <div className="divide-y divide-silver/10">
            <div className="sticky top-0 bg-navy-2 border-b border-silver/15 z-10 grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] px-6 py-2.5">
              {["Empleado","Bruto","Cargas s.","Ganancias","Neto","Estado"].map(h => (
                <span key={h} className="text-[10px] font-bold text-cool-steel/45 uppercase tracking-wider">{h}</span>
              ))}
            </div>
            {PAYROLL.map(p => (
              <div key={p.id}>
                <div
                  onClick={() => setExpandedPayroll(expandedPayroll === p.id ? null : p.id)}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] items-center px-6 py-3.5 hover:bg-deep-space/10 cursor-pointer group transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 ${p.avatarColor} rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>{p.avatar}</div>
                    <div>
                      <p className="text-sm font-semibold text-silver group-hover:text-white transition-colors">{p.employee}</p>
                      <p className="text-[10px] text-cool-steel/55">{p.period}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-silver">{fmt(p.grossSalary)}</span>
                  <span className="text-sm text-red-400/70">{fmt(p.jubilacion + p.obraSocial)}</span>
                  <span className="text-sm text-orange-400/70">{p.ganancias > 0 ? fmt(p.ganancias) : <span className="text-cool-steel/40">—</span>}</span>
                  <span className="text-sm font-bold text-cl-accent">{fmt(p.netSalary)}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.status === "pagada" ? "bg-cl-accent/20 text-cl-accent" : p.status === "procesada" ? "bg-blue-400/20 text-blue-400" : "bg-silver/15 text-cool-steel"}`}>
                      {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                    </span>
                    <i className={`ti ${expandedPayroll === p.id ? "ti-chevron-up" : "ti-chevron-down"} text-xs text-cool-steel/40 group-hover:text-cool-steel transition-colors`} />
                  </div>
                </div>

                {expandedPayroll === p.id && (
                  <div className="px-6 pb-4 bg-deep-space/10">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                      {[
                        { label: "Básico",           val: p.basico,      color: "text-white" },
                        { label: "Adicionales",      val: p.adicionales, color: "text-blue-300" },
                        { label: "Bonos",            val: p.bonos,       color: "text-cl-accent" },
                        { label: "Jubilación (11%)", val: -p.jubilacion, color: "text-red-400" },
                        { label: "Obra social (2.5%)",val:-p.obraSocial, color: "text-red-400" },
                        { label: "Ganancias",        val: -p.ganancias,  color: "text-orange-400" },
                        { label: "Otros descuentos", val: -p.otrosDesc,  color: "text-cool-steel" },
                        { label: "NETO TOTAL",       val: p.netSalary,   color: "text-cl-accent font-bold text-base" },
                      ].map(item => (
                        <div key={item.label} className="bg-navy-2 rounded-xl p-3">
                          <p className="text-[10px] text-cool-steel/55 mb-0.5">{item.label}</p>
                          <p className={`text-sm font-semibold ${item.color}`}>
                            {item.val < 0 ? `-${fmt(-item.val)}` : item.val === 0 ? "—" : fmt(item.val)}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-3">
                      {p.status === "borrador" && (
                        <button className="text-xs bg-blue-400/20 text-blue-400 hover:bg-blue-400/30 font-bold px-3 py-1.5 rounded-lg transition-all">
                          <i className="ti ti-player-play mr-1" />Procesar
                        </button>
                      )}
                      {p.status === "procesada" && (
                        <button className="text-xs bg-cl-accent/20 text-cl-accent hover:bg-cl-accent/30 font-bold px-3 py-1.5 rounded-lg transition-all">
                          <i className="ti ti-cash mr-1" />Marcar como pagada
                        </button>
                      )}
                      <button className="text-xs bg-silver/10 text-cool-steel hover:bg-silver/15 font-semibold px-3 py-1.5 rounded-lg transition-all">
                        <i className="ti ti-download mr-1" />Recibo de sueldo PDF
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ══ AUSENCIAS ══ */}
        {tab === "ausencias" && (
          <div className="p-6 space-y-4 max-w-4xl mx-auto">
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: "Solicitudes pendientes", value: ABSENCES.filter(a=>a.status==="pendiente").length, color:"text-yellow-400", bg:"bg-yellow-400/10", icon:"ti-clock" },
                { label: "En licencia hoy",         value: ABSENCES.filter(a=>a.status==="aprobada" && a.from <= "2026-06-13" && a.to >= "2026-06-13").length, color:"text-blue-400", bg:"bg-blue-400/10", icon:"ti-calendar-off" },
                { label: "Vacaciones programadas",  value: ABSENCES.filter(a=>a.type==="vacaciones" && a.status==="aprobada").length, color:"text-cl-accent", bg:"bg-cl-accent/10", icon:"ti-beach" },
              ].map(s => (
                <div key={s.label} className="bg-navy-2 border border-silver/20 rounded-xl p-4 flex items-center gap-3">
                  <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <i className={`ti ${s.icon} text-lg ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{s.value}</p>
                    <p className="text-[10px] text-cool-steel/55">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {ABSENCES.map(abs => {
                const t = ABSENCE_TYPES[abs.type];
                const st = ABSENCE_STATUS[abs.status];
                return (
                  <div key={abs.id} className="bg-navy-2 border border-silver/20 hover:border-cl-accent/20 rounded-xl p-4 flex items-start gap-4 transition-all group">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${t.color}`}>
                      <i className={`ti ${t.icon} text-base`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-6 h-6 ${abs.avatarColor} rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0`}>{abs.avatar}</div>
                        <p className="font-bold text-white text-sm">{abs.employee}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                      </div>
                      <p className="text-xs text-cool-steel mb-1">{t.label} — {abs.reason}</p>
                      <div className="flex items-center gap-3 text-[10px] text-cool-steel/55">
                        <span className="flex items-center gap-1"><i className="ti ti-calendar text-xs" />{abs.from} → {abs.to}</span>
                        <span>{abs.days} día{abs.days !== 1 ? "s" : ""}</span>
                        <span>Solicitado el {abs.requestedAt}</span>
                      </div>
                    </div>
                    {abs.status === "pendiente" && (
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button className="px-3 py-1.5 text-xs font-bold bg-cl-accent/20 text-cl-accent hover:bg-cl-accent/30 rounded-lg transition-all">Aprobar</button>
                        <button className="px-3 py-1.5 text-xs font-bold bg-red-400/10 text-red-400 hover:bg-red-400/20 rounded-lg transition-all">Rechazar</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ ORGANIGRAMA ══ */}
        {tab === "organigrama" && (
          <div className="p-6 overflow-x-auto">
            <div className="flex flex-col items-center gap-0 min-w-max mx-auto">
              <OrgCard emp={orgRoot} level={0} />
              {orgRoot.reports.length > 0 && (
                <>
                  <div className="w-px h-8 bg-silver/15" />
                  <div className="flex items-start gap-8 relative">
                    {orgRoot.reports.length > 1 && (
                      <div
                        className="absolute top-0 left-0 right-0 h-px bg-silver/15"
                        style={{ left: `calc(50% - ${(orgRoot.reports.length - 1) * 50}%)`, right: `calc(50% - ${(orgRoot.reports.length - 1) * 50}%)` }}
                      />
                    )}
                    {orgRoot.reports.map(r => (
                      <div key={r.id} className="flex flex-col items-center gap-0">
                        <div className="w-px h-6 bg-silver/15" />
                        <OrgCard emp={r} level={1} />
                        {r.reports.length > 0 && (
                          <>
                            <div className="w-px h-6 bg-silver/15" />
                            <div className="flex items-start gap-6">
                              {r.reports.map(sub => (
                                <div key={sub.id} className="flex flex-col items-center gap-0">
                                  <div className="w-px h-6 bg-silver/15" />
                                  <OrgCard emp={sub} level={2} />
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Modal detalle empleado ── */}
      {selectedEmp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedEmp(null)}>
          <div className="bg-navy-2 border border-silver/20 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-5">
              <div className={`w-14 h-14 ${selectedEmp.avatarColor} rounded-full flex items-center justify-center text-xl font-bold text-white flex-shrink-0`}>
                {selectedEmp.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white text-lg">{selectedEmp.name}</h3>
                <p className="text-sm text-cool-steel">{selectedEmp.role}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${STATUS_EMP[selectedEmp.status].dot}`} />
                  <span className={`text-xs ${STATUS_EMP[selectedEmp.status].color}`}>{STATUS_EMP[selectedEmp.status].label}</span>
                </div>
              </div>
              <button onClick={() => setSelectedEmp(null)} className="text-cool-steel/55 hover:text-white transition-all flex-shrink-0"><i className="ti ti-x" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { label: "Departamento",  value: selectedEmp.department },
                { label: "Contrato",      value: CONTRACT_LABELS[selectedEmp.contract].label },
                { label: "Salario",       value: fmt(selectedEmp.salary) + "/mes" },
                { label: "Inicio",        value: selectedEmp.startDate },
                { label: "Ubicación",     value: selectedEmp.location },
                { label: "Reporta a",     value: selectedEmp.manager ?? "—" },
              ].map(s => (
                <div key={s.label} className="bg-silver/10 rounded-xl p-3">
                  <p className="text-[10px] text-cool-steel/55 mb-0.5 uppercase tracking-wider">{s.label}</p>
                  <p className="font-semibold text-white text-sm">{s.value}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2 mb-5">
              <div className="flex items-center gap-2 text-xs text-cool-steel"><i className="ti ti-mail text-sm" />{selectedEmp.email}</div>
              <div className="flex items-center gap-2 text-xs text-cool-steel"><i className="ti ti-phone text-sm" />{selectedEmp.phone}</div>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 py-2 text-sm bg-cl-accent text-navy font-bold rounded-lg hover:bg-cl-accent/90 transition-all"><i className="ti ti-pencil mr-1" />Editar legajo</button>
              <button className="py-2 px-4 text-sm bg-silver/10 hover:bg-silver/15 text-cool-steel rounded-lg transition-all"><i className="ti ti-cash" /></button>
              <button className="py-2 px-4 text-sm bg-silver/10 hover:bg-silver/15 text-cool-steel rounded-lg transition-all"><i className="ti ti-calendar-off" /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type OrgNodeWithReports = Employee & { reports: (Employee & { reports: (Employee & { reports: never[] })[] })[] };

function OrgCard({ emp, level }: { emp: OrgNodeWithReports | Employee & { reports: any[] }; level: number }) {
  const st = STATUS_EMP[(emp as Employee).status];
  const sizes = ["w-44", "w-40", "w-36"];
  return (
    <div className={`${sizes[level] ?? "w-36"} bg-navy-2 border border-silver/20 hover:border-cl-accent/30 rounded-xl p-3 flex flex-col items-center gap-2 transition-all cursor-default`}>
      <div className={`w-10 h-10 ${(emp as Employee).avatarColor} rounded-full flex items-center justify-center text-sm font-bold text-white`}>
        {(emp as Employee).avatar}
      </div>
      <div className="text-center">
        <p className="text-xs font-bold text-white leading-tight">{emp.name}</p>
        <p className="text-[10px] text-cool-steel mt-0.5 leading-tight">{(emp as Employee).role}</p>
        <div className="flex items-center justify-center gap-1 mt-1">
          <div className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
          <span className={`text-[9px] ${st.color}`}>{st.label}</span>
        </div>
      </div>
    </div>
  );
}

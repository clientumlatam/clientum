import { useState } from "react";

type ColumnType = "text" | "number" | "email" | "phone" | "select" | "date" | "boolean" | "url";

type Column = {
  id: string;
  name: string;
  type: ColumnType;
  width?: number;
};

type Row = Record<string, string | number | boolean>;

type Table = {
  id: string;
  name: string;
  icon: string;
  color: string;
  columns: Column[];
  rows: Row[];
  description: string;
};

const COLUMN_TYPE_ICONS: Record<ColumnType, string> = {
  text: "ti-letter-t",
  number: "ti-hash",
  email: "ti-mail",
  phone: "ti-phone",
  select: "ti-list",
  date: "ti-calendar",
  boolean: "ti-toggle-left",
  url: "ti-link",
};

const DEMO_TABLES: Table[] = [
  {
    id: "1",
    name: "Clientes",
    icon: "ti-users",
    color: "text-blue-400",
    description: "Base de datos de clientes",
    columns: [
      { id: "c1", name: "Nombre", type: "text" },
      { id: "c2", name: "Email", type: "email" },
      { id: "c3", name: "Teléfono", type: "phone" },
      { id: "c4", name: "Ciudad", type: "select" },
      { id: "c5", name: "Última compra", type: "date" },
      { id: "c6", name: "Total gastado", type: "number" },
      { id: "c7", name: "Activo", type: "boolean" },
    ],
    rows: [
      { c1: "María García", c2: "maria@gmail.com", c3: "2984-123456", c4: "Buenos Aires", c5: "2026-06-10", c6: 145000, c7: true },
      { c1: "Carlos López", c2: "carlos@hotmail.com", c3: "11-4567-8901", c4: "Córdoba", c5: "2026-05-28", c6: 89000, c7: true },
      { c1: "Ana Rodríguez", c2: "ana.rod@gmail.com", c3: "351-234-5678", c4: "Rosario", c5: "2026-06-01", c6: 230000, c7: false },
      { c1: "Diego Fernández", c2: "diego.f@outlook.com", c3: "2994-789012", c4: "Bariloche", c5: "2026-06-08", c6: 67000, c7: true },
      { c1: "Laura Martínez", c2: "laura.m@gmail.com", c3: "11-2345-6789", c4: "Buenos Aires", c5: "2026-05-15", c6: 312000, c7: true },
    ],
  },
  {
    id: "2",
    name: "Inventario",
    icon: "ti-box",
    color: "text-orange-400",
    description: "Control de stock de productos",
    columns: [
      { id: "c1", name: "Producto", type: "text" },
      { id: "c2", name: "SKU", type: "text" },
      { id: "c3", name: "Categoría", type: "select" },
      { id: "c4", name: "Precio", type: "number" },
      { id: "c5", name: "Stock", type: "number" },
      { id: "c6", name: "Disponible", type: "boolean" },
    ],
    rows: [
      { c1: "Camiseta básica M", c2: "CAM-001-M", c3: "Ropa", c4: 8500, c5: 45, c6: true },
      { c1: "Camiseta básica L", c2: "CAM-001-L", c3: "Ropa", c4: 8500, c5: 3, c6: true },
      { c1: "Pantalón jean 32", c2: "PAN-002-32", c3: "Ropa", c4: 22000, c5: 0, c6: false },
      { c1: "Zapatillas 42", c2: "ZAP-010-42", c3: "Calzado", c4: 45000, c5: 12, c6: true },
    ],
  },
  {
    id: "3",
    name: "Proyectos",
    icon: "ti-layout-kanban",
    color: "text-purple-400",
    description: "Seguimiento de proyectos activos",
    columns: [
      { id: "c1", name: "Proyecto", type: "text" },
      { id: "c2", name: "Cliente", type: "text" },
      { id: "c3", name: "Estado", type: "select" },
      { id: "c4", name: "Inicio", type: "date" },
      { id: "c5", name: "Vencimiento", type: "date" },
      { id: "c6", name: "Presupuesto", type: "number" },
    ],
    rows: [
      { c1: "Rediseño web", c2: "García & Co", c3: "En progreso", c4: "2026-05-01", c5: "2026-07-01", c6: 150000 },
      { c1: "App mobile", c2: "TechStart SA", c3: "En revisión", c4: "2026-04-15", c5: "2026-06-30", c6: 350000 },
      { c1: "Campaña social", c2: "Moda Libre", c3: "Completado", c4: "2026-03-01", c5: "2026-05-31", c6: 80000 },
    ],
  },
];

const SELECT_COLORS: Record<string, string> = {
  "En progreso": "bg-blue-500/20 text-blue-400",
  "En revisión": "bg-yellow-500/20 text-yellow-400",
  "Completado": "bg-cl-accent/20 text-cl-accent",
  "Buenos Aires": "bg-purple-500/20 text-purple-300",
  Córdoba: "bg-orange-500/20 text-orange-300",
  Rosario: "bg-red-500/20 text-red-300",
  Bariloche: "bg-teal-500/20 text-teal-300",
  Ropa: "bg-pink-500/20 text-pink-300",
  Calzado: "bg-indigo-500/20 text-indigo-300",
};

function CellValue({ col, value }: { col: Column; value: string | number | boolean }) {
  if (col.type === "boolean") {
    return (
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${value ? "bg-cl-accent/20 text-cl-accent" : "bg-silver/10 text-cool-steel/55"}`}>
        {value ? "Sí" : "No"}
      </span>
    );
  }
  if (col.type === "number") {
    const n = Number(value);
    if (col.name.toLowerCase().includes("precio") || col.name.toLowerCase().includes("total") || col.name.toLowerCase().includes("presupuesto") || col.name.toLowerCase().includes("gastado")) {
      return <span className="text-cl-accent font-semibold">${n.toLocaleString("es-AR")}</span>;
    }
    if (col.name.toLowerCase().includes("stock")) {
      return <span className={n === 0 ? "text-red-400 font-semibold" : n < 5 ? "text-yellow-400 font-semibold" : "text-silver"}>{n}</span>;
    }
    return <span className="text-silver">{n.toLocaleString("es-AR")}</span>;
  }
  if (col.type === "select") {
    const colorClass = SELECT_COLORS[String(value)] ?? "bg-silver/10 text-cool-steel";
    return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colorClass}`}>{String(value)}</span>;
  }
  if (col.type === "email") {
    return <span className="text-blue-400/80 text-xs">{String(value)}</span>;
  }
  if (col.type === "phone") {
    return <span className="text-cool-steel text-xs font-mono">{String(value)}</span>;
  }
  if (col.type === "date") {
    return <span className="text-cool-steel text-xs">{String(value)}</span>;
  }
  return <span className="text-silver">{String(value)}</span>;
}

export default function TablesPage() {
  const [selectedTable, setSelectedTable] = useState<Table>(DEMO_TABLES[0]);
  const [search, setSearch] = useState("");
  const [newTableModal, setNewTableModal] = useState(false);

  const filtered = selectedTable.rows.filter((row) => {
    if (!search) return true;
    return Object.values(row).some((v) => String(v).toLowerCase().includes(search.toLowerCase()));
  });

  return (
    <div className="flex h-full">
      <div className="w-56 bg-navy-2 border-r border-silver/15 flex flex-col py-4 flex-shrink-0">
        <div className="px-4 mb-3">
          <p className="text-xs font-bold text-cool-steel/55 uppercase tracking-wider">Mis tablas</p>
        </div>
        <div className="px-3 flex-1 overflow-y-auto space-y-0.5">
          {DEMO_TABLES.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTable(t)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-all ${
                selectedTable.id === t.id
                  ? "bg-cl-accent/10 text-cl-accent"
                  : "text-cool-steel hover:text-white hover:bg-silver/10"
              }`}
            >
              <i className={`ti ${t.icon} text-base ${t.color}`} />
              <span className="font-semibold truncate">{t.name}</span>
              <span className="ml-auto text-[10px] text-cool-steel/40">{t.rows.length}</span>
            </button>
          ))}
        </div>
        <div className="px-3 pt-3 border-t border-silver/15">
          <button
            onClick={() => setNewTableModal(true)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-cool-steel hover:text-cl-accent hover:bg-cl-accent/5 rounded-lg transition-all"
          >
            <i className="ti ti-plus text-base" />
            Nueva tabla
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-silver/15 px-6 py-3 flex items-center gap-4 bg-navy-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <i className={`ti ${selectedTable.icon} text-xl ${selectedTable.color}`} />
            <h2 className="font-bold text-white">{selectedTable.name}</h2>
            <span className="text-xs text-cool-steel/55">{selectedTable.rows.length} registros</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <div className="flex items-center gap-2 bg-silver/10 border border-silver/20 rounded-lg px-3 py-1.5">
              <i className="ti ti-search text-sm text-cool-steel/55" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="bg-transparent text-sm text-white outline-none w-40 placeholder-white/30"
              />
            </div>
            <button className="flex items-center gap-2 text-sm text-cool-steel hover:text-white bg-silver/10 hover:bg-silver/15 px-3 py-1.5 rounded-lg transition-all">
              <i className="ti ti-filter text-base" /> Filtrar
            </button>
            <button className="flex items-center gap-2 text-sm bg-cl-accent text-navy font-bold px-3 py-1.5 rounded-lg hover:bg-cl-accent/90 transition-all">
              <i className="ti ti-plus text-base" /> Nuevo registro
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm min-w-max">
            <thead className="bg-navy-2 sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-cool-steel/40 uppercase tracking-wider w-8">#</th>
                {selectedTable.columns.map((col) => (
                  <th key={col.id} className="text-left px-4 py-3 text-[10px] font-bold text-cool-steel/55 uppercase tracking-wider whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <i className={`ti ${COLUMN_TYPE_ICONS[col.type]} text-xs`} />
                      {col.name}
                    </div>
                  </th>
                ))}
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={i} className="border-t border-silver/15 hover:bg-deep-space/10 group transition-colors">
                  <td className="px-4 py-3 text-xs text-cool-steel/40">{i + 1}</td>
                  {selectedTable.columns.map((col) => (
                    <td key={col.id} className="px-4 py-3 whitespace-nowrap">
                      <CellValue col={col} value={row[col.id] ?? ""} />
                    </td>
                  ))}
                  <td className="px-2 py-3">
                    <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-all">
                      <button className="w-6 h-6 text-cool-steel/55 hover:text-white hover:bg-silver/15 rounded flex items-center justify-center transition-all">
                        <i className="ti ti-pencil text-xs" />
                      </button>
                      <button className="w-6 h-6 text-cool-steel/55 hover:text-red-400 hover:bg-red-400/10 rounded flex items-center justify-center transition-all">
                        <i className="ti ti-trash text-xs" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={selectedTable.columns.length + 2} className="text-center py-16 text-cool-steel/40">
                    <i className="ti ti-search text-3xl block mb-2" />
                    Sin resultados para "{search}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-silver/15 px-6 py-3 flex items-center justify-between bg-navy-2 flex-shrink-0">
          <span className="text-xs text-cool-steel/55">{filtered.length} registros mostrados</span>
          <div className="flex items-center gap-1">
            {["CSV", "Excel", "JSON"].map((fmt) => (
              <button key={fmt} className="text-xs text-cool-steel hover:text-white bg-silver/10 hover:bg-silver/15 px-2 py-1 rounded transition-all">
                <i className="ti ti-download mr-1" />{fmt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {newTableModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-navy-2 border border-silver/20 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-white text-lg mb-4">Nueva tabla</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-cool-steel mb-1.5 block">Nombre de la tabla</label>
                <input className="w-full bg-silver/10 border border-silver/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-cl-accent" placeholder="Ej: Proveedores" />
              </div>
              <div>
                <label className="text-xs font-semibold text-cool-steel mb-2 block">Icono</label>
                <div className="grid grid-cols-6 gap-1.5">
                  {["ti-users", "ti-box", "ti-layout-kanban", "ti-shopping-cart", "ti-calendar", "ti-chart-bar"].map((ic) => (
                    <button key={ic} className="w-9 h-9 bg-silver/10 hover:bg-cl-accent/20 hover:text-cl-accent text-cool-steel rounded-lg flex items-center justify-center transition-all">
                      <i className={`ti ${ic} text-base`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setNewTableModal(false)} className="flex-1 py-2 text-sm text-cool-steel bg-silver/10 hover:bg-silver/15 rounded-lg transition-all">
                Cancelar
              </button>
              <button onClick={() => setNewTableModal(false)} className="flex-1 py-2 text-sm bg-cl-accent text-navy font-bold rounded-lg hover:bg-cl-accent/90 transition-all">
                Crear tabla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

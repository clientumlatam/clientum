import { useState } from "react";

type FinTab = "flujo" | "cuentas" | "transferencias" | "conciliacion";

type BankAccount = {
  id: string;
  bank: string;
  alias: string;
  cbu: string;
  currency: "ARS" | "USD";
  balance: number;
  color: string;
  icon: string;
  lastUpdate: string;
  type: "corriente" | "caja_ahorro" | "virtual";
};

type Transaction = {
  id: string;
  date: string;
  description: string;
  category: string;
  account: string;
  amount: number;
  type: "ingreso" | "egreso";
  status: "confirmado" | "pendiente" | "rechazado";
  reference: string;
};

type Transfer = {
  id: string;
  date: string;
  from: string;
  to: string;
  amount: number;
  currency: "ARS" | "USD";
  concept: string;
  status: "completada" | "pendiente" | "fallida";
};

const ACCOUNTS: BankAccount[] = [
  { id:"1", bank:"Banco Galicia",    alias:"galicia-clientum",   cbu:"0070999020000001234567", currency:"ARS", balance:4_821_350, color:"bg-red-500",    icon:"ti-building-bank", lastUpdate:"Hace 5 min",  type:"corriente"  },
  { id:"2", bank:"Mercado Pago",     alias:"mp.clientum",        cbu:"0000003100035820001736", currency:"ARS", balance:1_238_900, color:"bg-blue-500",   icon:"ti-brand-mastercard", lastUpdate:"Hace 1 hora", type:"virtual"  },
  { id:"3", bank:"Banco Nación",     alias:"bna-ops",            cbu:"0110073230007309218001", currency:"ARS", balance:2_100_000, color:"bg-teal-500",   icon:"ti-building-bank", lastUpdate:"Hace 2 h",  type:"caja_ahorro" },
  { id:"4", bank:"Wise (USD)",       alias:"wise.clientum",      cbu:"—",                      currency:"USD", balance:12_840,    color:"bg-green-500",  icon:"ti-currency-dollar", lastUpdate:"Hace 3 h", type:"virtual"   },
];

const TRANSACTIONS: Transaction[] = [
  { id:"1",  date:"2026-06-13", description:"Cobro plan Pro — Academia Fit",           category:"Suscripciones", account:"Mercado Pago", amount: 350_000, type:"ingreso", status:"confirmado", reference:"MP-98712345" },
  { id:"2",  date:"2026-06-13", description:"Pago servidor AWS — Junio",               category:"Infraestructura", account:"Wise (USD)",  amount: 280,     type:"egreso",  status:"confirmado", reference:"AWS-JUN26" },
  { id:"3",  date:"2026-06-12", description:"Cobro plan Starter — Ferretería Central", category:"Suscripciones", account:"Mercado Pago", amount: 180_000, type:"ingreso", status:"confirmado", reference:"MP-98701234" },
  { id:"4",  date:"2026-06-12", description:"Sueldos — Quincena junio",                category:"RRHH",          account:"Banco Galicia", amount:1_382_063, type:"egreso", status:"confirmado", reference:"TRF-RRHH-01" },
  { id:"5",  date:"2026-06-11", description:"Cobro plan Business — Grupo Textil SA",  category:"Suscripciones", account:"Mercado Pago", amount: 600_000, type:"ingreso", status:"confirmado", reference:"MP-98690123" },
  { id:"6",  date:"2026-06-11", description:"Servicio contable externo",               category:"Administración",account:"Banco Galicia", amount:  85_000, type:"egreso",  status:"confirmado", reference:"FAC-0012" },
  { id:"7",  date:"2026-06-10", description:"Cobro plan Enterprise — Demo",            category:"Suscripciones", account:"Banco Galicia", amount:1_200_000,type:"ingreso", status:"confirmado", reference:"TRF-ENT-01" },
  { id:"8",  date:"2026-06-10", description:"Dominio & hosting adicional",             category:"Infraestructura",account:"Wise (USD)",  amount:  49,     type:"egreso",  status:"pendiente",  reference:"DOM-2026" },
  { id:"9",  date:"2026-06-09", description:"Cobro plan Free (upgrade)",               category:"Suscripciones", account:"Mercado Pago", amount: 180_000, type:"ingreso", status:"confirmado", reference:"MP-98680012" },
  { id:"10", date:"2026-06-09", description:"Marketing digital — Google Ads",          category:"Marketing",     account:"Banco Galicia", amount: 250_000, type:"egreso",  status:"confirmado", reference:"GADS-JUN" },
  { id:"11", date:"2026-06-08", description:"Cobro plan Starter — Clínica del Sur",   category:"Suscripciones", account:"Mercado Pago", amount: 180_000, type:"ingreso", status:"confirmado", reference:"MP-98670001" },
  { id:"12", date:"2026-06-07", description:"Reembolso — cliente inactivo",            category:"Devolución",    account:"Mercado Pago", amount:  35_000, type:"egreso",  status:"rechazado",  reference:"MP-REF-009" },
];

const TRANSFERS: Transfer[] = [
  { id:"1", date:"2026-06-12", from:"Mercado Pago",  to:"Banco Galicia", amount:800_000,  currency:"ARS", concept:"Concentración diaria de cobros MP", status:"completada" },
  { id:"2", date:"2026-06-11", from:"Banco Galicia", to:"Banco Nación",  amount:500_000,  currency:"ARS", concept:"Provisión de fondos operativos", status:"completada" },
  { id:"3", date:"2026-06-10", from:"Wise (USD)",    to:"Banco Galicia", amount:5_000,    currency:"USD", concept:"Conversión USD → ARS (cotiz. blue)", status:"completada" },
  { id:"4", date:"2026-06-13", from:"Banco Galicia", to:"Mercado Pago",  amount:200_000,  currency:"ARS", concept:"Reposición de fondos para pagos", status:"pendiente" },
  { id:"5", date:"2026-06-14", from:"Banco Galicia", to:"Wise (USD)",    amount:2_000,    currency:"USD", concept:"Pago proveedor SaaS internacional", status:"pendiente" },
];

const RECONCILE = [
  { id:"1", date:"2026-06-12", description:"Cobro MP — Academia Fit", accountAmt:350_000, bankAmt:350_000, diff:0,    status:"ok" },
  { id:"2", date:"2026-06-11", description:"AWS junio (USD 280)",      accountAmt:280_000, bankAmt:281_200, diff:-1200, status:"diff" },
  { id:"3", date:"2026-06-10", description:"Sueldo quincena",          accountAmt:1_382_063,bankAmt:1_382_063,diff:0,  status:"ok" },
  { id:"4", date:"2026-06-09", description:"Google Ads junio",         accountAmt:250_000, bankAmt:250_000, diff:0,    status:"ok" },
  { id:"5", date:"2026-06-08", description:"Cobro MP — Ferretería",    accountAmt:180_000, bankAmt:0,       diff:180_000,status:"pendiente" },
];

const CASH_FLOW = [
  { mes:"Ene", ing:980,  eg:610 },
  { mes:"Feb", ing:1100, eg:680 },
  { mes:"Mar", ing:1250, eg:720 },
  { mes:"Abr", ing:1180, eg:690 },
  { mes:"May", ing:1320, eg:750 },
  { mes:"Jun", ing:1285, eg:719 },
];

const STATUS_TX: Record<string, { label:string; color:string }> = {
  confirmado: { label:"Confirmado", color:"bg-cl-accent/20 text-cl-accent" },
  pendiente:  { label:"Pendiente",  color:"bg-yellow-400/20 text-yellow-400" },
  rechazado:  { label:"Rechazado",  color:"bg-red-400/20 text-red-400" },
};

const STATUS_TR: Record<string, { label:string; color:string }> = {
  completada: { label:"Completada", color:"bg-cl-accent/20 text-cl-accent" },
  pendiente:  { label:"Pendiente",  color:"bg-yellow-400/20 text-yellow-400" },
  fallida:    { label:"Fallida",    color:"bg-red-400/20 text-red-400" },
};

const TYPE_LABELS: Record<"corriente"|"caja_ahorro"|"virtual", string> = {
  corriente:  "Cuenta corriente",
  caja_ahorro:"Caja de ahorro",
  virtual:    "Billetera virtual",
};

const fmt = (n: number, cur = "ARS") =>
  cur === "USD" ? `U$D ${n.toLocaleString("es-AR")}` : `$${n.toLocaleString("es-AR")}`;

export default function FinanzasPage() {
  const [tab, setTab] = useState<FinTab>("flujo");
  const [txFilter, setTxFilter] = useState<"todos"|"ingreso"|"egreso">("todos");

  const tabs: { id:FinTab; label:string; icon:string }[] = [
    { id:"flujo",         label:"Flujo de caja",     icon:"ti-trending-up" },
    { id:"cuentas",       label:"Cuentas bancarias", icon:"ti-building-bank" },
    { id:"transferencias",label:"Transferencias",    icon:"ti-transfer" },
    { id:"conciliacion",  label:"Conciliación",      icon:"ti-adjustments" },
  ];

  const totalARS = ACCOUNTS.filter(a=>a.currency==="ARS").reduce((s,a)=>s+a.balance,0);
  const totalUSD = ACCOUNTS.filter(a=>a.currency==="USD").reduce((s,a)=>s+a.balance,0);

  const ingTotal = TRANSACTIONS.filter(t=>t.type==="ingreso"&&t.status==="confirmado").reduce((s,t)=>s+t.amount,0);
  const egTotal  = TRANSACTIONS.filter(t=>t.type==="egreso" &&t.status==="confirmado").reduce((s,t)=>s+t.amount,0);

  const filteredTx = TRANSACTIONS.filter(t => txFilter==="todos" || t.type===txFilter);

  const maxBar = Math.max(...CASH_FLOW.map(m=>Math.max(m.ing,m.eg)));

  return (
    <div className="flex flex-col h-full">
      {/* tabs */}
      <div className="border-b border-silver/15 px-6 py-3 flex items-center gap-2 bg-navy-2 flex-shrink-0">
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${tab===t.id?"bg-cl-accent/10 text-cl-accent":"text-cool-steel hover:text-white"}`}>
            <i className={`ti ${t.icon} text-base`}/>{t.label}
          </button>
        ))}
        <button className="ml-auto flex items-center gap-1.5 text-sm bg-cl-accent text-navy font-bold px-4 py-1.5 rounded-lg hover:bg-cl-accent/90 transition-all">
          <i className="ti ti-plus"/> {tab==="transferencias"?"Nueva transferencia":tab==="cuentas"?"Nueva cuenta":"Registrar"}
        </button>
      </div>

      {/* KPIs globales */}
      <div className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-silver/15 flex-shrink-0">
        {[
          { label:"Saldo total ARS",    value:fmt(totalARS),    icon:"ti-cash",          color:"text-cl-accent",  bg:"bg-cl-accent/10" },
          { label:"Saldo total USD",    value:fmt(totalUSD,"USD"),icon:"ti-currency-dollar",color:"text-green-400", bg:"bg-green-400/10" },
          { label:"Ingresos (30 días)", value:fmt(ingTotal),    icon:"ti-trending-up",   color:"text-blue-400",   bg:"bg-blue-400/10" },
          { label:"Egresos (30 días)",  value:fmt(egTotal),     icon:"ti-trending-down", color:"text-red-400",    bg:"bg-red-400/10" },
        ].map(s=>(
          <div key={s.label} className="bg-navy-2 border border-silver/20 rounded-xl p-4 flex items-center gap-3">
            <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
              <i className={`ti ${s.icon} text-lg ${s.color}`}/>
            </div>
            <div>
              <p className="text-base font-bold text-white leading-tight">{s.value}</p>
              <p className="text-[10px] text-cool-steel/55">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* ══ FLUJO DE CAJA ══ */}
        {tab==="flujo" && (
          <div className="p-6 space-y-6 max-w-5xl mx-auto">
            {/* gráfico barras agrupadas */}
            <div className="bg-navy-2 border border-silver/20 rounded-2xl p-6">
              <h3 className="font-bold text-white mb-1 flex items-center gap-2">
                <i className="ti ti-chart-bar-popular text-cl-accent"/> Ingresos vs Egresos — últimos 6 meses
              </h3>
              <p className="text-xs text-cool-steel/55 mb-5">En miles de pesos ARS</p>
              <div className="flex items-end gap-6 h-48">
                {CASH_FLOW.map(m=>(
                  <div key={m.mes} className="flex-1 flex flex-col items-center gap-1">
                    <div className="flex items-end gap-1 w-full h-full">
                      <div className="flex-1 bg-gradient-to-t from-cl-accent/30 to-cl-accent rounded-t-md"
                           style={{height:`${m.ing/maxBar*100}%`}} title={`$${m.ing}K`}/>
                      <div className="flex-1 bg-gradient-to-t from-red-500/30 to-red-500 rounded-t-md"
                           style={{height:`${m.eg/maxBar*100}%`}} title={`$${m.eg}K`}/>
                    </div>
                    <span className="text-[10px] text-cool-steel/55">{m.mes}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-3">
                <span className="flex items-center gap-1.5 text-xs text-cool-steel"><span className="w-3 h-3 bg-cl-accent rounded-sm inline-block"/>Ingresos</span>
                <span className="flex items-center gap-1.5 text-xs text-cool-steel"><span className="w-3 h-3 bg-red-500 rounded-sm inline-block"/>Egresos</span>
              </div>
            </div>

            {/* movimientos */}
            <div className="bg-navy-2 border border-silver/20 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 bg-deep-space/10 border-b border-silver/15 flex items-center justify-between">
                <h3 className="font-bold text-white text-sm">Movimientos recientes</h3>
                <div className="flex gap-1 bg-silver/10 rounded-lg p-1">
                  {(["todos","ingreso","egreso"] as const).map(f=>(
                    <button key={f} onClick={()=>setTxFilter(f)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all capitalize ${txFilter===f?"bg-cl-accent/20 text-cl-accent":"text-cool-steel hover:text-white"}`}>
                      {f==="todos"?"Todos":f==="ingreso"?"Ingresos":"Egresos"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="divide-y divide-silver/10">
                {filteredTx.map(tx=>(
                  <div key={tx.id} className="flex items-center gap-4 px-5 py-3 hover:bg-deep-space/10 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${tx.type==="ingreso"?"bg-cl-accent/10":"bg-red-400/10"}`}>
                      <i className={`ti ${tx.type==="ingreso"?"ti-arrow-down-left text-cl-accent":"ti-arrow-up-right text-red-400"} text-sm`}/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-silver truncate">{tx.description}</p>
                      <p className="text-[10px] text-cool-steel/55">{tx.date} · {tx.category} · {tx.account}</p>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_TX[tx.status].color}`}>{STATUS_TX[tx.status].label}</span>
                      <span className={`text-sm font-bold ${tx.type==="ingreso"?"text-cl-accent":"text-red-400"}`}>
                        {tx.type==="ingreso"?"+":"−"}{fmt(tx.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ CUENTAS ══ */}
        {tab==="cuentas" && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {ACCOUNTS.map(acc=>(
              <div key={acc.id} className="bg-navy-2 border border-silver/20 hover:border-cl-accent/20 rounded-2xl p-5 transition-all group">
                <div className="flex items-start gap-3 mb-4">
                  <div className={`w-10 h-10 ${acc.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <i className={`ti ${acc.icon} text-lg text-white`}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white">{acc.bank}</p>
                    <p className="text-xs text-cool-steel">{TYPE_LABELS[acc.type]} · {acc.currency}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-xl font-black ${acc.currency==="USD"?"text-green-400":"text-white"}`}>{fmt(acc.balance, acc.currency)}</p>
                    <p className="text-[10px] text-cool-steel/55">Actualizado {acc.lastUpdate}</p>
                  </div>
                </div>
                <div className="bg-deep-space/15 rounded-lg px-3 py-2 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-cool-steel/55">{acc.alias} {acc.cbu !== "—" && `· CBU: ${acc.cbu.slice(0,8)}…`}</span>
                  <button className="text-[10px] text-cool-steel/55 hover:text-cl-accent transition-colors flex items-center gap-1"><i className="ti ti-copy text-xs"/>Copiar CBU</button>
                </div>
              </div>
            ))}
            <div className="border-2 border-dashed border-silver/20 hover:border-cl-accent/30 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group">
              <div className="w-10 h-10 bg-silver/10 group-hover:bg-cl-accent/10 rounded-xl flex items-center justify-center transition-all">
                <i className="ti ti-plus text-cool-steel/55 group-hover:text-cl-accent text-lg transition-colors"/>
              </div>
              <p className="text-xs text-cool-steel/55 group-hover:text-cool-steel transition-colors">Agregar cuenta bancaria</p>
            </div>
          </div>
        )}

        {/* ══ TRANSFERENCIAS ══ */}
        {tab==="transferencias" && (
          <div className="p-6 max-w-3xl mx-auto space-y-3">
            {TRANSFERS.map(tr=>{
              const st = STATUS_TR[tr.status];
              return (
                <div key={tr.id} className="bg-navy-2 border border-silver/20 hover:border-cl-accent/20 rounded-xl p-4 flex items-center gap-4 transition-all">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${tr.status==="completada"?"bg-cl-accent/10":tr.status==="pendiente"?"bg-yellow-400/10":"bg-red-400/10"}`}>
                    <i className="ti ti-transfer text-base text-cool-steel"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-silver">{tr.concept}</p>
                    <div className="flex items-center gap-2 text-[10px] text-cool-steel/55 mt-0.5">
                      <span>{tr.from}</span>
                      <i className="ti ti-arrow-right text-xs"/>
                      <span>{tr.to}</span>
                      <span>·</span>
                      <span>{tr.date}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                    <span className="text-sm font-bold text-white">{fmt(tr.amount, tr.currency)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══ CONCILIACIÓN ══ */}
        {tab==="conciliacion" && (
          <div className="p-6 max-w-4xl mx-auto space-y-4">
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label:"Conciliadas",  value:RECONCILE.filter(r=>r.status==="ok").length,        color:"text-cl-accent",  bg:"bg-cl-accent/10",  icon:"ti-circle-check" },
                { label:"Con diferencia",value:RECONCILE.filter(r=>r.status==="diff").length,      color:"text-orange-400", bg:"bg-orange-400/10", icon:"ti-alert-triangle" },
                { label:"Pendientes",   value:RECONCILE.filter(r=>r.status==="pendiente").length,  color:"text-yellow-400", bg:"bg-yellow-400/10", icon:"ti-clock" },
              ].map(s=>(
                <div key={s.label} className="bg-navy-2 border border-silver/20 rounded-xl p-4 flex items-center gap-3">
                  <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <i className={`ti ${s.icon} text-lg ${s.color}`}/>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{s.value}</p>
                    <p className="text-[10px] text-cool-steel/55">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-navy-2 border border-silver/20 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {["Fecha","Descripción","Registrado","Banco","Diferencia","Estado"].map(h=>(
                      <th key={h} className="text-left px-5 py-3 text-[10px] font-bold text-cool-steel/45 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {RECONCILE.map(r=>(
                    <tr key={r.id} className="border-t border-silver/15 hover:bg-deep-space/10 transition-colors">
                      <td className="px-5 py-3 text-xs font-mono text-cool-steel">{r.date}</td>
                      <td className="px-5 py-3 text-xs text-silver max-w-[200px] truncate">{r.description}</td>
                      <td className="px-5 py-3 text-xs font-semibold text-cool-steel">{fmt(r.accountAmt)}</td>
                      <td className="px-5 py-3 text-xs font-semibold text-cool-steel">{r.bankAmt>0?fmt(r.bankAmt):<span className="text-cool-steel/40">—</span>}</td>
                      <td className="px-5 py-3 text-xs font-bold">
                        {r.diff===0
                          ? <span className="text-cl-accent">Sin diferencia</span>
                          : <span className="text-orange-400">{r.diff>0?"+":""}{fmt(Math.abs(r.diff))}</span>}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.status==="ok"?"bg-cl-accent/20 text-cl-accent":r.status==="diff"?"bg-orange-400/20 text-orange-400":"bg-yellow-400/20 text-yellow-400"}`}>
                          {r.status==="ok"?"✓ OK":r.status==="diff"?"Diferencia":"Pendiente"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

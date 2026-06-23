import { ShieldCheck } from "lucide-react";

export interface FiscalInvoice {
  invoiceType: "A" | "B" | "C";
  invoiceNumber: string;
  date: string;
  pointOfSale: string;
  cuitEmisor: string;
  contactName: string;
  cuitReceptor: string;
  amount: number;
  cae: string;
  caeVencimiento: string;
}

interface FiscalReceiptProps {
  invoice: FiscalInvoice;
  onClose: () => void;
}

export default function FiscalReceipt({ invoice, onClose }: FiscalReceiptProps) {
  const isA = invoice.invoiceType === "A";

  const handlePrint = () => {
    window.print();
  };

  const neto = isA ? invoice.amount / 1.21 : invoice.amount;
  const iva  = isA ? invoice.amount - neto : 0;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white text-[#031E43] rounded-2xl shadow-2xl max-w-2xl w-full border border-[#DDDFE2] overflow-hidden my-8">

        {/* Modal toolbar — dark, dashboard-style */}
        <div className="bg-[#07102a] px-5 py-3.5 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-amber-400/15 flex items-center justify-center">
              <i className="ti ti-receipt-2 text-amber-400 text-sm" />
            </span>
            <div>
              <p className="text-xs font-bold text-white leading-none">Comprobante AFIP</p>
              <p className="text-[10px] text-white/40 mt-0.5">Borrador de factura electrónica</p>
            </div>
            <span className="ml-1 bg-amber-400/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-400/30">
              HOMOLOGADO
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white/80 hover:text-white rounded-lg text-xs font-semibold transition-all"
            >
              <i className="ti ti-printer text-sm" /> Imprimir
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            >
              <i className="ti ti-x text-sm" />
            </button>
          </div>
        </div>

        {/* AFIP Receipt body — white for print compliance */}
        <div className="p-8 print:p-0 font-sans">
          <div className="border-2 border-[#031E43] p-6 rounded-md">

            {/* Header: invoice type letter box + issuer/recipient */}
            <div className="relative border-b-2 border-[#031E43] pb-6 mb-6">
              {/* Big letter indicator */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 w-14 h-14 bg-white border-2 border-[#031E43] flex flex-col items-center justify-center z-10">
                <span className="text-3xl font-extrabold text-[#031E43] leading-none">{invoice.invoiceType}</span>
                <span className="text-[9px] font-bold text-[#3B506D] uppercase">Cod. 011</span>
              </div>
              <div className="absolute top-8 bottom-0 left-1/2 w-0.5 bg-[#031E43] -translate-x-1/2 hidden md:block" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div>
                  <h1 className="text-2xl font-black text-[#031E43] tracking-tight">CLIENTUM S.A.</h1>
                  <p className="text-xs text-[#3B506D] mt-1 font-semibold">Soluciones Tecnológicas e Inteligencia Artificial</p>
                  <p className="text-xs text-[#3B506D] mt-2">Av. Corrientes 1424, Piso 8</p>
                  <p className="text-xs text-[#3B506D]">C1042 Buenos Aires, Argentina</p>
                  <p className="text-xs text-[#3B506D]">IVA Responsable Inscripto</p>
                </div>
                <div className="md:pl-10 text-left md:text-right">
                  <h2 className="text-xl font-bold text-[#031E43] uppercase">Factura</h2>
                  <p className="text-xs font-mono text-[#3B506D] mt-1">Nº Comprobante: {invoice.invoiceNumber}</p>
                  <p className="text-xs text-[#3B506D]">Fecha de Emisión: {invoice.date}</p>
                  <p className="text-xs text-[#3B506D] mt-2">Punto de Venta: {invoice.pointOfSale}</p>
                  <p className="text-xs text-[#3B506D]">CUIT Emisor: <span className="font-mono">{invoice.cuitEmisor}</span></p>
                  <p className="text-xs text-[#3B506D]">Ingresos Brutos: Convenio Multilateral</p>
                  <p className="text-xs text-[#3B506D]">Inicio de Actividades: 10/11/2024</p>
                </div>
              </div>
            </div>

            {/* Buyer details */}
            <div className="bg-[#FDFDFB] border border-[#DDDFE2] rounded p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[#3B506D] uppercase font-semibold text-[10px]">Cliente Receptor:</span>
                  <p className="text-sm font-bold text-[#031E43] mt-0.5">{invoice.contactName}</p>
                </div>
                <div>
                  <span className="text-[#3B506D] uppercase font-semibold text-[10px]">CUIT Receptor:</span>
                  <p className="text-sm font-mono font-bold text-[#031E43] mt-0.5">{invoice.cuitReceptor}</p>
                </div>
                <div className="mt-2">
                  <span className="text-[#3B506D] uppercase font-semibold text-[10px]">Condición ante IVA:</span>
                  <p className="text-xs text-[#031E43] mt-0.5">
                    {isA ? "Responsable Inscripto" : "Consumidor Final / Monotributo"}
                  </p>
                </div>
                <div className="mt-2">
                  <span className="text-[#3B506D] uppercase font-semibold text-[10px]">Condición de Venta:</span>
                  <p className="text-xs text-[#031E43] mt-0.5">Cuenta Corriente Comercial</p>
                </div>
              </div>
            </div>

            {/* Items table */}
            <table className="w-full text-left text-xs mb-8">
              <thead>
                <tr className="border-b border-[#031E43] text-[#3B506D] uppercase font-bold text-[10px]">
                  <th className="py-2">Código</th>
                  <th className="py-2">Detalle / Concepto</th>
                  <th className="py-2 text-right">Cant.</th>
                  <th className="py-2 text-right">U. Medida</th>
                  <th className="py-2 text-right">Precio Unit.</th>
                  {isA ? (
                    <>
                      <th className="py-2 text-right">Alícuota IVA</th>
                      <th className="py-2 text-right">Subtotal c/IVA</th>
                    </>
                  ) : (
                    <th className="py-2 text-right">Total</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDDFE2]/40">
                <tr>
                  <td className="py-3 font-mono">SERV-AI-8</td>
                  <td className="py-3 font-semibold">
                    Servicios de Consultoría de Arquitectura CRM + Integración Clientum
                  </td>
                  <td className="py-3 text-right">1.00</td>
                  <td className="py-3 text-right">unidades</td>
                  <td className="py-3 text-right">
                    ${neto.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </td>
                  {isA ? (
                    <>
                      <td className="py-3 text-right">21.00%</td>
                      <td className="py-3 text-right font-semibold">
                        ${invoice.amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                      </td>
                    </>
                  ) : (
                    <td className="py-3 text-right font-semibold">
                      ${invoice.amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </td>
                  )}
                </tr>
              </tbody>
            </table>

            {/* Totals + CAE barcode area */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-[#DDDFE2] pt-6">
              <div className="flex flex-col justify-end text-[10px] text-[#3B506D]">
                <div className="flex items-center gap-1.5 text-[#031E43] font-semibold mb-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Comprobante de Homologación AFIP</span>
                </div>
                <p>Simulación fiscal conforme a lineamientos RG AFIP para validación de arquitectura CRM. Sin valor comercial real.</p>
                <div className="mt-3 font-mono bg-[#DDDFE2]/40 p-2 text-[10px] rounded tracking-widest text-[#031E43]">
                  {invoice.cuitEmisor.replace(/[^0-9]/g, "")}01{invoice.cae}{invoice.caeVencimiento.replace(/[^0-9]/g, "")}
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-xs text-[#3B506D] text-right">
                {isA ? (
                  <>
                    <div className="flex justify-between md:justify-end gap-10">
                      <span>Importe Neto No Gravado:</span>
                      <span className="font-mono">$0,00</span>
                    </div>
                    <div className="flex justify-between md:justify-end gap-10">
                      <span>Importe Neto Gravado (21%):</span>
                      <span className="font-mono">${neto.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between md:justify-end gap-10">
                      <span>IVA Inscripto (21%):</span>
                      <span className="font-mono">${iva.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between md:justify-end gap-10 font-bold text-base text-[#031E43] border-t border-dashed border-[#DDDFE2] pt-2 mt-1">
                      <span>Total Comprobante:</span>
                      <span className="font-mono">${invoice.amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between md:justify-end gap-10">
                      <span>Subtotal:</span>
                      <span className="font-mono">${invoice.amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between md:justify-end gap-10">
                      <span>IVA Incluido / Exento:</span>
                      <span>$0,00</span>
                    </div>
                    <div className="flex justify-between md:justify-end gap-10 font-bold text-base text-[#031E43] border-t border-dashed border-[#DDDFE2] pt-2 mt-1">
                      <span>Total Comprobante:</span>
                      <span className="font-mono">${invoice.amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* CAE footer */}
            <div className="border-t-2 border-[#031E43] mt-6 pt-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs font-semibold text-[#031E43]">
              <div className="bg-[#DDDFE2]/40 p-2 border border-[#DDDFE2] rounded font-mono text-center text-[#3B506D]">
                |||| | || ||||| ||| ||| | ||| |||||| ||
              </div>
              <div className="text-left md:text-right flex flex-col gap-1">
                <div>
                  <span className="text-[#3B506D] uppercase text-[10px] mr-1">CAE Nº:</span>
                  <span className="font-mono font-bold text-sm text-[#031E43]">{invoice.cae}</span>
                </div>
                <div>
                  <span className="text-[#3B506D] uppercase text-[10px] mr-1">Vencimiento del CAE:</span>
                  <span className="font-mono text-[#031E43]">{invoice.caeVencimiento}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#FDFDFB] px-6 py-4 border-t border-[#DDDFE2] flex justify-between items-center print:hidden">
          <p className="text-xs text-[#3B506D]">Integración AFIP Legal Core — Clientum</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#031E43] hover:bg-[#031E43] text-white rounded-lg text-xs font-semibold transition-all shadow"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

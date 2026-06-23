import axios from "axios";

const WSFE_HOMO = "https://wswhomo.afip.gov.ar/wsfev1/service.asmx";
const WSFE_PROD = "https://servicios1.afip.gov.ar/wsfev1/service.asmx";

export interface InvoiceData {
  tipo:        number;
  concepto:    number;
  docTipo:     number;
  docNro:      string;
  impTotal:    number;
  impNeto:     number;
  impIva:      number;
  iva21Neto?:  number;
  iva105Neto?: number;
  descripcion?: string;
}

export interface CaeResult {
  numero:    number;
  cae:       string;
  caeFchVto: string;
  fecha:     string;
  resultado: string;
  errores:   string[];
}

function soapHeader(token: string, sign: string, cuit: string): string {
  return `<ar:FEAuthRequest>
    <ar:Token>${token}</ar:Token>
    <ar:Sign>${sign}</ar:Sign>
    <ar:Cuit>${cuit}</ar:Cuit>
  </ar:FEAuthRequest>`;
}

async function soapCall(url: string, action: string, bodyInner: string): Promise<string> {
  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soapenv:Header/>
  <soapenv:Body>${bodyInner}</soapenv:Body>
</soapenv:Envelope>`;

  const resp = await axios.post(url, envelope, {
    headers: {
      "Content-Type": "text/xml;charset=UTF-8",
      "SOAPAction":   `http://ar.gov.afip.dif.FEV1/${action}`,
    },
    timeout: 30_000,
  });
  return resp.data as string;
}

function getWsfeUrl(env: string): string {
  return env === "produccion" ? WSFE_PROD : WSFE_HOMO;
}

export async function ultimoComprobante(
  token: string, sign: string, cuit: string,
  puntoVenta: number, tipo: number, env: string,
): Promise<number> {
  const url  = getWsfeUrl(env);
  const body = `<ar:FECompUltimoAutorizado>
    ${soapHeader(token, sign, cuit)}
    <ar:PtoVta>${puntoVenta}</ar:PtoVta>
    <ar:CbteTipo>${tipo}</ar:CbteTipo>
  </ar:FECompUltimoAutorizado>`;

  const xml = await soapCall(url, "FECompUltimoAutorizado", body);
  const nro = xml.match(/<CbteNro>(\d+)<\/CbteNro>/)?.[1];
  return nro ? parseInt(nro, 10) : 0;
}

export async function solicitarCae(
  token: string, sign: string, cuit: string,
  puntoVenta: number, inv: InvoiceData, env: string,
): Promise<CaeResult> {
  const url    = getWsfeUrl(env);
  const ultimo = await ultimoComprobante(token, sign, cuit, puntoVenta, inv.tipo, env);
  const numero = ultimo + 1;

  const hoy  = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  const ivaItems = buildIvaItems(inv);

  const body = `<ar:FECAESolicitar>
    ${soapHeader(token, sign, cuit)}
    <ar:FeCAEReq>
      <ar:FeCabReq>
        <ar:CantReg>1</ar:CantReg>
        <ar:PtoVta>${puntoVenta}</ar:PtoVta>
        <ar:CbteTipo>${inv.tipo}</ar:CbteTipo>
      </ar:FeCabReq>
      <ar:FeDetReq>
        <ar:FECAEDetRequest>
          <ar:Concepto>${inv.concepto}</ar:Concepto>
          <ar:DocTipo>${inv.docTipo}</ar:DocTipo>
          <ar:DocNro>${inv.docNro}</ar:DocNro>
          <ar:CbteDesde>${numero}</ar:CbteDesde>
          <ar:CbteHasta>${numero}</ar:CbteHasta>
          <ar:CbteFch>${hoy}</ar:CbteFch>
          <ar:ImpTotal>${inv.impTotal.toFixed(2)}</ar:ImpTotal>
          <ar:ImpTotConc>0.00</ar:ImpTotConc>
          <ar:ImpNeto>${inv.impNeto.toFixed(2)}</ar:ImpNeto>
          <ar:ImpOpEx>0.00</ar:ImpOpEx>
          <ar:ImpIVA>${inv.impIva.toFixed(2)}</ar:ImpIVA>
          <ar:ImpTrib>0.00</ar:ImpTrib>
          <ar:MonId>PES</ar:MonId>
          <ar:MonCotiz>1</ar:MonCotiz>
          ${ivaItems}
        </ar:FECAEDetRequest>
      </ar:FeDetReq>
    </ar:FeCAEReq>
  </ar:FECAESolicitar>`;

  const xml = await soapCall(url, "FECAESolicitar", body);

  const resultado  = xml.match(/<Resultado>(.*?)<\/Resultado>/)?.[1] ?? "E";
  const cae        = xml.match(/<CAE>(.*?)<\/CAE>/)?.[1] ?? "";
  const caeFchVto  = xml.match(/<CAEFchVto>(.*?)<\/CAEFchVto>/)?.[1] ?? "";
  const errores: string[] = [];

  const errMatches = xml.matchAll(/<Msg>(.*?)<\/Msg>/g);
  for (const m of errMatches) errores.push(m[1]);

  if (resultado !== "A") {
    throw new Error(`AFIP rechazó la solicitud: ${errores.join(" | ") || "error desconocido"}`);
  }

  return { numero, cae, caeFchVto, fecha: hoy, resultado, errores };
}

function buildIvaItems(inv: InvoiceData): string {
  const items: string[] = [];

  if (inv.iva21Neto && inv.iva21Neto > 0) {
    items.push(`<ar:AlicIva>
      <ar:Id>5</ar:Id>
      <ar:BaseImp>${inv.iva21Neto.toFixed(2)}</ar:BaseImp>
      <ar:Importe>${(inv.iva21Neto * 0.21).toFixed(2)}</ar:Importe>
    </ar:AlicIva>`);
  }
  if (inv.iva105Neto && inv.iva105Neto > 0) {
    items.push(`<ar:AlicIva>
      <ar:Id>4</ar:Id>
      <ar:BaseImp>${inv.iva105Neto.toFixed(2)}</ar:BaseImp>
      <ar:Importe>${(inv.iva105Neto * 0.105).toFixed(2)}</ar:Importe>
    </ar:AlicIva>`);
  }

  if (items.length === 0 && inv.impIva > 0) {
    items.push(`<ar:AlicIva>
      <ar:Id>5</ar:Id>
      <ar:BaseImp>${inv.impNeto.toFixed(2)}</ar:BaseImp>
      <ar:Importe>${inv.impIva.toFixed(2)}</ar:Importe>
    </ar:AlicIva>`);
  }

  if (items.length === 0) return "";
  return `<ar:Iva>${items.join("\n")}</ar:Iva>`;
}

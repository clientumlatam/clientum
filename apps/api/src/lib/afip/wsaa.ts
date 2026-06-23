import forge from "node-forge";
import axios from "axios";
import { db, afipConfigsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const WSAA_HOMO = "https://wsaahomo.afip.gov.ar/ws/services/LoginCms";
const WSAA_PROD = "https://wsaa.afip.gov.ar/ws/services/LoginCms";

function buildLoginTicketRequest(): string {
  const now    = new Date();
  const expiry = new Date(now.getTime() + 12 * 60 * 60 * 1000);
  const fmt    = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "-03:00");
  const uid    = Math.floor(Math.random() * 2_000_000_000);
  return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${uid}</uniqueId>
    <generationTime>${fmt(now)}</generationTime>
    <expirationTime>${fmt(expiry)}</expirationTime>
  </header>
  <service>wsfe</service>
</loginTicketRequest>`;
}

function signCms(xmlContent: string, certPem: string, keyPem: string): string {
  const cert       = forge.pki.certificateFromPem(certPem);
  const privateKey = forge.pki.privateKeyFromPem(keyPem);

  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(xmlContent, "utf8");
  p7.addCertificate(cert);
  p7.addSigner({
    key:                     privateKey,
    certificate:             cert,
    digestAlgorithm:         forge.pki.oids.sha256,
    authenticatedAttributes: [],
  });
  p7.sign({ detached: false });

  const der = forge.asn1.toDer(p7.toAsn1());
  return forge.util.encode64(der.bytes());
}

async function callWsaa(cmsCms64: string, url: string): Promise<{ token: string; sign: string; expiry: Date }> {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov.ar">
  <soapenv:Header/>
  <soapenv:Body>
    <wsaa:loginCms>
      <wsaa:in0>${cmsCms64}</wsaa:in0>
    </wsaa:loginCms>
  </soapenv:Body>
</soapenv:Envelope>`;

  const resp = await axios.post(url, body, {
    headers: {
      "Content-Type": "text/xml;charset=UTF-8",
      "SOAPAction":   "",
    },
    timeout: 30_000,
  });

  const xml = resp.data as string;
  const token   = xml.match(/<token>([\s\S]*?)<\/token>/)?.[1]?.trim();
  const sign    = xml.match(/<sign>([\s\S]*?)<\/sign>/)?.[1]?.trim();
  const expStrRaw = xml.match(/<expirationTime>([\s\S]*?)<\/expirationTime>/)?.[1]?.trim();

  if (!token || !sign) throw new Error("WSAA: respuesta inválida — no se encontró token/sign");

  let expiry = new Date(Date.now() + 12 * 60 * 60 * 1000);
  if (expStrRaw) {
    const parsed = new Date(expStrRaw.replace(/-03:00$/, "Z").replace(/-03:00/, ""));
    if (!isNaN(parsed.getTime())) expiry = parsed;
  }

  return { token, sign, expiry };
}

export async function getToken(userId: string): Promise<{ token: string; sign: string; cuit: string; puntoVenta: number }> {
  const [config] = await db.select().from(afipConfigsTable).where(eq(afipConfigsTable.userId, userId)).limit(1);
  if (!config) throw new Error("AFIP no configurado para este usuario");
  if (!config.certPem || !config.privateKeyPem) throw new Error("Certificado AFIP no cargado");
  if (!config.cuit) throw new Error("CUIT no configurado");
  if (!config.puntoVenta) throw new Error("Punto de venta no configurado");

  const now = new Date();
  if (config.token && config.sign && config.tokenExpiry && config.tokenExpiry > new Date(now.getTime() + 5 * 60 * 1000)) {
    return { token: config.token, sign: config.sign, cuit: config.cuit, puntoVenta: config.puntoVenta };
  }

  const wsaaUrl = config.environment === "produccion" ? WSAA_PROD : WSAA_HOMO;
  const xml     = buildLoginTicketRequest();
  const cms     = signCms(xml, config.certPem, config.privateKeyPem);
  const { token, sign, expiry } = await callWsaa(cms, wsaaUrl);

  await db.update(afipConfigsTable)
    .set({ token, sign, tokenExpiry: expiry, updatedAt: new Date() })
    .where(eq(afipConfigsTable.userId, userId));

  return { token, sign, cuit: config.cuit, puntoVenta: config.puntoVenta };
}

export async function refreshToken(userId: string): Promise<void> {
  const [config] = await db.select().from(afipConfigsTable).where(eq(afipConfigsTable.userId, userId)).limit(1);
  if (!config?.certPem || !config?.privateKeyPem) throw new Error("Certificado AFIP no configurado");

  const wsaaUrl = config.environment === "produccion" ? WSAA_PROD : WSAA_HOMO;
  const xml     = buildLoginTicketRequest();
  const cms     = signCms(xml, config.certPem, config.privateKeyPem);
  const { token, sign, expiry } = await callWsaa(cms, wsaaUrl);

  await db.update(afipConfigsTable)
    .set({ token, sign, tokenExpiry: expiry, updatedAt: new Date() })
    .where(eq(afipConfigsTable.userId, userId));
}

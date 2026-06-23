import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { conversationsTable, chatbotConfigsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

interface PlaceResult {
  id: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  rating: number;
  reviews: number;
  status: string;
  source?: "google" | "openstreetmap";
}

/* ─────────────────────────────────────────────────────────────
   Helpers comunes
   ───────────────────────────────────────────────────────────── */

async function geocodeLocation(location: string): Promise<{ lat: string; lon: string } | null> {
  const q = encodeURIComponent(location + " Argentina");
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`;
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "Clientum-Prospector/1.0 (clientumlatam@gmail.com)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as Array<{ lat: string; lon: string }>;
    return data[0] ?? null;
  } catch {
    return null;
  }
}

function decodeUnicode(str: string): string {
  return str.replace(/\\u([\dA-Fa-f]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
}

/* ─────────────────────────────────────────────────────────────
   Google Maps interno — sin API key, sin browser
   Técnica: fetch directo al endpoint que usa el navegador,
   parseando el JSON embebido en la respuesta HTML.
   Estabilidad: ⚠️ frágil (Google puede cambiar el formato).
   Fallback automático a OpenStreetMap si falla.
   ───────────────────────────────────────────────────────────── */

const GMAPS_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Accept":
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "es-AR,es;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "max-age=0",
  "Referer": "https://www.google.com/",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "cross-site",
  "Upgrade-Insecure-Requests": "1",
};

function extractStringArray(html: string, maxResults: number): PlaceResult[] {
  const results: PlaceResult[] = [];
  const seen = new Set<string>();

  /*
    El APP_INITIALIZATION_STATE de Google Maps contiene los resultados
    en arrays anidados. La estructura relevante (reverse-engineered) es:

    Cada negocio aparece como fragmento:
      ["Nombre del local","<placeId>",<lat>,<lon>,<type>,...,
       ["Dirección completa"],
       ...
       [<rating:float>,<reviews:int>],   ← posición variable
       ...
       ["+54 9 ...", ...]                ← teléfono (a veces)
      ]

    Usamos múltiples patrones regex independientes y correlacionamos
    por cercanía de posición en el HTML.
  */

  // ── Patrón A ──────────────────────────────────────────────
  // Nombre + rating + reviews en bloque contiguo (el más común)
  // ["Business Name",null,null,null,[null,null,4.5,1234],...]
  const patA =
    /"((?:[^"\\]|\\.){3,80}?)",null,null,null,\[null,null,([\d]+\.?[\d]*),([\d]+)\]/g;

  let m: RegExpExecArray | null;
  while ((m = patA.exec(html)) !== null && results.length < maxResults) {
    const name = decodeUnicode(m[1]).trim();
    if (!name || seen.has(name.toLowerCase()) || name.startsWith("\\")) continue;
    seen.add(name.toLowerCase());

    results.push({
      id: `gm_a_${results.length}`,
      name,
      address: "",
      phone: "",
      website: "",
      rating: parseFloat(m[2]) || 0,
      reviews: parseInt(m[3]) || 0,
      status: "OPERATIONAL",
      source: "google",
    });
  }

  // ── Patrón B ──────────────────────────────────────────────
  // Formato alternativo: rating aparece antes que el nombre
  // [4.5,1234],null,null,"Business Name"
  if (results.length < 3) {
    const patB =
      /\[([\d]+\.[\d]+),([\d]+)\],(?:null,){0,4}"((?:[^"\\]|\\.){3,80}?)"/g;
    while ((m = patB.exec(html)) !== null && results.length < maxResults) {
      const name = decodeUnicode(m[3]).trim();
      if (!name || seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());

      results.push({
        id: `gm_b_${results.length}`,
        name,
        address: "",
        phone: "",
        website: "",
        rating: parseFloat(m[1]) || 0,
        reviews: parseInt(m[2]) || 0,
        status: "OPERATIONAL",
        source: "google",
      });
    }
  }

  // ── Patrón C ──────────────────────────────────────────────
  // Nombre + dirección en bloque (formato de lista de resultados)
  // ["Name",null,["Street, City, Province"],...]
  if (results.length < 3) {
    const patC =
      /"((?:[^"\\]|\\.){3,80}?)",null,\["((?:[^"\\]|\\.){5,120}?)"\]/g;
    while ((m = patC.exec(html)) !== null && results.length < maxResults) {
      const name = decodeUnicode(m[1]).trim();
      const addr = decodeUnicode(m[2]).trim();
      if (!name || seen.has(name.toLowerCase())) continue;
      // Filtrar falsos positivos: la dirección debe tener aspecto de dirección
      if (!/\d|calle|av\.|ruta|barrio|km/i.test(addr) && addr.length < 10) continue;
      seen.add(name.toLowerCase());

      results.push({
        id: `gm_c_${results.length}`,
        name,
        address: addr,
        phone: "",
        website: "",
        rating: 0,
        reviews: 0,
        status: "OPERATIONAL",
        source: "google",
      });
    }
  }

  return results;
}

async function searchGoogleMapsInternal(
  query: string,
  location: string,
  maxResults: number
): Promise<PlaceResult[]> {
  const geo = await geocodeLocation(location);
  const coordPart =
    geo
      ? `/@${parseFloat(geo.lat).toFixed(6)},${parseFloat(geo.lon).toFixed(6)},14z`
      : "";
  const searchTerm = encodeURIComponent(`${query} ${location} Argentina`);
  const url = `https://www.google.com/maps/search/${searchTerm}${coordPart}`;

  const resp = await fetch(url, {
    headers: GMAPS_HEADERS,
    signal: AbortSignal.timeout(14000),
    redirect: "follow",
  });

  if (!resp.ok) throw new Error(`Google Maps HTTP ${resp.status}`);

  // Google puede redirigir a /sorry/ (captcha) o /search?q=... (mobile)
  const finalUrl = resp.url;
  if (finalUrl.includes("/sorry/") || finalUrl.includes("accounts.google.com")) {
    throw new Error("Google bloqueó la petición (captcha). Usando OSM como fallback.");
  }

  const html = await resp.text();

  // Verificar que la respuesta contiene datos de Maps (no página de error)
  if (!html.includes("APP_INITIALIZATION_STATE") && !html.includes("window.google")) {
    throw new Error("Respuesta inesperada de Google Maps. Usando OSM como fallback.");
  }

  const results = extractStringArray(html, maxResults);
  if (results.length === 0) {
    throw new Error("No se encontraron resultados en la respuesta de Google Maps.");
  }

  return results;
}

/* ─────────────────────────────────────────────────────────────
   OpenStreetMap + Overpass API
   100% gratis · sin API key · datos reales de Argentina
   ───────────────────────────────────────────────────────────── */

function mapQueryToOSMTags(query: string): string[] {
  const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const mapping: Array<[string[], string]> = [
    [["restaurante", "parrilla", "bodegon", "cantina", "restaurant"], '["amenity"="restaurant"]'],
    [["bar", "pub", "cerveceria"], '["amenity"="bar"]'],
    [["cafe", "cafeteria", "confiteria"], '["amenity"="cafe"]'],
    [["pizza", "pizzeria"], '["amenity"="restaurant"]["cuisine"="pizza"]'],
    [["hotel", "hostel", "hospedaje", "alojamiento"], '["tourism"~"hotel|hostel|guest_house"]'],
    [["farmacia", "drogueria"], '["amenity"="pharmacy"]'],
    [["supermercado", "almacen", "despensa"], '["shop"~"supermarket|convenience"]'],
    [["banco", "bank", "financiera"], '["amenity"="bank"]'],
    [["taller", "mecanico", "gomeria"], '["shop"="car_repair"]'],
    [["panaderia", "bakery"], '["shop"="bakery"]'],
    [["heladeria", "helados"], '["shop"="ice_cream"]'],
    [["ferreteria", "corralon"], '["shop"="hardware"]'],
    [["peluqueria", "barberia"], '["shop"~"hairdresser|barber"]'],
    [["inmobiliaria", "real estate"], '["shop"="estate_agent"]'],
    [["kiosco", "kiosko"], '["shop"="kiosk"]'],
    [["veterinaria", "veterinario"], '["amenity"="veterinary"]'],
    [["dentista", "odontologia"], '["amenity"="dentist"]'],
    [["clinica", "medico", "salud"], '["amenity"~"clinic|doctors|hospital"]'],
    [["optica"], '["shop"="optician"]'],
    [["gym", "gimnasio", "fitness"], '["leisure"~"fitness_centre|gym"]'],
    [["libreria", "papeleria"], '["shop"~"books|stationery"]'],
    [["ropa", "indumentaria", "boutique"], '["shop"~"clothes|fashion"]'],
    [["zapateria", "calzado"], '["shop"="shoes"]'],
    [["electronica", "computacion"], '["shop"~"electronics|computers"]'],
    [["lavadero", "lavanderia", "tintoreria"], '["shop"~"laundry|dry_cleaning"]'],
    [["notaria", "escribania", "estudio juridico"], '["office"~"lawyer|notary"]'],
    [["contador", "contaduria", "estudio contable"], '["office"="accountant"]'],
    [["agencia de viajes", "turismo"], '["shop"="travel_agency"]'],
    [["autopartes", "repuesto"], '["shop"="car_parts"]'],
    [["concesionaria", "automotriz"], '["shop"~"car|motorcycle"]'],
    [["fruteria", "verduleria"], '["shop"~"greengrocer|fruits"]'],
    [["carniceria", "carnicero"], '["shop"="butcher"]'],
    [["pintureria"], '["shop"="paint"]'],
    [["cerrajeria", "cerrajero"], '["shop"="locksmith"]'],
    [["gasolinera", "nafta", "combustible", "ypf", "shell", "axion"], '["amenity"="fuel"]'],
    [["estacionamiento", "playa de estacionamiento"], '["amenity"="parking"]'],
    [["escuela", "colegio"], '["amenity"~"school|kindergarten"]'],
    [["universidad", "instituto"], '["amenity"~"university|college"]'],
    [["iglesia", "templo"], '["amenity"~"place_of_worship"]'],
    [["supermercado chino", "chino"], '["shop"="supermarket"]'],
  ];

  for (const [keys, tag] of mapping) {
    if (keys.some(k => q.includes(k))) {
      return [tag];
    }
  }

  const safe = query.replace(/['"]/g, "").trim();
  return [`["name"~"${safe}",i]`];
}

function buildAddress(tags: Record<string, string>): string {
  const parts: string[] = [];
  if (tags["addr:street"]) {
    parts.push(tags["addr:street"] + (tags["addr:housenumber"] ? " " + tags["addr:housenumber"] : ""));
  }
  if (tags["addr:city"]) parts.push(tags["addr:city"]);
  if (tags["addr:state"]) parts.push(tags["addr:state"]);
  return parts.join(", ") || tags["addr:full"] || "";
}

async function searchOpenStreetMap(
  query: string,
  location: string,
  maxResults: number
): Promise<PlaceResult[]> {
  const geo = await geocodeLocation(location);
  if (!geo) {
    throw new Error(
      `No se encontró la ubicación "${location}". Probá con el nombre completo de la ciudad, ej: "Neuquén Capital", "Rosario", "Córdoba".`
    );
  }

  const { lat, lon } = geo;
  const radius = 8000;
  const tags = mapQueryToOSMTags(query);

  const nodeLines = tags.map(t => `  node${t}(around:${radius},${lat},${lon});`).join("\n");
  const wayLines  = tags.map(t => `  way${t}(around:${radius},${lat},${lon});`).join("\n");
  const oql = `[out:json][timeout:30];\n(\n${nodeLines}\n${wayLines}\n);\nout body;`;

  const resp = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(oql)}`,
    signal: AbortSignal.timeout(35000),
  });

  if (!resp.ok) {
    throw new Error(
      `El servicio de mapas respondió con un error (${resp.status}). Intentá de nuevo en unos segundos.`
    );
  }

  const data = (await resp.json()) as {
    elements: Array<{
      id: number;
      type: string;
      tags?: Record<string, string>;
    }>;
  };

  const seen = new Set<string>();
  const results: PlaceResult[] = [];

  for (const el of data.elements) {
    const tags = el.tags ?? {};
    const name = tags.name || tags["name:es"] || "";
    if (!name) continue;

    const key = name.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);

    const phone = tags.phone || tags["contact:phone"] || tags["phone:mobile"] || "";
    const rawWeb = tags.website || tags["contact:website"] || tags["url"] || "";
    const website = rawWeb
      ? rawWeb.startsWith("http") ? rawWeb : "https://" + rawWeb
      : "";

    results.push({
      id: `osm_${el.type}_${el.id}`,
      name,
      address: buildAddress(tags),
      phone,
      website,
      rating: 0,
      reviews: 0,
      status: "OPERATIONAL",
      source: "openstreetmap",
    });

    if (results.length >= maxResults) break;
  }

  return results;
}

/* ─────────────────────────────────────────────────────────────
   Google Places API oficial
   Requiere API key propia — datos más ricos y estables
   ───────────────────────────────────────────────────────────── */

async function searchGooglePlaces(
  query: string,
  location: string,
  maxResults: number,
  apiKey: string
): Promise<PlaceResult[]> {
  const url = "https://places.googleapis.com/v1/places:searchText";
  const body = {
    textQuery: `${query} en ${location}`,
    maxResultCount: Math.min(maxResults, 20),
    languageCode: "es",
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber," +
        "places.websiteUri,places.rating,places.userRatingCount,places.businessStatus",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Google Places API error ${resp.status}: ${text}`);
  }

  const data = (await resp.json()) as {
    places?: {
      id?: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      nationalPhoneNumber?: string;
      websiteUri?: string;
      rating?: number;
      userRatingCount?: number;
      businessStatus?: string;
    }[];
  };

  return (data.places ?? []).map((p, i) => ({
    id: p.id ?? `gpl_${i}`,
    name: p.displayName?.text ?? "Sin nombre",
    address: p.formattedAddress ?? "",
    phone: p.nationalPhoneNumber ?? "",
    website: p.websiteUri ?? "",
    rating: p.rating ?? 0,
    reviews: p.userRatingCount ?? 0,
    status: p.businessStatus ?? "UNKNOWN",
    source: "google" as const,
  }));
}

/* ─── Routes ─── */

router.post("/prospector/search", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  const {
    query = "restaurante",
    location = "Neuquén Capital",
    maxResults = 20,
  } = req.body as { query?: string; location?: string; maxResults?: number };

  const [userConfig] = await db
    .select({ googleMapsApiKey: chatbotConfigsTable.googleMapsApiKey })
    .from(chatbotConfigsTable)
    .where(eq(chatbotConfigsTable.userId, (req.user as { id: string }).id))
    .limit(1);

  const googleApiKey =
    userConfig?.googleMapsApiKey?.trim() || process.env.GOOGLE_MAPS_API_KEY || "";

  // ① Google Places API oficial (si hay key)
  if (googleApiKey) {
    try {
      const results = await searchGooglePlaces(
        String(query),
        String(location),
        Number(maxResults),
        googleApiKey
      );
      res.json({ results, demo: false, source: "google_api", total: results.length });
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      res.status(500).json({ error: message });
      return;
    }
  }

  // ② Google Maps interno (sin key, con datos reales de Maps)
  try {
    const results = await searchGoogleMapsInternal(
      String(query),
      String(location),
      Number(maxResults)
    );
    res.json({ results, demo: false, source: "google_maps", total: results.length });
    return;
  } catch (gmapsErr) {
    // Log para debugging interno (no exponer al cliente)
    console.warn(
      "[prospector] Google Maps interno falló, usando OSM como fallback:",
      gmapsErr instanceof Error ? gmapsErr.message : gmapsErr
    );
  }

  // ③ OpenStreetMap como fallback confiable
  try {
    const results = await searchOpenStreetMap(
      String(query),
      String(location),
      Number(maxResults)
    );
    res.json({ results, demo: false, source: "openstreetmap", total: results.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.warn("[prospector] OSM también falló:", message);
    // Devolver resultado vacío en lugar de 500 — los servicios externos pueden estar caídos
    res.json({ results: [], demo: false, source: "none", total: 0, warning: message });
  }
});

router.post("/prospector/import", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  const userId = (req.user as { id: string }).id;
  const { leads } = req.body as {
    leads?: Array<{
      id: string;
      name: string;
      address: string;
      phone: string;
      website: string;
      rating: number;
      reviews: number;
      status: string;
      source?: string;
    }>;
  };

  if (!Array.isArray(leads) || leads.length === 0) {
    res.status(400).json({ error: "Se requiere al menos un lead" });
    return;
  }

  let imported = 0;
  let duplicates = 0;

  for (const lead of leads) {
    const phone = lead.phone?.trim() || `sin-tel-${lead.id}`;

    const existing = await db
      .select({ id: conversationsTable.id })
      .from(conversationsTable)
      .where(
        and(
          eq(conversationsTable.userId, userId),
          eq(conversationsTable.phoneNumber, phone)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      duplicates++;
      continue;
    }

    const noteParts: string[] = [];
    if (lead.address) noteParts.push(`Dirección: ${lead.address}`);
    if (lead.website) noteParts.push(`Web: ${lead.website}`);
    if (lead.rating > 0)
      noteParts.push(`Rating: ${lead.rating.toFixed(1)} ★ (${lead.reviews} reseñas)`);
    const srcLabel =
      lead.source === "google_maps" || lead.source === "google_api"
        ? "Google Maps"
        : "OpenStreetMap";
    noteParts.push(`Origen: ${srcLabel} · Prospector`);

    await db.insert(conversationsTable).values({
      id: crypto.randomUUID(),
      userId,
      phoneNumber: phone,
      contactName: lead.name || null,
      channel: "prospector",
      leadStatus: "nuevo",
      leadNotes: noteParts.join(" | "),
      lastMessageAt: new Date(),
    });

    imported++;
  }

  res.json({ imported, duplicates, total: leads.length });
});

export default router;

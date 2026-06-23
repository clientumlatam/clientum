---
name: AFIP + MCP Server implementation
description: Key decisions and gotchas for the AFIP electronic invoicing integration and MCP server added to Clientum
---

## AFIP (Facturación Electrónica)

**Why node-forge:** AFIP WSAA requires a CMS/PKCS#7 SignedData structure (not just raw RSA signing). `node-forge` handles this correctly. Native `crypto` module cannot produce PKCS#7 envelopes without extra libraries.

**Token caching:** `getToken()` in `lib/afip/wsaa.ts` checks `tokenExpiry` with a 5-minute buffer before requesting a new token. Tokens are cached in `afip_configs` table.

**WSFE SOAP calls:** Implemented as raw XML over axios (no SOAP library). AFIP's WSDL is stable — raw XML is simpler and lighter than `soap` package.

**Plan gate:** AFIP routes require `business` or `enterprise` plan. Free/Starter/Pro get 403.

**DB tables:** `afip_configs` (one per userId, UNIQUE constraint) + `afip_comprobantes` (list of issued invoices with CAE).

**IVA items:** `buildIvaItems()` in `wsfe.ts` — if no explicit `iva21Neto`/`iva105Neto` provided but `impIva > 0`, defaults to AlicIva Id=5 (21%).

**Environments:** "homologacion" → wswhomo.afip.gov.ar / wsaahomo.afip.gov.ar | "produccion" → servicios1.afip.gov.ar / wsaa.afip.gov.ar

## MCP Server

**Transport:** `StreamableHTTPServerTransport` from `@modelcontextprotocol/sdk/server/streamableHttp.js`. Sessions stored in `Map<string, StreamableHTTPServerTransport>` keyed by `mcp-session-id` header.

**Auth:** Bearer token (`MCP_API_KEY` env var) OR active Replit session cookie. Both work.

**Route:** `/mcp` (POST = new session or message, GET = SSE stream, DELETE = close session). Discovery endpoint at `/mcp/tools` (no auth needed for GET).

**Tools defined:** list_leads, create_lead, update_lead_stage, list_appointments, create_appointment, get_crm_summary, get_appointments_summary.

**Direct DB:** MCP tools query DB directly (not via HTTP) — same process, no auth overhead.

**Missing from MCP create_lead:** userId is hardcoded to "mcp" — tools create data without user attribution. Fine for agent use cases.

## Dependencies added to api-server
- `axios` — for AFIP SOAP calls
- `zod` — for MCP tool schema validation
- `node-forge` — for PKCS#7 signing
- `@modelcontextprotocol/sdk` — MCP server

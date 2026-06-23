import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@workspace/replit-auth-web";

// ── Types ────────────────────────────────────────────────────────────────────

interface AdminUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: "user" | "admin";
  createdAt: string;
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  mpPaymentId: string | null;
}

interface WcTenant {
  id: string;
  storeName: string;
  wcBaseUrl: string;
  wcKey: string;
  wcSecret: string;
  openrouterKey: string;
  openrouterModel: string | null;
  groqKey: string | null;
  openaiKey: string | null;
  storeLanguage: string | null;
  evolutionInstance: string | null;
  evolutionApiUrl: string | null;
  evolutionApiKey: string | null;
  systemPromptOverride: string | null;
  agentNotifyJid: string | null;
  active: boolean;
  createdAt: string;
}

type WcTenantFormData = {
  id: string; storeName: string; wcBaseUrl: string; wcKey: string; wcSecret: string;
  openrouterKey: string; openrouterModel: string; groqKey: string; openaiKey: string;
  storeLanguage: string; evolutionInstance: string; evolutionApiUrl: string;
  evolutionApiKey: string; systemPromptOverride: string; agentNotifyJid: string;
};

interface AdminAfipRow {
  userId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  cuit: string | null;
  razonSocial: string | null;
  puntoVenta: number | null;
  environment: string;
  tokenExpiry: string | null;
  tokenHorasRestantes: number | null;
  certDiasRestantes: number | null;
  hasCert: boolean;
  totalComprobantes: number;
  ultimoComprobante: string | null;
  updatedAt: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const PLANS = ["free", "starter", "pro", "business", "enterprise"] as const;
type PlanKey = typeof PLANS[number];

const PLAN_META: Record<string, { label: string; accent: string; bg: string }> = {
  free:       { label: "Free",       accent: "#6b7280", bg: "bg-silver/10" },
  starter:    { label: "Starter",    accent: "#031E43", bg: "bg-cl-blue/10" },
  pro:        { label: "Pro",        accent: "#2dd8a0", bg: "bg-cl-accent/10" },
  business:   { label: "Business",  accent: "#f59e0b", bg: "bg-yellow-400/10" },
  enterprise: { label: "Enterprise", accent: "#a855f7", bg: "bg-purple-400/10" },
  none:       { label: "Sin plan",   accent: "#4b5563", bg: "bg-silver/10" },
  trialing:   { label: "Prueba",     accent: "#f59e0b", bg: "bg-yellow-400/10" },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string | null) {
  if (!d) return "—";
  const date = new Date(d);
  if (date.getFullYear() > 2100) return "Sin vencimiento";
  return date.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateShort(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function PlanBadge({ plan, status }: { plan: string; status: string }) {
  const key = status === "trialing" ? "trialing" : plan;
  const m = PLAN_META[key] ?? PLAN_META.none;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${m.bg}`}
      style={{ color: m.accent }}>
      {m.label}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  if (status === "active") return (
    <span className="flex items-center gap-1.5 text-cl-accent text-xs font-semibold">
      <span className="w-1.5 h-1.5 rounded-full bg-cl-accent animate-pulse inline-block" />Activo
    </span>
  );
  if (status === "trialing") return (
    <span className="flex items-center gap-1.5 text-yellow-400 text-xs font-semibold">
      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse inline-block" />Prueba
    </span>
  );
  return <span className="text-cool-steel/55 text-xs">{status === "none" ? "Sin suscripción" : status}</span>;
}

// token: verde >8h · amarillo 1-8h · rojo ≤0h / null
function TokenBadge({ horas }: { horas: number | null }) {
  if (horas === null) return <span className="text-cool-steel/40 text-xs">Sin token</span>;
  if (horas <= 0)  return <span className="flex items-center gap-1 text-red-400 text-xs font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />Expirado</span>;
  if (horas <= 8)  return <span className="flex items-center gap-1 text-yellow-400 text-xs font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse inline-block" />{horas}h</span>;
  return <span className="flex items-center gap-1 text-cl-accent text-xs font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-cl-accent inline-block" />{horas}h</span>;
}

// cert: verde >60d · amarillo 8-60d · rojo ≤7d / null
function CertBadge({ dias }: { dias: number | null }) {
  if (dias === null) return <span className="text-cool-steel/40 text-xs">Sin cert</span>;
  if (dias <= 0)   return <span className="flex items-center gap-1 text-red-400 text-xs font-semibold"><i className="ti ti-certificate-off text-sm" />Expirado</span>;
  if (dias <= 7)   return <span className="flex items-center gap-1 text-red-400 text-xs font-semibold"><i className="ti ti-certificate text-sm" />{dias}d</span>;
  if (dias <= 60)  return <span className="flex items-center gap-1 text-yellow-400 text-xs font-semibold"><i className="ti ti-certificate text-sm" />{dias}d</span>;
  return <span className="flex items-center gap-1 text-cl-accent text-xs font-semibold"><i className="ti ti-certificate text-sm" />{dias}d</span>;
}

function EnvBadge({ env }: { env: string }) {
  if (env === "produccion") return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cl-accent/10 text-cl-accent">Producción</span>;
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-400/10 text-yellow-400">Homologación</span>;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const [users, setUsers]         = useState<AdminUser[]>([]);
  const [total, setTotal]         = useState(0);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [afipRows, setAfipRows]   = useState<AdminAfipRow[]>([]);
  const [loadingAfip, setLoadingAfip] = useState(false);
  const [renewingId, setRenewingId]   = useState<string | null>(null);
  const [renewingAll, setRenewingAll] = useState(false);
  const [renewResult, setRenewResult] = useState<{ ok: number; error: number } | null>(null);

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [tab, setTab]   = useState<"users" | "afip" | "system" | "deploy" | "handoffs" | "prompts" | "tenants">("users");
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [afipSearch, setAfipSearch] = useState("");

  const [deployGroup, setDeployGroup]   = useState("docs");
  const [deployDoc, setDeployDoc]       = useState("docs/produccion-checklist.md");
  const [deployContent, setDeployContent] = useState<string | null>(null);
  const [deployLoading, setDeployLoading] = useState(false);
  const [health, setHealth]             = useState<{ status: string; db: string; ts: string } | null>(null);

  const [termScript, setTermScript]   = useState("status");
  const [termLines, setTermLines]     = useState<string[]>([]);
  const [termRunning, setTermRunning] = useState(false);
  const termESRef  = useRef<EventSource | null>(null);
  const termEndRef = useRef<HTMLDivElement | null>(null);

  const [alertCfg, setAlertCfg]       = useState<{
    enabled: boolean; phone: string;
    dbStatus: "ok" | "error" | null;
    consecutiveErrors: number;
    lastAlertAt: number | null;
    lastCheckAt: number | null;
  } | null>(null);
  const [alertPhone, setAlertPhone]   = useState("");
  const [alertSaving, setAlertSaving] = useState(false);
  const [alertTesting, setAlertTesting] = useState(false);
  const [alertTestMsg, setAlertTestMsg] = useState<string | null>(null);

  type AlertLog = {
    id: string; type: string; status: string; message: string;
    phone: string; sent: boolean; error: string | null; createdAt: string;
  };
  const [alertLogs, setAlertLogs]     = useState<AlertLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // ── Handoffs state ───────────────────────────────────────────────────────────
  type Handoff = { id: number; tenantId: string; sessionId: number; waJid: string; reason: string; status: string; summary: string; createdAt: string; };
  type Tenant  = { id: string; storeName: string; evolutionInstance: string; active: boolean; systemPromptOverride?: string; };
  const [handoffs, setHandoffs]           = useState<Handoff[]>([]);
  const [handoffFilter, setHandoffFilter] = useState("pending");
  const [handoffsLoading, setHandoffsLoading] = useState(false);
  const [tenants, setTenants]             = useState<Tenant[]>([]);
  const [tenantsLoading, setTenantsLoading]   = useState(false);
  const [promptTenant, setPromptTenant]   = useState("");
  const [promptText, setPromptText]       = useState("");
  const [promptSaving, setPromptSaving]   = useState(false);
  const [promptSaved, setPromptSaved]     = useState(false);

  const DEFAULT_PROMPT = `Sos el asistente de atención al cliente de {storeName}.\nIdioma: es-AR. Usá lenguaje informal argentino (vos, -ás).\n\nReglas:\n1. Nunca inventes info de pedidos.\n2. Para devoluciones, escalá a un agente humano.\n3. Respondé en menos de 3 oraciones.`;
  const PROMPT_VARS = ["{storeName}", "{orderCount}", "{totalSpent}", "{favoriteCategories}", "{customerEmail}", "{sentiment}", "{toneInstruction}"];

  // ── WC Tenants CRUD state ──────────────────────────────────────────────────
  const BLANK_FORM: WcTenantFormData = {
    id: "", storeName: "", wcBaseUrl: "", wcKey: "", wcSecret: "",
    openrouterKey: "", openrouterModel: "deepseek/deepseek-r1:free", groqKey: "", openaiKey: "",
    storeLanguage: "es-AR", evolutionInstance: "", evolutionApiUrl: "", evolutionApiKey: "",
    systemPromptOverride: "", agentNotifyJid: "",
  };
  const [wcTenants, setWcTenants]         = useState<WcTenant[]>([]);
  const [wcTenantsLoading, setWcTenantsLoading] = useState(false);
  const [wcFormOpen, setWcFormOpen]       = useState(false);
  const [wcFormEditing, setWcFormEditing] = useState<string | null>(null);
  const [wcForm, setWcForm]               = useState<WcTenantFormData>(BLANK_FORM);
  const [wcFormSaving, setWcFormSaving]   = useState(false);
  const [wcFormError, setWcFormError]     = useState<string | null>(null);
  const [wcDeleteId, setWcDeleteId]       = useState<string | null>(null);

  const loadHandoffs = useCallback(async () => {
    setHandoffsLoading(true);
    try {
      const r = await fetch(`/api/admin/handoffs?status=${handoffFilter}`, { credentials: "include" });
      if (r.ok) setHandoffs(await r.json());
    } catch { /* ignore */ } finally { setHandoffsLoading(false); }
  }, [handoffFilter]);

  const loadTenants = useCallback(async () => {
    setTenantsLoading(true);
    try {
      const r = await fetch("/api/admin/tenants", { credentials: "include" });
      if (r.ok) setTenants(await r.json());
    } catch { /* ignore */ } finally { setTenantsLoading(false); }
  }, []);

  const loadWcTenants = useCallback(async () => {
    setWcTenantsLoading(true);
    try {
      const r = await fetch("/api/admin/wc-tenants", { credentials: "include" });
      if (r.ok) setWcTenants(await r.json());
    } catch { /* ignore */ } finally { setWcTenantsLoading(false); }
  }, []);

  useEffect(() => { if (tab === "handoffs" && !isLoading && user?.role === "admin") loadHandoffs(); }, [tab, handoffFilter, isLoading, user, loadHandoffs]);
  useEffect(() => { if (tab === "prompts" && !isLoading && user?.role === "admin") loadTenants(); }, [tab, isLoading, user, loadTenants]);
  useEffect(() => { if (tab === "tenants" && !isLoading && user?.role === "admin") loadWcTenants(); }, [tab, isLoading, user, loadWcTenants]);
  useEffect(() => {
    if (!promptTenant) return;
    const t = tenants.find(t => t.id === promptTenant);
    setPromptText(t?.systemPromptOverride ?? DEFAULT_PROMPT);
  }, [promptTenant, tenants]); // eslint-disable-line react-hooks/exhaustive-deps

  const resolveHandoff = async (h: Handoff) => {
    await fetch(`/api/admin/tenants/${h.tenantId}/sessions/${h.sessionId}/handoff/resolve`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ takenBy: "admin" }),
    });
    loadHandoffs();
  };

  const savePrompt = async () => {
    if (!promptTenant) return;
    setPromptSaving(true);
    await fetch(`/api/admin/tenants/${promptTenant}/prompt`, {
      method: "PUT", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemPromptOverride: promptText }),
    });
    setPromptSaving(false); setPromptSaved(true);
    setTimeout(() => setPromptSaved(false), 2000);
  };

  // ── WC Tenants handlers ────────────────────────────────────────────────────
  const openWcCreate = () => {
    setWcForm(BLANK_FORM);
    setWcFormEditing(null);
    setWcFormError(null);
    setWcFormOpen(true);
  };

  const openWcEdit = (t: WcTenant) => {
    setWcForm({
      id: t.id,
      storeName: t.storeName,
      wcBaseUrl: t.wcBaseUrl,
      wcKey: t.wcKey,
      wcSecret: t.wcSecret,
      openrouterKey: t.openrouterKey,
      openrouterModel: t.openrouterModel ?? "",
      groqKey: t.groqKey ?? "",
      openaiKey: t.openaiKey ?? "",
      storeLanguage: t.storeLanguage ?? "es-AR",
      evolutionInstance: t.evolutionInstance ?? "",
      evolutionApiUrl: t.evolutionApiUrl ?? "",
      evolutionApiKey: t.evolutionApiKey ?? "",
      systemPromptOverride: t.systemPromptOverride ?? "",
      agentNotifyJid: t.agentNotifyJid ?? "",
    });
    setWcFormEditing(t.id);
    setWcFormError(null);
    setWcFormOpen(true);
  };

  const saveWcTenant = async () => {
    if (!wcForm.id || !wcForm.storeName) {
      setWcFormError("ID y nombre de tienda son requeridos."); return;
    }
    setWcFormSaving(true);
    setWcFormError(null);
    try {
      const body = {
        ...wcForm,
        openrouterModel: wcForm.openrouterModel || null,
        groqKey: wcForm.groqKey || null,
        openaiKey: wcForm.openaiKey || null,
        evolutionInstance: wcForm.evolutionInstance || null,
        evolutionApiUrl: wcForm.evolutionApiUrl || null,
        evolutionApiKey: wcForm.evolutionApiKey || null,
        systemPromptOverride: wcForm.systemPromptOverride || null,
        agentNotifyJid: wcForm.agentNotifyJid || null,
      };
      const url = wcFormEditing ? `/api/admin/wc-tenants/${wcFormEditing}` : "/api/admin/wc-tenants";
      const method = wcFormEditing ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
      if (!r.ok) {
        const d = await r.json() as { error?: string };
        setWcFormError(d.error ?? "Error al guardar"); return;
      }
      setWcFormOpen(false);
      loadWcTenants();
    } finally { setWcFormSaving(false); }
  };

  const toggleWcTenant = async (id: string) => {
    await fetch(`/api/admin/wc-tenants/${id}/toggle`, { method: "PATCH", credentials: "include" });
    loadWcTenants();
  };

  const deleteWcTenant = async (id: string) => {
    await fetch(`/api/admin/wc-tenants/${id}`, { method: "DELETE", credentials: "include" });
    setWcDeleteId(null);
    loadWcTenants();
  };

  const minutesAgo = (iso: string) => {
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h`;
  };

  const isAdmin = !isLoading && user?.role === "admin";

  // ── Load users ──────────────────────────────────────────────────────────────
  const loadUsers = useCallback(() => {
    setLoadingUsers(true);
    fetch("/api/admin/users", { credentials: "include" })
      .then(r => r.json())
      .then((d: { users: AdminUser[]; total: number }) => {
        setUsers(d.users ?? []);
        setTotal(d.total ?? 0);
        setLoadingUsers(false);
      })
      .catch(() => setLoadingUsers(false));
  }, []);

  // ── Load AFIP ───────────────────────────────────────────────────────────────
  const loadAfip = useCallback(() => {
    setLoadingAfip(true);
    fetch("/api/admin/afip", { credentials: "include" })
      .then(r => r.json())
      .then((d: { configs: AdminAfipRow[] }) => {
        setAfipRows(d.configs ?? []);
        setLoadingAfip(false);
      })
      .catch(() => setLoadingAfip(false));
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    loadUsers();
  }, [isAdmin, loadUsers]);

  useEffect(() => {
    if (!isAdmin || tab !== "afip") return;
    loadAfip();
  }, [isAdmin, tab, loadAfip]);

  const stopCommand = useCallback(() => {
    if (termESRef.current) { termESRef.current.close(); termESRef.current = null; }
    setTermRunning(false);
  }, []);

  const runCommand = useCallback((script: string) => {
    stopCommand();
    setTermLines([]);
    setTermRunning(true);
    const es = new EventSource(`/api/admin/exec?script=${encodeURIComponent(script)}`);
    termESRef.current = es;
    es.onmessage = (e) => {
      if (e.data === "__EOF__") { es.close(); termESRef.current = null; setTermRunning(false); return; }
      try {
        const line = JSON.parse(e.data) as string;
        setTermLines(prev => [...prev.slice(-500), line]);
      } catch { /* ignore parse errors */ }
    };
    es.onerror = () => { es.close(); termESRef.current = null; setTermRunning(false); };
  }, [stopCommand]);

  useEffect(() => {
    termEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [termLines]);

  useEffect(() => { return () => stopCommand(); }, [stopCommand]);

  const loadAlertCfg = useCallback(() => {
    fetch("/api/admin/health-alerts", { credentials: "include" })
      .then(r => r.json())
      .then((d: typeof alertCfg) => { setAlertCfg(d); setAlertPhone(d?.phone ?? ""); })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAlertLogs = useCallback(() => {
    setLogsLoading(true);
    fetch("/api/admin/health-alerts/logs?limit=50", { credentials: "include" })
      .then(r => r.json())
      .then((d: { logs: AlertLog[] }) => setAlertLogs(d.logs ?? []))
      .catch(() => {})
      .finally(() => setLogsLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const saveAlertCfg = async (patch: { enabled?: boolean; phone?: string }) => {
    setAlertSaving(true);
    try {
      const r = await fetch("/api/admin/health-alerts", {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const d = await r.json() as typeof alertCfg;
      setAlertCfg(d); setAlertPhone(d?.phone ?? "");
    } finally { setAlertSaving(false); }
  };

  const testAlert = async () => {
    setAlertTesting(true); setAlertTestMsg(null);
    try {
      const r = await fetch("/api/admin/health-alerts/test", { method: "POST", credentials: "include" });
      const d = await r.json() as { ok?: boolean; error?: string };
      setAlertTestMsg(d.ok ? "✅ Mensaje de prueba enviado" : `❌ ${d.error ?? "Error"}`);
    } catch { setAlertTestMsg("❌ Error de red"); }
    finally { setAlertTesting(false); setTimeout(() => setAlertTestMsg(null), 5000); }
  };

  const manualCheck = async () => {
    await fetch("/api/admin/health-alerts/check", { method: "POST", credentials: "include" });
    loadAlertCfg();
  };

  useEffect(() => {
    if (!isAdmin || tab !== "deploy") return;
    loadAlertCfg();
    loadAlertLogs();
  }, [isAdmin, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isAdmin || tab !== "deploy") return;
    fetch("/api/healthz", { credentials: "include" })
      .then(r => r.json())
      .then((d: { status: string; db: string; ts: string }) => setHealth(d))
      .catch(() => setHealth({ status: "error", db: "unknown", ts: new Date().toISOString() }));
  }, [isAdmin, tab]);

  useEffect(() => {
    if (!isAdmin || tab !== "deploy") return;
    setDeployLoading(true);
    setDeployContent(null);
    fetch(`/api/admin/docs/${deployDoc}`, { credentials: "include" })
      .then(r => r.text())
      .then(text => { setDeployContent(text); setDeployLoading(false); })
      .catch(() => { setDeployContent("Error al cargar el documento."); setDeployLoading(false); });
  }, [isAdmin, tab, deployDoc]);

  // ── Renovar token ────────────────────────────────────────────────────────────
  const handleRenew = async (userId: string) => {
    setRenewingId(userId);
    try {
      await fetch(`/api/admin/afip/${userId}/renovar-token`, { method: "POST", credentials: "include" });
      loadAfip();
    } finally {
      setRenewingId(null);
    }
  };

  const handleRenewAll = async () => {
    setRenewingAll(true);
    setRenewResult(null);
    try {
      const r = await fetch("/api/admin/afip/renovar-todos", { method: "POST", credentials: "include" });
      const d = await r.json() as { ok: number; error: number };
      setRenewResult({ ok: d.ok, error: d.error });
      loadAfip();
    } finally {
      setRenewingAll(false);
    }
  };

  // ── Change plan ──────────────────────────────────────────────────────────────
  const handlePlanChange = async (userId: string, plan: string) => {
    setUpdatingId(userId);
    try {
      await fetch(`/api/admin/users/${userId}/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan, status: "active" }),
      });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan, status: "active" } : u));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRoleChange = async (userId: string, newRole: "user" | "admin") => {
    setUpdatingId(userId);
    try {
      const r = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: newRole }),
      });
      if (r.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      }
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Guard ────────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-cl-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
        <div className="w-16 h-16 rounded-2xl bg-red-400/10 flex items-center justify-center">
          <i className="ti ti-shield-lock text-3xl text-red-400" />
        </div>
        <div className="text-center">
          <h2 className="text-white font-bold text-lg">Acceso restringido</h2>
          <p className="text-cool-steel text-sm mt-1">Esta sección es solo para administradores de Clientum.</p>
        </div>
      </div>
    );
  }

  // ── Filtered lists ────────────────────────────────────────────────────────────
  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || (u.email ?? "").toLowerCase().includes(q)
      || (u.firstName ?? "").toLowerCase().includes(q)
      || (u.lastName ?? "").toLowerCase().includes(q);
    const matchPlan = filterPlan === "all"
      || (filterPlan === "trialing" ? u.status === "trialing" : u.plan === filterPlan);
    return matchSearch && matchPlan;
  });

  const filteredAfip = afipRows.filter(r => {
    const q = afipSearch.toLowerCase();
    return !q
      || (r.email ?? "").toLowerCase().includes(q)
      || (r.cuit ?? "").includes(q)
      || (r.razonSocial ?? "").toLowerCase().includes(q);
  });

  // ── Stats ─────────────────────────────────────────────────────────────────────
  const userStats = [
    { label: "Total usuarios",   value: total,                                                                                         icon: "ti-users",     accent: "#031E43" },
    { label: "Enterprise / Biz", value: users.filter(u => u.plan === "enterprise" || u.plan === "business").length,                    icon: "ti-crown",     accent: "#a855f7" },
    { label: "Pro",              value: users.filter(u => u.plan === "pro").length,                                                    icon: "ti-star",      accent: "#2dd8a0" },
    { label: "En prueba",        value: users.filter(u => u.status === "trialing").length,                                             icon: "ti-clock",     accent: "#f59e0b" },
    { label: "Starter",          value: users.filter(u => u.plan === "starter").length,                                                icon: "ti-bolt",      accent: "#3b82f6" },
    { label: "Free / Sin plan",  value: users.filter(u => !u.plan || u.plan === "free" || u.plan === "none").length,                   icon: "ti-lock-open", accent: "#6b7280" },
  ];

  const afipTokenOk      = afipRows.filter(r => r.tokenHorasRestantes !== null && r.tokenHorasRestantes > 8).length;
  const afipTokenWarn    = afipRows.filter(r => r.tokenHorasRestantes !== null && r.tokenHorasRestantes > 0 && r.tokenHorasRestantes <= 8).length;
  const afipTokenExp     = afipRows.filter(r => r.tokenHorasRestantes !== null && r.tokenHorasRestantes <= 0).length;
  const afipCertExp30    = afipRows.filter(r => r.certDiasRestantes !== null && r.certDiasRestantes <= 30 && r.certDiasRestantes > 0).length;
  const afipCertExpired  = afipRows.filter(r => r.certDiasRestantes !== null && r.certDiasRestantes <= 0).length;
  const afipTotalComp    = afipRows.reduce((sum, r) => sum + r.totalComprobantes, 0);

  const TABS = [
    { id: "users",     label: "Usuarios",      icon: "ti-users" },
    { id: "afip",      label: "AFIP",          icon: "ti-building-bank" },
    { id: "handoffs",  label: "Handoffs",      icon: "ti-bell" },
    { id: "prompts",   label: "Prompts",       icon: "ti-brain" },
    { id: "tenants",   label: "Tenants",       icon: "ti-building-store" },
    { id: "system",    label: "Sistema",       icon: "ti-server" },
    { id: "deploy",    label: "Deploy",        icon: "ti-brand-ubuntu" },
  ] as const;

  const DEPLOY_DOCS_GROUPED: Record<string, { label: string; icon: string; files: { file: string; label: string; icon: string }[] }> = {
    docs: { label: "Docs", icon: "ti-file-text", files: [
      { file: "docs/produccion-checklist.md", label: "Producción",    icon: "ti-rocket" },
      { file: "docs/CHECKLIST.md",            label: "Checklist",     icon: "ti-checklist" },
      { file: "docs/comandos-rapidos.md",     label: "Comandos",      icon: "ti-terminal-2" },
      { file: "docs/setup-local.md",          label: "Setup local",   icon: "ti-home" },
      { file: "docs/PUBLICAR-CLOUDFLARE.md",  label: "Cloudflare",    icon: "ti-cloud" },
      { file: "docs/setup-evolution.md",      label: "Evolution API", icon: "ti-brand-whatsapp" },
      { file: "docs/CLEANUP-LOG.md",          label: "Cleanup Log",   icon: "ti-history" },
    ]},
    afip: { label: "AFIP", icon: "ti-building-bank", files: [
      { file: "docs/afip/informe-afip-parte1.md", label: "Parte 1",     icon: "ti-file-description" },
      { file: "docs/afip/informe-afip-parte2.md", label: "Parte 2",     icon: "ti-file-description" },
      { file: "docs/afip/conector_afip_api.py",   label: "Conector .py",icon: "ti-brand-python" },
    ]},
    frappe: { label: "Frappe", icon: "ti-topology-star", files: [
      { file: "docs/frappe/frappe-estrategia.md",    label: "Estrategia",    icon: "ti-target" },
      { file: "docs/frappe/frappe-repos.md",         label: "Repos",         icon: "ti-brand-github" },
      { file: "docs/frappe/frappe-repos-resumen.md", label: "Repos Resumen", icon: "ti-brand-github" },
    ]},
    brand: { label: "Brand", icon: "ti-palette", files: [
      { file: "docs/brand/brand-style-guide.html",     label: "Style Guide", icon: "ti-palette" },
      { file: "docs/brand/brand-preview.html",         label: "Preview",     icon: "ti-eye" },
      { file: "docs/brand/pasted-react-component.txt", label: "Componente",  icon: "ti-components" },
    ]},
    setup: { label: "Setup", icon: "ti-rocket", files: [
      { file: "scripts-ubuntu-v10/README.md",                    label: "README",             icon: "ti-file-text" },
      { file: "scripts-ubuntu-v10/Makefile",                     label: "Makefile",           icon: "ti-hammer" },
      { file: "scripts-ubuntu-v10/.env.example",                 label: ".env",               icon: "ti-settings" },
      { file: "scripts-ubuntu-v10/.env.production.example",      label: ".env producción",    icon: "ti-settings-2" },
      { file: "scripts-ubuntu-v10/ubuntu-local.env.example",     label: ".env local",         icon: "ti-settings" },
      { file: "scripts-ubuntu-v10/setup/setup-completo.sh",      label: "setup-completo",     icon: "ti-player-play" },
      { file: "scripts-ubuntu-v10/setup/instalar-servicios.sh",  label: "instalar-servicios", icon: "ti-player-play" },
      { file: "scripts-ubuntu-v10/setup/setup-nginx.sh",         label: "nginx",              icon: "ti-player-play" },
      { file: "scripts-ubuntu-v10/setup/setup-tunnel.sh",        label: "tunnel",             icon: "ti-player-play" },
    ]},
    ops: { label: "Ops", icon: "ti-refresh", files: [
      { file: "scripts-ubuntu-v10/ops/start.sh",   label: "start",   icon: "ti-player-play" },
      { file: "scripts-ubuntu-v10/ops/stop.sh",    label: "stop",    icon: "ti-player-stop" },
      { file: "scripts-ubuntu-v10/ops/rebuild.sh", label: "rebuild", icon: "ti-hammer" },
      { file: "scripts-ubuntu-v10/ops/update.sh",  label: "update",  icon: "ti-refresh" },
    ]},
    monitoreo: { label: "Monitoreo", icon: "ti-activity", files: [
      { file: "scripts-ubuntu-v10/monitoreo/status.sh",        label: "status",         icon: "ti-activity" },
      { file: "scripts-ubuntu-v10/monitoreo/health-check.sh",  label: "health-check",   icon: "ti-heart-rate-monitor" },
      { file: "scripts-ubuntu-v10/monitoreo/diagnostico.sh",   label: "diagnostico",    icon: "ti-stethoscope" },
      { file: "scripts-ubuntu-v10/monitoreo/logs.sh",          label: "logs",           icon: "ti-file-text" },
      { file: "scripts-ubuntu-v10/monitoreo/monitoreo.sh",     label: "monitoreo",      icon: "ti-bell" },
      { file: "scripts-ubuntu-v10/monitoreo/reporte-diario.sh",label: "reporte-diario", icon: "ti-report" },
    ]},
    whatsapp: { label: "WhatsApp", icon: "ti-brand-whatsapp", files: [
      { file: "scripts-ubuntu-v10/evolution.env.example",                  label: "Evolution .env",   icon: "ti-settings" },
      { file: "scripts-ubuntu-v10/whatsapp/instalar-evolution-lite.sh",    label: "instalar-lite",    icon: "ti-player-play" },
      { file: "scripts-ubuntu-v10/whatsapp/instalar-evolution.sh",         label: "instalar-full",    icon: "ti-player-play" },
      { file: "scripts-ubuntu-v10/whatsapp/actualizar-evolution-lite.sh",  label: "actualizar",       icon: "ti-refresh" },
      { file: "scripts-ubuntu-v10/whatsapp/conectar-whatsapp.sh",          label: "conectar-wa",      icon: "ti-qrcode" },
    ]},
    db: { label: "DB", icon: "ti-database", files: [
      { file: "scripts-ubuntu-v10/db/backup-db.sh",  label: "backup",  icon: "ti-archive" },
      { file: "scripts-ubuntu-v10/db/restore-db.sh", label: "restore", icon: "ti-archive-restore" },
    ]},
    services: { label: "Services", icon: "ti-server", files: [
      { file: "scripts-ubuntu-v10/services/clientum-api.service",          label: "clientum-api",      icon: "ti-server" },
      { file: "scripts-ubuntu-v10/services/clientum-proxy.service",        label: "clientum-proxy",    icon: "ti-server" },
      { file: "scripts-ubuntu-v10/services/clientum-vite.service",         label: "clientum-vite",     icon: "ti-server" },
      { file: "scripts-ubuntu-v10/services/evolution-api-lite.service",    label: "evolution-lite",    icon: "ti-server" },
      { file: "scripts-ubuntu-v10/services/evolution-api.service",         label: "evolution-full",    icon: "ti-server" },
    ]},
  };

  const TERM_COMMANDS: { key: string; label: string; icon: string; danger?: boolean }[] = [
    { key: "status",      label: "Estado servidor",          icon: "ti-activity" },
    { key: "health",      label: "Health check",             icon: "ti-heart-rate-monitor" },
    { key: "diagnostico", label: "Diagnóstico",              icon: "ti-stethoscope" },
    { key: "logs-api",    label: "Logs API",                 icon: "ti-file-text" },
    { key: "logs-evo",    label: "Logs Evolution",           icon: "ti-brand-whatsapp" },
    { key: "migrate",     label: "Migraciones DB",           icon: "ti-database" },
    { key: "rebuild",     label: "Rebuild",                  icon: "ti-hammer", danger: true },
    { key: "update",      label: "git pull + build",         icon: "ti-refresh", danger: true },
    { key: "backup-db",   label: "Backup PostgreSQL",        icon: "ti-archive" },
  ];

  const DEPLOY_COMMANDS: { cat: string; icon: string; cmds: { cmd: string; desc: string }[] }[] = [
    { cat: "Setup inicial", icon: "ti-rocket",
      cmds: [
        { cmd: "bash scripts-ubuntu-v10/setup/setup-completo.sh",            desc: "Setup completo desde cero" },
        { cmd: "bash scripts-ubuntu-v10/setup/instalar-servicios.sh",        desc: "Reinstalar servicios systemd" },
        { cmd: "bash scripts-ubuntu-v10/setup/setup-tunnel.sh clientum.com.ar", desc: "Cloudflare Tunnel" },
        { cmd: "bash scripts-ubuntu-v10/setup/setup-nginx.sh clientum.com.ar",  desc: "Nginx + SSL" },
      ],
    },
    { cat: "Operaciones", icon: "ti-refresh",
      cmds: [
        { cmd: "bash scripts-ubuntu-v10/ops/update.sh",          desc: "git pull + build + restart" },
        { cmd: "bash scripts-ubuntu-v10/ops/rebuild.sh",         desc: "build + restart (sin git pull)" },
        { cmd: "bash scripts-ubuntu-v10/ops/stop.sh",            desc: "Detener Clientum" },
        { cmd: "bash scripts-ubuntu-v10/ops/stop.sh --all",      desc: "Detener todo (incluyendo Evolution + CF)" },
      ],
    },
    { cat: "Estado y diagnóstico", icon: "ti-stethoscope",
      cmds: [
        { cmd: "bash scripts-ubuntu-v10/monitoreo/status.sh",           desc: "Vista rápida de todos los servicios" },
        { cmd: "bash scripts-ubuntu-v10/monitoreo/health-check.sh",     desc: "Health check completo" },
        { cmd: "bash scripts-ubuntu-v10/monitoreo/diagnostico.sh",      desc: "Diagnóstico completo" },
        { cmd: "bash scripts-ubuntu-v10/monitoreo/diagnostico.sh --evolution", desc: "Diagnóstico Evolution API" },
        { cmd: "bash scripts-ubuntu-v10/monitoreo/diagnostico.sh --afip",     desc: "Diagnóstico AFIP / tokens" },
        { cmd: "bash scripts-ubuntu-v10/monitoreo/logs.sh api",               desc: "Logs API en tiempo real" },
        { cmd: "bash scripts-ubuntu-v10/monitoreo/logs.sh evo",               desc: "Logs Evolution / WhatsApp" },
      ],
    },
    { cat: "WhatsApp / Evolution", icon: "ti-brand-whatsapp",
      cmds: [
        { cmd: "bash scripts-ubuntu-v10/whatsapp/instalar-evolution-lite.sh",     desc: "Instalar Evolution Lite" },
        { cmd: "bash scripts-ubuntu-v10/whatsapp/actualizar-evolution-lite.sh",   desc: "Actualizar sin downtime" },
        { cmd: "bash scripts-ubuntu-v10/whatsapp/conectar-whatsapp.sh",           desc: "Conectar WhatsApp (QR terminal)" },
      ],
    },
    { cat: "Base de datos", icon: "ti-database",
      cmds: [
        { cmd: "bash scripts-ubuntu-v10/db/backup-db.sh",   desc: "Backup manual PostgreSQL" },
        { cmd: "bash scripts-ubuntu-v10/db/restore-db.sh",  desc: "Restaurar desde backup (interactivo)" },
        { cmd: "pnpm --filter @workspace/db run migrate",    desc: "Aplicar migraciones (producción)" },
        { cmd: "pnpm --filter @workspace/db run push",       desc: "Sync schema sin migraciones (dev)" },
      ],
    },
    { cat: "Monitoreo automático", icon: "ti-bell",
      cmds: [
        { cmd: "bash scripts-ubuntu-v10/monitoreo/monitoreo.sh --setup-cron",      desc: "Instalar cron (cada 5 min)" },
        { cmd: "bash scripts-ubuntu-v10/monitoreo/monitoreo.sh --test-alerta",     desc: "Alerta de prueba WhatsApp" },
        { cmd: "bash scripts-ubuntu-v10/monitoreo/reporte-diario.sh --setup-cron", desc: "Cron reporte diario (8am)" },
        { cmd: "bash scripts-ubuntu-v10/monitoreo/reporte-diario.sh",              desc: "Enviar reporte ahora" },
      ],
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-400/10 flex items-center justify-center">
            <i className="ti ti-shield-lock text-xl text-purple-400" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">Panel de Administración</h2>
            <p className="text-cool-steel text-xs">Solo visible para cuentas @clientum.com.ar</p>
          </div>
        </div>
        <button
          onClick={() => { loadUsers(); if (tab === "afip") loadAfip(); }}
          disabled={loadingUsers || loadingAfip}
          className="flex items-center gap-2 px-4 py-2 bg-navy-2 border border-silver/20 rounded-lg text-xs font-semibold text-cool-steel hover:text-white hover:border-silver/35 transition-all disabled:opacity-50">
          <i className={`ti ti-refresh text-sm ${(loadingUsers || loadingAfip) ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      {/* Stats row — shown on users tab */}
      {tab === "users" && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {userStats.map(s => (
            <div key={s.label} className="bg-navy-2 border border-silver/20 rounded-xl p-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: `${s.accent}20` }}>
                <i className={`ti ${s.icon} text-base`} style={{ color: s.accent }} />
              </div>
              <div className="text-2xl font-extrabold text-white">{loadingUsers ? "—" : s.value}</div>
              <div className="text-cool-steel text-[11px] mt-0.5 leading-tight">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Stats row — shown on afip tab */}
      {tab === "afip" && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {[
            { label: "Configs AFIP",     value: afipRows.length,  icon: "ti-building-bank", accent: "#031E43" },
            { label: "Tokens activos",   value: afipTokenOk,      icon: "ti-check",         accent: "#2dd8a0" },
            { label: "Tokens < 8h",      value: afipTokenWarn,    icon: "ti-clock",         accent: "#f59e0b" },
            { label: "Tokens expirados", value: afipTokenExp,     icon: "ti-x",             accent: "#f87171" },
            { label: "Certs por vencer", value: afipCertExp30,    icon: "ti-certificate",   accent: "#f59e0b" },
            { label: "Total facturas",   value: afipTotalComp,    icon: "ti-receipt",       accent: "#a855f7" },
          ].map(s => (
            <div key={s.label} className="bg-navy-2 border border-silver/20 rounded-xl p-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: `${s.accent}20` }}>
                <i className={`ti ${s.icon} text-base`} style={{ color: s.accent }} />
              </div>
              <div className="text-2xl font-extrabold text-white">{loadingAfip ? "—" : s.value}</div>
              <div className="text-cool-steel text-[11px] mt-0.5 leading-tight">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-navy-2 border border-silver/20 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              tab === t.id ? "bg-cl-accent/10 text-cl-accent" : "text-cool-steel hover:text-white"
            }`}>
            <i className={`ti ${t.icon} text-sm`} /> {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Usuarios ─────────────────────────────────────────────────── */}
      {tab === "users" && (
        <div className="bg-navy-2 border border-silver/20 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-silver/15 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-cool-steel/55 text-sm" />
              <input type="text" placeholder="Buscar por email o nombre..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full bg-navy border border-silver/20 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-cool-steel/45 focus:outline-none focus:border-cl-accent/50 transition-colors" />
            </div>
            <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)}
              className="bg-navy border border-silver/20 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cl-accent/50 transition-colors">
              <option value="all">Todos los planes</option>
              <option value="enterprise">Enterprise</option>
              <option value="business">Business</option>
              <option value="pro">Pro</option>
              <option value="starter">Starter</option>
              <option value="free">Free</option>
              <option value="none">Sin plan</option>
              <option value="trialing">⏳ En prueba</option>
            </select>
          </div>

          {loadingUsers ? (
            <div className="p-12 flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-cl-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-cool-steel text-sm">Cargando usuarios...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center">
              <i className="ti ti-search-off text-3xl text-cool-steel/40 block mb-2" />
              <p className="text-cool-steel text-sm">No se encontraron usuarios.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-silver/15">
                    {["Usuario", "Plan", "Estado", "Vencimiento", "Registro", "MP Payment ID", "Rol", "Cambiar plan"].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-cool-steel/45">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredUsers.map(u => {
                    const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || "—";
                    return (
                      <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-cl-accent/10 flex items-center justify-center text-cl-accent text-xs font-bold flex-shrink-0">
                              {name !== "—" ? name.charAt(0).toUpperCase() : "?"}
                            </div>
                            <div className="min-w-0">
                              <p className="text-white font-semibold text-xs truncate">{name}</p>
                              <p className="text-cool-steel text-[11px] truncate">{u.email ?? "Sin email"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3"><PlanBadge plan={u.plan} status={u.status} /></td>
                        <td className="px-5 py-3"><StatusDot status={u.status} /></td>
                        <td className="px-5 py-3 text-cool-steel text-xs">{formatDate(u.currentPeriodEnd)}</td>
                        <td className="px-5 py-3 text-cool-steel text-xs">{formatDate(u.createdAt)}</td>
                        <td className="px-5 py-3 text-cool-steel/55 text-[11px] font-mono">{u.mpPaymentId ?? "—"}</td>
                        <td className="px-5 py-3">
                          <button
                            disabled={updatingId === u.id || u.id === user?.id}
                            onClick={() => void handleRoleChange(u.id, u.role === "admin" ? "user" : "admin")}
                            title={u.id === user?.id ? "No puedes cambiar tu propio rol" : u.role === "admin" ? "Quitar admin" : "Promover a admin"}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border transition-all disabled:opacity-50 ${
                              u.role === "admin"
                                ? "bg-cl-accent/10 text-cl-accent border-cl-accent/30 hover:bg-red-400/10 hover:text-red-400 hover:border-red-400/30"
                                : "bg-silver/10 text-cool-steel border-silver/20 hover:bg-cl-accent/10 hover:text-cl-accent hover:border-cl-accent/30"
                            }`}
                          >
                            {u.role === "admin" ? "Admin" : "User"}
                          </button>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <select value={u.plan} disabled={updatingId === u.id}
                              onChange={e => void handlePlanChange(u.id, e.target.value)}
                              className="bg-navy border border-silver/20 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cl-accent/50 disabled:opacity-50 transition-colors">
                              {PLANS.map(p => (
                                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                              ))}
                            </select>
                            {updatingId === u.id && (
                              <div className="w-3.5 h-3.5 border-2 border-cl-accent border-t-transparent rounded-full animate-spin flex-shrink-0" />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-5 py-3 border-t border-silver/15 flex items-center justify-between">
            <p className="text-cool-steel/55 text-xs">Mostrando {filteredUsers.length} de {total} usuarios</p>
            <p className="text-cool-steel/40 text-[11px] font-mono">{user?.id}</p>
          </div>
        </div>
      )}

      {/* ── Tab: AFIP ─────────────────────────────────────────────────────── */}
      {tab === "afip" && (
        <div className="space-y-4">

          {/* Alertas de certificados expirados */}
          {(afipCertExpired > 0 || afipCertExp30 > 0) && !loadingAfip && (
            <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${
              afipCertExpired > 0
                ? "bg-red-400/5 border-red-400/20"
                : "bg-yellow-400/5 border-yellow-400/20"
            }`}>
              <i className={`ti ti-certificate text-base mt-0.5 ${afipCertExpired > 0 ? "text-red-400" : "text-yellow-400"}`} />
              <div>
                {afipCertExpired > 0 && (
                  <p className="text-red-400 text-xs font-bold">
                    {afipCertExpired} certificado{afipCertExpired > 1 ? "s" : ""} X.509 expirado{afipCertExpired > 1 ? "s" : ""}. Renovar desde el panel de contabilidad del usuario.
                  </p>
                )}
                {afipCertExp30 > 0 && (
                  <p className="text-yellow-400 text-xs font-bold mt-0.5">
                    {afipCertExp30} certificado{afipCertExp30 > 1 ? "s" : ""} vence{afipCertExp30 > 1 ? "n" : ""} en ≤30 días.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Tabla AFIP */}
          <div className="bg-navy-2 border border-silver/20 rounded-xl overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 border-b border-silver/15 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="relative flex-1">
                <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-cool-steel/55 text-sm" />
                <input type="text" placeholder="Buscar por email, CUIT o razón social..."
                  value={afipSearch} onChange={e => setAfipSearch(e.target.value)}
                  className="w-full bg-navy border border-silver/20 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-cool-steel/45 focus:outline-none focus:border-cl-accent/50 transition-colors" />
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {renewResult && (
                  <span className="text-xs text-cool-steel">
                    <span className="text-cl-accent font-bold">{renewResult.ok} OK</span>
                    {renewResult.error > 0 && <span className="text-red-400 font-bold ml-2">{renewResult.error} error{renewResult.error > 1 ? "es" : ""}</span>}
                  </span>
                )}
                <button onClick={handleRenewAll} disabled={renewingAll || loadingAfip || afipRows.length === 0}
                  className="flex items-center gap-2 px-3 py-2 bg-cl-accent/10 border border-cl-accent/20 rounded-lg text-xs font-bold text-cl-accent hover:bg-cl-accent/20 transition-all disabled:opacity-50">
                  <i className={`ti ti-refresh text-sm ${renewingAll ? "animate-spin" : ""}`} />
                  Renovar todos los tokens
                </button>
              </div>
            </div>

            {loadingAfip ? (
              <div className="p-12 flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-cl-accent border-t-transparent rounded-full animate-spin" />
                <p className="text-cool-steel text-sm">Cargando configuraciones AFIP...</p>
              </div>
            ) : filteredAfip.length === 0 ? (
              <div className="p-12 text-center">
                <i className="ti ti-building-bank text-3xl text-cool-steel/30 block mb-2" />
                <p className="text-cool-steel text-sm">
                  {afipRows.length === 0 ? "Ningún usuario tiene AFIP configurado aún." : "No se encontraron resultados."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-silver/15">
                      {["Usuario", "CUIT / Razón social", "Ambiente", "Token WSAA", "Cert X.509", "Facturas", "Actualizado", ""].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-cool-steel/45">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredAfip.map(r => {
                      const name = [r.firstName, r.lastName].filter(Boolean).join(" ") || "—";
                      const isRenewing = renewingId === r.userId;
                      return (
                        <tr key={r.userId} className={`hover:bg-white/[0.02] transition-colors ${
                          (r.tokenHorasRestantes !== null && r.tokenHorasRestantes <= 0) || (r.certDiasRestantes !== null && r.certDiasRestantes <= 7)
                            ? "bg-red-400/[0.02]" : ""
                        }`}>
                          {/* Usuario */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-purple-400/10 flex items-center justify-center text-purple-400 text-[10px] font-bold flex-shrink-0">
                                {name !== "—" ? name.charAt(0).toUpperCase() : "?"}
                              </div>
                              <div className="min-w-0">
                                <p className="text-white text-xs font-semibold truncate">{name}</p>
                                <p className="text-cool-steel/60 text-[10px] truncate">{r.email ?? "—"}</p>
                              </div>
                            </div>
                          </td>
                          {/* CUIT */}
                          <td className="px-4 py-3">
                            <p className="text-silver text-xs font-mono">{r.cuit ?? "—"}</p>
                            {r.razonSocial && <p className="text-cool-steel/60 text-[10px] truncate max-w-[140px]">{r.razonSocial}</p>}
                            {r.puntoVenta && <p className="text-cool-steel/40 text-[10px]">PV {r.puntoVenta}</p>}
                          </td>
                          {/* Ambiente */}
                          <td className="px-4 py-3"><EnvBadge env={r.environment} /></td>
                          {/* Token */}
                          <td className="px-4 py-3">
                            <TokenBadge horas={r.tokenHorasRestantes} />
                            {r.tokenExpiry && (
                              <p className="text-cool-steel/40 text-[10px] mt-0.5">Vence {formatDateShort(r.tokenExpiry)}</p>
                            )}
                          </td>
                          {/* Cert */}
                          <td className="px-4 py-3">
                            {r.hasCert
                              ? <CertBadge dias={r.certDiasRestantes} />
                              : <span className="text-cool-steel/40 text-xs">Sin cert</span>}
                          </td>
                          {/* Facturas */}
                          <td className="px-4 py-3">
                            <p className="text-silver text-xs font-bold">{r.totalComprobantes.toLocaleString("es-AR")}</p>
                            {r.ultimoComprobante && (
                              <p className="text-cool-steel/40 text-[10px]">Último {formatDateShort(r.ultimoComprobante)}</p>
                            )}
                          </td>
                          {/* Actualizado */}
                          <td className="px-4 py-3 text-cool-steel/55 text-[11px]">{formatDateShort(r.updatedAt)}</td>
                          {/* Acción */}
                          <td className="px-4 py-3">
                            <button
                              onClick={() => void handleRenew(r.userId)}
                              disabled={isRenewing || renewingAll}
                              title="Renovar token WSAA"
                              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-cl-accent/10 border border-cl-accent/20 rounded-lg text-cl-accent text-[11px] font-bold hover:bg-cl-accent/20 transition-all disabled:opacity-40">
                              <i className={`ti ti-refresh text-xs ${isRenewing ? "animate-spin" : ""}`} />
                              {isRenewing ? "..." : "Renovar"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="px-5 py-3 border-t border-silver/15 flex items-center justify-between">
              <p className="text-cool-steel/55 text-xs">
                {filteredAfip.length} de {afipRows.length} configuraciones
              </p>
              <p className="text-cool-steel/40 text-[11px]">Token WSAA válido ~12h · Cert X.509 1–2 años</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Sistema ──────────────────────────────────────────────────── */}
      {tab === "system" && (
        <div className="space-y-4">
          {/* Info de entorno */}
          <div className="bg-navy-2 border border-silver/20 rounded-xl p-5">
            <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
              <i className="ti ti-server text-cl-accent" /> Entorno
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Admin ID",    value: user?.id ?? "—" },
                { label: "Admin email", value: user?.email ?? "—" },
                { label: "NODE_ENV",    value: import.meta.env.MODE },
                { label: "Base URL",    value: import.meta.env.BASE_URL },
                { label: "DEV mode",    value: import.meta.env.DEV ? "Sí" : "No" },
                { label: "Fecha/hora",  value: new Date().toLocaleString("es-AR") },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between gap-4 px-4 py-2.5 bg-navy rounded-lg border border-silver/15">
                  <span className="text-cool-steel text-xs">{row.label}</span>
                  <span className="text-silver text-xs font-mono truncate max-w-[200px]">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Endpoints de utilidad */}
          <div className="bg-navy-2 border border-silver/20 rounded-xl p-5">
            <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
              <i className="ti ti-tool text-cl-accent" /> Herramientas rápidas
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Dev Login (solo dev)",    href: "/api/auth/dev-login",    icon: "ti-login",        note: "Solo funciona en NODE_ENV=development" },
                { label: "Estado de auth",          href: "/api/auth/user",          icon: "ti-user-check",   note: "Retorna el usuario de sesión actual" },
                { label: "Settings de cuenta",      href: "/api/settings",           icon: "ti-settings",     note: "Plan, features y datos del usuario" },
                { label: "Lista de usuarios (API)", href: "/api/admin/users",         icon: "ti-users",        note: "JSON con todos los usuarios y planes" },
                { label: "AFIP status (admin)",     href: "/api/admin/afip",          icon: "ti-building-bank",note: "Configs AFIP de todos los usuarios" },
                { label: "Historial de pagos",      href: "/api/payments/history",   icon: "ti-receipt",      note: "Eventos de MercadoPago del usuario" },
                { label: "Status chatbot",          href: "/api/chatbot/status",     icon: "ti-robot",        note: "Configuración y estado del bot" },
              ].map(tool => (
                <a key={tool.label} href={tool.href} target="_blank" rel="noreferrer"
                  className="flex items-start gap-3 px-4 py-3 bg-navy rounded-lg border border-silver/15 hover:border-cl-accent/30 hover:bg-cl-accent/5 transition-all group">
                  <i className={`ti ${tool.icon} text-base text-cool-steel group-hover:text-cl-accent transition-colors mt-0.5 flex-shrink-0`} />
                  <div className="min-w-0">
                    <p className="text-silver text-xs font-semibold group-hover:text-white transition-colors">{tool.label}</p>
                    <p className="text-cool-steel/55 text-[11px] mt-0.5">{tool.note}</p>
                    <p className="text-cl-accent/60 text-[11px] font-mono mt-0.5">{tool.href}</p>
                  </div>
                  <i className="ti ti-external-link text-cool-steel/40 group-hover:text-cl-accent/60 transition-colors flex-shrink-0 ml-auto text-xs mt-0.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Acciones de mantenimiento */}
          <div className="bg-navy-2 border border-silver/20 rounded-xl p-5">
            <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
              <i className="ti ti-alert-triangle text-yellow-400" /> Acciones de mantenimiento
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4 px-4 py-3 bg-navy rounded-lg border border-silver/15">
                <div>
                  <p className="text-silver text-xs font-semibold">Cerrar sesión global</p>
                  <p className="text-cool-steel/55 text-[11px] mt-0.5">Cierra la sesión actual y redirige al login</p>
                </div>
                <a href="/api/auth/logout"
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-red-400/10 border border-red-400/20 rounded-lg text-red-400 text-xs font-bold hover:bg-red-400/20 transition-colors">
                  <i className="ti ti-logout text-sm" /> Logout
                </a>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-3 bg-navy rounded-lg border border-silver/15">
                <div>
                  <p className="text-silver text-xs font-semibold">Recrear usuario admin</p>
                  <p className="text-cool-steel/55 text-[11px] mt-0.5">Comando: <span className="font-mono text-cool-steel">pnpm --filter @workspace/scripts run seed:admin</span></p>
                </div>
                <span className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-silver/10 rounded-lg text-cool-steel/55 text-xs">
                  <i className="ti ti-terminal text-sm" /> CLI
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-3 bg-navy rounded-lg border border-silver/15">
                <div>
                  <p className="text-silver text-xs font-semibold">Aplicar migraciones de DB</p>
                  <p className="text-cool-steel/55 text-[11px] mt-0.5">Comando: <span className="font-mono text-cool-steel">pnpm --filter @workspace/db run push</span></p>
                </div>
                <span className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-silver/10 rounded-lg text-cool-steel/55 text-xs">
                  <i className="ti ti-terminal text-sm" /> CLI
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── Tab: Deploy ───────────────────────────────────────────────────── */}
      {tab === "deploy" && (
        <div className="space-y-5">

          {/* Health check */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={`bg-navy-2 border rounded-xl p-4 flex items-center gap-3 ${
              health?.status === "ok" ? "border-cl-accent/25" : health ? "border-red-400/25" : "border-silver/20"
            }`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                health?.status === "ok" ? "bg-cl-accent/10" : health ? "bg-red-400/10" : "bg-silver/10"
              }`}>
                <i className={`ti ti-activity-heartbeat text-lg ${
                  health?.status === "ok" ? "text-cl-accent" : health ? "text-red-400" : "text-cool-steel/40"
                }`} />
              </div>
              <div>
                <p className="text-[11px] text-cool-steel uppercase tracking-widest font-bold">API</p>
                <p className={`text-sm font-bold ${health?.status === "ok" ? "text-cl-accent" : health ? "text-red-400" : "text-cool-steel/40"}`}>
                  {health ? (health.status === "ok" ? "Online" : "Error") : "Verificando..."}
                </p>
              </div>
            </div>
            <div className={`bg-navy-2 border rounded-xl p-4 flex items-center gap-3 ${
              health?.db === "connected" ? "border-cl-accent/25" : health ? "border-red-400/25" : "border-silver/20"
            }`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                health?.db === "connected" ? "bg-cl-accent/10" : health ? "bg-red-400/10" : "bg-silver/10"
              }`}>
                <i className={`ti ti-database text-lg ${
                  health?.db === "connected" ? "text-cl-accent" : health ? "text-red-400" : "text-cool-steel/40"
                }`} />
              </div>
              <div>
                <p className="text-[11px] text-cool-steel uppercase tracking-widest font-bold">PostgreSQL</p>
                <p className={`text-sm font-bold ${health?.db === "connected" ? "text-cl-accent" : health ? "text-red-400" : "text-cool-steel/40"}`}>
                  {health ? (health.db === "connected" ? "Conectado" : "Desconectado") : "Verificando..."}
                </p>
              </div>
            </div>
            <div className="bg-navy-2 border border-silver/20 rounded-xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-400/10 flex items-center justify-center flex-shrink-0">
                <i className="ti ti-brand-ubuntu text-lg text-purple-400" />
              </div>
              <div>
                <p className="text-[11px] text-cool-steel uppercase tracking-widest font-bold">Scripts</p>
                <p className="text-sm font-bold text-purple-400">scripts-ubuntu-v10/</p>
              </div>
            </div>
          </div>

          {/* Docs viewer */}
          <div className="bg-navy-2 border border-silver/20 rounded-xl overflow-hidden">
            {/* Group selector */}
            <div className="border-b border-silver/15 flex items-center gap-1 p-2 overflow-x-auto">
              {Object.entries(DEPLOY_DOCS_GROUPED).map(([key, grp]) => (
                <button key={key}
                  onClick={() => {
                    setDeployGroup(key);
                    setDeployDoc(grp.files[0].file);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                    deployGroup === key
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      : "text-cool-steel/70 hover:text-white hover:bg-white/[0.04] border border-transparent"
                  }`}>
                  <i className={`ti ${grp.icon} text-xs`} />
                  {grp.label}
                </button>
              ))}
            </div>
            {/* File selector within group */}
            <div className="border-b border-silver/[0.08] flex items-center gap-1 px-3 py-2 overflow-x-auto bg-navy/40">
              {(DEPLOY_DOCS_GROUPED[deployGroup]?.files ?? []).map(d => (
                <button key={d.file} onClick={() => setDeployDoc(d.file)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                    deployDoc === d.file
                      ? "bg-purple-400/10 text-purple-400"
                      : "text-cool-steel/60 hover:text-white hover:bg-white/[0.04]"
                  }`}>
                  <i className={`ti ${d.icon} text-[11px]`} />
                  {d.label}
                </button>
              ))}
            </div>
            {deployLoading ? (
              <div className="p-12 flex flex-col items-center gap-3">
                <div className="w-7 h-7 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-cool-steel text-sm">Cargando documento...</p>
              </div>
            ) : deployDoc.endsWith(".html") ? (
              <div className="relative">
                <a
                  href={`/api/admin/docs/${deployDoc}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 bg-navy border border-silver/20 rounded-lg text-cool-steel/60 hover:text-white hover:border-silver/35 text-[11px] font-semibold transition-all">
                  <i className="ti ti-external-link text-xs" /> Abrir
                </a>
                <iframe
                  src={`/api/admin/docs/${deployDoc}`}
                  title={DEPLOY_DOCS.find(d => d.file === deployDoc)?.label ?? deployDoc}
                  className="w-full border-0"
                  style={{ height: "520px" }}
                />
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => deployContent && void navigator.clipboard.writeText(deployContent)}
                  title="Copiar contenido"
                  className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 bg-navy border border-silver/20 rounded-lg text-cool-steel/60 hover:text-white hover:border-silver/35 text-[11px] font-semibold transition-all">
                  <i className="ti ti-copy text-xs" /> Copiar
                </button>
                <pre className="p-5 text-[12px] leading-relaxed text-silver/80 font-mono whitespace-pre-wrap overflow-x-auto max-h-[520px] overflow-y-auto scrollbar-thin scrollbar-thumb-silver/10 scrollbar-track-transparent">
                  {deployContent ?? ""}
                </pre>
              </div>
            )}
          </div>

          {/* Commands reference */}
          <div className="bg-navy-2 border border-silver/20 rounded-xl p-5">
            <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
              <i className="ti ti-terminal-2 text-purple-400" /> Referencia de comandos
              <span className="ml-2 text-[11px] text-cool-steel/45 font-normal">Ejecutar desde la raíz del proyecto en el servidor</span>
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {DEPLOY_COMMANDS.map(group => (
                <div key={group.cat} className="space-y-1.5">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-cool-steel/55 mb-2">
                    <i className={`ti ${group.icon} text-xs`} /> {group.cat}
                  </p>
                  {group.cmds.map(c => (
                    <div key={c.cmd}
                      className="group flex items-start justify-between gap-3 px-3 py-2.5 bg-navy rounded-lg border border-silver/10 hover:border-purple-400/20 hover:bg-purple-400/[0.03] transition-all cursor-default">
                      <div className="min-w-0">
                        <code className="text-purple-300 text-[11px] font-mono break-all leading-snug">{c.cmd}</code>
                        <p className="text-cool-steel/55 text-[10px] mt-0.5">{c.desc}</p>
                      </div>
                      <button
                        onClick={() => void navigator.clipboard.writeText(c.cmd)}
                        title="Copiar"
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-purple-400/10 text-purple-400">
                        <i className="ti ti-copy text-xs" />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Alertas WhatsApp ─────────────────────────────────────────── */}
          <div className="bg-navy-2 border border-silver/20 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <i className="ti ti-bell-ringing text-green-400" /> Alertas por WhatsApp
                <span className="ml-1 text-[11px] text-cool-steel/45 font-normal">Health check automático cada 3 min</span>
              </h3>
              {alertCfg && (
                <button
                  onClick={() => void saveAlertCfg({ enabled: !alertCfg.enabled })}
                  disabled={alertSaving}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    alertCfg.enabled
                      ? "bg-green-400/10 text-green-400 border-green-400/25 hover:bg-green-400/20"
                      : "bg-silver/10 text-cool-steel border-silver/20 hover:text-white hover:border-silver/40"
                  }`}>
                  <span className={`w-2 h-2 rounded-full ${alertCfg.enabled ? "bg-green-400 animate-pulse" : "bg-cool-steel/40"}`} />
                  {alertCfg.enabled ? "Activado" : "Desactivado"}
                </button>
              )}
            </div>

            {/* Status row */}
            {alertCfg && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="bg-navy rounded-lg border border-silver/10 p-3">
                  <p className="text-[10px] text-cool-steel/50 uppercase tracking-wider mb-1">Estado DB</p>
                  <p className={`text-sm font-bold ${alertCfg.dbStatus === "ok" ? "text-green-400" : alertCfg.dbStatus === "error" ? "text-red-400" : "text-cool-steel/40"}`}>
                    {alertCfg.dbStatus === "ok" ? "✓ OK" : alertCfg.dbStatus === "error" ? "✗ Error" : "—"}
                  </p>
                </div>
                <div className="bg-navy rounded-lg border border-silver/10 p-3">
                  <p className="text-[10px] text-cool-steel/50 uppercase tracking-wider mb-1">Errores consec.</p>
                  <p className={`text-sm font-bold ${alertCfg.consecutiveErrors > 0 ? "text-red-400" : "text-green-400"}`}>
                    {alertCfg.consecutiveErrors}
                  </p>
                </div>
                <div className="bg-navy rounded-lg border border-silver/10 p-3">
                  <p className="text-[10px] text-cool-steel/50 uppercase tracking-wider mb-1">Último check</p>
                  <p className="text-xs text-silver/70 font-mono">
                    {alertCfg.lastCheckAt
                      ? new Date(alertCfg.lastCheckAt).toLocaleTimeString("es-AR")
                      : "—"}
                  </p>
                </div>
                <div className="bg-navy rounded-lg border border-silver/10 p-3">
                  <p className="text-[10px] text-cool-steel/50 uppercase tracking-wider mb-1">Última alerta</p>
                  <p className="text-xs text-silver/70 font-mono">
                    {alertCfg.lastAlertAt
                      ? new Date(alertCfg.lastAlertAt).toLocaleTimeString("es-AR")
                      : "Ninguna"}
                  </p>
                </div>
              </div>
            )}

            {/* Phone config */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-[11px] text-cool-steel/60 mb-1.5 font-semibold uppercase tracking-wider">
                  Número de alerta (formato internacional, sin +)
                </label>
                <input
                  value={alertPhone}
                  onChange={e => setAlertPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="5492984510883"
                  className="w-full bg-navy border border-silver/20 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder-cool-steel/30 focus:outline-none focus:border-green-400/40 transition-colors"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={() => void saveAlertCfg({ phone: alertPhone })}
                  disabled={alertSaving || !alertPhone || alertPhone === alertCfg?.phone}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-navy border border-silver/20 text-cool-steel hover:text-white hover:border-silver/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                  {alertSaving ? <i className="ti ti-loader animate-spin" /> : "Guardar"}
                </button>
                <button
                  onClick={() => void manualCheck()}
                  title="Ejecutar check manual"
                  className="px-3 py-2 rounded-lg text-xs font-bold bg-navy border border-silver/20 text-cool-steel hover:text-white hover:border-silver/40 transition-all">
                  <i className="ti ti-refresh text-xs" />
                </button>
                <button
                  onClick={() => void testAlert()}
                  disabled={alertTesting || !alertCfg?.enabled}
                  title={!alertCfg?.enabled ? "Activá las alertas para enviar prueba" : "Enviar mensaje de prueba"}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-green-400/10 border border-green-400/25 text-green-400 hover:bg-green-400/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                  <i className={`ti ${alertTesting ? "ti-loader animate-spin" : "ti-brand-whatsapp"} text-xs`} />
                  Probar
                </button>
              </div>
            </div>

            {alertTestMsg && (
              <p className="mt-3 text-xs font-semibold text-center py-2 rounded-lg bg-navy border border-silver/10 text-silver/70">
                {alertTestMsg}
              </p>
            )}

            <p className="mt-3 text-[11px] text-cool-steel/40 leading-relaxed">
              Las alertas usan las credenciales de Evolution API configuradas en tu cuenta de admin.
              Se envía alerta al detectar el primer error de DB, y una notificación de recuperación cuando vuelve a responder.
              Cooldown de 15 min entre alertas.
            </p>
          </div>

          {/* Historial de alertas ──────────────────────────────────────── */}
          <div className="bg-navy-2 border border-silver/20 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-silver/10">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <i className="ti ti-history text-purple-400" /> Historial de alertas
                <span className="ml-1 text-[11px] text-cool-steel/45 font-normal">últimas 50 entradas</span>
              </h3>
              <button onClick={loadAlertLogs} disabled={logsLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-cool-steel hover:text-white hover:bg-white/[0.04] border border-silver/15 hover:border-silver/30 transition-all font-semibold disabled:opacity-50">
                <i className={`ti ${logsLoading ? "ti-loader animate-spin" : "ti-refresh"} text-xs`} />
                Actualizar
              </button>
            </div>

            {logsLoading ? (
              <div className="py-12 flex items-center justify-center gap-3 text-cool-steel/40">
                <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Cargando...</span>
              </div>
            ) : alertLogs.length === 0 ? (
              <div className="py-12 flex flex-col items-center gap-2 text-cool-steel/30">
                <i className="ti ti-inbox text-2xl" />
                <p className="text-sm">Sin registros aún. Las alertas aparecerán aquí cuando se generen.</p>
              </div>
            ) : (
              <div className="divide-y divide-silver/[0.06]">
                {alertLogs.map(log => {
                  const typeMap: Record<string, { label: string; icon: string; color: string }> = {
                    db_error:     { label: "Error DB",       icon: "ti-database-x",     color: "text-red-400" },
                    db_recovered: { label: "DB recuperada",  icon: "ti-database-check",  color: "text-green-400" },
                    test:         { label: "Prueba",         icon: "ti-test-pipe",        color: "text-purple-400" },
                  };
                  const t = typeMap[log.type] ?? { label: log.type, icon: "ti-bell", color: "text-cool-steel/60" };
                  return (
                    <div key={log.id} className="flex items-start gap-4 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        log.sent ? "bg-green-400/10" : "bg-red-400/10"
                      }`}>
                        <i className={`ti ${t.icon} text-xs ${t.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-bold ${t.color}`}>{t.label}</span>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            log.sent
                              ? "bg-green-400/10 text-green-400"
                              : "bg-red-400/10 text-red-400"
                          }`}>
                            <i className={`ti ${log.sent ? "ti-check" : "ti-x"} text-[9px]`} />
                            {log.sent ? "Enviado" : log.status === "no_evo_config" ? "Sin Evolution API" : "Error"}
                          </span>
                          <span className="text-[10px] text-cool-steel/40 font-mono ml-auto flex-shrink-0">
                            {new Date(log.createdAt).toLocaleString("es-AR", {
                              day: "2-digit", month: "2-digit",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {log.error && (
                          <p className="text-[10px] text-red-400/70 mt-0.5 font-mono">{log.error}</p>
                        )}
                        <p className="text-[11px] text-cool-steel/40 mt-0.5 truncate">{log.message.replace(/\*/g, "").split("\n")[0]}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Terminal SSE ─────────────────────────────────────────────────── */}
          <div className="bg-[#0a0e1a] border border-silver/20 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-silver/10 bg-[#0d1120]">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/70" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                  <div className="w-3 h-3 rounded-full bg-green-500/70" />
                </div>
                <span className="text-cool-steel/50 text-[11px] font-mono ml-2">terminal — admin@clientum</span>
              </div>
              <div className="flex items-center gap-2">
                {termRunning && (
                  <span className="flex items-center gap-1.5 text-[10px] text-purple-400 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" /> Ejecutando...
                  </span>
                )}
                {termLines.length > 0 && (
                  <button onClick={() => setTermLines([])} title="Limpiar"
                    className="px-2.5 py-1 rounded-md text-[11px] text-cool-steel/50 hover:text-white hover:bg-white/[0.05] transition-all font-semibold">
                    <i className="ti ti-trash text-xs mr-1" />Limpiar
                  </button>
                )}
                {termRunning && (
                  <button onClick={stopCommand} title="Detener"
                    className="px-2.5 py-1 rounded-md text-[11px] text-red-400 hover:bg-red-400/10 transition-all font-semibold border border-red-400/25">
                    <i className="ti ti-player-stop text-xs mr-1" />Detener
                  </button>
                )}
              </div>
            </div>

            {/* Script selector */}
            <div className="flex flex-wrap gap-1.5 px-4 py-3 border-b border-silver/[0.07]">
              {TERM_COMMANDS.map(tc => (
                <button key={tc.key}
                  onClick={() => { setTermScript(tc.key); }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
                    termScript === tc.key
                      ? tc.danger
                        ? "bg-red-400/10 text-red-400 border-red-400/25"
                        : "bg-purple-400/10 text-purple-400 border-purple-400/25"
                      : "text-cool-steel/60 border-silver/10 hover:text-white hover:border-silver/25 hover:bg-white/[0.03]"
                  }`}>
                  <i className={`ti ${tc.icon} text-xs`} />
                  {tc.label}
                  {tc.danger && <i className="ti ti-alert-triangle text-[9px] opacity-60" />}
                </button>
              ))}
              <button
                onClick={() => runCommand(termScript)}
                disabled={termRunning}
                className="ml-auto flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[11px] font-bold bg-purple-500 hover:bg-purple-400 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all">
                <i className={`ti ${termRunning ? "ti-loader animate-spin" : "ti-player-play"} text-xs`} />
                {termRunning ? "Ejecutando..." : "Ejecutar"}
              </button>
            </div>

            {/* Output */}
            <div className="h-64 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed scrollbar-thin scrollbar-thumb-silver/10 scrollbar-track-transparent">
              {termLines.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-cool-steel/25 select-none">
                  <i className="ti ti-terminal text-2xl" />
                  <p>Seleccioná un comando y presioná Ejecutar</p>
                </div>
              ) : (
                termLines.map((line, i) => (
                  <div key={i} className={`leading-snug py-0.5 ${
                    line.startsWith("✓") ? "text-green-400" :
                    line.startsWith("▶") ? "text-purple-300 font-bold" :
                    line.startsWith("⚠") ? "text-yellow-400" :
                    line.startsWith("⏱") ? "text-orange-400" :
                    line.startsWith("─") ? "text-silver/20" :
                    "text-green-300/80"
                  }`}>
                    {line || "\u00A0"}
                  </div>
                ))
              )}
              <div ref={termEndRef} />
            </div>
          </div>

        </div>
      )}

      {/* ── Tab: Handoffs ─────────────────────────────────────────────────── */}
      {tab === "handoffs" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-bold text-lg">Casos de Handoff Activos</h2>
              <p className="text-cool-steel text-xs mt-0.5">Conversaciones derivadas a agentes humanos desde el bot de WhatsApp.</p>
            </div>
            <div className="flex gap-1 bg-navy-2 border border-silver/20 rounded-xl p-1">
              {["pending", "taken", "resolved"].map(s => (
                <button key={s} onClick={() => setHandoffFilter(s)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all ${
                    handoffFilter === s ? "bg-cl-accent/10 text-cl-accent" : "text-cool-steel hover:text-white"
                  }`}>
                  {s === "pending" ? "⏳ Pendientes" : s === "taken" ? "👤 En atención" : "✅ Resueltos"}
                </button>
              ))}
            </div>
          </div>

          {handoffsLoading ? (
            <div className="p-12 flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-cl-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-cool-steel text-sm">Cargando handoffs...</p>
            </div>
          ) : handoffs.length === 0 ? (
            <div className="p-12 text-center bg-navy-2 border border-silver/20 rounded-xl">
              <i className="ti ti-bell-off text-3xl text-cool-steel/30 block mb-2" />
              <p className="text-cool-steel text-sm">
                {handoffFilter === "pending" ? "✅ No hay casos pendientes." : `Sin casos ${handoffFilter}.`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {handoffs.map(h => {
                const phone = h.waJid.replace("@s.whatsapp.net", "");
                return (
                  <div key={h.id} className="bg-navy-2 border border-silver/20 rounded-xl p-4 space-y-3 hover:border-cl-accent/30 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-semibold text-sm">+{phone}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] border font-mono ${
                            h.reason === "refund" ? "bg-red-500/20 text-red-300 border-red-500/30" :
                            h.reason === "escalation" ? "bg-orange-500/20 text-orange-300 border-orange-500/30" :
                            "bg-amber-500/20 text-amber-300 border-amber-500/30"
                          }`}>{h.reason}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] border font-mono ${
                            h.status === "resolved" ? "bg-green-500/20 text-green-300 border-green-500/30" :
                            h.status === "taken" ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" :
                            "bg-amber-500/20 text-amber-300 border-amber-500/30"
                          }`}>{h.status}</span>
                          <span className="text-cool-steel/50 text-xs font-mono">hace {minutesAgo(h.createdAt)}</span>
                        </div>
                        <p className="text-cool-steel/60 text-[11px] font-mono">{h.tenantId}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => window.open(`https://wa.me/${phone}`, "_blank")}
                          className="px-3 py-1.5 text-xs rounded-lg bg-green-500/15 text-green-300 border border-green-500/25 hover:bg-green-500/25 transition-colors font-medium">
                          📱 WA
                        </button>
                        {h.status !== "resolved" && (
                          <button onClick={() => resolveHandoff(h)}
                            className="px-3 py-1.5 text-xs rounded-lg bg-cl-accent/15 text-cl-accent border border-cl-accent/25 hover:bg-cl-accent/25 transition-colors font-medium">
                            ✓ Cerrar
                          </button>
                        )}
                      </div>
                    </div>
                    {h.summary && (
                      <p className="text-cool-steel/70 text-sm leading-relaxed border-l-2 border-cl-accent/30 pl-3 italic">
                        {h.summary}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: System Prompts ───────────────────────────────────────────── */}
      {tab === "prompts" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-white font-bold text-lg">System Prompts por Tenant</h2>
            <p className="text-cool-steel text-xs mt-0.5">Personaliza el comportamiento del agente IA por cliente (tenant).</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-cool-steel/60 text-[10px] uppercase tracking-widest font-bold">Tenant</label>
                <select value={promptTenant} onChange={e => setPromptTenant(e.target.value)}
                  className="w-full bg-navy-2 border border-silver/20 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cl-accent/50 transition-colors">
                  <option value="">— Seleccioná un tenant —</option>
                  {tenants.map(t => <option key={t.id} value={t.id}>{t.storeName}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-cool-steel/60 text-[10px] uppercase tracking-widest font-bold">Variables disponibles</label>
                <div className="flex flex-wrap gap-1.5">
                  {PROMPT_VARS.map(v => (
                    <button key={v} onClick={() => setPromptText(p => p + v)}
                      className="px-2 py-0.5 text-[10px] rounded bg-cl-accent/10 text-cl-accent border border-cl-accent/20 hover:bg-cl-accent/20 transition-colors font-mono">
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-cool-steel/60 text-[10px] uppercase tracking-widest font-bold">Prompt del sistema</label>
              <textarea value={promptText} onChange={e => setPromptText(e.target.value)}
                disabled={!promptTenant} rows={13}
                placeholder="Seleccioná un tenant para editar su prompt..."
                className="w-full bg-navy-2 border border-silver/20 rounded-xl px-4 py-3 text-white/80 text-sm font-mono resize-none focus:outline-none focus:border-cl-accent/50 disabled:opacity-30 leading-relaxed transition-colors" />
              <div className="flex items-center justify-between">
                <span className="text-cool-steel/30 text-xs font-mono">{promptText.length} chars</span>
                <div className="flex gap-2 items-center">
                  {promptSaved && <span className="text-cl-accent text-xs font-mono">✓ Guardado</span>}
                  <button onClick={() => setPromptText(DEFAULT_PROMPT)} disabled={!promptTenant}
                    className="px-3 py-1.5 text-xs text-cool-steel/50 hover:text-white transition-colors disabled:opacity-25">
                    Reset
                  </button>
                  <button onClick={savePrompt} disabled={!promptTenant || promptSaving}
                    className="px-4 py-1.5 text-xs rounded-lg bg-cl-accent text-navy font-bold hover:bg-cl-accent/85 transition-colors disabled:opacity-40">
                    {promptSaving ? "Guardando..." : "Guardar prompt"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Tenants ──────────────────────────────────────────────────── */}
      {tab === "tenants" && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-white font-bold text-lg">WC Agent Tenants</h2>
              <p className="text-cool-steel text-xs mt-0.5">Clientes con WooCommerce AI Agent + WhatsApp (Evolution API).</p>
            </div>
            <button onClick={openWcCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cl-accent/15 border border-cl-accent/30 text-cl-accent text-sm font-bold hover:bg-cl-accent/25 transition-colors">
              <i className="ti ti-plus text-sm" /> Nuevo Tenant
            </button>
          </div>

          {/* Table */}
          {wcTenantsLoading ? (
            <div className="p-12 flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-cl-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-cool-steel text-sm">Cargando tenants...</p>
            </div>
          ) : (
            <div className="bg-navy-2 border border-silver/20 rounded-xl overflow-hidden">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-silver/15">
                    {["Tienda", "ID", "WooCommerce", "Evolution", "Modelo AI", "Estado", ""].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-cool-steel/45">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {wcTenants.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-14 text-center">
                        <i className="ti ti-building-store text-3xl block mb-2 text-cool-steel/20" />
                        <p className="text-cool-steel/40 text-sm">No hay tenants registrados.</p>
                        <button onClick={openWcCreate} className="mt-3 text-cl-accent text-xs font-bold hover:underline">
                          + Crear el primero
                        </button>
                      </td>
                    </tr>
                  ) : wcTenants.map((t) => (
                    <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-white font-semibold text-sm">{t.storeName}</p>
                        <p className="text-cool-steel/40 text-[11px] font-mono mt-0.5">{t.storeLanguage ?? "es-AR"}</p>
                      </td>
                      <td className="px-4 py-3 text-cool-steel/50 font-mono text-[11px]">{t.id}</td>
                      <td className="px-4 py-3">
                        {t.wcBaseUrl ? (
                          <span className="flex items-center gap-1 text-[11px] text-green-400/80">
                            <i className="ti ti-check text-[10px]" /> Configurado
                          </span>
                        ) : (
                          <span className="text-[11px] text-cool-steel/30">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {t.evolutionInstance ? (
                          <span className="text-cl-accent/70 font-mono text-[11px]">{t.evolutionInstance}</span>
                        ) : (
                          <span className="text-[11px] text-cool-steel/30">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-cool-steel/50 font-mono text-[11px]">
                        {t.openrouterModel ?? "deepseek-r1"}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => void toggleWcTenant(t.id)}
                          className={`px-2 py-0.5 rounded text-[10px] border font-bold transition-colors ${
                            t.active
                              ? "bg-green-500/15 text-green-300 border-green-500/25 hover:bg-red-400/10 hover:text-red-300 hover:border-red-400/20"
                              : "bg-white/5 text-cool-steel/40 border-silver/10 hover:bg-green-500/10 hover:text-green-300 hover:border-green-500/20"
                          }`}>
                          {t.active ? "activo" : "inactivo"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => openWcEdit(t)}
                            title="Editar"
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-cool-steel/50 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-silver/15 transition-all">
                            <i className="ti ti-pencil text-sm" />
                          </button>
                          <button onClick={() => setWcDeleteId(t.id)}
                            title="Eliminar"
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-cool-steel/50 hover:text-red-400 hover:bg-red-400/[0.06] border border-transparent hover:border-red-400/15 transition-all">
                            <i className="ti ti-trash text-sm" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Delete confirm */}
          {wcDeleteId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-navy-2 border border-red-400/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                <div className="w-12 h-12 rounded-xl bg-red-400/10 flex items-center justify-center mb-4 mx-auto">
                  <i className="ti ti-trash text-2xl text-red-400" />
                </div>
                <h3 className="text-white font-bold text-center mb-1">Eliminar tenant</h3>
                <p className="text-cool-steel text-sm text-center mb-5">
                  ¿Seguro que querés eliminar <span className="text-red-300 font-mono">{wcDeleteId}</span>? Esta acción no se puede deshacer.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setWcDeleteId(null)}
                    className="flex-1 px-4 py-2 rounded-lg border border-silver/20 text-cool-steel text-sm font-semibold hover:text-white hover:border-silver/35 transition-all">
                    Cancelar
                  </button>
                  <button onClick={() => void deleteWcTenant(wcDeleteId)}
                    className="flex-1 px-4 py-2 rounded-lg bg-red-400/15 border border-red-400/30 text-red-300 text-sm font-bold hover:bg-red-400/25 transition-all">
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Create / Edit drawer */}
          {wcFormOpen && (
            <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/60 backdrop-blur-sm">
              <div className="bg-navy-2 border-l border-silver/20 w-full max-w-lg flex flex-col shadow-2xl overflow-hidden">
                {/* Drawer header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-silver/15">
                  <div>
                    <h3 className="text-white font-bold">{wcFormEditing ? "Editar Tenant" : "Nuevo Tenant"}</h3>
                    <p className="text-cool-steel/50 text-xs mt-0.5">{wcFormEditing ?? "Completar todos los campos requeridos"}</p>
                  </div>
                  <button onClick={() => setWcFormOpen(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-cool-steel/50 hover:text-white hover:bg-white/[0.06] transition-all">
                    <i className="ti ti-x text-sm" />
                  </button>
                </div>

                {/* Drawer body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  {/* General */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-cool-steel/40 mb-3">General</p>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-cool-steel/60 mb-1 font-semibold">ID <span className="text-red-400">*</span></label>
                          <input value={wcForm.id} onChange={e => setWcForm(f => ({ ...f, id: e.target.value.toLowerCase().replace(/\s+/g, "-") }))}
                            disabled={!!wcFormEditing}
                            placeholder="gaman-ferreteria"
                            className="w-full bg-navy border border-silver/20 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder-cool-steel/25 focus:outline-none focus:border-cl-accent/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" />
                        </div>
                        <div>
                          <label className="block text-[11px] text-cool-steel/60 mb-1 font-semibold">Idioma</label>
                          <input value={wcForm.storeLanguage} onChange={e => setWcForm(f => ({ ...f, storeLanguage: e.target.value }))}
                            placeholder="es-AR"
                            className="w-full bg-navy border border-silver/20 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder-cool-steel/25 focus:outline-none focus:border-cl-accent/40 transition-colors" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] text-cool-steel/60 mb-1 font-semibold">Nombre de tienda <span className="text-red-400">*</span></label>
                        <input value={wcForm.storeName} onChange={e => setWcForm(f => ({ ...f, storeName: e.target.value }))}
                          placeholder="Ferretería Gaman"
                          className="w-full bg-navy border border-silver/20 rounded-lg px-3 py-2 text-sm text-white placeholder-cool-steel/25 focus:outline-none focus:border-cl-accent/40 transition-colors" />
                      </div>
                    </div>
                  </div>

                  {/* WooCommerce */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-cool-steel/40 mb-3">WooCommerce REST API</p>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] text-cool-steel/60 mb-1 font-semibold">URL base</label>
                        <input value={wcForm.wcBaseUrl} onChange={e => setWcForm(f => ({ ...f, wcBaseUrl: e.target.value }))}
                          placeholder="https://mitienda.com/wp-json/wc/v3"
                          className="w-full bg-navy border border-silver/20 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder-cool-steel/25 focus:outline-none focus:border-cl-accent/40 transition-colors" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-cool-steel/60 mb-1 font-semibold">Consumer Key</label>
                          <input value={wcForm.wcKey} onChange={e => setWcForm(f => ({ ...f, wcKey: e.target.value }))}
                            type="password" placeholder="ck_…"
                            className="w-full bg-navy border border-silver/20 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder-cool-steel/25 focus:outline-none focus:border-cl-accent/40 transition-colors" />
                        </div>
                        <div>
                          <label className="block text-[11px] text-cool-steel/60 mb-1 font-semibold">Consumer Secret</label>
                          <input value={wcForm.wcSecret} onChange={e => setWcForm(f => ({ ...f, wcSecret: e.target.value }))}
                            type="password" placeholder="cs_…"
                            className="w-full bg-navy border border-silver/20 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder-cool-steel/25 focus:outline-none focus:border-cl-accent/40 transition-colors" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-cool-steel/40 mb-3">Proveedor AI</p>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-cool-steel/60 mb-1 font-semibold">OpenRouter Key</label>
                          <input value={wcForm.openrouterKey} onChange={e => setWcForm(f => ({ ...f, openrouterKey: e.target.value }))}
                            type="password" placeholder="sk-or-…"
                            className="w-full bg-navy border border-silver/20 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder-cool-steel/25 focus:outline-none focus:border-cl-accent/40 transition-colors" />
                        </div>
                        <div>
                          <label className="block text-[11px] text-cool-steel/60 mb-1 font-semibold">Modelo</label>
                          <input value={wcForm.openrouterModel} onChange={e => setWcForm(f => ({ ...f, openrouterModel: e.target.value }))}
                            placeholder="deepseek/deepseek-r1:free"
                            className="w-full bg-navy border border-silver/20 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder-cool-steel/25 focus:outline-none focus:border-cl-accent/40 transition-colors" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-cool-steel/60 mb-1 font-semibold">Groq Key <span className="text-cool-steel/30">(opcional)</span></label>
                          <input value={wcForm.groqKey} onChange={e => setWcForm(f => ({ ...f, groqKey: e.target.value }))}
                            type="password" placeholder="gsk_…"
                            className="w-full bg-navy border border-silver/20 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder-cool-steel/25 focus:outline-none focus:border-cl-accent/40 transition-colors" />
                        </div>
                        <div>
                          <label className="block text-[11px] text-cool-steel/60 mb-1 font-semibold">OpenAI Key <span className="text-cool-steel/30">(opcional)</span></label>
                          <input value={wcForm.openaiKey} onChange={e => setWcForm(f => ({ ...f, openaiKey: e.target.value }))}
                            type="password" placeholder="sk-…"
                            className="w-full bg-navy border border-silver/20 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder-cool-steel/25 focus:outline-none focus:border-cl-accent/40 transition-colors" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* WhatsApp / Evolution */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-cool-steel/40 mb-3">WhatsApp — Evolution API</p>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] text-cool-steel/60 mb-1 font-semibold">URL de Evolution API</label>
                        <input value={wcForm.evolutionApiUrl} onChange={e => setWcForm(f => ({ ...f, evolutionApiUrl: e.target.value }))}
                          placeholder="https://evolution.miserver.com"
                          className="w-full bg-navy border border-silver/20 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder-cool-steel/25 focus:outline-none focus:border-cl-accent/40 transition-colors" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-cool-steel/60 mb-1 font-semibold">Nombre de instancia</label>
                          <input value={wcForm.evolutionInstance} onChange={e => setWcForm(f => ({ ...f, evolutionInstance: e.target.value }))}
                            placeholder="gaman-bot"
                            className="w-full bg-navy border border-silver/20 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder-cool-steel/25 focus:outline-none focus:border-cl-accent/40 transition-colors" />
                        </div>
                        <div>
                          <label className="block text-[11px] text-cool-steel/60 mb-1 font-semibold">API Key</label>
                          <input value={wcForm.evolutionApiKey} onChange={e => setWcForm(f => ({ ...f, evolutionApiKey: e.target.value }))}
                            type="password" placeholder="…"
                            className="w-full bg-navy border border-silver/20 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder-cool-steel/25 focus:outline-none focus:border-cl-accent/40 transition-colors" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] text-cool-steel/60 mb-1 font-semibold">JID de notificación al agente <span className="text-cool-steel/30">(opcional)</span></label>
                        <input value={wcForm.agentNotifyJid} onChange={e => setWcForm(f => ({ ...f, agentNotifyJid: e.target.value }))}
                          placeholder="5492984510883@s.whatsapp.net"
                          className="w-full bg-navy border border-silver/20 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder-cool-steel/25 focus:outline-none focus:border-cl-accent/40 transition-colors" />
                      </div>
                    </div>
                  </div>

                  {/* System prompt */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-cool-steel/40 mb-3">System Prompt <span className="font-normal normal-case text-cool-steel/30">(opcional — sobreescribe el default)</span></p>
                    <textarea value={wcForm.systemPromptOverride} onChange={e => setWcForm(f => ({ ...f, systemPromptOverride: e.target.value }))}
                      rows={5}
                      placeholder="Sos el asistente de {storeName}…"
                      className="w-full bg-navy border border-silver/20 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder-cool-steel/25 focus:outline-none focus:border-cl-accent/40 transition-colors resize-none" />
                    <p className="text-[10px] text-cool-steel/35 mt-1">Variables: {"{storeName}"} {"{orderCount}"} {"{totalSpent}"} {"{customerEmail}"}</p>
                  </div>

                  {wcFormError && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-400/10 border border-red-400/20 text-red-300 text-xs">
                      <i className="ti ti-alert-circle text-sm flex-shrink-0" />
                      {wcFormError}
                    </div>
                  )}
                </div>

                {/* Drawer footer */}
                <div className="flex items-center gap-3 px-6 py-4 border-t border-silver/15">
                  <button onClick={() => setWcFormOpen(false)}
                    className="flex-1 px-4 py-2 rounded-lg border border-silver/20 text-cool-steel text-sm font-semibold hover:text-white hover:border-silver/35 transition-all">
                    Cancelar
                  </button>
                  <button onClick={() => void saveWcTenant()} disabled={wcFormSaving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-cl-accent/15 border border-cl-accent/30 text-cl-accent text-sm font-bold hover:bg-cl-accent/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                    {wcFormSaving ? <i className="ti ti-loader animate-spin text-sm" /> : <i className="ti ti-device-floppy text-sm" />}
                    {wcFormEditing ? "Guardar cambios" : "Crear tenant"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

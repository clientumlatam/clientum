import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";

/* ─── helpers ─── */
async function apiFetch(url: string, opts?: RequestInit) {
  const r = await fetch(url, { credentials: "include", ...opts });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error ?? String(r.status));
  return data;
}

interface ChatbotConfig {
  evolutionApiUrl?: string;
  evolutionApiKey?: string;
  evolutionInstance?: string;
  active?: boolean;
}

/* ─── step definitions ─── */
const STEPS = ["Bienvenida", "Servidor", "Instancia", "Escanear QR", "¡Listo!"] as const;

/* ─── main component ─── */
export default function ConnectWhatsApp() {
  const qc = useQueryClient();

  const { data: cfgData } = useQuery<{ config: ChatbotConfig | null }>({
    queryKey: ["chatbot-config"],
    queryFn: () => apiFetch("/api/chatbot/config"),
    staleTime: 30_000,
  });
  const cfg = cfgData?.config ?? {};

  const saveConfig = useMutation({
    mutationFn: (patch: Partial<ChatbotConfig>) =>
      apiFetch("/api/chatbot/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chatbot-config"] }),
  });

  /* ── state ── */
  const alreadyConnected = !!cfg.evolutionInstance;
  const [step, setStep] = useState<number>(alreadyConnected ? 4 : 0);

  const [evoUrl, setEvoUrl] = useState(cfg.evolutionApiUrl ?? "");
  const [evoKey, setEvoKey] = useState(cfg.evolutionApiKey ?? "");
  const [evoInstance, setEvoInstance] = useState(cfg.evolutionInstance ?? "");
  const [evoNewName, setEvoNewName] = useState("");
  const [evoInstances, setEvoInstances] = useState<{ name: string; state: string }[]>([]);

  const [evoQr, setEvoQr] = useState<string | null>(null);
  const [qrCountdown, setQrCountdown] = useState(60);
  const [connected, setConnected] = useState(false);
  const [evoPhone, setEvoPhone] = useState<string | null>(cfg.evolutionApiUrl ? null : null);
  const [evoProfileName, setEvoProfileName] = useState<string | null>(null);
  const [webhookDone, setWebhookDone] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [testPhone, setTestPhone] = useState("");
  const [testSent, setTestSent] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testError, setTestError] = useState("");

  /* sync cfg when loaded */
  useEffect(() => {
    if (cfg.evolutionApiUrl) setEvoUrl(cfg.evolutionApiUrl);
    if (cfg.evolutionApiKey) setEvoKey(cfg.evolutionApiKey);
    if (cfg.evolutionInstance) {
      setEvoInstance(cfg.evolutionInstance);
      setStep(4);
    }
  }, [cfg.evolutionApiUrl, cfg.evolutionApiKey, cfg.evolutionInstance]);

  /* QR countdown */
  useEffect(() => {
    if (step !== 3 || connected) return;
    setQrCountdown(60);
    const id = setInterval(() => {
      setQrCountdown((n) => {
        if (n <= 1) {
          if (evoInstance && evoUrl && evoKey) {
            setEvoQr(null);
            apiFetch("/api/chatbot/evolution/qr", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: evoUrl, apiKey: evoKey, instanceName: evoInstance }),
            }).then((r) => setEvoQr(r.qrCode ?? null)).catch(() => {});
          }
          return 60;
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [step, connected, evoInstance, evoUrl, evoKey]);

  /* Connection polling */
  useEffect(() => {
    if (step !== 3 || !evoInstance || !evoUrl || !evoKey) return;
    const id = setInterval(async () => {
      try {
        const r = await apiFetch("/api/chatbot/evolution/connection-state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: evoUrl, apiKey: evoKey, instanceName: evoInstance }),
        });
        if (r.state === "open") {
          setConnected(true);
          if (r.phone) { setEvoPhone(r.phone); setTestPhone(r.phone); }
          if (r.profileName) setEvoProfileName(r.profileName);
          clearInterval(id);
          const origin = window.location.origin;
          apiFetch("/api/chatbot/evolution/setup-webhook", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: evoUrl, apiKey: evoKey,
              instanceName: evoInstance,
              webhookUrl: `${origin}/api/chatbot/webhook`,
            }),
          }).then(() => setWebhookDone(true)).catch(() => {});
          await saveConfig.mutateAsync({
            evolutionApiUrl: evoUrl,
            evolutionApiKey: evoKey,
            evolutionInstance: evoInstance,
          });
          setTimeout(() => { setStep(4); setConnected(false); }, 1500);
        }
      } catch {}
    }, 3000);
    return () => clearInterval(id);
  }, [step, evoInstance, evoUrl, evoKey]);

  /* ── handlers ── */
  async function handleTestConnection() {
    if (!evoUrl || !evoKey) return;
    setLoading(true); setError("");
    try {
      const r = await apiFetch("/api/chatbot/evolution/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: evoUrl, apiKey: evoKey }),
      });
      if (!r.ok) { setError(r.error ?? "Error de conexión"); }
      else { setEvoInstances(r.instances ?? []); setStep(2); }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión");
    } finally { setLoading(false); }
  }

  async function handleSelectInstance(name: string) {
    setLoading(true); setError("");
    try {
      const r = await apiFetch("/api/chatbot/evolution/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: evoUrl, apiKey: evoKey, instanceName: name }),
      });
      setEvoInstance(name);
      setEvoQr(r.qrCode ?? null);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al obtener QR");
    } finally { setLoading(false); }
  }

  async function handleCreateInstance() {
    if (!evoNewName.trim()) return;
    setLoading(true); setError("");
    try {
      const r = await apiFetch("/api/chatbot/evolution/create-instance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: evoUrl, apiKey: evoKey, instanceName: evoNewName.trim() }),
      });
      if (!r.ok) { setError(r.error ?? "Error al crear instancia"); }
      else { setEvoInstance(evoNewName.trim()); setEvoQr(r.qrCode); setStep(3); }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear instancia");
    } finally { setLoading(false); }
  }

  async function handleSendTest() {
    if (!testPhone.trim()) return;
    setTestSending(true); setTestError("");
    try {
      const r = await apiFetch("/api/chatbot/evolution/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: evoUrl, apiKey: evoKey, instanceName: evoInstance, phone: testPhone.trim() }),
      });
      if (!r.ok) setTestError(r.error ?? "Error al enviar");
      else setTestSent(true);
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Error al enviar");
    } finally { setTestSending(false); }
  }

  function handleReset() {
    setStep(0);
    setEvoQr(null);
    setConnected(false);
    setEvoPhone(null);
    setEvoProfileName(null);
    setWebhookDone(false);
    setTestSent(false);
    setTestError("");
    setError("");
  }

  /* ── render ── */
  return (
    <div className="min-h-full bg-[#FDFDFB] flex flex-col">

      {/* Progress bar */}
      <div className="w-full h-1 bg-[#DDDFE2]/40">
        <div
          className="h-full bg-blue-600 transition-all duration-500"
          style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
        />
      </div>

      {/* Step tabs */}
      <div className="flex items-center justify-center gap-1 py-4 px-6 border-b border-[#DDDFE2]/40 bg-white">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-1">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              i === step ? "bg-blue-600 text-white" :
              i < step ? "bg-emerald-500/15 text-emerald-600" :
              "text-[#3B506D]/70"
            }`}>
              {i < step
                ? <i className="ti ti-check text-xs" />
                : <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">{i + 1}</span>
              }
              <span className="hidden sm:inline">{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-6 h-px transition-all ${i < step ? "bg-emerald-400" : "bg-[#DDDFE2]"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Content area */}
      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-xl">

          {/* ── STEP 0: Bienvenida ── */}
          {step === 0 && (
            <div className="text-center space-y-8">
              <div className="w-20 h-20 rounded-3xl bg-[#25D366]/10 flex items-center justify-center mx-auto">
                <i className="ti ti-brand-whatsapp text-5xl text-[#25D366]" />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-[#031E43] mb-3">
                  Conectá tu número de WhatsApp
                </h2>
                <p className="text-[#3B506D] text-sm leading-relaxed max-w-md mx-auto">
                  En menos de 5 minutos tu número de WhatsApp quedará conectado al agente IA de Clientum.
                  El bot responderá automáticamente a tus clientes — sin código, sin apps extra.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { icon: "ti-server", label: "Servidor Evolution", desc: "URL + API Key del servidor" },
                  { icon: "ti-qrcode", label: "Escanear QR", desc: "Con tu celular en 30 seg" },
                  { icon: "ti-robot", label: "Bot activo", desc: "Respuestas automáticas" },
                ].map((item) => (
                  <div key={item.label} className="bg-white border border-[#DDDFE2]/40 rounded-2xl p-4 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-2">
                      <i className={`ti ${item.icon} text-blue-600 text-xl`} />
                    </div>
                    <p className="text-xs font-bold text-[#031E43] mb-1">{item.label}</p>
                    <p className="text-[11px] text-[#3B506D]/70">{item.desc}</p>
                  </div>
                ))}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-left">
                <div className="flex items-start gap-3">
                  <i className="ti ti-info-circle text-amber-500 text-lg flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800 mb-1">Necesitás un servidor Evolution API</p>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      Si todavía no tenés uno, instalalo gratis con nuestro script:&nbsp;
                      <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-[11px]">
                        bash scripts-ubuntu/instalar-evolution.sh
                      </code>
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep(1)}
                className="w-full py-3.5 rounded-2xl bg-[#031E43] text-white font-bold text-sm hover:bg-[#0A2558] transition-all flex items-center justify-center gap-2"
              >
                Empezar <i className="ti ti-arrow-right" />
              </button>
            </div>
          )}

          {/* ── STEP 1: Credenciales ── */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-[#031E43] mb-1">Conectar servidor Evolution API</h2>
                <p className="text-sm text-[#3B506D]">Ingresá la URL y la API Key de tu servidor Evolution.</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 flex items-center gap-2">
                  <i className="ti ti-alert-circle flex-shrink-0" /> {error}
                </div>
              )}

              <div className="bg-white border border-[#DDDFE2]/40 rounded-2xl p-6 shadow-sm space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#3B506D] mb-1.5 uppercase tracking-wider">
                    URL del servidor
                  </label>
                  <input
                    type="url"
                    value={evoUrl}
                    onChange={(e) => setEvoUrl(e.target.value)}
                    placeholder="https://evo.tudominio.com"
                    className="w-full bg-[#FDFDFB] border border-[#DDDFE2] rounded-xl px-4 py-3 text-sm text-[#031E43] placeholder:text-[#3B506D]/40 focus:outline-none focus:border-[#3B506D] focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#3B506D] mb-1.5 uppercase tracking-wider">
                    API Key global
                  </label>
                  <input
                    type="password"
                    value={evoKey}
                    onChange={(e) => setEvoKey(e.target.value)}
                    placeholder="••••••••••••••••"
                    className="w-full bg-[#FDFDFB] border border-[#DDDFE2] rounded-xl px-4 py-3 text-sm text-[#031E43] placeholder:text-[#3B506D]/40 focus:outline-none focus:border-[#3B506D] focus:bg-white transition-all"
                  />
                  <p className="text-[11px] text-[#3B506D]/70 mt-1.5">
                    La encontrás en el archivo <code className="bg-[#DDDFE2]/40 px-1 rounded font-mono">.env</code> como <code className="bg-[#DDDFE2]/40 px-1 rounded font-mono">AUTHENTICATION_API_KEY</code>
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(0)}
                  className="px-4 py-3 rounded-xl border border-[#DDDFE2] text-[#3B506D] text-sm font-semibold hover:bg-[#FDFDFB] transition-all"
                >
                  ← Atrás
                </button>
                <button
                  onClick={handleTestConnection}
                  disabled={!evoUrl || !evoKey || loading}
                  className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {loading
                    ? <><i className="ti ti-loader-2 animate-spin" /> Verificando…</>
                    : <><i className="ti ti-plug" /> Verificar conexión →</>
                  }
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Instancia ── */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-[#031E43] mb-1">Seleccionar instancia</h2>
                <p className="text-sm text-[#3B506D]">Cada número de WhatsApp necesita una instancia. Usá una existente o creá una nueva.</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 flex items-center gap-2">
                  <i className="ti ti-alert-circle flex-shrink-0" /> {error}
                </div>
              )}

              <div className="bg-white border border-[#DDDFE2]/40 rounded-2xl shadow-sm overflow-hidden">
                {evoInstances.length > 0 && (
                  <div className="p-5 space-y-3 border-b border-[#DDDFE2]/40">
                    <p className="text-xs font-bold text-[#3B506D] uppercase tracking-wider">Instancias existentes</p>
                    {evoInstances.map((inst) => (
                      <button
                        key={inst.name}
                        onClick={() => handleSelectInstance(inst.name)}
                        disabled={loading}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[#DDDFE2]/40 hover:border-blue-300 hover:bg-blue-50 transition-all disabled:opacity-50 text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#25D366]/10 flex items-center justify-center">
                            <i className="ti ti-brand-whatsapp text-[#25D366]" />
                          </div>
                          <span className="text-sm font-bold text-[#031E43]">{inst.name}</span>
                        </div>
                        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          inst.state === "open"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-[#DDDFE2]/40 text-[#3B506D]"
                        }`}>
                          {inst.state}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="p-5 space-y-3">
                  <p className="text-xs font-bold text-[#3B506D] uppercase tracking-wider">
                    {evoInstances.length > 0 ? "O creá una nueva" : "Crear instancia"}
                  </p>
                  <div className="flex gap-2">
                    <input
                      value={evoNewName}
                      onChange={(e) => setEvoNewName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreateInstance()}
                      placeholder="mi-negocio-wp"
                      className="flex-1 bg-[#FDFDFB] border border-[#DDDFE2] rounded-xl px-4 py-3 text-sm text-[#031E43] placeholder:text-[#3B506D]/40 focus:outline-none focus:border-[#3B506D] focus:bg-white transition-all"
                    />
                    <button
                      onClick={handleCreateInstance}
                      disabled={!evoNewName.trim() || loading}
                      className="px-5 py-3 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all whitespace-nowrap flex items-center gap-2"
                    >
                      {loading ? <i className="ti ti-loader-2 animate-spin" /> : null}
                      Crear →
                    </button>
                  </div>
                  <p className="text-[11px] text-[#3B506D]/70">Usá solo letras, números y guiones. Ej: <code className="bg-[#DDDFE2]/40 px-1 rounded">pizzeria-don-carlos</code></p>
                </div>
              </div>

              <button
                onClick={() => setStep(1)}
                className="px-4 py-3 rounded-xl border border-[#DDDFE2] text-[#3B506D] text-sm font-semibold hover:bg-[#FDFDFB] transition-all"
              >
                ← Atrás
              </button>
            </div>
          )}

          {/* ── STEP 3: QR ── */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-[#031E43] mb-1">Escanear código QR</h2>
                <p className="text-sm text-[#3B506D]">
                  Abrí WhatsApp en tu celular y escaneá el código para vincular el número <strong>{evoInstance}</strong>.
                </p>
              </div>

              <div className="flex flex-col items-center gap-4">
                {/* QR grande */}
                <div className="relative">
                  <div className={`w-72 h-72 bg-white rounded-3xl border-4 flex items-center justify-center overflow-hidden shadow-lg transition-all ${
                    connected ? "border-emerald-400" : qrCountdown <= 10 ? "border-red-300" : "border-[#DDDFE2]/40"
                  }`}>
                    {connected ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
                          <i className="ti ti-check text-emerald-500 text-5xl" />
                        </div>
                        <p className="text-sm font-bold text-emerald-600">¡Conectado!</p>
                      </div>
                    ) : evoQr ? (
                      <>
                        <img
                          src={evoQr.startsWith("data:") ? evoQr : `data:image/png;base64,${evoQr}`}
                          alt="Código QR WhatsApp"
                          className="w-full h-full object-contain p-3"
                        />
                        {qrCountdown <= 10 && (
                          <div className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center gap-2">
                            <i className="ti ti-refresh text-white text-3xl" />
                            <span className="text-white font-black text-sm">Actualizando…</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <i className="ti ti-loader-2 animate-spin text-4xl text-[#DDDFE2]" />
                        <p className="text-sm text-[#3B506D]/70">Generando QR…</p>
                      </div>
                    )}
                  </div>

                  {/* countdown badge */}
                  {!connected && evoQr && (
                    <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider shadow-sm transition-all ${
                      qrCountdown <= 10
                        ? "bg-red-500 text-white"
                        : "bg-white border border-[#DDDFE2] text-[#3B506D]"
                    }`}>
                      {qrCountdown <= 10 ? `Actualizando en ${qrCountdown}s` : `Válido por ${qrCountdown}s`}
                    </div>
                  )}
                </div>

                {/* Polling indicator */}
                {!connected && (
                  <div className="flex items-center gap-2 text-xs text-[#3B506D]/70 mt-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    Esperando escaneo… verificando cada 3 segundos
                  </div>
                )}
              </div>

              {/* Instrucciones */}
              {!connected && (
                <div className="bg-white border border-[#DDDFE2]/40 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-5 pt-4 pb-2">
                    <p className="text-xs font-bold text-[#3B506D] uppercase tracking-wider mb-3">Cómo escanearlo</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[11px] font-bold text-[#3B506D] mb-2 flex items-center gap-1">
                          <i className="ti ti-brand-android text-green-500" /> Android
                        </p>
                        <ol className="space-y-1.5">
                          {[
                            "Abrí WhatsApp",
                            "Tocá los 3 puntos (⋮)",
                            "\"Dispositivos vinculados\"",
                            "\"Vincular dispositivo\"",
                            "Apuntá al QR",
                          ].map((s, i) => (
                            <li key={i} className="flex items-start gap-2 text-[11px] text-[#3B506D]">
                              <span className="w-4 h-4 rounded-full bg-[#DDDFE2]/40 text-[9px] font-black text-[#3B506D] flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                              {s}
                            </li>
                          ))}
                        </ol>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-[#3B506D] mb-2 flex items-center gap-1">
                          <i className="ti ti-brand-apple" /> iPhone
                        </p>
                        <ol className="space-y-1.5">
                          {[
                            "Abrí WhatsApp",
                            "Tocá \"Configuración\"",
                            "\"Dispositivos vinculados\"",
                            "\"Vincular dispositivo\"",
                            "Apuntá al QR",
                          ].map((s, i) => (
                            <li key={i} className="flex items-start gap-2 text-[11px] text-[#3B506D]">
                              <span className="w-4 h-4 rounded-full bg-[#DDDFE2]/40 text-[9px] font-black text-[#3B506D] flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                              {s}
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  </div>
                  <div className="px-5 py-3 bg-[#FDFDFB] border-t border-[#DDDFE2]/40">
                    <p className="text-[11px] text-[#3B506D]/70">
                      ⚡ El escaneo se detecta automáticamente — no hace falta tocar ningún botón acá.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 4: Éxito ── */}
          {step === 4 && (
            <div className="space-y-6">
              {/* Banner */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-8 text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto">
                  <i className="ti ti-circle-check text-emerald-500 text-4xl" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-emerald-800">¡WhatsApp conectado!</h2>
                  <p className="text-sm text-emerald-600 mt-1">
                    {webhookDone
                      ? "Webhook configurado automáticamente · El bot ya puede recibir mensajes."
                      : "El número quedó vinculado a tu agente IA."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-white rounded-xl px-4 py-3 text-left border border-emerald-100">
                    <p className="text-[10px] font-bold text-[#3B506D]/70 uppercase tracking-wider mb-1">Instancia</p>
                    <p className="text-sm font-bold text-[#031E43] truncate">{evoInstance || cfg.evolutionInstance || "—"}</p>
                  </div>
                  <div className="bg-white rounded-xl px-4 py-3 text-left border border-emerald-100">
                    <p className="text-[10px] font-bold text-[#3B506D]/70 uppercase tracking-wider mb-1">Número</p>
                    <p className="text-sm font-bold text-[#031E43] truncate">
                      {evoPhone ? `+${evoPhone}` : "Detectado al conectar"}
                    </p>
                    {evoProfileName && <p className="text-[10px] text-[#3B506D]/70 truncate">{evoProfileName}</p>}
                  </div>
                </div>
              </div>

              {/* Test message */}
              <div className="bg-white border border-[#DDDFE2]/40 rounded-2xl shadow-sm p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#25D366]/10 flex items-center justify-center">
                    <i className="ti ti-brand-whatsapp text-[#25D366]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#031E43]">Enviar mensaje de prueba</p>
                    <p className="text-[11px] text-[#3B506D]/70">Verificá que el bot funciona enviándote un mensaje</p>
                  </div>
                </div>

                {testSent ? (
                  <div className="flex items-center justify-between gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div className="flex items-center gap-2">
                      <i className="ti ti-circle-check text-emerald-500" />
                      <p className="text-sm font-semibold text-emerald-700">¡Mensaje enviado! Revisá tu WhatsApp.</p>
                    </div>
                    <button
                      onClick={() => { setTestSent(false); setTestError(""); }}
                      className="text-[11px] text-[#3B506D]/70 hover:text-[#3B506D]"
                    >
                      Otro
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {testError && (
                      <p className="text-xs text-red-500">{testError}</p>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                        placeholder="5492984510883 (sin +)"
                        className="flex-1 bg-[#FDFDFB] border border-[#DDDFE2] rounded-xl px-4 py-3 text-sm text-[#031E43] placeholder:text-[#3B506D]/40 focus:outline-none focus:border-[#25D366]/50 focus:bg-white transition-all"
                      />
                      <button
                        onClick={handleSendTest}
                        disabled={!testPhone.trim() || testSending}
                        className="px-5 py-3 bg-[#25D366] text-white font-bold text-sm rounded-xl hover:bg-[#22c55e] disabled:opacity-40 disabled:cursor-not-allowed transition-all whitespace-nowrap flex items-center gap-2"
                      >
                        {testSending ? <i className="ti ti-loader-2 animate-spin" /> : <i className="ti ti-send" />}
                        Enviar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Next steps */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 space-y-3">
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Próximos pasos</p>
                <div className="space-y-2">
                  {[
                    { icon: "ti-robot", label: "Configurar el agente IA", to: "/app/agent", desc: "Prompt, modelo y horarios" },
                    { icon: "ti-file-text", label: "Agregar base de conocimiento", to: "/app/knowledge", desc: "FAQs, productos, catálogo" },
                    { icon: "ti-git-branch", label: "Crear flows de respuesta", to: "/app/flows", desc: "Respuestas por palabras clave" },
                  ].map((item) => (
                    <Link
                      key={item.to}
                      href={item.to}
                      className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-blue-100 hover:border-blue-300 transition-all no-underline group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <i className={`ti ${item.icon} text-blue-600`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#031E43]">{item.label}</p>
                        <p className="text-[11px] text-[#3B506D]/70">{item.desc}</p>
                      </div>
                      <i className="ti ti-arrow-right text-[#DDDFE2] group-hover:text-blue-400 transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>

              <button
                onClick={handleReset}
                className="w-full py-2.5 rounded-xl border border-[#DDDFE2] text-[#3B506D]/70 text-sm hover:bg-[#FDFDFB] hover:text-[#3B506D] transition-all"
              >
                Reconectar otro número
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

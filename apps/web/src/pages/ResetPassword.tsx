import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import { ClientumLogo } from "@/components/ui/logo";

const NAVY = "#031E43";
const NAVY_DARK = "#031E43";

const inputCls = `w-full px-3 py-2.5 rounded-lg border border-[#DDDFE2] bg-white text-sm text-[#031E43] placeholder-[#3B506D]/70 focus:outline-none focus:ring-2 focus:border-[#031E43] transition-all`;

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (!t) setError("El enlace es inválido o ya expiró.");
    else setToken(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres."); return; }
    if (password !== confirm) { setError("Las contraseñas no coinciden."); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Error al restablecer la contraseña."); return; }
      setDone(true);
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#EEF2FF" }}>
      <div
        className="w-full max-w-[400px] rounded-2xl shadow-xl overflow-hidden"
        style={{ background: "#FAFBFF" }}
      >
        <div style={{ height: 4, background: `linear-gradient(90deg, ${NAVY_DARK}, ${NAVY})` }} />

        <div className="px-8 pt-8 pb-6">
          <div className="flex justify-center mb-6">
            <ClientumLogo variant="pill" size={34} subtitle="IA para PyMEs" />
          </div>

          {done ? (
            <div className="text-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: "#DCFCE7" }}
              >
                <CheckCircle2 size={30} className="text-green-600" />
              </div>
              <h2 className="text-[21px] font-bold mb-2" style={{ color: NAVY_DARK }}>
                ¡Contraseña actualizada!
              </h2>
              <p className="text-sm text-[#3B506D] mb-6">
                Tu contraseña fue restablecida. Ya podés ingresar con tu nueva contraseña.
              </p>
              <button
                onClick={() => setLocation("/")}
                className="w-full py-2.5 rounded-lg text-white font-semibold text-sm"
                style={{ background: NAVY }}
              >
                Volver al inicio
              </button>
            </div>
          ) : !token ? (
            <div className="text-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: "#FEE2E2" }}
              >
                <XCircle size={30} className="text-red-500" />
              </div>
              <h2 className="text-[21px] font-bold mb-2" style={{ color: NAVY_DARK }}>
                Enlace inválido
              </h2>
              <p className="text-sm text-[#3B506D] mb-6">
                Este enlace es inválido o ya expiró. Solicitá uno nuevo desde el login.
              </p>
              <button
                onClick={() => setLocation("/")}
                className="w-full py-2.5 rounded-lg text-white font-semibold text-sm"
                style={{ background: NAVY }}
              >
                Volver al inicio
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-[21px] font-bold text-center mb-1" style={{ color: NAVY_DARK }}>
                Nueva contraseña
              </h2>
              <p className="text-sm text-center text-[#3B506D] mb-6">
                Ingresá y confirmá tu nueva contraseña.
              </p>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#3B506D] uppercase tracking-wide mb-1.5">
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      autoFocus
                      placeholder="Mínimo 6 caracteres"
                      className={`${inputCls} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3B506D]/70 hover:text-[#3B506D] transition-colors"
                    >
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#3B506D] uppercase tracking-wide mb-1.5">
                    Repetir contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      placeholder="Repetí la contraseña"
                      className={`${inputCls} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3B506D]/70 hover:text-[#3B506D] transition-colors"
                    >
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg text-white font-semibold text-sm transition-all disabled:opacity-50"
                  style={{ background: loading ? "#9ca3af" : NAVY }}
                >
                  {loading ? "Guardando..." : "Guardar nueva contraseña"}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="px-8 pb-5 border-t border-[#DDDFE2]/40">
          <p className="text-center text-xs text-[#3B506D]/70 mt-4">
            © {new Date().getFullYear()} Clientum · IA para PyMEs
          </p>
        </div>
      </div>
    </div>
  );
}

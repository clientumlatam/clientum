import { useEffect, useState } from "react";
import { X, Mail, Eye, EyeOff, ArrowLeft, Key } from "lucide-react";

interface LoginModalProps {
  view: "login" | "register";
  onClose: () => void;
  onSwitchView: (view: "login" | "register") => void;
}

const NAVY = "#031E43";
const NAVY_DARK = "#031E43";

const ClientumLogo = () => (
  <div className="flex flex-col items-center gap-2 mb-6">
    <div
      className="flex items-center gap-2 px-4 py-2 rounded-full"
      style={{ background: NAVY_DARK }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="22" height="22" fill="none">
        <circle cx="24" cy="8" r="4.5" fill="white" />
        <circle cx="40" cy="24" r="4.5" fill="white" />
        <circle cx="24" cy="40" r="4.5" fill="white" />
        <circle cx="8" cy="24" r="4.5" fill="white" />
        <line x1="24" y1="8" x2="40" y2="24" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="40" y1="24" x2="24" y2="40" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="24" y1="40" x2="8" y2="24" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="8" y1="24" x2="24" y2="8" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <span className="text-white font-bold text-[15px] tracking-wide">Clientum</span>
    </div>
  </div>
);

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
);

const inputCls = `w-full px-3 py-2.5 rounded-lg border border-[#DDDFE2] bg-white text-sm text-[#031E43] placeholder-[#3B506D]/70 focus:outline-none focus:ring-2 focus:border-[#031E43] transition-all`;
const inputFocusRing = { "--tw-ring-color": "#031E4333" } as React.CSSProperties;

type SubView = "options" | "email-form" | "forgot" | "forgot-sent";

export default function LoginModal({ view, onClose, onSwitchView }: LoginModalProps) {
  const isLogin = view === "login";
  const [subView, setSubView] = useState<SubView>("options");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    setSubView("options");
    setError(null);
    setEmail("");
    setPassword("");
  }, [view]);

  const handleGoogle = () => { window.location.href = "/api/auth/google"; };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = isLogin ? "/api/auth/login-email" : "/api/auth/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Error al procesar la solicitud"); return; }
      window.location.href = data.redirectTo || "/app";
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSubView("forgot-sent");
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const switchAndReset = (v: "login" | "register") => {
    setSubView("options");
    setError(null);
    onSwitchView(v);
  };

  const PrimaryBtn = ({ children, disabled, onClick, type = "button" }: {
    children: React.ReactNode; disabled?: boolean; onClick?: () => void; type?: "button" | "submit";
  }) => (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="w-full py-2.5 rounded-lg text-white font-semibold text-sm transition-all disabled:opacity-50"
      style={{ background: disabled ? "#9ca3af" : NAVY }}
    >
      {children}
    </button>
  );

  const LinkBtn = ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className="font-semibold hover:underline transition-all"
      style={{ color: NAVY }}
    >
      {children}
    </button>
  );

  const BackBtn = ({ onClick }: { onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 text-sm text-[#3B506D]/70 hover:text-[#3B506D] mb-5 transition-colors"
    >
      <ArrowLeft size={14} />
      Atrás
    </button>
  );

  const SwitchRow = () => (
    <div className="mt-5 pt-4 border-t border-[#DDDFE2]/40">
      <p className="text-center text-sm text-[#3B506D]">
        {isLogin ? (
          <>¿Nuevo por acá?{" "}<LinkBtn onClick={() => switchAndReset("register")}>Crear cuenta</LinkBtn></>
        ) : (
          <>¿Ya tenés cuenta?{" "}<LinkBtn onClick={() => switchAndReset("login")}>Iniciar sesión</LinkBtn></>
        )}
      </p>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(13,36,97,0.55)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-[400px] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        style={{ background: "#FAFBFF" }}
      >
        {/* navy top accent bar */}
        <div style={{ height: 4, background: `linear-gradient(90deg, ${NAVY_DARK}, ${NAVY})` }} />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center text-[#3B506D]/70 hover:bg-[#DDDFE2]/40 hover:text-[#3B506D] transition-all z-10"
        >
          <X size={15} />
        </button>

        <div className="px-8 pt-7 pb-6">

          {/* ── OPTIONS ── */}
          {subView === "options" && (
            <>
              <ClientumLogo />
              <h2 className="text-[21px] font-bold text-center mb-1" style={{ color: NAVY_DARK }}>
                {isLogin ? "Ingresar a Clientum" : "Crear una cuenta"}
              </h2>
              <p className="text-xs text-center text-[#3B506D]/70 mb-6">
                {isLogin ? "IA para PyMEs argentinas" : "Empezá gratis · Sin tarjeta de crédito"}
              </p>

              <div className="space-y-2.5">
                <button
                  onClick={handleGoogle}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-[#DDDFE2] bg-white text-[#031E43] font-medium text-sm hover:border-[#DDDFE2] hover:bg-[#FDFDFB] transition-all shadow-sm"
                >
                  <GoogleIcon />
                  Continuar con Google
                </button>

                <button
                  onClick={() => setSubView("email-form")}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-[#DDDFE2] bg-white text-[#031E43] font-medium text-sm hover:border-[#DDDFE2] hover:bg-[#FDFDFB] transition-all shadow-sm"
                >
                  <Mail size={16} className="text-[#3B506D]" />
                  Continuar con email
                </button>

                {isLogin && (
                  <button
                    onClick={() => window.location.href = "/api/login"}
                    className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-[#DDDFE2] bg-white text-[#031E43] font-medium text-sm hover:border-[#DDDFE2] hover:bg-[#FDFDFB] transition-all shadow-sm"
                  >
                    <Key size={15} className="text-[#3B506D]" />
                    Usar SSO
                  </button>
                )}

                <button
                  onClick={() => window.location.href = "/api/login"}
                  className="w-full text-center text-sm text-[#3B506D]/70 hover:text-[#3B506D] py-1 transition-colors"
                >
                  Ver más opciones
                </button>
              </div>

              <div className="mt-5 pt-4 border-t border-[#DDDFE2]/40">
                <p className="text-center text-sm text-[#3B506D]">
                  {isLogin ? (
                    <>¿Nuevo por acá?{" "}<LinkBtn onClick={() => switchAndReset("register")}>Crear cuenta</LinkBtn></>
                  ) : (
                    <>¿Ya tenés cuenta?{" "}<LinkBtn onClick={() => switchAndReset("login")}>Iniciar sesión</LinkBtn></>
                  )}
                </p>
              </div>
            </>
          )}

          {/* ── EMAIL FORM ── */}
          {subView === "email-form" && (
            <>
              <BackBtn onClick={() => { setSubView("options"); setError(null); }} />
              <ClientumLogo />
              <h2 className="text-[21px] font-bold text-center mb-6" style={{ color: NAVY_DARK }}>
                {isLogin ? "Ingresar con email" : "Crear una cuenta"}
              </h2>

              <form onSubmit={handleEmailSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#3B506D] uppercase tracking-wide mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    placeholder="tu@email.com"
                    className={inputCls}
                    style={inputFocusRing}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-[#3B506D] uppercase tracking-wide">Contraseña</label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() => { setSubView("forgot"); setError(null); }}
                        className="text-xs font-medium hover:underline"
                        style={{ color: NAVY }}
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="Mínimo 6 caracteres"
                      className={`${inputCls} pr-10`}
                      style={inputFocusRing}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3B506D]/70 hover:text-[#3B506D] transition-colors"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
                )}

                <PrimaryBtn type="submit" disabled={loading}>
                  {loading ? "Procesando..." : isLogin ? "Ingresar" : "Crear cuenta"}
                </PrimaryBtn>
              </form>

              <SwitchRow />
            </>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {subView === "forgot" && (
            <>
              <BackBtn onClick={() => { setSubView("email-form"); setError(null); }} />
              <ClientumLogo />
              <h2 className="text-[21px] font-bold text-center mb-1" style={{ color: NAVY_DARK }}>
                Recuperar contraseña
              </h2>
              <p className="text-sm text-center text-[#3B506D] mb-6">
                Ingresá tu email y te enviamos un enlace para crear una nueva contraseña.
              </p>

              <form onSubmit={handleForgotSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#3B506D] uppercase tracking-wide mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    placeholder="tu@email.com"
                    className={inputCls}
                    style={inputFocusRing}
                  />
                </div>
                {error && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
                )}
                <PrimaryBtn type="submit" disabled={loading}>
                  {loading ? "Enviando..." : "Enviar enlace"}
                </PrimaryBtn>
              </form>
            </>
          )}

          {/* ── FORGOT SENT ── */}
          {subView === "forgot-sent" && (
            <div className="text-center py-2">
              <ClientumLogo />
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: "#EEF2FF" }}
              >
                <Mail size={26} style={{ color: NAVY }} />
              </div>
              <h2 className="text-[21px] font-bold mb-2" style={{ color: NAVY_DARK }}>Revisá tu email</h2>
              <p className="text-sm text-[#3B506D] mb-1">
                Si hay una cuenta con <strong className="text-[#031E43]">{email}</strong>, te enviamos un enlace de recuperación.
              </p>
              <p className="text-xs text-[#3B506D]/70 mb-6">Expira en 30 minutos.</p>
              <PrimaryBtn onClick={() => { setSubView("options"); setError(null); }}>
                Volver al inicio
              </PrimaryBtn>
            </div>
          )}
        </div>

        <div className="px-8 pb-5 border-t border-[#DDDFE2]/40">
          <p className="text-center text-xs text-[#3B506D]/70 leading-relaxed mt-4">
            Al continuar aceptás nuestros{" "}
            <a href="#" className="underline hover:text-[#3B506D]">Términos</a>
            {" "}y{" "}
            <a href="#" className="underline hover:text-[#3B506D]">Política de privacidad</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

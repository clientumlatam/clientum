import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { demoAuth, DEMO_CREDENTIALS } from "@/lib/demo-auth";
import { ClientumLogo } from "@/components/ui/logo";

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user || demoAuth.isActive()) {
      navigate("/app");
    }
  }, [user, navigate]);

  function handleDemoLogin() {
    setEmail(DEMO_CREDENTIALS.email);
    setPassword(DEMO_CREDENTIALS.password);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (demoAuth.signIn(email, password)) {
      navigate("/app");
      return;
    }

    const endpoint =
      mode === "signin" ? "/api/auth/login-email" : "/api/auth/register";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        window.location.href = data.redirectTo || "/app";
        return;
      }
      setError(data.error || "Error al procesar la solicitud. Intentá de nuevo.");
    } catch {
      setError("Error de conexión. Revisá tu internet e intentá de nuevo.");
    }
    setLoading(false);
  }

  function handleReplitLogin() {
    window.location.href = "/api/auth/login";
  }

  return (
    <div className="min-h-screen bg-navy text-white flex flex-col">
      <div className="px-6 py-5 border-b border-white/5">
        <Link href="/">
          <ClientumLogo variant="pill" size={34} subtitle="IA para PyMEs" />
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-4">
          {mode === "signin" && (
            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full py-2.5 bg-cl-accent/10 border border-cl-accent/20 text-cl-accent text-xs font-bold rounded-xl hover:bg-cl-accent/15 transition-all flex items-center justify-center gap-2"
            >
              <i className="ti ti-bolt text-base" />
              Usar credenciales demo
              <span className="text-cl-accent/60 font-normal">demo@clientum.com.ar / demo1234</span>
            </button>
          )}

          <div className="bg-navy-card border border-white/5 rounded-3xl p-8 space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-black">
                {mode === "signin" ? "Bienvenido de vuelta" : "Crear cuenta"}
              </h1>
              <p className="text-sm text-white/60">
                {mode === "signin"
                  ? "Ingresá a tu consola Clientum"
                  : "Empezá tu prueba gratuita en segundos"}
              </p>
            </div>

            <button
              onClick={handleReplitLogin}
              className="w-full h-12 bg-white text-navy rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-white/90 transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
              </svg>
              Iniciar sesión con cuenta
            </button>

            <div className="flex items-center gap-3 text-xs text-white/40">
              <div className="flex-1 h-px bg-white/10" />
              o con email
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full mt-1 h-11 bg-navy-3 border border-white/10 rounded-xl px-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cl-accent"
                  placeholder="vos@empresa.com"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Contraseña</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full mt-1 h-11 bg-navy-3 border border-white/10 rounded-xl px-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cl-accent"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
              {error && (
                <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-cl-accent text-navy rounded-xl font-black hover:bg-cl-accent-hover disabled:opacity-50 transition-all"
              >
                {loading
                  ? "Cargando..."
                  : mode === "signin"
                    ? "Ingresar"
                    : "Crear cuenta"}
              </button>
            </form>

            <div className="text-center text-sm text-white/60">
              {mode === "signin" ? (
                <>
                  ¿Sin cuenta?{" "}
                  <button onClick={() => setMode("signup")} className="text-cl-accent font-bold hover:underline">
                    Crear una
                  </button>
                </>
              ) : (
                <>
                  ¿Ya tenés cuenta?{" "}
                  <button onClick={() => setMode("signin")} className="text-cl-accent font-bold hover:underline">
                    Ingresar
                  </button>
                </>
              )}
            </div>
          </div>

          {import.meta.env.DEV && (
            <button
              type="button"
              onClick={() => { window.location.href = "/api/auth/dev-login"; }}
              className="w-full py-2 border border-dashed border-white/20 text-white/40 text-xs font-mono rounded-xl hover:border-white/40 hover:text-white/60 transition-all flex items-center justify-center gap-2"
            >
              <i className="ti ti-terminal text-sm" />
              [DEV] Login como admin_clientum
            </button>
          )}

          <p className="text-center text-xs text-white/40">
            Al continuar aceptás nuestros términos de uso y política de privacidad.
          </p>
        </div>
      </div>
    </div>
  );
}

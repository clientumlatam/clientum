import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";
import { Menu, X, Sun, Moon } from "lucide-react";
import LoginModal from "@/components/LoginModal";
import { useTheme } from "@/hooks/useTheme";
import { ClientumLogo } from "@/components/ui/logo";

const WA_URL = "https://wa.me/5492984510883";

const navLinks = [
  { label: "Inicio",    href: "/" },
  { label: "Nosotros",  href: "/#nosotros" },
  { label: "Casos",     href: "/#casos" },
  { label: "Contacto",  href: "/#contacto" },
  { label: "Planes",    href: "/#precios" },
];

export default function PublicLayout({ children, title, subtitle }: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authView, setAuthView] = useState<"login" | "register">("login");
  const { theme, toggleTheme } = useTheme();

  function goTo(href: string) {
    setMobileOpen(false);
    navigate(href);
  }

  function openLogin() {
    setAuthView("login");
    setShowAuthModal(true);
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-background border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <button
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => goTo("/")}
          >
            <ClientumLogo variant="pill" size={34} subtitle="IA para PyMEs" />
          </button>

          <div className="hidden lg:flex items-center gap-1 text-sm font-semibold text-muted-foreground">
            {navLinks.map(({ label, href }) => (
              <button
                key={href}
                onClick={() => goTo(href)}
                className="px-3 py-2 rounded-lg hover:bg-foreground/5 hover:text-foreground transition-colors"
              >
                {label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggleTheme}
              title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
              className="w-9 h-9 flex items-center justify-center rounded-full border border-foreground/20 text-muted-foreground hover:bg-foreground/8 transition-colors flex-shrink-0"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Button
              onClick={() => window.open(WA_URL, "_blank")}
              className="bg-green-500 hover:bg-green-600 text-white rounded-full font-bold"
            >
              WhatsApp
            </Button>
            {!authLoading && (
              user
                ? <Button
                    onClick={() => navigate("/app")}
                    className="bg-[#031E43] hover:bg-[#031E43]/90 text-white rounded-full font-bold"
                  >Mi cuenta</Button>
                : <Button
                    onClick={openLogin}
                    className="bg-[#031E43] hover:bg-[#031E43]/90 text-white rounded-full font-bold"
                  >Ingresar</Button>
            )}
          </div>

          <button className="md:hidden p-2 text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X /> : <Menu />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden absolute left-0 right-0 bg-background border-b border-border p-4 shadow-xl flex flex-col gap-3 text-center font-bold text-foreground">
            {navLinks.map(({ label, href }) => (
              <button
                key={href}
                onClick={() => goTo(href)}
                className="p-2 border-b border-border"
              >{label}</button>
            ))}
            <button
              onClick={toggleTheme}
              className="p-2 border-b border-border text-muted-foreground flex items-center justify-center gap-2"
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              {theme === "dark" ? "Modo claro" : "Modo oscuro"}
            </button>
            {!authLoading && (
              user
                ? <button onClick={() => { setMobileOpen(false); navigate("/app"); }} className="p-2 border border-foreground/25 text-foreground rounded-lg">Mi cuenta</button>
                : <button onClick={() => { setMobileOpen(false); openLogin(); }} className="p-2 bg-[#031E43] text-white rounded-lg">Ingresar</button>
            )}
          </div>
        )}
      </nav>

      {/* Page header */}
      {(title || subtitle) && (
        <div
          className="py-10 px-4 md:px-8"
          style={{ background: "linear-gradient(180deg, #071325 0%, #07102A 100%)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="max-w-5xl mx-auto">
            {title && <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-1">{title}</h1>}
            {subtitle && <p className="text-sm" style={{ color: "rgba(255,255,255,.55)" }}>{subtitle}</p>}
          </div>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 px-4 md:px-8 py-8">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer style={{ background: "#020D1E", color: "rgba(255,255,255,.5)" }} className="py-12 px-4 md:px-8 text-sm">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="mb-4">
                <ClientumLogo variant="pill" size={32} subtitle="IA para PyMEs" className="opacity-90" />
              </div>
              <p className="text-xs leading-relaxed mb-4">Automatización IA para PyMEs argentinas. Atendé más, vendé más, operá mejor.</p>
              <a
                href={WA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold"
                style={{ background: "#25D366", color: "#fff" }}
              >
                <i className="ti ti-brand-whatsapp" /> WhatsApp
              </a>
            </div>
            <div>
              <h4 className="font-extrabold text-white mb-4 uppercase tracking-wider text-xs">Producto</h4>
              <ul className="space-y-3 font-semibold">
                <li><button onClick={() => navigate("/#precios")} className="hover:text-white transition-colors">Planes</button></li>
                <li><button onClick={() => navigate("/#soluciones")} className="hover:text-white transition-colors">Chatbot 24/7</button></li>
                <li><button onClick={() => navigate("/#soluciones")} className="hover:text-white transition-colors">Reportes automáticos</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-extrabold text-white mb-4 uppercase tracking-wider text-xs">Empresa</h4>
              <ul className="space-y-3 font-semibold">
                <li><button onClick={() => navigate("/nosotros")} className="hover:text-white transition-colors">Sobre Clientum</button></li>
                <li><button onClick={() => navigate("/casos")} className="hover:text-white transition-colors">Casos de éxito</button></li>
                <li><button onClick={() => navigate("/contacto")} className="hover:text-white transition-colors">Contacto</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-extrabold text-white mb-4 uppercase tracking-wider text-xs">Contacto</h4>
              <ul className="space-y-3 font-semibold">
                <li>+54 9 2984 51-0883</li>
                <li>clientumlatam@gmail.com</li>
                <li>General Roca, Río Negro, Argentina</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-semibold">
            <div>© 2026 Clientum LATAM · Todos los derechos reservados</div>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition-colors">Privacidad</a>
              <a href="#" className="hover:text-white transition-colors">Términos</a>
            </div>
          </div>
        </div>
      </footer>

      {showAuthModal && (
        <LoginModal
          view={authView}
          onClose={() => setShowAuthModal(false)}
          onSwitchView={(v) => setAuthView(v)}
        />
      )}
    </div>
  );
}

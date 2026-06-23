import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFDFB] px-4">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 rounded-3xl bg-[#031E43]/10 flex items-center justify-center mx-auto mb-6">
          <span className="text-5xl">🤖</span>
        </div>
        <h1 className="text-8xl font-black text-[#031E43] mb-2">404</h1>
        <h2 className="text-2xl font-bold text-[#031E43] mb-3">Página no encontrada</h2>
        <p className="text-[#3B506D] mb-8">
          La página que buscás no existe o fue movida. Pero tranqui, tu IA sí está disponible. 😄
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="px-6 py-3 rounded-xl text-white font-bold text-sm inline-block" style={{ background: "linear-gradient(135deg, #031E43, #031E43)" }}>
            ← Volver al inicio
          </Link>
          <Link href="/app" className="px-6 py-3 rounded-xl border-2 border-[#031E43] text-[#031E43] font-bold text-sm inline-block hover:bg-[#031E43] hover:text-white transition-colors no-underline">
            Mi cuenta
          </Link>
        </div>
        <p className="text-xs text-[#3B506D]/70 mt-8">
          ¿Necesitás ayuda?{" "}
          <a href="https://wa.me/5492984510883" target="_blank" rel="noreferrer" className="text-[#031E43] font-semibold hover:underline">
            Escribinos por WhatsApp
          </a>
        </p>
      </div>
    </div>
  );
}

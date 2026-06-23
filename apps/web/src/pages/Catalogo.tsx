import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import Papa from "papaparse";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, X, Plus, Minus, Sun, Moon, Search, ChevronLeft, ChevronRight,
  Eye, Scale, Trash2, CheckCircle, MessageCircle, Instagram, MapPin, Clock,
  History, ChevronDown, Filter, ExternalLink, Facebook,
  Package, ShieldAlert, Droplets, ArrowLeft, RefreshCcw, CreditCard, Phone, User, ArrowRight,
} from "lucide-react";

interface CatalogConfig {
  token: string;
  productsUrl: string;
  brandName: string;
  brandSubtitle: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  heroImage: string;
  heroBadge: string;
  heroTitle: string;
  heroTitleAccent: string;
  heroDescription: string;
  catalogTitle: string;
  catalogSubtitle: string;
  searchPlaceholder: string;
  currency: string;
  whatsapp: string;
  instagram: string;
  facebook: string;
  mapsUrl: string;
  address: string;
  hours: string;
  footerDesc: string;
  featuresJson: string;
  faqJson: string;
  resellerJson?: string;
  chatbotWidgetToken?: string | null;
  hasMercadoPago?: boolean;
}

interface Product {
  id: string;
  nombre: string;
  precio: string;
  precioAnterior?: string;
  stock?: string;
  categoria: string;
  descripcion: string;
  imagen?: string;
  destacado?: boolean;
  presentacion?: string;
  usos?: string;
  dilucion?: string;
  precauciones?: string;
}

interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
}

interface OrderHistoryEntry {
  id: string;
  date: string;
  items: CartItem[];
  total: number;
  currency: string;
  brandName: string;
}

const ITEMS_PER_PAGE = 12;

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span
      className="absolute top-3 right-3 px-3 py-0.5 rounded-full text-[9px] font-black uppercase z-10 shadow-sm"
      style={{ background: color, color: "#fff" }}
    >
      {children}
    </span>
  );
}

function ProductCard({
  p,
  config,
  onOrder,
  onAddToCart,
  onQuickView,
  darkMode,
  isCompared,
  onToggleCompare,
  primary,
}: {
  p: Product;
  config: CatalogConfig;
  onOrder: (p: Product) => void;
  onAddToCart: (p: Product) => void;
  onQuickView: (p: Product) => void;
  darkMode: boolean;
  isCompared: boolean;
  onToggleCompare: (p: Product) => void;
  primary: string;
}) {
  const isOffer = p.nombre.toUpperCase().includes("OFERTA") || p.nombre.toUpperCase().includes("PROMO");
  const isNew = p.nombre.toUpperCase().includes("NUEVO");
  const priceNum = parseFloat(p.precio) || 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className={`rounded-3xl border overflow-hidden flex flex-col group cursor-pointer transition-shadow hover:shadow-2xl ${
        darkMode ? "bg-[#031E43] border-[#3B506D] text-white" : "bg-white border-[#DDDFE2] text-[#031E43]"
      }`}
      onClick={() => onQuickView(p)}
    >
      <div className={`aspect-square relative overflow-hidden flex items-center justify-center ${darkMode ? "bg-[#031E43]" : "bg-[#FDFDFB]"}`}>
        <span className={`absolute top-3 left-3 text-[9px] font-mono px-2 py-0.5 rounded z-10 ${darkMode ? "bg-[#3B506D] text-[#3B506D]/70" : "bg-[#DDDFE2]/40 text-[#3B506D]/70"}`}>
          #{p.id}
        </span>
        {p.destacado && <span className="absolute top-9 left-3 bg-amber-400 text-amber-900 px-3 py-0.5 rounded-full text-[9px] font-black uppercase z-10">⭐ Destacado</span>}
        {isOffer && <Badge color="#ef4444">¡Oferta!</Badge>}
        {isNew && !isOffer && <Badge color="#0ea5e9">Nuevo</Badge>}
        {(p.stock === "0" || p.stock === "false" || p.stock === "FALSE" || p.stock === "sin stock" || p.stock === "Sin stock") && (
          <span className="absolute bottom-3 left-3 bg-[#031E43]/80 text-white px-3 py-0.5 rounded-full text-[9px] font-black uppercase z-10">Sin stock</span>
        )}

        {p.imagen ? (
          <img
            src={p.imagen}
            alt={p.nombre}
            className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        ) : (
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: `${primary}20` }}>
            <ShoppingCart className="w-8 h-8 opacity-40" style={{ color: primary }} />
          </div>
        )}

        <div className="absolute inset-0 bg-[#031E43]/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-20">
          <button
            onClick={(e) => { e.stopPropagation(); onQuickView(p); }}
            className="bg-white text-[#031E43] px-3 py-2 rounded-full font-bold text-xs shadow-md transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 flex items-center gap-1.5 hover:bg-[#DDDFE2]/40"
          >
            <Eye size={13} /> Vista rápida
          </button>
        </div>
      </div>

      <div className="p-5 flex flex-col flex-grow">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-black uppercase" style={{ color: primary }}>{p.categoria}</span>
          <label
            className="flex items-center gap-1 cursor-pointer select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={isCompared}
              onChange={() => onToggleCompare(p)}
              className="w-3.5 h-3.5 accent-blue-500 cursor-pointer rounded"
            />
            <span className={`text-[9px] font-bold uppercase ${darkMode ? "text-[#3B506D]/70" : "text-[#3B506D]/70"} hover:text-blue-500 transition-colors`}>Comparar</span>
          </label>
        </div>

        <h3 className="text-sm font-black mb-1.5 leading-tight line-clamp-2">{p.nombre}</h3>
        <p className={`text-xs mb-4 flex-grow line-clamp-2 ${darkMode ? "text-[#3B506D]/70" : "text-[#3B506D]/70"}`}>{p.descripcion}</p>

        <div className={`flex items-center justify-between pt-4 border-t ${darkMode ? "border-[#3B506D]" : "border-[#FDFDFB]"}`}>
          <div>
            <p className="text-[9px] font-black text-[#3B506D]/70 uppercase">Precio</p>
            {p.precioAnterior && parseFloat(p.precioAnterior) > 0 && (
              <span className="text-xs line-through text-[#3B506D]/70 block">{config.currency}{parseFloat(p.precioAnterior).toLocaleString("es-AR")}</span>
            )}
            <span className="text-xl font-black">{config.currency}{priceNum > 0 ? priceNum.toLocaleString("es-AR") : p.precio}</span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onAddToCart(p); }}
            className="p-3 rounded-2xl text-white shadow-lg transition-all active:scale-95 hover:opacity-90 hover:scale-105"
            style={{ background: "#22c55e" }}
            title="Agregar al carrito"
            disabled={p.stock === "0" || p.stock === "false" || p.stock === "FALSE"}
          >
            <ShoppingCart size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function QuickViewModal({
  product,
  config,
  darkMode,
  primary,
  onClose,
  onAddToCart,
  onOrder,
}: {
  product: Product;
  config: CatalogConfig;
  darkMode: boolean;
  primary: string;
  onClose: () => void;
  onAddToCart: (p: Product, qty: number, notes?: string) => void;
  onOrder: (p: Product) => void;
}) {
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const priceNum = parseFloat(product.precio) || 0;
  const hasExtra = product.usos || product.dilucion || product.precauciones || product.presentacion;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 my-4 ${darkMode ? "bg-[#031E43] text-white" : "bg-white text-[#031E43]"}`}
      >
        {/* Left: Image */}
        <div className={`relative flex items-center justify-center p-8 min-h-[260px] ${darkMode ? "bg-[#031E43]" : "bg-[#FDFDFB]"}`}>
          <button
            onClick={onClose}
            className={`absolute top-4 left-4 md:hidden w-9 h-9 rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-transform ${darkMode ? "bg-[#031E43] text-white" : "bg-white text-[#031E43]"}`}
          >
            <ArrowLeft size={16} />
          </button>
          {product.destacado && (
            <span className="absolute top-4 right-4 bg-amber-400 text-amber-900 px-3 py-0.5 rounded-full text-[9px] font-black uppercase z-10">⭐ Destacado</span>
          )}
          {product.imagen ? (
            <img src={product.imagen} alt={product.nombre} className="w-full max-h-72 object-contain" referrerPolicy="no-referrer" />
          ) : (
            <ShoppingCart className="w-20 h-20 opacity-20" style={{ color: primary }} />
          )}
        </div>

        {/* Right: Details */}
        <div className={`flex flex-col overflow-y-auto max-h-[80vh] md:max-h-[90vh] p-7`}>
          <button
            onClick={onClose}
            className={`hidden md:flex absolute top-5 right-5 w-9 h-9 rounded-full items-center justify-center shadow-md hover:scale-105 transition-transform z-10 ${darkMode ? "bg-[#031E43] text-white" : "bg-white text-[#031E43]"}`}
          >
            <X size={16} />
          </button>

          <span className="text-[10px] font-black uppercase mb-1 block" style={{ color: primary }}>{product.categoria}</span>
          <h2 className="text-2xl font-black mb-1 leading-tight">{product.nombre}</h2>
          {product.descripcion && (
            <p className={`text-sm mb-4 leading-relaxed ${darkMode ? "text-[#3B506D]/70" : "text-[#3B506D]"}`}>{product.descripcion}</p>
          )}

          <div className="mb-5">
            {product.precioAnterior && parseFloat(product.precioAnterior) > 0 && (
              <span className="text-sm line-through text-[#3B506D]/70 block">{config.currency}{parseFloat(product.precioAnterior).toLocaleString("es-AR")}</span>
            )}
            <p className="text-3xl font-black" style={{ color: primary }}>
              {config.currency}{priceNum > 0 ? priceNum.toLocaleString("es-AR") : product.precio}
            </p>
          </div>

          {/* Technical info rows */}
          {hasExtra && (
            <div className={`space-y-3 mb-5 border-t pt-4 ${darkMode ? "border-[#031E43]" : "border-[#DDDFE2]"}`}>
              {product.presentacion && (
                <div className="flex gap-3 items-start">
                  <div className={`p-2 rounded-xl shrink-0 ${darkMode ? "bg-blue-950/40 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
                    <Package size={15} />
                  </div>
                  <div>
                    <p className={`text-[10px] font-black uppercase mb-0.5 ${darkMode ? "text-[#3B506D]/70" : "text-[#3B506D]/70"}`}>Presentación</p>
                    <p className={`text-xs font-semibold ${darkMode ? "text-[#DDDFE2]" : "text-[#3B506D]"}`}>{product.presentacion}</p>
                  </div>
                </div>
              )}
              {product.usos && (
                <div className="flex gap-3 items-start">
                  <div className={`p-2 rounded-xl shrink-0 ${darkMode ? "bg-emerald-950/40 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>
                    <CheckCircle size={15} />
                  </div>
                  <div>
                    <p className={`text-[10px] font-black uppercase mb-0.5 ${darkMode ? "text-[#3B506D]/70" : "text-[#3B506D]/70"}`}>Usos sugeridos</p>
                    <p className={`text-xs font-semibold leading-relaxed ${darkMode ? "text-[#DDDFE2]" : "text-[#3B506D]"}`}>{product.usos}</p>
                  </div>
                </div>
              )}
              {product.dilucion && (
                <div className="flex gap-3 items-start">
                  <div className={`p-2 rounded-xl shrink-0 ${darkMode ? "bg-indigo-950/40 text-indigo-400" : "bg-indigo-50 text-indigo-600"}`}>
                    <Droplets size={15} />
                  </div>
                  <div>
                    <p className={`text-[10px] font-black uppercase mb-0.5 ${darkMode ? "text-[#3B506D]/70" : "text-[#3B506D]/70"}`}>Instrucciones / Dilución</p>
                    <p className={`text-xs font-semibold leading-relaxed ${darkMode ? "text-[#DDDFE2]" : "text-[#3B506D]"}`}>{product.dilucion}</p>
                  </div>
                </div>
              )}
              {product.precauciones && (
                <div className={`flex gap-3 items-start p-3 rounded-2xl border ${darkMode ? "bg-amber-950/20 border-amber-900/30" : "bg-amber-50 border-amber-100"}`}>
                  <div className={`p-2 rounded-xl shrink-0 ${darkMode ? "bg-amber-900/60 text-amber-300" : "bg-amber-100 text-amber-700"}`}>
                    <ShieldAlert size={15} />
                  </div>
                  <div>
                    <p className={`text-[10px] font-black uppercase mb-0.5 ${darkMode ? "text-amber-400" : "text-amber-700"}`}>Precauciones</p>
                    <p className={`text-xs font-semibold leading-relaxed ${darkMode ? "text-amber-300" : "text-amber-800"}`}>{product.precauciones}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className={`flex items-center gap-3 mb-4 mt-auto pt-4 border-t ${darkMode ? "border-[#031E43]" : "border-[#DDDFE2]"}`}>
            <div className={`flex items-center rounded-2xl overflow-hidden border ${darkMode ? "border-[#3B506D]" : "border-[#DDDFE2]"}`}>
              <button onClick={() => setQty(q => Math.max(1, q - 1))} className={`px-3 py-2.5 ${darkMode ? "hover:bg-[#3B506D]" : "hover:bg-[#DDDFE2]/40"} transition-colors`}><Minus size={14} /></button>
              <span className="px-4 font-bold text-sm">{qty}</span>
              <button onClick={() => setQty(q => Math.min(99, q + 1))} className={`px-3 py-2.5 ${darkMode ? "hover:bg-[#3B506D]" : "hover:bg-[#DDDFE2]/40"} transition-colors`}><Plus size={14} /></button>
            </div>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas (opcional)"
              className={`flex-1 px-3 py-2.5 rounded-2xl text-sm border ${darkMode ? "bg-[#031E43] border-[#3B506D] text-white placeholder-[#3B506D]" : "border-[#DDDFE2] placeholder-[#3B506D]/70"} outline-none focus:border-blue-400`}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { onAddToCart(product, qty, notes || undefined); onClose(); }}
              className="flex-1 py-3 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all"
              style={{ background: "#22c55e" }}
            >
              <ShoppingCart size={16} /> Agregar al carrito
            </button>
            <button
              onClick={() => { onOrder(product); onClose(); }}
              className="flex-1 py-3 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all"
              style={{ background: primary }}
            >
              <MessageCircle size={16} /> Consultar WA
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CartPanel({
  cart,
  config,
  darkMode,
  primary,
  onClose,
  onRemove,
  onUpdateQty,
  onClear,
  onCheckout,
  hasMercadoPago,
}: {
  cart: CartItem[];
  config: CatalogConfig;
  darkMode: boolean;
  primary: string;
  onClose: () => void;
  onRemove: (id: string) => void;
  onUpdateQty: (id: string, qty: number) => void;
  onClear: () => void;
  onCheckout: (name: string, phone: string, notes: string, payWith: "mp" | "whatsapp") => Promise<void>;
  hasMercadoPago: boolean;
}) {
  const [step, setStep] = useState<"cart" | "form">("cart");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const total = cart.reduce((s, i) => s + (parseFloat(i.product.precio) || 0) * i.quantity, 0);

  async function submit(payWith: "mp" | "whatsapp") {
    if (!name.trim() || !phone.trim()) return;
    setSubmitting(true);
    try {
      await onCheckout(name.trim(), phone.trim(), formNotes.trim(), payWith);
      setStep("cart");
      setName(""); setPhone(""); setFormNotes("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className={`fixed top-0 right-0 h-full w-full sm:w-96 z-50 shadow-2xl flex flex-col ${darkMode ? "bg-[#031E43] text-white" : "bg-white text-[#031E43]"}`}
    >
      <div className={`flex items-center justify-between p-5 border-b ${darkMode ? "border-[#3B506D]" : "border-[#DDDFE2]"}`}>
        <div className="flex items-center gap-2">
          <ShoppingCart size={18} style={{ color: primary }} />
          <h2 className="font-black text-lg">Tu carrito</h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-black text-white" style={{ background: primary }}>{cart.length}</span>
        </div>
        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <button onClick={onClear} className="text-xs text-red-400 hover:text-red-500 font-semibold flex items-center gap-1">
              <Trash2 size={12} /> Vaciar
            </button>
          )}
          <button onClick={onClose} className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? "bg-[#031E43] hover:bg-[#3B506D]" : "bg-[#DDDFE2]/40 hover:bg-[#DDDFE2]"} transition-colors`}>
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <ShoppingCart className="w-12 h-12 mb-3 opacity-20" />
            <p className={`font-bold ${darkMode ? "text-[#3B506D]/70" : "text-[#3B506D]/70"}`}>Tu carrito está vacío</p>
            <p className={`text-xs mt-1 ${darkMode ? "text-[#3B506D]" : "text-[#3B506D]/70"}`}>Agregá productos para hacer tu pedido</p>
          </div>
        ) : cart.map((item) => (
          <div key={item.product.id} className={`p-3 rounded-2xl border ${darkMode ? "border-[#3B506D] bg-[#031E43]" : "border-[#DDDFE2] bg-[#FDFDFB]"}`}>
            <div className="flex gap-3 items-start">
              {item.product.imagen && (
                <img src={item.product.imagen} alt={item.product.nombre} className="w-12 h-12 rounded-xl object-contain bg-white" referrerPolicy="no-referrer" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{item.product.nombre}</p>
                <p className="text-xs" style={{ color: primary }}>{config.currency}{(parseFloat(item.product.precio) || 0).toLocaleString("es-AR")} c/u</p>
                {item.notes && <p className={`text-xs mt-0.5 italic ${darkMode ? "text-[#3B506D]" : "text-[#3B506D]/70"}`}>{item.notes}</p>}
              </div>
              <button onClick={() => onRemove(item.product.id)} className="text-red-400 hover:text-red-500 transition-colors">
                <X size={14} />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className={`flex items-center rounded-xl overflow-hidden border text-xs ${darkMode ? "border-[#3B506D]" : "border-[#DDDFE2]"}`}>
                <button onClick={() => onUpdateQty(item.product.id, item.quantity - 1)} className={`px-2 py-1 ${darkMode ? "hover:bg-[#3B506D]" : "hover:bg-[#DDDFE2]"} transition-colors`}><Minus size={11} /></button>
                <span className="px-2.5 font-bold">{item.quantity}</span>
                <button onClick={() => onUpdateQty(item.product.id, item.quantity + 1)} className={`px-2 py-1 ${darkMode ? "hover:bg-[#3B506D]" : "hover:bg-[#DDDFE2]"} transition-colors`}><Plus size={11} /></button>
              </div>
              <span className={`ml-auto font-black text-sm`}>
                {config.currency}{((parseFloat(item.product.precio) || 0) * item.quantity).toLocaleString("es-AR")}
              </span>
            </div>
          </div>
        ))}
      </div>

      {cart.length > 0 && (
        <div className={`border-t ${darkMode ? "border-[#3B506D]" : "border-[#DDDFE2]"}`}>
          {/* Total summary */}
          <div className={`flex justify-between items-center px-5 pt-4 pb-2`}>
            <span className={`font-bold ${darkMode ? "text-[#DDDFE2]" : "text-[#3B506D]"}`}>Total</span>
            <span className="text-2xl font-black" style={{ color: primary }}>
              {config.currency}{total.toLocaleString("es-AR")}
            </span>
          </div>

          {step === "cart" ? (
            <div className="px-5 pb-5">
              <button
                onClick={() => setStep("form")}
                className="w-full py-3.5 rounded-2xl font-black text-white flex items-center justify-center gap-2 hover:opacity-90 active:scale-98 transition-all shadow-lg"
                style={{ background: primary }}
              >
                Hacer pedido <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <div className="px-5 pb-5 space-y-3">
              <button
                onClick={() => setStep("cart")}
                className={`flex items-center gap-1 text-xs font-semibold mb-1 ${darkMode ? "text-[#3B506D]/70 hover:text-[#DDDFE2]" : "text-[#3B506D]/70 hover:text-[#3B506D]"} transition-colors`}
              >
                <ArrowLeft size={13} /> Volver al carrito
              </button>

              <div className="space-y-2">
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3B506D]/70" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre *"
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm outline-none transition-colors ${
                      darkMode ? "bg-[#031E43] border-[#3B506D] text-white placeholder-[#3B506D] focus:border-[#3B506D]/70" : "border-[#DDDFE2] focus:border-[#3B506D]/70 placeholder-[#3B506D]/70"
                    }`}
                  />
                </div>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3B506D]/70" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Tu teléfono WhatsApp *"
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm outline-none transition-colors ${
                      darkMode ? "bg-[#031E43] border-[#3B506D] text-white placeholder-[#3B506D] focus:border-[#3B506D]/70" : "border-[#DDDFE2] focus:border-[#3B506D]/70 placeholder-[#3B506D]/70"
                    }`}
                  />
                </div>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Notas adicionales (opcional)"
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-colors ${
                    darkMode ? "bg-[#031E43] border-[#3B506D] text-white placeholder-[#3B506D] focus:border-[#3B506D]/70" : "border-[#DDDFE2] focus:border-[#3B506D]/70 placeholder-[#3B506D]/70"
                  }`}
                />
              </div>

              {hasMercadoPago && (
                <button
                  onClick={() => submit("mp")}
                  disabled={submitting || !name.trim() || !phone.trim()}
                  className="w-full py-3 rounded-2xl font-black text-white flex items-center justify-center gap-2 hover:opacity-90 active:scale-98 transition-all shadow-md disabled:opacity-40 text-sm"
                  style={{ background: "#009ee3" }}
                >
                  <CreditCard size={16} />
                  {submitting ? "Procesando…" : "Pagar con MercadoPago"}
                </button>
              )}

              <button
                onClick={() => submit("whatsapp")}
                disabled={submitting || !name.trim() || !phone.trim()}
                className="w-full py-3 rounded-2xl font-black text-white flex items-center justify-center gap-2 hover:opacity-90 active:scale-98 transition-all shadow-md disabled:opacity-40 text-sm"
                style={{ background: "#22c55e" }}
              >
                <MessageCircle size={16} />
                {submitting ? "Enviando…" : hasMercadoPago ? "Confirmar por WhatsApp" : "Enviar pedido por WhatsApp"}
              </button>

              {(!name.trim() || !phone.trim()) && (
                <p className="text-[10px] text-center text-[#3B506D]/70">* Completá nombre y teléfono para continuar</p>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

function CompareModal({
  products,
  config,
  darkMode,
  primary,
  onClose,
  onRemove,
}: {
  products: Product[];
  config: CatalogConfig;
  darkMode: boolean;
  primary: string;
  onClose: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden ${darkMode ? "bg-[#031E43] text-white" : "bg-white text-[#031E43]"}`}
      >
        <div className={`flex items-center justify-between p-5 border-b ${darkMode ? "border-[#3B506D]" : "border-[#DDDFE2]"}`}>
          <div className="flex items-center gap-2">
            <Scale size={18} style={{ color: primary }} />
            <h2 className="font-black text-lg">Comparando {products.length} productos</h2>
          </div>
          <button onClick={onClose} className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? "bg-[#031E43]" : "bg-[#DDDFE2]/40"} transition-colors hover:opacity-80`}>
            <X size={16} />
          </button>
        </div>
        <div className="p-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {products.map((p) => (
                  <th key={p.id} className="text-center pb-4 px-3 min-w-[160px]">
                    <div className="relative">
                      <button
                        onClick={() => onRemove(p.id)}
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <X size={10} />
                      </button>
                      {p.imagen ? (
                        <img src={p.imagen} alt={p.nombre} className="w-16 h-16 object-contain mx-auto rounded-xl mb-2" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-16 h-16 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: `${primary}15` }}>
                          <ShoppingCart className="w-6 h-6 opacity-40" style={{ color: primary }} />
                        </div>
                      )}
                      <p className="font-black text-xs leading-tight">{p.nombre}</p>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Precio", key: "precio", render: (p: Product) => `${config.currency}${parseFloat(p.precio).toLocaleString("es-AR")}` },
                { label: "Categoría", key: "categoria", render: (p: Product) => p.categoria },
                { label: "Descripción", key: "descripcion", render: (p: Product) => p.descripcion || "—" },
                { label: "Destacado", key: "destacado", render: (p: Product) => p.destacado ? <CheckCircle size={14} className="mx-auto text-green-500" /> : <X size={14} className="mx-auto text-[#3B506D]/70" /> },
              ].map((row) => (
                <tr key={row.key} className={darkMode ? "border-t border-[#031E43]" : "border-t border-[#FDFDFB]"}>
                  <td colSpan={0} />
                  {products.map((p) => (
                    <td key={p.id} className={`py-3 px-3 text-center text-xs ${darkMode ? "text-[#DDDFE2]" : "text-[#3B506D]"}`}>
                      {row.label === "Precio" && (
                        <span className="font-black text-base" style={{ color: primary }}>
                          {config.currency}{parseFloat(p.precio).toLocaleString("es-AR")}
                        </span>
                      )}
                      {row.label === "Categoría" && (
                        <span className="font-bold uppercase text-[10px]" style={{ color: primary }}>{p.categoria}</span>
                      )}
                      {row.label === "Descripción" && (
                        <span className="line-clamp-2">{p.descripcion || "—"}</span>
                      )}
                      {row.label === "Destacado" && (
                        p.destacado
                          ? <CheckCircle size={14} className="mx-auto text-green-500" />
                          : <X size={14} className="mx-auto text-[#3B506D]/70" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}

function OrderHistoryPanel({
  history,
  darkMode,
  primary,
  onClose,
  onClear,
  onReorder,
}: {
  history: OrderHistoryEntry[];
  darkMode: boolean;
  primary: string;
  onClose: () => void;
  onClear: () => void;
  onReorder: (items: CartItem[]) => void;
}) {
  return (
    <motion.div
      initial={{ x: "-100%" }}
      animate={{ x: 0 }}
      exit={{ x: "-100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className={`fixed top-0 left-0 h-full w-full sm:w-96 z-50 shadow-2xl flex flex-col ${darkMode ? "bg-[#031E43] text-white" : "bg-white text-[#031E43]"}`}
    >
      <div className={`flex items-center justify-between p-5 border-b ${darkMode ? "border-[#3B506D]" : "border-[#DDDFE2]"}`}>
        <div className="flex items-center gap-2">
          <History size={18} style={{ color: primary }} />
          <h2 className="font-black text-lg">Mis pedidos</h2>
        </div>
        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <button onClick={onClear} className="text-xs text-red-400 hover:text-red-500 font-semibold flex items-center gap-1">
              <Trash2 size={12} /> Limpiar
            </button>
          )}
          <button onClick={onClose} className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? "bg-[#031E43]" : "bg-[#DDDFE2]/40"}`}>
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <History className="w-12 h-12 mb-3 opacity-20" />
            <p className={`font-bold ${darkMode ? "text-[#3B506D]/70" : "text-[#3B506D]/70"}`}>Sin pedidos todavía</p>
            <p className={`text-xs mt-1 ${darkMode ? "text-[#3B506D]" : "text-[#3B506D]/70"}`}>Tus pedidos enviados por WhatsApp aparecerán acá</p>
          </div>
        ) : (
          [...history].reverse().map((order) => (
            <div key={order.id} className={`p-4 rounded-2xl border ${darkMode ? "border-[#3B506D] bg-[#031E43]" : "border-[#DDDFE2] bg-[#FDFDFB]"}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-black text-sm">{order.brandName}</p>
                  <p className={`text-xs ${darkMode ? "text-[#3B506D]/70" : "text-[#3B506D]/70"}`}>{order.date}</p>
                </div>
                <span className="font-black text-sm" style={{ color: primary }}>
                  {order.currency}{order.total.toLocaleString("es-AR")}
                </span>
              </div>
              <ul className={`space-y-1 text-xs mb-3 ${darkMode ? "text-[#3B506D]/70" : "text-[#3B506D]"}`}>
                {order.items.map((item) => (
                  <li key={item.product.id} className="flex justify-between">
                    <span>{item.quantity}× {item.product.nombre}</span>
                    <span>{order.currency}{((parseFloat(item.product.precio) || 0) * item.quantity).toLocaleString("es-AR")}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => { onReorder(order.items); onClose(); }}
                className="w-full py-2 rounded-xl text-white text-xs font-black flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-95 transition-all"
                style={{ background: "#22c55e" }}
              >
                <RefreshCcw size={12} /> Volver a pedir
              </button>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

function PromoCarousel({
  products,
  config,
  primary,
  darkMode,
  onAddToCart,
}: {
  products: Product[];
  config: CatalogConfig;
  primary: string;
  darkMode: boolean;
  onAddToCart: (p: Product) => void;
}) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (products.length <= 1) return;
    const t = setInterval(() => setCurrent((i) => (i + 1) % products.length), 5000);
    return () => clearInterval(t);
  }, [products.length]);

  if (products.length === 0) return null;
  const p = products[current];

  return (
    <div className={`relative rounded-3xl overflow-hidden mb-10 ${darkMode ? "bg-[#031E43] border border-[#3B506D]" : "bg-gradient-to-r from-red-50 to-orange-50 border border-red-100"}`}>
      <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-sm animate-pulse z-10">
        🔥 Ofertas destacadas
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={p.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex items-center gap-6 p-6 pt-12"
        >
          <div className={`w-24 h-24 rounded-2xl flex items-center justify-center flex-shrink-0 ${darkMode ? "bg-[#031E43]" : "bg-white"} shadow-sm`}>
            {p.imagen ? (
              <img src={p.imagen} alt={p.nombre} className="w-full h-full object-contain rounded-2xl" referrerPolicy="no-referrer" />
            ) : (
              <ShoppingCart className="w-8 h-8 opacity-30" style={{ color: primary }} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[9px] font-black uppercase text-red-500">{p.categoria}</span>
            <h3 className={`font-black text-lg leading-tight truncate ${darkMode ? "text-white" : "text-[#031E43]"}`}>{p.nombre}</h3>
            <p className={`text-xs mt-0.5 line-clamp-1 ${darkMode ? "text-[#3B506D]/70" : "text-[#3B506D]"}`}>{p.descripcion}</p>
            <div className="flex items-center gap-3 mt-3">
              <span className="text-2xl font-black text-red-500">{config.currency}{(parseFloat(p.precio) || 0).toLocaleString("es-AR")}</span>
              <button
                onClick={() => onAddToCart(p)}
                className="px-4 py-2 rounded-2xl text-white text-xs font-black flex items-center gap-1.5 hover:opacity-90 active:scale-95 transition-all"
                style={{ background: "#22c55e" }}
              >
                <ShoppingCart size={13} /> Agregar
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
      {products.length > 1 && (
        <div className="flex justify-center gap-1.5 pb-4">
          {products.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === current ? "w-6" : ""}`}
              style={{ background: i === current ? primary : "#d1d5db" }}
            />
          ))}
        </div>
      )}
      {products.length > 1 && (
        <>
          <button onClick={() => setCurrent((i) => (i - 1 + products.length) % products.length)} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 shadow flex items-center justify-center hover:bg-white transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setCurrent((i) => (i + 1) % products.length)} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 shadow flex items-center justify-center hover:bg-white transition-colors">
            <ChevronRight size={16} />
          </button>
        </>
      )}
    </div>
  );
}

export default function Catalogo() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [, setLocation] = useLocation();

  const [config, setConfig] = useState<CatalogConfig | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [sortOrder, setSortOrder] = useState<"default" | "low" | "high">("default");
  const [currentPage, setCurrentPage] = useState(1);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPriceFilter, setMaxPriceFilter] = useState(999999999);
  const [showPriceFilter, setShowPriceFilter] = useState(false);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try { return localStorage.getItem("cat_darkMode") === "true"; } catch { return false; }
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    try { const s = localStorage.getItem("cat_cart"); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [showCart, setShowCart] = useState(false);

  const [compareList, setCompareList] = useState<Product[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  const [orderHistory, setOrderHistory] = useState<OrderHistoryEntry[]>(() => {
    try { const s = localStorage.getItem("cat_history"); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [showHistory, setShowHistory] = useState(false);

  const [addedToastId, setAddedToastId] = useState<string | null>(null);

  useEffect(() => {
    try { localStorage.setItem("cat_darkMode", String(darkMode)); } catch {}
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    try { localStorage.setItem("cat_cart", JSON.stringify(cart)); } catch {}
  }, [cart]);

  useEffect(() => {
    try { localStorage.setItem("cat_history", JSON.stringify(orderHistory)); } catch {}
  }, [orderHistory]);

  useEffect(() => {
    if (!token) { setError("Token no válido"); setLoadingConfig(false); return; }
    fetch(`/api/catalog/public/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error("Catálogo no encontrado");
        return r.json();
      })
      .then((data: CatalogConfig) => {
        setConfig(data);
        setLoadingConfig(false);
        if (data.productsUrl) {
          setLoadingProducts(true);
          Papa.parse(data.productsUrl, {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              const rows = results.data as Record<string, string>[];
              const parsed: Product[] = rows.map((item, idx) => ({
                id: item.ID || item.id || `p-${idx}`,
                nombre: item.Nombre || item.nombre || "Producto sin nombre",
                precio: item.Precio || item.precio || "0",
                precioAnterior: item.PrecioAnterior || item.precioAnterior || item["Precio Anterior"] || "",
                stock: item.Stock || item.stock || "",
                categoria: item.Categoria || item.categoria || "General",
                descripcion: item.Descripcion || item.descripcion || "",
                imagen: item.Imagen || item.imagen || undefined,
                destacado: item.Destacado === "TRUE" || item.destacado === "true",
                presentacion: item.Presentacion || item.presentacion || undefined,
                usos: item.Usos || item.usos || undefined,
                dilucion: item.Dilucion || item.dilucion || undefined,
                precauciones: item.Precauciones || item.precauciones || undefined,
              })).filter((p) => p.nombre !== "Producto sin nombre" || p.precio !== "0");
              setProducts(parsed);
              setLoadingProducts(false);
            },
            error: () => setLoadingProducts(false),
          });
        }
      })
      .catch((e: Error) => { setError(e.message); setLoadingConfig(false); });
  }, [token]);

  useEffect(() => {
    if (!config?.chatbotWidgetToken) return;
    const widgetToken = config.chatbotWidgetToken;
    const scriptId = `clm-widget-script-${widgetToken}`;
    if (document.getElementById(scriptId)) return;
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `/api/widget/${widgetToken}/widget.js`;
    script.async = true;
    document.body.appendChild(script);
    return () => {
      const el = document.getElementById(scriptId);
      if (el) el.remove();
    };
  }, [config?.chatbotWidgetToken]);

  const absoluteMaxPrice = useMemo(() => {
    if (products.length === 0) return 999999;
    return Math.max(...products.map((p) => parseFloat(p.precio) || 0), 0);
  }, [products]);

  useEffect(() => {
    if (products.length > 0) setMaxPriceFilter(absoluteMaxPrice);
  }, [absoluteMaxPrice, products]);

  const categories = useMemo(() => ["Todos", ...Array.from(new Set(products.map((p) => p.categoria)))], [products]);

  const filtered = useMemo(() => {
    let r = products.filter(
      (p) =>
        (activeCategory === "Todos" || p.categoria === activeCategory) &&
        (p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || p.descripcion.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (parseFloat(p.precio) || 0) >= minPrice &&
        (parseFloat(p.precio) || 0) <= maxPriceFilter,
    );
    if (sortOrder === "low") r = [...r].sort((a, b) => parseFloat(a.precio) - parseFloat(b.precio));
    if (sortOrder === "high") r = [...r].sort((a, b) => parseFloat(b.precio) - parseFloat(a.precio));
    return r;
  }, [products, activeCategory, searchTerm, sortOrder, minPrice, maxPriceFilter]);

  const promoProducts = useMemo(
    () => products.filter((p) => p.nombre.toUpperCase().includes("OFERTA") || p.nombre.toUpperCase().includes("PROMO")),
    [products],
  );

  useEffect(() => setCurrentPage(1), [searchTerm, activeCategory, sortOrder, minPrice, maxPriceFilter]);

  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filtered, currentPage],
  );
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  const cartTotalItems = useMemo(() => cart.reduce((s, i) => s + i.quantity, 0), [cart]);

  const addToCart = useCallback((product: Product, quantity = 1, notes?: string) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id);
      if (idx > -1) {
        const c = [...prev];
        c[idx] = { ...c[idx], quantity: c[idx].quantity + quantity };
        return c;
      }
      return [...prev, { product, quantity, notes }];
    });
    setAddedToastId(product.id);
    setTimeout(() => setAddedToastId(null), 1800);
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== id));
  }, []);

  const updateCartQty = useCallback((id: string, qty: number) => {
    if (qty <= 0) { removeFromCart(id); return; }
    setCart((prev) => prev.map((i) => (i.product.id === id ? { ...i, quantity: qty } : i)));
  }, [removeFromCart]);

  const handleOrder = useCallback((p: Product) => {
    if (!config) return;
    const msg = `Hola ${config.brandName}! Me interesa: *${p.nombre}* (${config.currency}${p.precio})`;
    window.open(`https://wa.me/${config.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
  }, [config]);

  const handleCheckout = useCallback(async (
    contactName: string,
    contactPhone: string,
    notes: string,
    payWith: "mp" | "whatsapp",
  ) => {
    if (!config || cart.length === 0 || !token) return;

    const items = cart.map((i) => ({
      productName: i.product.nombre,
      quantity: i.quantity,
      unitPrice: parseFloat(i.product.precio) || 0,
      notes: i.notes,
    }));

    const total = cart.reduce((s, i) => s + (parseFloat(i.product.precio) || 0) * i.quantity, 0);

    const lines = cart
      .map((i) => `• ${i.quantity}× *${i.product.nombre}* — ${config.currency}${((parseFloat(i.product.precio) || 0) * i.quantity).toLocaleString("es-AR")}${i.notes ? ` (${i.notes})` : ""}`)
      .join("\n");
    const waMsg = `Hola ${config.brandName}! Quiero hacer el siguiente pedido:\n\n👤 *${contactName}*\n📱 ${contactPhone}${notes ? `\n📝 ${notes}` : ""}\n\n${lines}\n\n*Total: ${config.currency}${total.toLocaleString("es-AR")}*`;

    const entry: OrderHistoryEntry = {
      id: crypto.randomUUID(),
      date: new Date().toLocaleString("es-AR"),
      items: [...cart],
      total,
      currency: config.currency,
      brandName: config.brandName,
    };

    setOrderHistory((prev) => [...prev, entry]);
    setCart([]);
    setShowCart(false);

    let mpInitPoint: string | null = null;
    let orderId: string | null = null;
    try {
      const res = await fetch(`/api/catalog/public/${token}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactName, contactPhone, notes, items }),
      });
      if (res.ok) {
        const data = (await res.json()) as { mpInitPoint?: string; orderId?: string };
        mpInitPoint = data.mpInitPoint ?? null;
        orderId = data.orderId ?? null;
      }
    } catch {}

    if (payWith === "mp" && mpInitPoint) {
      window.location.href = mpInitPoint;
    } else {
      if (config.whatsapp) {
        window.open(`https://wa.me/${config.whatsapp}?text=${encodeURIComponent(waMsg)}`, "_blank");
      }
      if (orderId) {
        setLocation(`/pedido/${orderId}`);
      }
    }
  }, [cart, config, token, setLocation]);

  const handleToggleCompare = useCallback((p: Product) => {
    setCompareList((prev) => {
      const exists = prev.some((x) => x.id === p.id);
      if (exists) return prev.filter((x) => x.id !== p.id);
      if (prev.length >= 3) return prev;
      return [...prev, p];
    });
  }, []);

  const handleConsult = useCallback(() => {
    if (!config) return;
    window.open(`https://wa.me/${config.whatsapp}?text=${encodeURIComponent(`Hola ${config.brandName}! Quisiera hacer una consulta.`)}`, "_blank");
  }, [config]);

  if (loadingConfig) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? "bg-[#031E43]" : "bg-[#FDFDFB]"}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#DDDFE2] border-t-[#031E43] mx-auto mb-4" />
          <p className={`font-medium ${darkMode ? "text-[#3B506D]/70" : "text-[#3B506D]"}`}>Cargando catálogo…</p>
        </div>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFDFB]">
        <div className="text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="text-2xl font-black text-[#031E43] mb-2">Catálogo no encontrado</h1>
          <p className="text-[#3B506D]">{error ?? "El catálogo no existe o fue desactivado."}</p>
        </div>
      </div>
    );
  }

  const primary = config.primaryColor || "#002266";
  const secondary = config.secondaryColor || "#0052CC";

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${darkMode ? "bg-[#031E43] text-white" : "bg-white text-[#031E43]"}`}>

      {/* Toast notificación */}
      <AnimatePresence>
        {addedToastId && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="fixed top-20 left-1/2 z-50 bg-green-500 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-xl flex items-center gap-2"
          >
            <CheckCircle size={16} /> ¡Agregado al carrito!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navbar */}
      <nav className={`sticky top-0 z-40 backdrop-blur border-b px-4 py-3.5 ${darkMode ? "bg-[#031E43]/90 border-[#031E43]" : "bg-white/90 border-[#DDDFE2]"}`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-3">
          <div className="flex items-center gap-3 flex-shrink-0">
            {config.logoUrl ? (
              <img src={config.logoUrl} alt={config.brandName} className="h-8 w-auto object-contain" referrerPolicy="no-referrer" />
            ) : (
              <div>
                <h1 className="text-lg font-black tracking-tight leading-none" style={{ color: darkMode ? "#fff" : primary }}>{config.brandName}</h1>
                {config.brandSubtitle && <p className="text-[9px] font-bold uppercase tracking-widest text-[#3B506D]/70">{config.brandSubtitle}</p>}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(true)}
              className={`p-2 rounded-xl transition-colors relative ${darkMode ? "bg-[#031E43] hover:bg-[#3B506D] text-white" : "bg-[#DDDFE2]/40 hover:bg-[#DDDFE2] text-[#3B506D]"}`}
              title="Mis pedidos"
            >
              <History size={16} />
              {orderHistory.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black text-white flex items-center justify-center" style={{ background: primary }}>
                  {orderHistory.length > 9 ? "9+" : orderHistory.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setDarkMode((d) => !d)}
              className={`p-2 rounded-xl transition-colors ${darkMode ? "bg-[#031E43] hover:bg-[#3B506D] text-yellow-400" : "bg-[#DDDFE2]/40 hover:bg-[#DDDFE2] text-[#3B506D]"}`}
              title="Modo oscuro"
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {compareList.length > 0 && (
              <button
                onClick={() => setShowCompare(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white shadow transition-all hover:opacity-90"
                style={{ background: "#3b82f6" }}
              >
                <Scale size={14} /> Comparar ({compareList.length})
              </button>
            )}

            {config.whatsapp && (
              <button
                onClick={handleConsult}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-lg transition-all hover:opacity-90"
                style={{ background: "#22c55e" }}
              >
                <MessageCircle size={15} /> <span className="hidden sm:inline">Consultar</span>
              </button>
            )}

            <button
              onClick={() => setShowCart(true)}
              className="relative p-2.5 rounded-xl text-white shadow-lg transition-all hover:opacity-90 active:scale-95"
              style={{ background: primary }}
              title="Ver carrito"
            >
              <ShoppingCart size={16} />
              {cartTotalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-green-500 text-white rounded-full text-[9px] font-black flex items-center justify-center shadow">
                  {cartTotalItems > 9 ? "9+" : cartTotalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      {(config.heroTitle || config.heroImage) && (
        <header
          className="relative pt-14 pb-18 px-6 overflow-hidden"
          style={{ background: darkMode ? `linear-gradient(135deg, ${primary}20 0%, #0f172a 60%)` : `linear-gradient(135deg, ${primary}08 0%, white 60%)` }}
        >
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
            <div>
              {config.heroBadge && (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase mb-5" style={{ background: `${primary}15`, color: primary }}>
                  ✨ {config.heroBadge}
                </div>
              )}
              <h2 className={`text-5xl font-black mb-4 tracking-tight leading-[1.1] ${darkMode ? "text-white" : "text-[#031E43]"}`}>
                {config.heroTitle}{" "}
                {config.heroTitleAccent && <span style={{ color: secondary }}>{config.heroTitleAccent}</span>}
              </h2>
              {config.heroDescription && <p className={`text-lg max-w-xl mb-8 font-medium ${darkMode ? "text-[#3B506D]/70" : "text-[#3B506D]"}`}>{config.heroDescription}</p>}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" })}
                  className="px-8 py-4 rounded-2xl font-black text-lg text-white shadow-xl hover:scale-105 transition-all flex items-center gap-2"
                  style={{ background: secondary }}
                >
                  Ver catálogo →
                </button>
                {config.whatsapp && (
                  <button onClick={handleConsult} className={`px-8 py-4 rounded-2xl font-black text-lg border-2 transition-all flex items-center gap-2 ${darkMode ? "border-[#3B506D] text-white hover:bg-[#031E43]" : "border-[#DDDFE2] hover:bg-[#FDFDFB]"}`}>
                    <MessageCircle size={18} /> Contactar
                  </button>
                )}
              </div>
            </div>
            {config.heroImage && (
              <div className="relative hidden lg:block">
                <div className="absolute -inset-4 bg-[#DDDFE2]/40 rounded-[3rem] -rotate-2 dark:bg-[#031E43]" />
                <img src={config.heroImage} alt="Hero" className="relative rounded-[3rem] shadow-2xl w-full h-80 object-cover rotate-1 hover:rotate-0 transition-transform duration-700" referrerPolicy="no-referrer" />
              </div>
            )}
          </div>
        </header>
      )}

      {/* Catalog */}
      <main id="catalogo" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 w-full">
        {/* Promo Carousel */}
        {promoProducts.length > 0 && (
          <PromoCarousel products={promoProducts} config={config} primary={primary} darkMode={darkMode} onAddToCart={(p) => addToCart(p)} />
        )}

        {/* Features section */}
        {(() => {
          try {
            const features: { emoji: string; title: string; desc: string }[] = JSON.parse(config.featuresJson || "[]");
            if (!features.length) return null;
            return (
              <div className={`grid md:grid-cols-3 gap-6 mb-14 rounded-3xl p-8 ${darkMode ? "bg-[#031E43]" : "bg-[#031E43]"} text-white`}>
                {features.map((f, i) => (
                  <div key={i} className="text-center">
                    <div className="text-4xl mb-3">{f.emoji}</div>
                    <h4 className="text-base font-black mb-2">{f.title}</h4>
                    <p className="text-[#3B506D]/70 text-sm font-medium">{f.desc}</p>
                  </div>
                ))}
              </div>
            );
          } catch { return null; }
        })()}

        <div className="text-center mb-10">
          <h2 className={`text-4xl font-black mb-3 ${darkMode ? "text-white" : "text-[#031E43]"}`}>{config.catalogTitle}</h2>
          <p className={darkMode ? "text-[#3B506D]/70" : "text-[#3B506D]"}>{config.catalogSubtitle}</p>
        </div>

        {/* Mobile filter toggle */}
        <div className="flex lg:hidden gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3B506D]/70" size={15} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={config.searchPlaceholder}
              className={`w-full pl-9 pr-4 py-2.5 rounded-2xl border-2 outline-none text-sm font-semibold transition-all ${
                darkMode ? "bg-[#031E43] border-[#3B506D] text-white placeholder-[#3B506D] focus:border-[#3B506D]" : "border-[#DDDFE2] focus:border-[#DDDFE2] placeholder-[#3B506D]/70"
              }`}
            />
          </div>
          <button
            onClick={() => setShowPriceFilter((v) => !v)}
            className={`px-3 py-2.5 rounded-2xl border-2 text-sm font-semibold flex items-center gap-1.5 flex-shrink-0 transition-all ${
              showPriceFilter ? "text-white border-transparent" : darkMode ? "bg-[#031E43] border-[#3B506D] text-white" : "bg-white border-[#DDDFE2] text-[#3B506D]"
            }`}
            style={showPriceFilter ? { background: primary, borderColor: primary } : {}}
          >
            <Filter size={14} /> Filtros
          </button>
        </div>

        {/* Mobile: category pills + price filter */}
        <div className="lg:hidden mb-6 space-y-3">
          <AnimatePresence>
            {showPriceFilter && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className={`overflow-hidden rounded-2xl border-2 p-4 ${darkMode ? "bg-[#031E43] border-[#3B506D]" : "bg-[#FDFDFB] border-[#DDDFE2]"}`}
              >
                <p className="text-xs font-black uppercase mb-3" style={{ color: primary }}>Rango de precio</p>
                <div className="flex items-center gap-3 mb-3">
                  <input type="number" value={minPrice} onChange={(e) => setMinPrice(Number(e.target.value))} placeholder="Mín"
                    className={`flex-1 px-3 py-2 rounded-xl border text-xs font-bold outline-none ${darkMode ? "bg-[#3B506D] border-[#3B506D] text-white" : "border-[#DDDFE2]"}`} min={0} />
                  <span className={`text-xs ${darkMode ? "text-[#3B506D]" : "text-[#3B506D]/70"}`}>—</span>
                  <input type="number" value={maxPriceFilter} onChange={(e) => setMaxPriceFilter(Number(e.target.value))} placeholder="Máx"
                    className={`flex-1 px-3 py-2 rounded-xl border text-xs font-bold outline-none ${darkMode ? "bg-[#3B506D] border-[#3B506D] text-white" : "border-[#DDDFE2]"}`} max={absoluteMaxPrice} />
                  <button onClick={() => { setMinPrice(0); setMaxPriceFilter(absoluteMaxPrice); }} className="text-xs text-red-400 hover:text-red-500 font-semibold">Limpiar</button>
                </div>
                <input type="range" min={0} max={Math.max(1, absoluteMaxPrice)} value={maxPriceFilter}
                  onChange={(e) => setMaxPriceFilter(Number(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  style={{ background: darkMode ? "#334155" : "#e2e8f0" }} />
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => {
              const count = cat === "Todos" ? products.length : products.filter(p => p.categoria === cat).length;
              return (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className="px-3 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 whitespace-nowrap flex-shrink-0 flex items-center gap-1"
                  style={activeCategory === cat ? { background: primary, color: "#fff", borderColor: primary }
                    : darkMode ? { background: "#1e293b", color: "#94a3b8", borderColor: "#334155" }
                    : { background: "#fff", color: "#94a3b8", borderColor: "#f1f5f9" }}
                >
                  {cat}
                  <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black ${activeCategory === cat ? "bg-white/20 text-white" : darkMode ? "bg-[#031E43] text-[#3B506D]" : "bg-[#DDDFE2]/40 text-[#3B506D]/70"}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Desktop: sidebar + products */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">

          {/* Sidebar */}
          <aside className={`hidden lg:block p-6 rounded-3xl border space-y-7 sticky top-24 ${darkMode ? "bg-[#031E43] border-[#031E43]" : "bg-[#FDFDFB] border-[#DDDFE2]"}`}>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider mb-2.5 text-[#3B506D]/70">¿Qué buscás?</p>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#3B506D]/70" size={14} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={config.searchPlaceholder}
                  className={`w-full pl-10 pr-4 py-3 rounded-2xl border-2 outline-none text-sm font-semibold transition-all ${
                    darkMode ? "bg-[#031E43] border-[#031E43] text-white placeholder-[#3B506D] focus:border-[#3B506D]" : "bg-white border-[#DDDFE2] focus:border-[#DDDFE2] placeholder-[#3B506D]/70"
                  }`}
                />
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-wider mb-3 text-[#3B506D]/70">Rango de precios</p>
              <div className="flex gap-2 mb-3">
                <div className="relative flex-1">
                  <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold ${darkMode ? "text-[#3B506D]" : "text-[#3B506D]/70"}`}>{config.currency}</span>
                  <input type="number" value={minPrice} onChange={(e) => setMinPrice(Math.max(0, Number(e.target.value)))}
                    className={`w-full pl-7 pr-2 py-2 rounded-xl border text-xs font-bold outline-none ${darkMode ? "bg-[#031E43] border-[#031E43] text-white" : "bg-white border-[#DDDFE2]"}`} min={0} />
                </div>
                <div className="relative flex-1">
                  <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold ${darkMode ? "text-[#3B506D]" : "text-[#3B506D]/70"}`}>{config.currency}</span>
                  <input type="number" value={maxPriceFilter} onChange={(e) => setMaxPriceFilter(Math.max(minPrice, Number(e.target.value)))}
                    className={`w-full pl-7 pr-2 py-2 rounded-xl border text-xs font-bold outline-none ${darkMode ? "bg-[#031E43] border-[#031E43] text-white" : "bg-white border-[#DDDFE2]"}`} max={absoluteMaxPrice} />
                </div>
              </div>
              <input type="range" min={0} max={Math.max(1, absoluteMaxPrice)} value={maxPriceFilter}
                onChange={(e) => setMaxPriceFilter(Number(e.target.value))}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                style={{ background: darkMode ? "#1e293b" : "#e2e8f0" }} />
              <button onClick={() => { setMinPrice(0); setMaxPriceFilter(absoluteMaxPrice); }}
                className="mt-2 text-[10px] font-black uppercase tracking-wider text-emerald-500 hover:text-emerald-600 transition-colors">
                Restablecer
              </button>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-wider mb-2.5 text-[#3B506D]/70">Ordenar por</p>
              <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as "default" | "low" | "high")}
                className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold outline-none ${darkMode ? "bg-[#031E43] border-[#031E43] text-[#DDDFE2]" : "bg-white border-[#DDDFE2] text-[#031E43]"}`}>
                <option value="default">Por defecto</option>
                <option value="low">Precio: Menor a Mayor</option>
                <option value="high">Precio: Mayor a Menor</option>
              </select>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-wider mb-3 text-[#3B506D]/70">Categorías</p>
              <div className="space-y-1.5">
                {categories.map((cat) => {
                  const count = cat === "Todos" ? products.length : products.filter(p => p.categoria === cat).length;
                  return (
                    <button key={cat} onClick={() => setActiveCategory(cat)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold uppercase transition-all text-left ${
                        activeCategory === cat ? "text-white shadow-md" : darkMode ? "hover:bg-[#031E43] text-[#DDDFE2]" : "hover:bg-[#DDDFE2]/40 text-[#3B506D] border border-[#DDDFE2] bg-white"
                      }`}
                      style={activeCategory === cat ? { background: primary } : {}}
                    >
                      <span>{cat}</span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                        activeCategory === cat ? "bg-white/20 text-white" : darkMode ? "bg-[#031E43] text-[#3B506D]" : "bg-[#DDDFE2]/40 text-[#3B506D]"
                      }`}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* Products area */}
          <div className="lg:col-span-3">
            {!loadingProducts && (
              <p className={`text-xs mb-5 font-semibold ${darkMode ? "text-[#3B506D]" : "text-[#3B506D]/70"}`}>
                {filtered.length === 0 ? "Sin resultados" : `${filtered.length} producto${filtered.length !== 1 ? "s" : ""} encontrado${filtered.length !== 1 ? "s" : ""}`}
              </p>
            )}

            {loadingProducts ? (
              <div className="py-24 text-center">
                <div className={`animate-spin rounded-full h-10 w-10 border-4 border-t-transparent mx-auto ${darkMode ? "border-[#3B506D] border-t-white" : "border-[#DDDFE2] border-t-[#031E43]"}`} />
                <p className={`mt-4 font-medium text-sm ${darkMode ? "text-[#3B506D]" : "text-[#3B506D]/70"}`}>Cargando productos…</p>
              </div>
            ) : paginated.length === 0 ? (
              <div className={`py-24 text-center rounded-3xl border-2 border-dashed ${darkMode ? "border-[#031E43] text-[#3B506D]" : "border-[#DDDFE2] text-[#3B506D]/70"}`}>
                <div className="text-5xl mb-3">📦</div>
                <p className="font-bold text-sm mb-1">No hay productos que coincidan</p>
                <p className="text-xs">Probá cambiando los filtros o el rango de precios</p>
              </div>
            ) : (
              <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                <AnimatePresence mode="popLayout">
                  {paginated.map((p) => (
                    <ProductCard
                      key={p.id}
                      p={p}
                      config={config}
                      onOrder={handleOrder}
                      onAddToCart={(prod) => addToCart(prod)}
                      onQuickView={setQuickViewProduct}
                      darkMode={darkMode}
                      isCompared={compareList.some((x) => x.id === p.id)}
                      onToggleCompare={handleToggleCompare}
                      primary={primary}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}

            {totalPages > 1 && (
              <div className="mt-12 flex justify-center items-center gap-3">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className={`p-3 rounded-xl border-2 disabled:opacity-30 transition-all ${darkMode ? "border-[#3B506D] hover:bg-[#031E43]" : "border-[#DDDFE2] hover:bg-[#FDFDFB]"}`}>
                  <ChevronLeft size={16} />
                </button>
                <span className={`text-sm font-bold ${darkMode ? "text-[#3B506D]/70" : "text-[#3B506D]"}`}>{currentPage} / {totalPages}</span>
                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className={`p-3 rounded-xl border-2 disabled:opacity-30 transition-all ${darkMode ? "border-[#3B506D] hover:bg-[#031E43]" : "border-[#DDDFE2] hover:bg-[#FDFDFB]"}`}>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* FAQ section */}
      {(() => {
        try {
          const faq: { q: string; a: string }[] = JSON.parse(config.faqJson || "[]");
          if (!faq.length) return null;
          return (
            <section className={`px-4 sm:px-6 py-16 ${darkMode ? "bg-[#031E43]" : "bg-[#FDFDFB]"}`}>
              <div className="max-w-3xl mx-auto">
                <div className="text-center mb-10">
                  <h2 className={`text-3xl font-black mb-3 ${darkMode ? "text-white" : "text-[#031E43]"}`}>Preguntas frecuentes</h2>
                  <p className={`text-sm font-medium ${darkMode ? "text-[#3B506D]/70" : "text-[#3B506D]"}`}>Todo lo que necesitás saber sobre nuestros productos y servicios.</p>
                </div>
                <div className="space-y-3">
                  {faq.map((item, i) => (
                    <details key={i} className={`group rounded-2xl border overflow-hidden ${darkMode ? "bg-[#031E43] border-[#3B506D]" : "bg-white border-[#DDDFE2]"}`}>
                      <summary className={`flex justify-between items-center p-5 cursor-pointer font-bold text-sm list-none ${darkMode ? "text-white" : "text-[#031E43]"}`}>
                        {item.q}
                        <ChevronDown size={16} className={`${darkMode ? "text-[#3B506D]/70" : "text-[#3B506D]/70"} transition-transform group-open:rotate-180 flex-shrink-0 ml-4`} />
                      </summary>
                      <div className={`px-5 pb-5 text-sm font-medium leading-relaxed ${darkMode ? "text-[#3B506D]/70" : "text-[#3B506D]"}`}>
                        {item.a}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            </section>
          );
        } catch { return null; }
      })()}

      {/* Reseller section */}
      {(() => {
        try {
          const r: { enabled?: boolean; title?: string; subtitle?: string; description?: string; buttonText?: string } = JSON.parse(config.resellerJson || "{}");
          if (!r.enabled || (!r.title && !r.description)) return null;
          return (
            <section className="px-4 sm:px-6 py-16">
              <div className="max-w-7xl mx-auto">
                <div className="rounded-3xl p-10 md:p-16 relative overflow-hidden text-white" style={{ background: "linear-gradient(135deg, #031E43 0%, #3B506D 100%)" }}>
                  <div className="absolute top-0 right-0 w-1/2 h-full opacity-30 pointer-events-none">
                    <div className="absolute top-[-20%] right-[-10%] w-[80%] h-[80%] rounded-full blur-[120px]" style={{ backgroundColor: secondary }} />
                  </div>
                  <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
                    <div>
                      {r.subtitle && (
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase mb-6 bg-white/10 text-white border border-white/10">
                          🤝 {r.subtitle}
                        </div>
                      )}
                      {r.title && (
                        <h2 className="text-3xl md:text-5xl font-black mb-6 leading-tight">{r.title}</h2>
                      )}
                      {r.description && (
                        <p className="text-lg text-[#DDDFE2] mb-8 font-medium leading-relaxed">{r.description}</p>
                      )}
                      {config.whatsapp && (
                        <button
                          onClick={() => {
                            const msg = `Hola ${config.brandName}! Me interesa el programa de ${r.subtitle || "revendedores"}.`;
                            window.open(`https://wa.me/${config.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
                          }}
                          className="bg-white text-[#031E43] px-8 py-4 rounded-2xl font-black text-base shadow-xl hover:scale-105 transition-all flex items-center gap-2"
                        >
                          <MessageCircle size={18} />
                          {r.buttonText || "Consultar por Mayor"}
                        </button>
                      )}
                    </div>
                    <div className="hidden lg:grid grid-cols-2 gap-4">
                      {[
                        { val: "+100", label: "Negocios activos" },
                        { val: "30%", label: "Margen promedio" },
                        { val: "100%", label: "Calidad garantizada" },
                        { val: "24hs", label: "Soporte directo" },
                      ].map((stat, i) => (
                        <div
                          key={i}
                          className={`bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/10 ${i % 2 === 1 ? "mt-8" : ""}`}
                        >
                          <h4 className="text-2xl font-black mb-1" style={{ color: secondary }}>{stat.val}</h4>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[#3B506D]/70">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          );
        } catch { return null; }
      })()}

      {/* Footer */}
      <footer className={`mt-auto border-t px-6 py-10 ${darkMode ? "border-[#031E43] bg-[#031E43]" : "border-[#DDDFE2]"}`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-6">
          <div>
            <h3 className={`font-black text-lg ${darkMode ? "text-white" : "text-[#031E43]"}`}>{config.brandName}</h3>
            {config.brandSubtitle && <p className={`text-sm ${darkMode ? "text-[#3B506D]/70" : "text-[#3B506D]/70"}`}>{config.brandSubtitle}</p>}
            {config.footerDesc && <p className={`text-sm mt-2 max-w-sm ${darkMode ? "text-[#3B506D]/70" : "text-[#3B506D]/70"}`}>{config.footerDesc}</p>}
          </div>
          <div className="flex flex-col gap-2 text-sm">
            {config.address && (
              <span className={`flex items-center gap-1.5 ${darkMode ? "text-[#3B506D]/70" : "text-[#3B506D]"}`}>
                <MapPin size={14} /> {config.address}
              </span>
            )}
            {config.hours && (
              <span className={`flex items-center gap-1.5 ${darkMode ? "text-[#3B506D]/70" : "text-[#3B506D]"}`}>
                <Clock size={14} /> {config.hours}
              </span>
            )}
            {config.whatsapp && (
              <a href={`https://wa.me/${config.whatsapp}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 font-semibold" style={{ color: "#22c55e" }}>
                <MessageCircle size={14} /> WhatsApp
              </a>
            )}
            {config.instagram && (
              <a href={config.instagram} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 font-semibold" style={{ color: primary }}>
                <Instagram size={14} /> Instagram
              </a>
            )}
            {config.facebook && (
              <a href={config.facebook} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 font-semibold" style={{ color: "#1877f2" }}>
                <Facebook size={14} /> Facebook
              </a>
            )}
            {config.mapsUrl && config.address && (
              <a href={config.mapsUrl} target="_blank" rel="noreferrer" className={`flex items-center gap-1.5 font-semibold text-sm ${darkMode ? "text-[#3B506D]/70" : "text-[#3B506D]"}`}>
                <ExternalLink size={14} /> Ver en Google Maps
              </a>
            )}
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-[#FDFDFB]/10 text-center">
          <p className={`text-xs ${darkMode ? "text-[#031E43]" : "text-[#DDDFE2]"}`}>
            Catálogo digital impulsado por{" "}
            <a href="/" className="font-bold" style={{ color: primary }}>Clientum IA</a>
          </p>
        </div>
      </footer>

      {/* WhatsApp FAB */}
      {config.whatsapp && (
        <a
          href={`https://wa.me/${config.whatsapp}`}
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-20 right-6 w-14 h-14 rounded-full flex items-center justify-center text-white text-2xl shadow-lg hover:scale-110 transition-transform z-30"
          style={{ background: "#22c55e" }}
        >
          <MessageCircle size={22} />
        </a>
      )}

      {/* Sidepanels y Modales */}
      <AnimatePresence>
        {showCart && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowCart(false)} />
            <CartPanel
              cart={cart}
              config={config}
              darkMode={darkMode}
              primary={primary}
              onClose={() => setShowCart(false)}
              onRemove={removeFromCart}
              onUpdateQty={updateCartQty}
              onClear={() => setCart([])}
              onCheckout={handleCheckout}
              hasMercadoPago={config.hasMercadoPago ?? false}
            />
          </>
        )}
        {showHistory && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowHistory(false)} />
            <OrderHistoryPanel
              history={orderHistory}
              darkMode={darkMode}
              primary={primary}
              onClose={() => setShowHistory(false)}
              onClear={() => setOrderHistory([])}
              onReorder={(items) => {
                items.forEach((item) => addToCart(item.product, item.quantity, item.notes));
                setShowCart(true);
              }}
            />
          </>
        )}
        {quickViewProduct && (
          <QuickViewModal
            product={quickViewProduct}
            config={config}
            darkMode={darkMode}
            primary={primary}
            onClose={() => setQuickViewProduct(null)}
            onAddToCart={addToCart}
            onOrder={handleOrder}
          />
        )}
        {showCompare && compareList.length > 0 && (
          <CompareModal
            products={compareList}
            config={config}
            darkMode={darkMode}
            primary={primary}
            onClose={() => setShowCompare(false)}
            onRemove={(id) => {
              setCompareList((prev) => prev.filter((x) => x.id !== id));
              if (compareList.length <= 1) setShowCompare(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* Compare floating bar */}
      <AnimatePresence>
        {compareList.length > 0 && !showCompare && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-5 py-3 rounded-full shadow-2xl text-white text-sm font-bold"
            style={{ background: "#3b82f6" }}
          >
            <Scale size={15} />
            {compareList.length} producto{compareList.length !== 1 ? "s" : ""} para comparar
            <button onClick={() => setShowCompare(true)} className="bg-white text-blue-600 px-3 py-1 rounded-full text-xs font-black hover:bg-blue-50 transition-colors">
              Ver
            </button>
            <button onClick={() => setCompareList([])} className="opacity-70 hover:opacity-100 transition-opacity">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

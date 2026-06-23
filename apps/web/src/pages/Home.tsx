import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@workspace/replit-auth-web';
import { Button } from '@/components/ui/button';
import LoginModal from '@/components/LoginModal';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ArrowUp, Menu, X, Sun, Moon, Play, CheckCircle2, Bot, BarChart3, Users, Zap, Mail, Phone, MapPin, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';
import { ClientumLogo } from '@/components/ui/logo';

const WA_URL = "https://wa.me/5492984510883";

function useCountUp(end: number, duration: number = 2000) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !hasAnimated) {
        setHasAnimated(true);
        let startTimestamp: number | null = null;
        const step = (timestamp: number) => {
          if (!startTimestamp) startTimestamp = timestamp;
          const progress = Math.min((timestamp - startTimestamp) / duration, 1);
          setCount(Math.floor(progress * end));
          if (progress < 1) {
            window.requestAnimationFrame(step);
          }
        };
        window.requestAnimationFrame(step);
      }
    }, { threshold: 0.1 });

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration, hasAnimated]);

  return { count, ref };
}

function RoiSlider({ id, label, value, min, max, step, display, ariaLabel, onChange, testId, textTestId, minLabel, maxLabel }: {
  id: string; label: string; value: number; min: number; max: number; step: number;
  display: string; ariaLabel: string; onChange: (v: number) => void;
  testId: string; textTestId: string; minLabel: string; maxLabel: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex justify-between mb-3">
        <Label className="font-bold text-foreground" htmlFor={id}>{label}</Label>
        <span className="font-extrabold text-primary" data-testid={textTestId}>{display}</span>
      </div>
      <div className="relative">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-label={ariaLabel}
          onChange={e => onChange(Number(e.target.value))}
          className="roi-range"
          data-testid={testId}
        />
        <div
          className="pointer-events-none absolute -top-7 px-2 py-0.5 rounded-full text-[11px] font-extrabold text-white shadow-md"
          style={{
            left: `calc(${pct}% - 20px)`,
            background: '#031E43',
            transition: 'left 0.1s',
            whiteSpace: 'nowrap',
          }}
        >
          {display}
        </div>
      </div>
      <div className="flex justify-between mt-1.5 text-xs text-muted-foreground"><span>{minLabel}</span><span>{maxLabel}</span></div>
    </div>
  );
}

function ProblemaCard({ item, delay, testId, onSoluciones }: { item: { num: string; icon: string; title: string; desc: string }; delay: number; testId: string; onSoluciones: () => void }) {
  const [hov, setHov] = React.useState(false);
  return (
    <div
      className="border-2 rounded-3xl bg-card shadow-sm reveal cursor-pointer group"
      style={{ transitionDelay: `${delay}s`, borderColor: hov ? 'hsl(var(--foreground))' : 'hsl(var(--border))', transition: 'border-color 0.2s, box-shadow 0.2s', boxShadow: hov ? '0 8px 28px rgba(0,0,0,0.12)' : undefined }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      data-testid={testId}
    >
      <div className="p-8 flex flex-col h-full">
        <div className="text-4xl font-black leading-none mb-3 select-none" style={{ color: 'rgba(3,30,67,0.10)' }}>{item.num}</div>
        <div className="text-4xl mb-6 bg-blue-50/50 w-16 h-16 flex items-center justify-center rounded-2xl group-hover:scale-110 transition-transform duration-300">{item.icon}</div>
        <h3 className="text-xl font-bold mb-3">{item.title}</h3>
        <p className="text-muted-foreground font-medium leading-relaxed flex-1">{item.desc}</p>
        <div className="mt-5 pt-4 border-t border-border">
          <button
            onClick={onSoluciones}
            className="inline-flex items-center gap-1 text-sm font-bold transition-all"
            style={{ color: hov ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))' }}
          >
            Ver cómo lo resolvemos
            <span style={{ display: 'inline-block', transition: 'transform 0.15s', transform: hov ? 'translateX(4px)' : 'none' }}>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

const RECURSOS_ITEMS = [
  { icon: '📊', label: 'Calculadora ROI',    sub: 'Cuánto ahorrás con IA',      section: 'roi' },
  { icon: '🤖', label: 'Mis Servicios',       sub: 'Qué podés automatizar',      section: 'soluciones' },
  { icon: '📋', label: 'Hoja de Cálculo',     sub: 'Template gratuito',          section: 'recursos' },
  { icon: '👥', label: 'Guía de Clientes',    sub: 'Onboarding paso a paso',     section: 'recursos' },
  { icon: '💼', label: 'Casos Reales',        sub: 'Resultados por sector',      section: 'casos' },
  { icon: '🎟️', label: 'Códigos de Descuento',sub: 'Promos activas',            section: 'precios' },
  { icon: '✅', label: 'Checklist IA',        sub: '10 pasos para empezar',      section: 'recursos' },
  { icon: '🔬', label: 'Research 2025',       sub: 'IA en PyMEs argentinas',     section: 'recursos' },
] as const;

function RecursosDropdown({ onNavigate }: { onNavigate: (section: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 px-3 py-2 min-h-[44px] text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors relative group"
        data-testid="navlink-recursos"
      >
        Recursos
        <ChevronDown size={14} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        <span className="absolute bottom-1 left-3 right-3 h-[2px] bg-[#031E43] scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-200 rounded-full" />
      </button>

      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[420px] bg-[#031E43] rounded-2xl shadow-2xl p-4 z-[200]"
          style={{ boxShadow: '0 20px 60px rgba(3,30,67,0.35)' }}>
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-2 mb-3">Recursos</div>
          <div className="grid grid-cols-2 gap-1">
            {RECURSOS_ITEMS.map(({ icon, label, sub, section }) => (
              <button
                key={label}
                onClick={() => { setOpen(false); onNavigate(section); }}
                className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/8 transition-colors text-left group/item"
              >
                <span className="text-xl mt-0.5 flex-shrink-0">{icon}</span>
                <div>
                  <div className="text-sm font-bold text-white leading-tight group-hover/item:text-[#FDFDFB] transition-colors">{label}</div>
                  <div className="text-xs text-white/50 mt-0.5">{sub}</div>
                </div>
              </button>
            ))}
          </div>
          <div className="border-t border-white/10 mt-3 pt-3 px-2">
            <button
              onClick={() => { setOpen(false); onNavigate('recursos'); }}
              className="text-xs font-bold text-[#FDFDFB] hover:text-[#FDFDFB]/80 transition-colors flex items-center gap-1"
            >
              Ver todos los recursos gratuitos →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NavBtn({ label, testId, onClick }: { label: string; testId: string; onClick: () => void }) {
  const [hov, setHov] = React.useState(false);
  return (
    <button
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
      data-testid={testId}
      style={{
        padding: '6px 12px',
        fontSize: 13,
        fontWeight: 600,
        color: hov ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
        background: 'none',
        border: 'none',
        borderBottom: `2px solid ${hov ? 'hsl(var(--foreground))' : 'transparent'}`,
        cursor: 'pointer',
        transition: 'all 0.15s',
        minHeight: 44,
      }}
    >
      {label}
    </button>
  );
}

function PricingCountdown() {
  const [time, setTime] = React.useState({ d: 0, h: 0, m: 0, s: 0 });
  useEffect(() => {
    const target = new Date();
    target.setDate(target.getDate() + 13);
    target.setHours(target.getHours() + 8, target.getMinutes() + 31, 52);
    const tick = () => {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) return;
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTime({ d, h, m, s });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <div className="mt-16 text-center space-y-4 reveal">
      <p className="font-mono text-xs uppercase tracking-widest text-white/40">Esta oferta de lanzamiento expira en:</p>
      <div className="flex justify-center gap-2 font-mono">
        {[{ v: time.d, l: 'días' }, { v: time.h, l: 'hs' }, { v: time.m, l: 'min' }, { v: time.s, l: 'seg' }].map(({ v, l }) => (
          <div key={l} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 min-w-[70px] text-center">
            <b className="block text-2xl font-bold text-white">{pad(v)}</b>
            <span className="text-[9px] text-white/40 uppercase block mt-1">{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScreenPanelGeneral() {
  return (
    <div className="p-4 h-full overflow-hidden">
      <div className="flex flex-wrap gap-1.5 mb-3">
        {['+ Nuevo lead','📅 Agendar','📢 Broadcast','⚡ Nuevo flow'].map((a,i) => (
          <button key={i} className="px-2.5 py-1 rounded-lg border border-[#DDDFE2] text-[9px] font-bold text-[#031E43] bg-white hover:bg-[#031E43] hover:text-white transition-colors">{a}</button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2 mb-3">
        {[
          { label:'Bot activo', value:'✓ Online', sub:'24/7', c:'#1aa260' },
          { label:'Conversaciones', value:'127', sub:'+12 hoy', c:'#031E43' },
          { label:'Base KB', value:'43 docs', sub:'2 nuevos', c:'#3B506D' },
          { label:'Handoffs', value:'3', sub:'Sin responder', c:'#F59E0B' },
        ].map((m,i) => (
          <div key={i} className="bg-white border border-[#DDDFE2] rounded-xl p-2.5">
            <div className="text-[9px] font-bold text-[#3B506D] uppercase tracking-wide mb-1">{m.label}</div>
            <div className="font-extrabold text-base leading-none mb-0.5" style={{color:m.c}}>{m.value}</div>
            <div className="text-[9px] text-[#3B506D]/60">{m.sub}</div>
          </div>
        ))}
      </div>
      <div className="bg-white border border-[#DDDFE2] rounded-xl p-3 mb-3">
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold text-[#031E43] text-[10px]">Mensajes por día</span>
          <span className="text-[9px] text-[#3B506D] bg-[#DDDFE2]/40 px-2 py-0.5 rounded">Esta semana</span>
        </div>
        <div className="flex items-end gap-1.5 h-14">
          {[45,72,58,90,84,110,96].map((h,i) => (
            <div key={i} className="flex-1 rounded-t-sm transition-all" style={{height:`${(h/110)*100}%`, background: i===4?'#031E43':'#DDDFE2'}} />
          ))}
        </div>
        <div className="flex mt-1">
          {['L','M','X','J','V','S','D'].map((d,i) => (
            <div key={i} className="flex-1 text-center text-[8px] text-[#3B506D]/50">{d}</div>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        {[
          { icon:'ti-alert-triangle', text:'TKT-0234 — SLA por vencer en 30 min', time:'6 min', c:'#F59E0B' },
          { icon:'ti-trending-up', text:'Deal cerrado — Grupo Textil SA · $55K', time:'22 min', c:'#1aa260' },
          { icon:'ti-receipt', text:'Cobro confirmado — Plan Pro Academia Fit', time:'35 min', c:'#031E43' },
        ].map((a,i) => (
          <div key={i} className="flex items-center gap-2 bg-white border border-[#DDDFE2] rounded-lg px-3 py-1.5">
            <i className={`ti ${a.icon} text-xs`} style={{color:a.c}} />
            <span className="text-[9px] text-[#031E43] font-medium flex-1">{a.text}</span>
            <span className="text-[8px] text-[#3B506D]/50">Hace {a.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScreenAgenteIA() {
  return (
    <div className="h-full flex overflow-hidden">
      <div className="w-40 border-r border-[#DDDFE2] bg-white flex flex-col shrink-0">
        <div className="p-3 border-b border-[#DDDFE2]">
          <div className="font-bold text-[#031E43] text-[10px]">Conversaciones</div>
          <div className="flex items-center gap-1 mt-0.5"><div className="w-1.5 h-1.5 rounded-full bg-[#1aa260]"/><span className="text-[9px] text-[#3B506D]">127 activas</span></div>
        </div>
        {[
          { name:'Juan Pérez', msg:'¿Tienen el repuesto?', time:'14:22', unread:2, status:'bot' },
          { name:'María López', msg:'Ok, lo reservo', time:'14:18', unread:0, status:'resolved' },
          { name:'Carlos Ruiz', msg:'Necesito factura', time:'14:05', unread:1, status:'human' },
          { name:'Ana Torres', msg:'¿Cuánto sale el kit?', time:'13:52', unread:0, status:'bot' },
        ].map((c,i) => (
          <div key={i} className={`px-2.5 py-2 border-b border-[#DDDFE2]/50 cursor-pointer ${i===0?'bg-[#031E43]/5 border-l-2 border-l-[#031E43]':''}`}>
            <div className="flex justify-between items-start">
              <div className="font-bold text-[#031E43] text-[9px]">{c.name}</div>
              <div className="text-[8px] text-[#3B506D]/50">{c.time}</div>
            </div>
            <div className="text-[8px] text-[#3B506D] truncate mt-0.5">{c.msg}</div>
            <div className="flex items-center gap-1 mt-1">
              <span className={`text-[7px] px-1 py-0.5 rounded font-bold ${c.status==='bot'?'bg-[#031E43]/10 text-[#031E43]':c.status==='human'?'bg-amber-100 text-amber-700':'bg-green-100 text-green-700'}`}>
                {c.status==='bot'?'🤖 Bot':c.status==='human'?'👤 Handoff':'✓ Listo'}
              </span>
              {c.unread>0&&<span className="ml-auto w-4 h-4 rounded-full bg-[#031E43] text-white text-[7px] flex items-center justify-center font-bold">{c.unread}</span>}
            </div>
          </div>
        ))}
      </div>
      <div className="flex-1 flex flex-col bg-[#FDFDFB] min-w-0">
        <div className="p-2.5 border-b border-[#DDDFE2] bg-white flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-full bg-[#031E43] flex items-center justify-center text-white text-[9px] font-bold shrink-0">JP</div>
          <div><div className="font-bold text-[#031E43] text-[10px]">Juan Pérez</div><div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#1aa260]"/><span className="text-[8px] text-[#3B506D]">Bot activo</span></div></div>
        </div>
        <div className="flex-1 p-3 space-y-2.5 overflow-hidden">
          {[
            { from:'user', msg:'Hola, ¿tienen el repuesto 4599-A en stock?' },
            { from:'bot', msg:'¡Hola! 👋 Sí, tenemos 14 unidades. Precio: $45.000 + IVA. ¿Te reservo uno?' },
            { from:'user', msg:'Sí, reservame 2 por favor' },
            { from:'bot', msg:'¡Listo! Reservé 2 unidades. Te envío el link de pago 🔗' },
          ].map((m,i) => (
            <div key={i} className={`flex gap-1.5 ${m.from==='bot'?'flex-row-reverse':''}`}>
              <div className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[8px] font-bold ${m.from==='bot'?'bg-[#031E43] text-white':'bg-[#DDDFE2] text-[#3B506D]'}`}>
                {m.from==='bot'?<ClientumLogo size={9} color="#FDFDFB" />:'JP'}
              </div>
              <div className={`rounded-2xl px-2.5 py-1.5 text-[9px] max-w-[78%] leading-relaxed ${m.from==='bot'?'bg-[#031E43] text-white rounded-tr-sm':'bg-white border border-[#DDDFE2] text-[#031E43] rounded-tl-sm'}`}>
                {m.msg}
              </div>
            </div>
          ))}
        </div>
        <div className="p-2.5 border-t border-[#DDDFE2] bg-white shrink-0">
          <div className="flex items-center gap-2 bg-[#FDFDFB] border border-[#DDDFE2] rounded-xl px-3 py-1.5">
            <span className="text-[9px] text-[#3B506D]/40 flex-1">Escribir respuesta...</span>
            <div className="w-5 h-5 rounded-full bg-[#031E43] flex items-center justify-center"><i className="ti ti-send text-[8px] text-white"/></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScreenAgenda() {
  return (
    <div className="p-4 h-full overflow-hidden">
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label:'Hoy', value:'12 turnos', c:'#031E43' },
          { label:'Pendientes', value:'3', c:'#F59E0B' },
          { label:'Confirmados', value:'9', c:'#1aa260' },
        ].map((s,i) => (
          <div key={i} className="bg-white border border-[#DDDFE2] rounded-xl p-3 text-center">
            <div className="text-[9px] font-bold text-[#3B506D] uppercase mb-1">{s.label}</div>
            <div className="font-extrabold text-xl" style={{color:s.c}}>{s.value}</div>
          </div>
        ))}
      </div>
      <div className="bg-white border border-[#DDDFE2] rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#DDDFE2] flex items-center justify-between">
          <span className="font-bold text-[#031E43] text-[10px]">Jueves 19 de junio · 2026</span>
          <button className="text-[9px] font-bold text-[#031E43] bg-[#031E43]/5 px-2 py-1 rounded-lg">+ Nuevo turno</button>
        </div>
        {[
          { time:'09:00', name:'Laura Martínez', service:'Consulta inicial', status:'confirmed' },
          { time:'10:30', name:'Roberto Sánchez', service:'Seguimiento', status:'pending' },
          { time:'11:30', name:'Valeria Cruz', service:'Cierre de venta', status:'confirmed' },
          { time:'14:00', name:'Ernesto López', service:'Demo producto', status:'confirmed' },
          { time:'15:30', name:'Sofía Méndez', service:'Consulta inicial', status:'pending' },
          { time:'17:00', name:'Pablo Gómez', service:'Firma contrato', status:'confirmed' },
        ].map((t,i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2 border-b border-[#DDDFE2]/40 last:border-0">
            <div className="text-[9px] font-mono font-bold text-[#3B506D] w-9 shrink-0">{t.time}</div>
            <div className={`w-1 h-7 rounded-full shrink-0 ${t.status==='confirmed'?'bg-[#1aa260]':'bg-[#F59E0B]'}`} />
            <div className="flex-1 min-w-0">
              <div className="text-[9px] font-bold text-[#031E43] truncate">{t.name}</div>
              <div className="text-[8px] text-[#3B506D]">{t.service}</div>
            </div>
            <div className={`text-[7px] px-1.5 py-0.5 rounded font-bold shrink-0 ${t.status==='confirmed'?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700'}`}>
              {t.status==='confirmed'?'Confirmado':'Pendiente'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScreenAnalytics() {
  return (
    <div className="p-4 h-full overflow-hidden">
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label:'Leads este mes', value:'284', delta:'+23%' },
          { label:'Tasa de cierre', value:'38%', delta:'+5pp' },
          { label:'Tiempo resp. IA', value:'< 2 seg', delta:'–89%' },
        ].map((m,i) => (
          <div key={i} className="bg-white border border-[#DDDFE2] rounded-xl p-3">
            <div className="text-[9px] font-bold text-[#3B506D] uppercase tracking-wide mb-1">{m.label}</div>
            <div className="font-extrabold text-[#031E43] text-xl">{m.value}</div>
            <div className="text-[9px] text-[#1aa260] font-bold mt-0.5">{m.delta}</div>
          </div>
        ))}
      </div>
      <div className="bg-white border border-[#DDDFE2] rounded-xl p-3 mb-3">
        <div className="font-bold text-[#031E43] text-[10px] mb-2.5">Embudo RAG — Resolución automática</div>
        {[
          { label:'Mensajes recibidos', value:8412, pct:100, c:'#031E43' },
          { label:'Intención reconocida', value:7318, pct:87, c:'#3B506D' },
          { label:'Resueltos por KB', value:5901, pct:70, c:'#1aa260' },
          { label:'Derivados a humano', value:1417, pct:17, c:'#F59E0B' },
        ].map((row,i) => (
          <div key={i} className="flex items-center gap-2 mb-1.5">
            <div className="w-28 text-[8px] text-[#3B506D] truncate shrink-0">{row.label}</div>
            <div className="flex-1 bg-[#DDDFE2]/40 rounded-full h-2">
              <div className="h-2 rounded-full transition-all" style={{width:`${row.pct}%`, background:row.c}} />
            </div>
            <div className="text-[9px] font-bold text-[#031E43] w-10 text-right shrink-0">{row.value.toLocaleString()}</div>
          </div>
        ))}
      </div>
      <div className="bg-white border border-[#DDDFE2] rounded-xl overflow-hidden">
        <div className="px-4 py-2 border-b border-[#DDDFE2]"><span className="font-bold text-[#031E43] text-[10px]">Leads recientes</span></div>
        {[
          { name:'Lucía Fernández', ch:'WhatsApp', stage:'Calificado', val:'$85K' },
          { name:'Miguel Díaz', ch:'Web', stage:'Contactado', val:'$32K' },
          { name:'Empresa SA', ch:'WhatsApp', stage:'Cerrado ✓', val:'$210K' },
        ].map((l,i) => (
          <div key={i} className="flex items-center gap-2 px-4 py-2 border-b border-[#DDDFE2]/40 last:border-0">
            <div className="w-5 h-5 rounded-full bg-[#031E43]/10 flex items-center justify-center text-[8px] font-bold text-[#031E43] shrink-0">{l.name[0]}</div>
            <div className="flex-1 min-w-0"><div className="text-[9px] font-bold text-[#031E43] truncate">{l.name}</div><div className="text-[8px] text-[#3B506D]">{l.ch}</div></div>
            <div className={`text-[7px] px-1.5 py-0.5 rounded font-bold ${l.stage.includes('Cerrado')?'bg-green-100 text-green-700':l.stage==='Calificado'?'bg-blue-100 text-[#031E43]':'bg-[#DDDFE2]/60 text-[#3B506D]'}`}>{l.stage}</div>
            <div className="text-[9px] font-bold text-[#031E43]">{l.val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScreenPedidos() {
  return (
    <div className="p-4 h-full overflow-hidden">
      <div className="grid grid-cols-4 gap-2 mb-3">
        {[
          { label:'Total', value:'47', c:'#031E43' },
          { label:'Pendientes', value:'12', c:'#F59E0B' },
          { label:'Entregados', value:'31', c:'#1aa260' },
          { label:'Facturado mes', value:'$1.2M', c:'#8B5CF6' },
        ].map((s,i) => (
          <div key={i} className="bg-white border border-[#DDDFE2] rounded-xl p-2.5">
            <div className="text-[8px] font-bold text-[#3B506D] uppercase mb-1">{s.label}</div>
            <div className="font-extrabold text-base leading-none" style={{color:s.c}}>{s.value}</div>
          </div>
        ))}
      </div>
      <div className="bg-white border border-[#DDDFE2] rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#DDDFE2] flex items-center justify-between">
          <span className="font-bold text-[#031E43] text-[10px]">Últimos pedidos</span>
          <button className="text-[9px] font-bold text-[#031E43] bg-[#031E43]/5 px-2 py-1 rounded-lg">+ Nuevo</button>
        </div>
        {[
          { id:'PED-0047', client:'Constructora SRL', items:'3 productos', amount:'$145.000', status:'Entregado', afip:true },
          { id:'PED-0046', client:'Juan Pérez', items:'2x repuesto 4599-A', amount:'$90.000', status:'Pendiente', afip:false },
          { id:'PED-0045', client:'Transportes Sur', items:'Pack anual', amount:'$320.000', status:'Facturado', afip:true },
          { id:'PED-0044', client:'María Gómez', items:'5 productos', amount:'$67.500', status:'En camino', afip:false },
          { id:'PED-0043', client:'Empresa SA', items:'Pack Pro + soporte', amount:'$210.000', status:'Facturado', afip:true },
        ].map((p,i) => (
          <div key={i} className="flex items-center gap-2.5 px-4 py-2 border-b border-[#DDDFE2]/40 last:border-0">
            <div className="text-[8px] font-mono text-[#3B506D] w-16 shrink-0">{p.id}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[9px] font-bold text-[#031E43] truncate">{p.client}</div>
              <div className="text-[8px] text-[#3B506D]">{p.items}</div>
            </div>
            <div className="text-[9px] font-bold text-[#031E43]">{p.amount}</div>
            <div className={`text-[7px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
              p.status==='Facturado'?'bg-green-100 text-green-700':
              p.status==='Entregado'?'bg-blue-100 text-[#031E43]':
              p.status==='En camino'?'bg-purple-100 text-purple-700':
              'bg-amber-100 text-amber-700'
            }`}>{p.status}</div>
            {p.afip&&<div className="text-[7px] bg-[#031E43]/10 text-[#031E43] px-1 py-0.5 rounded font-bold shrink-0">AFIP</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardDemoTour() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const TABS = [
    { label:'Panel General', icon:'ti-layout-dashboard', screen:<ScreenPanelGeneral /> },
    { label:'Agente IA', icon:'ti-robot', screen:<ScreenAgenteIA /> },
    { label:'Agenda de Turnos', icon:'ti-calendar-event', screen:<ScreenAgenda /> },
    { label:'Analytics', icon:'ti-chart-bar', screen:<ScreenAnalytics /> },
    { label:'Pedidos', icon:'ti-package', screen:<ScreenPedidos /> },
  ];

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setActive(a => (a+1) % TABS.length), 5000);
    return () => clearInterval(t);
  }, [paused, TABS.length]);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative max-w-5xl mx-auto"
    >
      {/* Browser window frame */}
      <div className="rounded-2xl overflow-hidden border border-white/10 shadow-[0_30px_80px_-15px_rgba(0,0,0,0.6)]">
        {/* Browser chrome */}
        <div className="h-9 bg-[#0a1628] flex items-center px-4 gap-3 border-b border-white/5">
          <div className="flex gap-1.5 shrink-0">
            {['#FF5F57','#FEBC2E','#28C840'].map((c,i) => <div key={i} className="w-3 h-3 rounded-full" style={{background:c}} />)}
          </div>
          <div className="flex-1 mx-4 h-6 bg-white/5 rounded-lg flex items-center justify-center">
            <span className="text-[10px] text-white/30 font-mono">🔒 clientum.ar/app</span>
          </div>
          <div className="w-16 shrink-0" />
        </div>

        {/* App body */}
        <div className="flex" style={{height:490}}>
          {/* Sidebar */}
          <div className="w-48 bg-white border-r border-[#DDDFE2] flex flex-col shrink-0">
            <div className="h-12 border-b border-[#DDDFE2] flex items-center px-4 gap-2.5">
              <div className="w-6 h-6 bg-[#031E43] rounded-lg flex items-center justify-center shrink-0">
                <ClientumLogo size={12} color="#FDFDFB" />
              </div>
              <span className="font-extrabold text-[#031E43] text-xs tracking-tight">Clientum</span>
            </div>
            <nav className="flex-1 p-2.5 space-y-0.5 overflow-hidden">
              {TABS.map((tab,i) => (
                <button key={i} onClick={() => setActive(i)}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-[10px] font-semibold transition-all ${
                    active===i ? 'bg-[#031E43] text-white shadow-sm' : 'text-[#3B506D] hover:bg-[#031E43]/5'
                  }`}
                >
                  <i className={`ti ${tab.icon} text-sm shrink-0`} />
                  <span className="truncate">{tab.label}</span>
                </button>
              ))}
              <div className="pt-2 mt-1 border-t border-[#DDDFE2] space-y-0.5">
                {[{l:'Integraciones',ic:'ti-plug'},{l:'Documentación',ic:'ti-book'}].map((item,i)=>(
                  <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 text-[9px] text-[#3B506D]/50 font-medium">
                    <i className={`ti ${item.ic} text-xs`} />{item.l}
                  </div>
                ))}
              </div>
            </nav>
          </div>

          {/* Main panel */}
          <div className="flex-1 bg-[#FDFDFB] overflow-hidden flex flex-col min-w-0">
            {/* Top bar */}
            <div className="h-12 bg-white border-b border-[#DDDFE2] flex items-center px-4 gap-3 shrink-0">
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[#031E43] text-xs">{TABS[active].label}</div>
                <div className="text-[9px] text-[#3B506D]">Panel de Control · Clientum</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="w-7 h-7 bg-[#DDDFE2]/60 rounded-full flex items-center justify-center">
                  <i className="ti ti-bell text-[10px] text-[#3B506D]" />
                </div>
                <div className="w-7 h-7 bg-[#031E43] rounded-full flex items-center justify-center text-white text-[9px] font-bold">AD</div>
              </div>
            </div>
            {/* Screen */}
            <div className="flex-1 overflow-hidden">
              {TABS[active].screen}
            </div>
          </div>
        </div>
      </div>

      {/* Progress pills */}
      <div className="flex justify-center items-center gap-2 mt-5">
        {TABS.map((tab,i) => (
          <button key={i} onClick={() => setActive(i)} className="group flex items-center gap-1.5">
            <div className={`h-1.5 rounded-full transition-all duration-500 ${active===i ? 'w-8 bg-white' : 'w-1.5 bg-white/20 group-hover:bg-white/50'}`} />
          </button>
        ))}
      </div>
      <p className="text-center mt-2 text-white/40 text-xs font-medium">{TABS[active].label}</p>
    </div>
  );
}

function DemoVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);

  function handlePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (playing) {
      v.pause();
      setPlaying(false);
    } else {
      v.play();
      setPlaying(true);
    }
  }

  function toggleMute() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }

  return (
    <div className="relative max-w-4xl mx-auto mb-12 rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-black/40 group">
      <video
        ref={videoRef}
        src={`${import.meta.env.BASE_URL}demo.mp4`}
        loop
        muted
        playsInline
        className="w-full aspect-video object-cover block"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

      {/* Centre play button — visible when paused */}
      {!playing && (
        <button
          onClick={handlePlay}
          className="absolute inset-0 flex items-center justify-center"
          aria-label="Reproducir demo"
        >
          <div className="w-20 h-20 bg-purple-600 text-white rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(147,51,234,0.6)] hover:scale-110 transition-transform">
            <Play className="w-8 h-8 ml-1" />
          </div>
        </button>
      )}

      {/* Bottom controls — visible when playing or on hover */}
      <div className={`absolute bottom-4 right-4 flex items-center gap-2 transition-opacity duration-200 ${playing ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
        <button
          onClick={handlePlay}
          className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
          aria-label={playing ? "Pausar" : "Reproducir"}
        >
          <i className={`ti ${playing ? "ti-player-pause" : "ti-player-play"} text-sm`} />
        </button>
        <button
          onClick={toggleMute}
          className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
          aria-label={muted ? "Activar sonido" : "Silenciar"}
        >
          <i className={`ti ${muted ? "ti-volume-off" : "ti-volume"} text-sm`} />
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const [, navigate] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showMobileCta, setShowMobileCta] = useState(false);
  const [showAnnBar, setShowAnnBar] = useState(true);
  const [fomoUser, setFomoUser] = useState<string | null>(null);
  const [fomoCity, setFomoCity] = useState<string | null>(null);
  const [showFomo, setShowFomo] = useState(false);
  
  // Interactive states
  const [roiEmp, setRoiEmp] = useState(5);
  const [roiHrs, setRoiHrs] = useState(3);
  const [roiCosto, setRoiCosto] = useState(15000);
  const [roiLeads, setRoiLeads] = useState(30);
  const [roiTicket, setRoiTicket] = useState(50000);
  
  const [activeSectorTab, setActiveSectorTab] = useState('Distribuidoras');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  
  const [isAnnual, setIsAnnual] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authView, setAuthView] = useState<"login" | "register">("login");
  const { user, isLoading: authLoading } = useAuth();

  const openLogin = () => { setAuthView("login"); setShowAuthModal(true); };
  const openRegister = () => { setAuthView("register"); setShowAuthModal(true); };

  // Counters
  const countHrs = useCountUp(3);
  const countPymes = useCountUp(500);

  // ROI Computed
  const perdidaOperativa = roiEmp * roiHrs * 22 * roiCosto * 0.4;
  const ventasPerdidas = roiLeads * roiTicket * 0.3;
  const totalImpacto = perdidaOperativa + ventasPerdidas;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "google_not_configured") {
      toast.error("Google login no está configurado. Usá 'Cuenta existente' para ingresar.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Scroll spy & reveal
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollTop;
      const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scroll = `${(totalScroll / windowHeight) * 100}%`;
      setScrollProgress((totalScroll / windowHeight) * 100);
      
      setShowScrollTop(totalScroll > 500);
      setShowMobileCta(totalScroll > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection Observer for reveals
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          
          // Animate stat bars if needed
          if (entry.target.classList.contains('stat-bar-container')) {
            const fills = entry.target.querySelectorAll('.stat-fill');
            fills.forEach(fill => {
              const width = (fill as HTMLElement).getAttribute('data-width');
              if (width) (fill as HTMLElement).style.width = width;
            });
          }
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal, .stat-bar-container').forEach(el => {
      el.classList.add('anim-start');
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // FOMO Logic
  useEffect(() => {
    const fomoData = [
      { name: "Martín F.", city: "Córdoba" },
      { name: "Luciana G.", city: "Mendoza" },
      { name: "Carlos R.", city: "Neuquén" },
      { name: "Laura M.", city: "Gral. Roca" },
      { name: "Diego M.", city: "Bahía Blanca" },
      { name: "Andrea P.", city: "Rosario" },
      { name: "Jorge R.", city: "Tucumán" }
    ];
    let idx = 0;

    const showNextFomo = () => {
      setFomoUser(fomoData[idx].name);
      setFomoCity(fomoData[idx].city);
      setShowFomo(true);
      
      setTimeout(() => setShowFomo(false), 5000);
      idx = (idx + 1) % fomoData.length;
    };

    const initialTimeout = setTimeout(() => {
      showNextFomo();
      const fomoInterval = setInterval(showNextFomo, 18000);
      return () => clearInterval(fomoInterval);
    }, 8000);

    return () => clearTimeout(initialTimeout);
  }, []);

  // Handlers
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
      setTimeout(() => {
        el.classList.add('section-highlight');
        setTimeout(() => el.classList.remove('section-highlight'), 950);
      }, 480);
    }
  };

  const handleContactSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const nombre = fd.get('nombre');
    const empresa = fd.get('empresa');
    const telefono = fd.get('telefono');
    if (!nombre || !empresa || !telefono) {
      toast.error('Completá los campos obligatorios');
      return;
    }
    toast.success('¡Mensaje recibido!');
    setTimeout(() => {
      window.open(`${WA_URL}?text=Hola, soy ${nombre} de ${empresa}. Quiero agendar mi diagnóstico gratis.`, '_blank');
    }, 1500);
  };

  const handleNewsletter = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = fd.get('email') as string;
    if (!email) return;
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'landing' }),
      });
      const data = await res.json() as { ok?: boolean; message?: string };
      if (data.ok) {
        toast.success(`${data.message ?? '¡Suscripto!'}`);
        (e.target as HTMLFormElement).reset();
      } else {
        toast.error('Ocurrió un error. Intentá de nuevo.');
      }
    } catch {
      toast.error('Sin conexión. Intentá de nuevo.');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-cyan-100 selection:text-navy-900 overflow-x-hidden">
      {/* Global Elements */}
      <div id="progressBar" style={{ width: `${scrollProgress}%` }} data-testid="scroll-progress"></div>
      
      <button 
        id="scrollTop" 
        className={showScrollTop ? 'show' : ''} 
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Volver arriba"
        data-testid="button-scroll-top"
      >
        <ArrowUp className="w-5 h-5 text-primary" />
      </button>

      <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="wa-float w-14 h-14 bg-[#1aa260] hover:bg-[#158048] rounded-full flex items-center justify-center shadow-lg hover:shadow-xl text-white transition-all" data-testid="link-floating-whatsapp">
        <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
      </a>

      <div id="fomoNotif" className={showFomo ? 'show flex items-start gap-3' : 'flex items-start gap-3'} data-testid="fomo-notification">
        <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0 mt-1">
          <span className="text-xs">⚡</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground m-0" data-testid="text-fomo-user">{fomoUser}</p>
          <p className="text-xs text-muted-foreground m-0" data-testid="text-fomo-city">Acaba de pedir su diagnóstico desde {fomoCity}</p>
        </div>
      </div>

      <div id="mobileCta" className={`bg-card border-t border-border p-4 shadow-[0_-8px_20px_rgba(0,0,0,0.05)] ${showMobileCta ? 'show' : ''}`} data-testid="container-mobile-cta">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="font-bold text-sm">Clientum — IA para tu PyME</p>
          </div>
          <Button onClick={() => window.open(WA_URL, '_blank')} className="bg-[#1aa260] hover:bg-[#158048] text-white rounded-full" data-testid="button-mobile-whatsapp">
            WhatsApp
          </Button>
        </div>
      </div>

      {/* 1. Trust Ticker Strip */}
      <div className="bg-[#070f24] overflow-hidden border-b border-white/10 py-2.5 font-mono" data-testid="section-ticker">
        <div className="live-ticker text-xs font-medium tracking-wider text-blue-200/80">
          <span>+500 PyMEs confían en Clientum</span>
          <span className="text-white/20">|</span>
          <span>3 hs ahorradas por día en promedio</span>
          <span className="text-white/20">|</span>
          <span>80% de consultas resueltas automáticamente</span>
          <span className="text-white/20">|</span>
          <span>Presencia en Río Negro · Neuquén · CABA · Buenos Aires</span>
          <span className="text-white/20">|</span>
          <span>98% de satisfacción de clientes</span>
          <span className="text-white/20">|</span>
          {/* Duplicate for seamless loop */}
          <span>+500 PyMEs confían en Clientum</span>
          <span className="text-white/20">|</span>
          <span>3 hs ahorradas por día en promedio</span>
          <span className="text-white/20">|</span>
          <span>80% de consultas resueltas automáticamente</span>
          <span className="text-white/20">|</span>
          <span>Presencia en Río Negro · Neuquén · CABA · Buenos Aires</span>
          <span className="text-white/20">|</span>
          <span>98% de satisfacción de clientes</span>
        </div>
      </div>

      {/* 2. Promo Banner */}
      {showAnnBar && (
        <div id="annBar" className="relative py-3 px-4 text-center text-white text-sm font-semibold flex items-center justify-center bg-gradient-to-r from-[#031E43] via-[#031E43] to-[#031E43] bg-[length:200%_100%] animate-[gradSlide_6s_linear_infinite]" data-testid="section-announcement">
          <span>🏷️ Precio de lanzamiento por tiempo limitado — <button onClick={() => scrollTo('contacto')} className="underline hover:text-white/80 transition-colors font-bold ml-1" data-testid="link-announcement-wa">Reservá tu diagnóstico hoy →</button></span>
          <button onClick={() => setShowAnnBar(false)} className="absolute right-4 top-1/2 -translate-y-1/2 hover:opacity-70 text-white" data-testid="button-dismiss-announcement"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* 3. Sticky Navbar */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border shadow-sm" data-testid="nav-main">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo(0,0)} data-testid="link-home-logo">
            <div className="w-10 h-10 bg-foreground/8 rounded-xl flex items-center justify-center">
              <ClientumLogo size={26} />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl leading-none text-foreground tracking-tight">Clientum</span>
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground bg-foreground/6 px-1.5 py-0.5 rounded-sm inline-block mt-0.5 w-max">IA para PyMEs</span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-1 text-sm font-semibold text-muted-foreground">
            {[
              { id: 'problema',   label: 'Problema',    testId: 'navlink-problema' },
              { id: 'soluciones', label: 'Soluciones',  testId: 'navlink-soluciones' },
              { id: 'studio',     label: 'Studio',      testId: 'navlink-studio' },
              { id: 'precios',    label: 'Planes',      testId: 'navlink-precios' },
              { id: 'partners',   label: 'Partners',    testId: 'navlink-partners' },
            ].map(({ id, label, testId }) => (
              <NavBtn key={id} label={label} testId={testId} onClick={() => scrollTo(id)} />
            ))}
            <NavBtn label="Casos" testId="navlink-casos" onClick={() => scrollTo('casos')} />
            <RecursosDropdown onNavigate={scrollTo} />
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground hidden sm:flex">
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            
            {user ? (
              <Button asChild variant="outline" className="hidden sm:inline-flex border-border font-bold">
                <Link href="/app">Dashboard</Link>
              </Button>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Button variant="ghost" onClick={openLogin} className="font-bold text-muted-foreground hover:text-foreground">
                  Ingresar
                </Button>
              </div>
            )}
            
            <Button onClick={() => window.open(WA_URL, '_blank')} className="bg-[#1aa260] hover:bg-[#158048] text-white font-bold rounded-full hidden sm:inline-flex cta-primary" data-testid="button-nav-wa">
              Diagnóstico gratis
            </Button>

            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-[110px] z-40 bg-background p-4 lg:hidden animate-in fade-in slide-in-from-top-2 border-t border-border overflow-y-auto">
          <div className="flex flex-col gap-4 max-w-md mx-auto">
            <button onClick={() => scrollTo('problema')} className="p-4 text-lg font-bold text-left border-b border-border">Problema</button>
            <button onClick={() => scrollTo('soluciones')} className="p-4 text-lg font-bold text-left border-b border-border">Soluciones</button>
            <button onClick={() => scrollTo('studio')} className="p-4 text-lg font-bold text-left border-b border-border">Studio</button>
            <button onClick={() => scrollTo('precios')} className="p-4 text-lg font-bold text-left border-b border-border">Planes</button>
            <button onClick={() => scrollTo('casos')} className="p-4 text-lg font-bold text-left border-b border-border">Casos Reales</button>
            
            <div className="p-4 flex flex-col gap-3 mt-4">
              {user ? (
                <Button asChild className="w-full font-bold">
                  <Link href="/app">Ir al Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => { setMobileMenuOpen(false); openLogin(); }} className="w-full font-bold">Ingresar</Button>
                </>
              )}
              <Button onClick={() => window.open(WA_URL, '_blank')} className="w-full bg-[#1aa260] hover:bg-[#158048] text-white font-bold">
                Agendar diagnóstico
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Redesigned Hero */}
      <section className="relative pt-20 pb-32 md:pt-32 md:pb-40 bg-[#070f24] overflow-hidden" data-testid="section-hero">
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-[800px] h-[800px] bg-[#031E43]/20 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-[600px] h-[600px] bg-[#1aa260]/10 blur-[100px] rounded-full pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            <div className="text-left animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-[#1aa260] animate-pulse"></span>
                <span className="text-sm font-semibold text-white/90">IA desarrollada para Argentina</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-[1.1] mb-6 tracking-tight font-sora">
                Tu PyME merece <br/>
                trabajar <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#031E43] to-cyan-400">con IA.</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-blue-100/70 mb-10 font-medium max-w-lg leading-relaxed">
                Dejá de hacerlo todo a mano. Automatizá consultas por WhatsApp, presupuestos y seguimiento de ventas.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Button size="lg" onClick={() => window.open(WA_URL, '_blank')} className="w-full sm:w-auto h-14 px-8 text-base font-bold rounded-full bg-[#031E43] hover:bg-[#3B506D] text-white shadow-[0_0_20px_rgba(59,111,237,0.3)] transition-all hover:-translate-y-1">
                  Ver demo por WhatsApp
                </Button>
                <Button size="lg" variant="outline" onClick={() => scrollTo('soluciones')} className="w-full sm:w-auto h-14 px-8 text-base font-bold rounded-full border-white/20 text-white hover:bg-white/10 backdrop-blur-sm transition-all">
                  Conocé las soluciones
                </Button>
              </div>
              
              <div className="mt-10 flex items-center gap-4 text-sm font-medium text-white/50">
                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-[#1aa260]" /> Setup en 7 días</div>
                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-[#1aa260]" /> Soporte local</div>
              </div>
            </div>
            
            {/* Hero Right Dashboard Mockup (JSX) */}
            <div className="relative animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
              <div className="relative w-full max-w-[540px] mx-auto rounded-2xl bg-[#040e21] border border-white/10 shadow-2xl overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]">
                {/* Mockup Header */}
                <div className="h-12 border-b border-white/5 flex items-center px-4 justify-between bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-white/20"></div>
                    <div className="w-3 h-3 rounded-full bg-white/20"></div>
                    <div className="w-3 h-3 rounded-full bg-white/20"></div>
                  </div>
                  <div className="text-xs font-medium text-white/40 font-mono">clientum.ar/app</div>
                  <div className="w-16"></div>
                </div>
                
                {/* Mockup Body */}
                <div className="p-6 grid gap-6">
                  {/* Stats Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                      <div className="text-white/50 text-xs font-medium mb-1">Mensajes Resueltos (IA)</div>
                      <div className="text-2xl font-bold text-white flex items-baseline gap-2">
                        8,492 <span className="text-[#1aa260] text-xs font-bold bg-[#1aa260]/10 px-1.5 py-0.5 rounded">+14%</span>
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                      <div className="text-white/50 text-xs font-medium mb-1">Tiempo Ahorrado</div>
                      <div className="text-2xl font-bold text-white flex items-baseline gap-2">
                        42 hrs <span className="text-[#031E43] text-xs font-bold bg-[#031E43]/10 px-1.5 py-0.5 rounded">Esta semana</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Chat Interface Mock */}
                  <div className="bg-white/5 rounded-xl border border-white/5 p-1 relative overflow-hidden">
                    <div className="h-8 border-b border-white/5 flex items-center px-3 gap-2">
                      <Bot className="w-4 h-4 text-[#031E43]" />
                      <span className="text-xs font-bold text-white">IA Ventas (WhatsApp)</span>
                      <span className="w-2 h-2 rounded-full bg-[#1aa260] ml-auto animate-pulse"></span>
                    </div>
                    <div className="p-4 space-y-4">
                      {/* User msg */}
                      <div className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-white/10 shrink-0 flex items-center justify-center text-[10px] text-white/50">C</div>
                        <div className="bg-white/10 rounded-2xl rounded-tl-sm px-3 py-2 text-xs text-white/80 max-w-[85%]">
                          Hola, ¿tienen stock del repuesto código 4599-A? Y el precio por favor.
                        </div>
                      </div>
                      {/* Bot msg */}
                      <div className="flex gap-2 flex-row-reverse">
                        <div className="w-6 h-6 rounded-full bg-[#031E43] shrink-0 flex items-center justify-center text-[10px] text-white"><ClientumLogo size={14} color="#FDFDFB" /></div>
                        <div className="bg-[#031E43]/20 border border-[#031E43]/30 rounded-2xl rounded-tr-sm px-3 py-2 text-xs text-blue-100 max-w-[85%]">
                          ¡Hola! 👋 Sí, tenemos 14 unidades en stock del repuesto 4599-A. El precio es de $45.000 + IVA. ¿Te reservo uno o querés que te envíe un link de pago?
                        </div>
                      </div>
                    </div>
                    {/* Gradient overlay to fade bottom */}
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#040e21] to-transparent pointer-events-none"></div>
                  </div>
                </div>
              </div>
              
              {/* Floating badges */}
              <div className="absolute -right-6 top-24 bg-white rounded-xl shadow-xl p-3 border border-border animate-[pulse_4s_ease-in-out_infinite] flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center"><CheckCircle2 className="w-4 h-4 text-green-600"/></div>
                <div>
                  <div className="text-xs font-bold text-[#031E43]">Presupuesto enviado</div>
                  <div className="text-[10px] text-[#3B506D]">Hace 2 seg</div>
                </div>
              </div>
              
              <div className="absolute -left-8 bottom-16 bg-[#1aa260] rounded-xl shadow-xl p-3 border border-[#158048] flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white"><Zap className="w-4 h-4"/></div>
                <div>
                  <div className="text-xs font-bold text-white">Nuevo Lead CRM</div>
                  <div className="text-[10px] text-green-100">WhatsApp</div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* 4. Problema Section */}
      <section id="problema" className="py-24 bg-background px-4 md:px-8 relative" data-testid="section-problema">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16 reveal">
            <span className="text-red-500 font-extrabold uppercase tracking-widest text-sm mb-4 block">El Problema</span>
            <h2 className="text-4xl font-extrabold text-foreground font-sora">Tu equipo hace trabajo de robots.</h2>
            <p className="mt-4 text-lg text-muted-foreground font-medium">Horas perdidas copiando y pegando datos. Clientes esperando respuestas. Ventas que se enfrían por falta de seguimiento rápido.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { num: '01', icon: '📝', title: 'Consultas repetitivas', desc: 'Tu equipo responde "precio y stock" 50 veces por día por WhatsApp. Tiempo valioso tirado a la basura.' },
              { num: '02', icon: '⏳', title: 'Leads fríos', desc: 'Un cliente escribe un domingo a las 14hs. Le respondés el lunes a las 9hs. Ya le compró a la competencia.' },
              { num: '03', icon: '🗂️', title: 'Caos administrativo', desc: 'Pasando presupuestos de Excel a WhatsApp, y facturas de un sistema a otro, cruzando los dedos para no errarle.' }
            ].map((p, i) => (
              <ProblemaCard key={i} item={p} delay={i * 0.15} testId={`card-problema-${i}`} onSoluciones={() => scrollTo('soluciones')} />
            ))}
          </div>
        </div>
      </section>

      {/* 5. Soluciones Section */}
      <section id="soluciones" className="py-24 bg-card px-4 md:px-8 border-y border-border" data-testid="section-soluciones">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16 reveal">
            <span className="text-[#031E43] font-extrabold uppercase tracking-widest text-sm mb-4 block">La Solución</span>
            <h2 className="text-4xl font-extrabold text-foreground font-sora">Contratá a tu empleado más eficiente.</h2>
            <p className="mt-4 text-lg text-muted-foreground font-medium">Clientum es un ecosistema completo para automatizar la operación de tu PyME.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center reveal">
            <div className="space-y-8">
              {[
                { title: 'Chatbots IA para WhatsApp', desc: 'Agentes que entienden el contexto, leen tu catálogo, responden como humanos y califican leads 24/7.', icon: <Bot /> },
                { title: 'CRM Simple y Potente', desc: 'Todos tus contactos y conversaciones en un solo lugar. Embudos visuales, etiquetas y recordatorios automáticos.', icon: <Users /> },
                { title: 'Reportes y Analítica', desc: 'Dashboards en tiempo real con tiempos de respuesta, leads generados, y rendimiento de agentes.', icon: <BarChart3 /> },
                { title: 'Integración AFIP & ERP', desc: 'Conectamos con tu facturador para emitir recibos automáticos al concretar una venta vía chat.', icon: <Zap /> },
              ].map((s, i) => (
                <div key={i} className="flex gap-4 group">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#031E43] flex items-center justify-center shrink-0 group-hover:bg-[#031E43] group-hover:text-white transition-colors duration-300">
                    {s.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-foreground">{s.title}</h3>
                    <p className="text-muted-foreground font-medium">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-[#070f24] rounded-[2rem] p-8 shadow-2xl relative overflow-hidden h-[500px]">
               <div className="absolute top-0 right-0 w-64 h-64 bg-[#031E43]/20 blur-[80px]"></div>
               <div className="relative z-10 h-full flex flex-col">
                 <div className="text-white font-bold text-lg mb-6">Pipeline de Ventas (CRM)</div>
                 <div className="flex-1 flex gap-4">
                   {/* Column 1 */}
                   <div className="w-1/3 bg-white/5 rounded-xl p-3 flex flex-col gap-3">
                     <div className="text-xs font-bold text-white/50 mb-1">Nuevos (WhatsApp)</div>
                     <div className="bg-white/10 rounded-lg p-3 border border-white/10 shadow-sm cursor-pointer hover:bg-white/20 transition-colors">
                       <div className="text-xs text-white font-bold mb-1">Juan Pérez</div>
                       <div className="text-[10px] text-green-300">Consultó por repuestos</div>
                     </div>
                     <div className="bg-white/10 rounded-lg p-3 border border-white/10 shadow-sm cursor-pointer hover:bg-white/20 transition-colors">
                       <div className="text-xs text-white font-bold mb-1">Marta Gómez</div>
                       <div className="text-[10px] text-green-300">Pidiendo presupuesto</div>
                     </div>
                   </div>
                   {/* Column 2 */}
                   <div className="w-1/3 bg-white/5 rounded-xl p-3 flex flex-col gap-3">
                     <div className="text-xs font-bold text-white/50 mb-1">Cotizado</div>
                     <div className="bg-white/10 rounded-lg p-3 border border-[#031E43]/40 shadow-sm cursor-pointer">
                       <div className="text-xs text-white font-bold mb-1">Constructora SRL</div>
                       <div className="text-[10px] text-white/60 mb-2">Presupuesto enviado</div>
                       <div className="text-xs font-bold text-[#031E43]">$145.000</div>
                     </div>
                   </div>
                   {/* Column 3 */}
                   <div className="w-1/3 bg-white/5 rounded-xl p-3 flex flex-col gap-3">
                     <div className="text-xs font-bold text-white/50 mb-1">Ganados</div>
                     <div className="bg-[#1aa260]/20 rounded-lg p-3 border border-[#1aa260]/40 shadow-sm cursor-pointer">
                       <div className="text-xs text-white font-bold mb-1">Transportes Sur</div>
                       <div className="text-[10px] text-white/60 mb-2">Facturado AFIP</div>
                       <div className="text-xs font-bold text-[#1aa260]">$320.000</div>
                     </div>
                   </div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Tour Section */}
      <section id="demo-tour" className="py-24 bg-[#040d1c] px-4 md:px-8 border-y border-white/5 relative overflow-hidden" data-testid="section-demo-tour">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-[#031E43]/30 blur-[120px] rounded-full" />
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#3B506D]/10 blur-[100px] rounded-full" />
        </div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6">
              <span className="w-2 h-2 rounded-full bg-[#1aa260] animate-pulse" />
              <span className="text-sm font-semibold text-white/70">Tour interactivo del panel</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white font-sora mb-6">
              Todo lo que necesitás,<br className="hidden md:block" /> en un solo lugar.
            </h2>
            <p className="text-xl text-white/50 font-medium leading-relaxed">
              Navegá las secciones del panel de Clientum. Cada pantalla es la herramienta real que usarán tus empleados y tu agente IA.
            </p>
          </div>
          <DashboardDemoTour />
          <div className="text-center mt-12">
            <Button asChild size="lg" className="h-14 px-10 text-base font-bold rounded-full bg-[#031E43] hover:bg-[#3B506D] text-white shadow-[0_0_30px_rgba(3,30,67,0.5)] transition-all hover:-translate-y-1 border border-white/10">
              <Link href="/app">Ingresar al panel →</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Studio Section (NEW) */}
      <section id="studio" className="py-24 bg-[#070f24] px-4 md:px-8 border-y border-white/10 relative overflow-hidden" data-testid="section-studio">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none"></div>
         <div className="max-w-7xl mx-auto relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6 backdrop-blur-sm">
              <span className="text-sm font-semibold text-purple-200">Nuevo: Clientum Studio</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white font-sora mb-6">Creá videos promocionales con IA.</h2>
            <p className="text-xl text-purple-100/70 max-w-2xl mx-auto mb-10 font-medium leading-relaxed">
              Escribí, editá y generá guiones, escenas y copys promocionales para tus redes sociales en un clic. Dale voz y rostro a tu marca sin equipos de grabación.
            </p>
            
            <DemoVideo />

            <Button asChild size="lg" className="h-14 px-8 text-base font-bold rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-[0_0_20px_rgba(147,51,234,0.3)] transition-all hover:-translate-y-1">
               <Link href="/studio">Explorar Clientum Studio</Link>
            </Button>
         </div>
      </section>

      {/* 6. Calculadora ROI */}
      <section id="roi" className="py-24 bg-background px-4 md:px-8" data-testid="section-roi">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="reveal">
              <span className="text-[#1aa260] font-extrabold uppercase tracking-widest text-sm mb-4 block">Calculadora de ROI</span>
              <h2 className="text-4xl font-extrabold text-foreground mb-6 font-sora">¿Cuánto te cuesta hacer el trabajo a mano?</h2>
              <p className="text-lg text-muted-foreground font-medium mb-10">Calculá el impacto económico de no tener procesos automatizados en tu PyME.</p>
              
              <div className="space-y-10 bg-card p-8 rounded-3xl border border-border shadow-sm">
                <RoiSlider id="roiEmp" label="Empleados en administración/ventas" value={roiEmp} min={1} max={20} step={1} display={roiEmp.toString()} ariaLabel="Cantidad de empleados" onChange={setRoiEmp} testId="slider-roi-emp" textTestId="text-roi-emp" minLabel="1" maxLabel="20" />
                <RoiSlider id="roiHrs" label="Horas perdidas por día (tareas repetitivas)" value={roiHrs} min={1} max={8} step={0.5} display={`${roiHrs} hs`} ariaLabel="Horas perdidas" onChange={setRoiHrs} testId="slider-roi-hrs" textTestId="text-roi-hrs" minLabel="1h" maxLabel="8h" />
                <RoiSlider id="roiCosto" label="Costo por hora promedio (ARS)" value={roiCosto} min={5000} max={50000} step={1000} display={`$${roiCosto.toLocaleString()}`} ariaLabel="Costo por hora" onChange={setRoiCosto} testId="slider-roi-costo" textTestId="text-roi-costo" minLabel="$5.000" maxLabel="$50.000" />
                <div className="border-t border-border pt-8">
                  <RoiSlider id="roiLeads" label="Consultas sin respuesta por mes" value={roiLeads} min={0} max={200} step={5} display={roiLeads.toString()} ariaLabel="Leads perdidos" onChange={setRoiLeads} testId="slider-roi-leads" textTestId="text-roi-leads" minLabel="0" maxLabel="200" />
                  <div className="mt-8">
                    <RoiSlider id="roiTicket" label="Ticket promedio de venta (ARS)" value={roiTicket} min={10000} max={500000} step={5000} display={`$${roiTicket.toLocaleString()}`} ariaLabel="Ticket promedio" onChange={setRoiTicket} testId="slider-roi-ticket" textTestId="text-roi-ticket" minLabel="$10.000" maxLabel="$500.000" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#070f24] p-8 md:p-12 rounded-[2rem] shadow-2xl reveal reveal-delay-2 text-white border border-[#031E43]/20 relative overflow-hidden" data-testid="card-roi-results">
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 blur-[80px]"></div>
              
              <h3 className="text-xl font-bold mb-8 text-white/80 border-b border-white/10 pb-4">Tu costo invisible mensual</h3>
              
              <div className="space-y-6 mb-10 relative z-10">
                <div className="flex justify-between items-center pb-4 border-b border-white/10">
                  <div className="text-blue-200">Costo operativo por horas perdidas</div>
                  <div className="font-mono text-xl" data-testid="text-roi-operativo">{formatCurrency(perdidaOperativa)}</div>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-white/10">
                  <div className="text-blue-200">Ventas perdidas (asumiendo 30% cierre)</div>
                  <div className="font-mono text-xl" data-testid="text-roi-ventas">{formatCurrency(ventasPerdidas)}</div>
                </div>
                <div className="pt-4">
                  <div className="text-white/60 text-sm font-bold uppercase tracking-wider mb-2">Impacto Total Negativo</div>
                  <div className="text-5xl md:text-6xl font-extrabold text-red-400 font-mono tracking-tight" data-testid="text-roi-total">{formatCurrency(totalImpacto)}</div>
                  <div className="text-sm text-red-400/60 mt-2">Dinero que estás perdiendo por mes</div>
                </div>
              </div>

              <div className="bg-white/5 rounded-2xl p-6 border border-white/10 relative z-10">
                <p className="text-lg font-bold mb-4">Clientum Pro cuesta solo {formatCurrency(isAnnual ? 239000 : 299000)} al mes.</p>
                <p className="text-white/70 mb-6">Tu ROI pagando el sistema sería inmediato.</p>
                <Button onClick={() => window.open(WA_URL, '_blank')} className="w-full h-14 bg-white hover:bg-[#DDDFE2]/40 text-[#070f24] font-bold text-lg rounded-xl transition-transform hover:scale-[1.02]">
                  Recuperar ese dinero →
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Now — Market Trends */}
      <section className="py-24 bg-[#070f24] px-4 md:px-8 border-y border-white/5" data-testid="section-whynow">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16 reveal">
            <span className="text-[#031E43] font-extrabold uppercase tracking-widest text-sm mb-4 block">¿Por qué ahora?</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white font-sora">El mercado ya se está moviendo. ¿Te quedás atrás?</h2>
            <p className="text-[#3B506D]/70 font-medium mt-4">Datos reales de penetración y rendimiento de IA en el segmento PyME LATAM 2025/2026.</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-7 bg-white/5 border border-white/10 p-6 md:p-8 rounded-2xl space-y-6 flex flex-col justify-between reveal">
              <div>
                <h4 className="text-white font-bold text-base mb-1">Tasa de adopción de IA corporativa</h4>
                <p className="text-xs text-[#3B506D]/70 font-mono">Fuente: Microsoft Encuesta PyMEs 2025 · Statista · Meta Corp</p>
              </div>
              <div className="space-y-5">
                {[
                  { label: 'PyMEs que ya usan IA en su flujo', pct: 54 },
                  { label: 'Proyección de inversión IA 2026', pct: 80 },
                  { label: 'Uso diario de herramientas IA', pct: 49 },
                  { label: 'Consultas resueltas autónomamente', pct: 70 },
                ].map(({ label, pct }) => (
                  <div key={label} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono font-semibold text-[#DDDFE2]">
                      <span>{label}</span><span>{pct}%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-[#031E43] rounded-full reveal" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-5 grid grid-cols-2 gap-4 reveal reveal-delay-1">
              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col justify-between">
                <span className="text-3xl font-mono font-bold text-white">64%</span>
                <span className="text-xs text-[#3B506D]/70 leading-relaxed mt-2">Adopción IA activa en PyMEs de México</span>
              </div>
              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col justify-between">
                <span className="text-3xl font-mono font-bold text-white">66%</span>
                <span className="text-xs text-[#3B506D]/70 leading-relaxed mt-2">Adopción IA activa en PyMEs de Colombia</span>
              </div>
              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl col-span-2 flex items-start gap-4">
                <span className="text-2xl mt-0.5">⚡</span>
                <div>
                  <h5 className="text-sm font-semibold text-white">Agentes Autónomos 2026</h5>
                  <p className="text-xs text-[#3B506D]/70 mt-1 leading-relaxed">Sistemas inteligentes capaces de ejecutar tareas comerciales complejas de inicio a fin sin supervisión humana directa.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Para quién es — Sector Badges */}
      <section className="py-16 bg-background border-b border-border px-4 md:px-8" data-testid="section-sectores">
        <div className="max-w-7xl mx-auto text-center space-y-8 reveal">
          <h2 className="text-xl md:text-2xl font-extrabold text-foreground font-sora">Solución universal adaptada para PyMEs argentinas</h2>
          <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
            {[
              '📦 Distribuidoras','🏠 Inmobiliarias','📋 Estudios Contables','🔧 Talleres',
              '🛒 Comercios','🚚 Transporte','🏗️ Constructoras','🏥 Salud y Clínicas',
              '🍽️ Gastronomía','📣 Agencias',
            ].map(s => (
              <span key={s} className="px-4 py-2 bg-card border border-border rounded-full text-sm font-semibold text-muted-foreground hover:border-[#031E43] hover:text-foreground transition-colors cursor-default">{s}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Sector Tabs — Casos por sector */}
      <section id="casos-sector" className="py-24 bg-card px-4 md:px-8 border-b border-border" data-testid="section-sector-tabs">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12 reveal">
            <span className="text-[#031E43] font-extrabold uppercase tracking-widest text-sm mb-4 block">Casos por Sector</span>
            <h2 className="text-3xl font-extrabold text-foreground font-sora">¿Cuál es tu rubro? Mirá cómo lo resolvemos</h2>
          </div>
          <div className="flex flex-wrap gap-2 justify-center mb-10">
            {[
              { id: 'Distribuidoras', label: '📦 Distribuidoras' },
              { id: 'Inmobiliarias', label: '🏠 Inmobiliarias' },
              { id: 'Contables', label: '📋 Est. Contables' },
              { id: 'Talleres', label: '🔧 Talleres' },
              { id: 'Comercios', label: '🛒 Comercios' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSectorTab(tab.id)}
                className={`px-4 py-2 text-xs font-semibold rounded-full border transition-all ${activeSectorTab === tab.id ? 'bg-[#031E43] text-white border-[#031E43]' : 'bg-background text-muted-foreground border-border hover:text-foreground'}`}
              >{tab.label}</button>
            ))}
          </div>
          <div className="max-w-4xl mx-auto">
            {[
              {
                id: 'Distribuidoras',
                problema: 'Presupuestos lentos en Excel, consultas de stock que se acumulan y falta de seguimiento a clientes mayoristas.',
                solucion: 'Bot que consulta stock en tiempo real, genera presupuestos y cotiza automáticamente en 2 minutos.',
                metrics: ['−35% tiempo adm.', '+22% cierre ventas', '−40% errores stock'],
                quote: '"Pasamos de armar presupuestos a mano todo el día a generarlos al instante en un chat."',
                name: 'Sergio R.', company: 'Distribuidora Vega · Córdoba', initials: 'SR',
              },
              {
                id: 'Inmobiliarias',
                problema: 'Consultas sobre alquileres a toda hora por WhatsApp, derivación desordenada de propiedades.',
                solucion: 'Filtro automático de presupuesto y requisitos, agendamiento de visitas autónomo y derivación coordinada.',
                metrics: ['+30% visitas agendadas', '−50% consultas frías'],
                quote: '"El bot filtra las consultas curiosas de los interesados reales. Ahorramos horas de llamadas."',
                name: 'Luciana G.', company: 'Inmobiliaria Faro · Mendoza', initials: 'LG',
              },
              {
                id: 'Contables',
                problema: 'Clientes reclamando facturas, envío caótico de documentación contable por distintos chats personales.',
                solucion: 'Canal seguro de recolección de documentación, envío automático de recordatorios de AFIP y alertas mensuales.',
                metrics: ['−45% consultas repetidas', '+18% entregas a tiempo'],
                quote: '"La recolección de impuestos a fin de mes ya no es un dolor de cabeza diario."',
                name: 'Laura M.', company: 'Estudio Contable · General Roca', initials: 'LM',
              },
              {
                id: 'Talleres',
                problema: 'Coordinación telefónica de turnos colapsada, ausencias sin aviso que vacían los horarios de trabajo.',
                solucion: 'Asignación automática de turnos, confirmación 24 hs antes por WhatsApp y reprogramación instantánea.',
                metrics: ['+28% turnos confirmados', '−30% ausencias'],
                quote: '"Eliminamos por completo las ausencias sin previo aviso. Los horarios rinden más."',
                name: 'Carlos R.', company: 'Taller Mecánico · Neuquén', initials: 'CR',
              },
              {
                id: 'Comercios',
                problema: 'Clientes esperando horas por una lista de precios o para consultar disponibilidad de un producto.',
                solucion: 'Catálogo interactivo asistido por IA en el chat. Los clientes navegan, seleccionan y abonan directamente.',
                metrics: ['+55% ticket promedio', '−60% tiempo respuesta'],
                quote: '"Mis clientes compran y coordinan envíos sin necesidad de que esté conectado."',
                name: 'Diego M.', company: 'Comercio · Bahía Blanca', initials: 'DM',
              },
            ].map(s => s.id === activeSectorTab && (
              <div key={s.id} className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-background border border-border p-6 md:p-8 rounded-2xl reveal">
                <div className="md:col-span-7 space-y-6">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-red-500 block mb-1">El problema</span>
                    <p className="text-base font-medium text-foreground">{s.problema}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#1aa260] block mb-1">La solución Clientum</span>
                    <p className="text-base text-muted-foreground font-medium">{s.solucion}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {s.metrics.map(m => (
                      <span key={m} className="bg-card border border-border px-3 py-1 rounded-md text-xs font-mono text-muted-foreground">{m}</span>
                    ))}
                  </div>
                </div>
                <div className="md:col-span-5 bg-card border border-border p-6 rounded-xl space-y-4">
                  <p className="text-sm text-muted-foreground italic leading-relaxed">{s.quote}</p>
                  <div className="flex items-center gap-3 pt-2 border-t border-border">
                    <div className="w-9 h-9 rounded-full bg-[#031E43]/10 flex items-center justify-center font-mono font-bold text-[#031E43] text-xs">{s.initials}</div>
                    <div>
                      <b className="text-sm font-bold text-foreground block">{s.name}</b>
                      <span className="text-[10px] text-muted-foreground">{s.company}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 13. Precios Section */}
      <section id="precios" className="py-24 bg-[#070f24] px-4 md:px-8 relative overflow-hidden" data-testid="section-precios">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-xl mx-auto mb-12 reveal">
            <span className="inline-flex items-center gap-2 px-3 py-1 text-[11px] font-bold tracking-widest uppercase text-white/70 bg-white/10 border border-white/15 rounded-full mb-4">Planes</span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white font-sora leading-tight mt-2 mb-4">
              Escalá a tu ritmo.
            </h2>
            <p className="text-blue-100/60 text-lg">Sin contratos a largo plazo. Resultados desde el día 1.</p>
          </div>

          <div className="flex items-center justify-center gap-4 mb-16">
            <span className={`text-sm font-bold transition-colors ${!isAnnual ? 'text-white' : 'text-white/40'}`}>Mensual</span>
            <button className={`w-12 h-6 rounded-full bg-white/20 relative transition-colors ${isAnnual ? 'bg-[#031E43]' : ''}`} onClick={() => setIsAnnual(!isAnnual)}>
              <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${isAnnual ? 'translate-x-6' : ''}`}></div>
            </button>
            <span className={`text-sm font-bold flex items-center gap-2 transition-colors ${isAnnual ? 'text-white' : 'text-white/40'}`}>
              Anual <span className="text-[10px] bg-[#1aa260]/20 text-[#1aa260] border border-[#1aa260]/30 px-2 py-0.5 rounded-full">-20%</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-stretch reveal">
            {/* Free */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col h-full">
              <span className="inline-block bg-[#1aa260]/20 text-[#1aa260] border border-[#1aa260]/30 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-3">Gratis para siempre</span>
              <h3 className="text-lg font-bold text-white mb-2">Free</h3>
              <p className="text-xs text-white/50 mb-4 min-h-[32px]">Para explorar la IA sin riesgos.</p>
              <div className="text-3xl font-extrabold text-white mb-1 font-mono">$0</div>
              <div className="text-[10px] text-white/40 mb-6 uppercase font-mono">ARS / mes</div>
              <ul className="space-y-2 mb-6 flex-1 text-xs font-medium text-white/70">
                <li className="flex gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[#1aa260] shrink-0 mt-0.5" /> CRM hasta 50 contactos</li>
                <li className="flex gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[#1aa260] shrink-0 mt-0.5" /> 1 chatbot (100 msgs/mes)</li>
                <li className="flex gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[#1aa260] shrink-0 mt-0.5" /> 1 integración básica</li>
              </ul>
              <Button onClick={() => window.open(WA_URL, '_blank')} variant="outline" className="w-full border-white/20 text-white hover:bg-white/10 text-xs">Empezar gratis</Button>
            </div>

            {/* Starter */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/10 transition-colors flex flex-col h-full">
              <h3 className="text-lg font-bold text-white mb-2">Starter</h3>
              <p className="text-xs text-white/50 mb-4 min-h-[32px]">Primera automatización real para tu PyME.</p>
              <div className="text-3xl font-extrabold text-white mb-1 font-mono">${isAnnual ? '119k' : '149k'}</div>
              <div className="text-[10px] text-white/40 mb-6 uppercase font-mono">ARS / mes</div>
              <ul className="space-y-2 mb-6 flex-1 text-xs font-medium text-white/70">
                <li className="flex gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[#031E43] shrink-0 mt-0.5" /> CRM 500 contactos</li>
                <li className="flex gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[#031E43] shrink-0 mt-0.5" /> Chatbot WhatsApp básico</li>
                <li className="flex gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[#031E43] shrink-0 mt-0.5" /> 1 integración completa</li>
                <li className="flex gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[#031E43] shrink-0 mt-0.5" /> Soporte email/WA</li>
              </ul>
              <Button onClick={() => window.open(WA_URL, '_blank')} variant="outline" className="w-full border-white/20 text-white hover:bg-white/10 text-xs">Elegir Starter</Button>
            </div>

            {/* Pro */}
            <div className="bg-[#031E43] border-2 border-[#031E43] rounded-3xl p-6 shadow-[0_20px_60px_-15px_rgba(59,111,237,0.5)] flex flex-col h-full relative z-10">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#1aa260] text-white text-[10px] font-bold tracking-widest uppercase px-4 py-1 rounded-full shadow-lg whitespace-nowrap">⚡ Más Popular</div>
              <h3 className="text-lg font-bold text-white mb-2">Pro</h3>
              <p className="text-xs text-blue-100/80 mb-4 min-h-[32px]">Automatización total de tu operación.</p>
              <div className="text-3xl font-extrabold text-white mb-1 font-mono">${isAnnual ? '239k' : '299k'}</div>
              <div className="text-[10px] text-blue-100/60 mb-6 uppercase font-mono">ARS / mes</div>
              <ul className="space-y-2 mb-6 flex-1 text-xs font-medium text-white">
                <li className="flex gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-blue-200 shrink-0 mt-0.5" /> CRM ilimitado</li>
                <li className="flex gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-blue-200 shrink-0 mt-0.5" /> Chatbot IA con entrenamiento</li>
                <li className="flex gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-blue-200 shrink-0 mt-0.5" /> 3 integraciones</li>
                <li className="flex gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-blue-200 shrink-0 mt-0.5" /> ERP básico (stock + pedidos)</li>
              </ul>
              <Button onClick={() => window.open(WA_URL, '_blank')} className="w-full bg-white text-[#031E43] hover:bg-blue-50 font-bold text-xs">Elegir Plan Pro</Button>
            </div>

            {/* Business */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/10 transition-colors flex flex-col h-full">
              <h3 className="text-lg font-bold text-white mb-2">Business</h3>
              <p className="text-xs text-white/50 mb-4 min-h-[32px]">Multi-agente IA y operaciones complejas.</p>
              <div className="text-3xl font-extrabold text-white mb-1 font-mono">${isAnnual ? '439k' : '549k'}</div>
              <div className="text-[10px] text-white/40 mb-6 uppercase font-mono">ARS / mes</div>
              <ul className="space-y-2 mb-6 flex-1 text-xs font-medium text-white/70">
                <li className="flex gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[#031E43] shrink-0 mt-0.5" /> Todo lo de Pro</li>
                <li className="flex gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[#031E43] shrink-0 mt-0.5" /> Multi-agente avanzado</li>
                <li className="flex gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[#031E43] shrink-0 mt-0.5" /> ERP + Facturación AFIP</li>
                <li className="flex gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[#031E43] shrink-0 mt-0.5" /> Acceso API completa</li>
              </ul>
              <Button onClick={() => window.open(WA_URL, '_blank')} variant="outline" className="w-full border-white/20 text-white hover:bg-white/10 text-xs">Elegir Business</Button>
            </div>

            {/* Enterprise */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/10 transition-colors flex flex-col h-full">
              <h3 className="text-lg font-bold text-white mb-2">Enterprise</h3>
              <p className="text-xs text-white/50 mb-4 min-h-[32px]">Automatización total a medida de tu escala.</p>
              <div className="text-2xl font-extrabold text-white mb-1 font-mono">A medida</div>
              <div className="text-[10px] text-white/40 mb-6 uppercase font-mono">Cotización rápida</div>
              <ul className="space-y-2 mb-6 flex-1 text-xs font-medium text-white/70">
                <li className="flex gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[#031E43] shrink-0 mt-0.5" /> Todo lo de Business</li>
                <li className="flex gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[#031E43] shrink-0 mt-0.5" /> Agentes autónomos</li>
                <li className="flex gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[#031E43] shrink-0 mt-0.5" /> Soporte de cuenta dedicado</li>
                <li className="flex gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[#031E43] shrink-0 mt-0.5" /> Integración heredada</li>
              </ul>
              <Button onClick={() => window.open(WA_URL, '_blank')} variant="outline" className="w-full border-white/20 text-white hover:bg-white/10 text-xs">Hablar con Ventas</Button>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="mt-16 overflow-x-auto rounded-xl border border-white/10 reveal">
            <table className="w-full text-left border-collapse min-w-[720px] text-xs">
              <thead>
                <tr className="bg-white/5 text-white/50 border-b border-white/10">
                  <th className="p-4 font-semibold uppercase tracking-wider">Funcionalidad</th>
                  {['Free','Starter','Pro','Business','Enterprise'].map((p, i) => (
                    <th key={p} className={`p-4 text-center font-semibold ${i === 2 ? 'bg-[#031E43]/10 text-white' : ''}`}>{p}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/70">
                {[
                  ['Contactos CRM','50','500','Ilimitado','Ilimitado','Ilimitado'],
                  ['Chatbot IA','1 básico','1 básico','1 Avanzado','3 Avanzados','Ilimitados'],
                  ['Mensajes/mes','100','500','2.000','10.000','Ilimitados'],
                  ['ERP (stock + pedidos)','—','—','Básico','Completo','A medida'],
                  ['Facturación AFIP','—','—','—','✓','✓'],
                  ['Soporte','Email','Email + WA','Soporte 24/7','Ejecutivo Dedicado','Gerente de Cuenta'],
                ].map(([feat, ...vals]) => (
                  <tr key={String(feat)}>
                    <td className="p-4 font-semibold text-white">{feat}</td>
                    {vals.map((v, i) => (
                      <td key={i} className={`p-4 text-center ${i === 2 ? 'bg-[#031E43]/5 font-bold text-white' : ''} ${v === '✓' ? 'text-[#1aa260]' : ''}`}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Countdown */}
          <PricingCountdown />
        </div>
      </section>

      {/* Integrations / Partners */}
      <section id="partners" className="py-24 bg-background px-4 md:px-8 border-b border-border text-center">
        <div className="max-w-5xl mx-auto reveal">
          <span className="text-muted-foreground font-extrabold uppercase tracking-widest text-sm mb-4 block">Ecosistema Abierto</span>
          <h2 className="text-3xl font-extrabold mb-4 font-sora">Sincronizá con tus herramientas de todos los días</h2>
          <p className="text-muted-foreground font-medium mb-10">¿Usás otro sistema administrativo? Lo evaluamos y desarrollamos a medida en tu diagnóstico gratis.</p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { label: 'WhatsApp API', color: '#1aa260' },
              { label: 'Gmail', color: '#ef4444' },
              { label: 'Google Sheets', color: '#22c55e' },
              { label: 'Mercado Libre', color: '#eab308' },
              { label: 'WooCommerce', color: '#6366f1' },
              { label: 'Shopify', color: '#f97316' },
              { label: 'AFIP', color: '#031E43' },
              { label: 'Dolibarr ERP', color: '#14b8a6' },
              { label: 'MercadoPago', color: '#031E43' },
              { label: 'Tango Gestión', color: '#8b5cf6' },
            ].map(({ label, color }) => (
              <div key={label} className="px-4 py-2.5 bg-card border border-border rounded-xl font-semibold text-muted-foreground hover:border-[#031E43] hover:text-foreground transition-colors cursor-default flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Programa de Alianzas */}
      <section className="py-24 bg-card px-4 md:px-8 border-b border-border" data-testid="section-alianzas">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16 reveal">
            <span className="text-[#031E43] font-extrabold uppercase tracking-widest text-sm mb-4 block">Programa de Alianzas</span>
            <h2 className="text-3xl font-extrabold text-foreground font-sora">Hacé crecer tu negocio con Clientum</h2>
            <p className="text-muted-foreground font-medium mt-4">Revendé, recomendá o integrá nuestras soluciones y generá ingresos recurrentes en pesos.</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { nivel: 'Nivel 01', icon: '🔗', title: 'Referidor', desc: 'Recomendá Clientum a tu cartera de clientes o red de contactos y cobrá comisiones limpias.', stat: '15%', statLabel: 'comisión recurrente mensual' },
              { nivel: 'Nivel 02', icon: '⭐', title: 'Reseller', desc: 'Comprás licencias a precio diferencial mayorista y las revendés con tu propio margen.', stat: '30%', statLabel: 'descuento sobre lista oficial' },
              { nivel: 'Nivel 03', icon: '🏆', title: 'White Label', desc: 'Marca blanca completa. La infraestructura corre bajo tu propio dominio y logo corporativo.', stat: 'WL', statLabel: 'Personalización de dominio' },
            ].map((a, i) => (
              <div key={i} className="bg-background border border-border p-6 rounded-2xl flex flex-col justify-between reveal" style={{ transitionDelay: `${i * 0.1}s` }}>
                <div className="space-y-4">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">{a.nivel}</span>
                  <h3 className="font-extrabold text-lg text-foreground">{a.icon} {a.title}</h3>
                  <p className="text-sm text-muted-foreground font-medium leading-relaxed">{a.desc}</p>
                  <div className="bg-card border border-border p-4 rounded-xl text-center">
                    <span className="block text-3xl font-mono font-bold text-foreground">{a.stat}</span>
                    <span className="text-[10px] text-muted-foreground block uppercase mt-1">{a.statLabel}</span>
                  </div>
                </div>
                <Button onClick={() => window.open(WA_URL, '_blank')} variant="outline" className="mt-6 w-full text-xs">Ser {a.title}</Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Implementación Express */}
      <section className="py-24 bg-background px-4 md:px-8 border-b border-border" data-testid="section-implementacion">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16 reveal">
            <span className="text-[#031E43] font-extrabold uppercase tracking-widest text-sm mb-4 block">Implementación Express</span>
            <h2 className="text-3xl font-extrabold text-foreground font-sora">Clientum activo en menos de 24 horas</h2>
            <p className="text-muted-foreground font-medium mt-4">Sin configuraciones infinitas. Setup 100% asistido por nuestro equipo.</p>
          </div>
          <div className="max-w-xl mx-auto space-y-4 reveal">
            {[
              { n: '1', title: '🗓️ Diagnóstico de 45 minutos gratis', desc: 'Hoy mismo: analizamos tus procesos y cuellos de botella reales de tu PyME.' },
              { n: '2', title: '⚙️ Configuración y Setup de Bots', desc: 'Días 1 a 3: nosotros nos encargamos del código, conexiones de API y base de conocimiento.' },
              { n: '3', title: '🎓 Capacitación de 1 hora al equipo', desc: 'Días 3 a 5: entrenamiento sencillo y directo a tus asesores de atención comercial.' },
              { n: '✓', title: '🚀 ¡Operativo y generando valor!', desc: 'Primeros resultados, chats respondidos automáticamente y total tranquilidad de stock.', success: true },
            ].map((step, i) => (
              <div key={i} className={`border p-5 rounded-xl flex items-start gap-4 ${step.success ? 'bg-[#1aa260]/5 border-[#1aa260]/30' : 'bg-card border-border'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-xs flex-shrink-0 mt-0.5 ${step.success ? 'bg-[#1aa260] text-white' : 'bg-background border border-border text-foreground'}`}>{step.n}</div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">{step.title} {step.success && <span className="text-[9px] bg-[#1aa260]/20 text-[#1aa260] px-2 py-0.5 rounded font-mono uppercase tracking-wider font-extrabold ml-2">Semana 1</span>}</h4>
                  <span className="text-xs text-muted-foreground block mt-1">{step.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Case Studies Grid */}
      <section className="py-24 bg-card px-4 md:px-8 border-b border-border" data-testid="section-case-studies">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16 reveal">
            <span className="text-[#031E43] font-extrabold uppercase tracking-widest text-sm mb-4 block">Prueba de Campo</span>
            <h2 className="text-3xl font-extrabold text-foreground font-sora">Resultados medibles de nuestros clientes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { emoji: '🍽️', name: 'La Paella de Carlitos', metrics: [['83%','auto-resp'],['2.3hs','ahorro/día'],['+34%','reservas']], quote: '"El bot atiende llamadas de reserva y WhatsApp los domingos a las 3 AM. Aumentamos las mesas sin tocar el teléfono."', credit: 'Carlos M. · Gastronomía' },
              { emoji: '👓', name: 'Óptica Visión Total', metrics: [['-42%','ausencias'],['+40%','turnos'],['-67%','tiempo']], quote: '"Los recordatorios automáticos de turnos redujeron el ausentismo a la mitad de lo habitual. Optimizamos la agenda."', credit: 'Valeria T. · Administradora' },
              { emoji: '📦', name: 'Distribuidora El Gaucho', metrics: [['-90%','tiempo'],['120+','pedidos'],['22%','conversión']], quote: '"La cotización automática de bultos por peso y cantidad eliminó el cuello de botella. Ahora el equipo comercial cierra las operaciones."', credit: 'Ezequiel D. · Director Comercial' },
            ].map((c, i) => (
              <div key={i} className="bg-background border border-border p-6 rounded-2xl flex flex-col justify-between reveal" style={{ transitionDelay: `${i * 0.1}s` }}>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{c.emoji}</span>
                    <b className="text-sm text-foreground">{c.name}</b>
                  </div>
                  <div className="grid grid-cols-3 gap-2 bg-card p-3 rounded-lg border border-border text-center text-xs font-mono">
                    {c.metrics.map(([v, l]) => (
                      <div key={l}><b className="text-[#1aa260] block">{v}</b><span className="text-[8px] text-muted-foreground uppercase">{l}</span></div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed font-medium">{c.quote}</p>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground block pt-4 border-t border-border mt-4">— {c.credit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Nosotros / Visión */}
      <section id="nosotros" className="py-24 bg-background px-4 md:px-8 border-b border-border" data-testid="section-nosotros">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16 reveal">
            <span className="text-[#031E43] font-extrabold uppercase tracking-widest text-sm mb-4 block">Nuestra Visión</span>
            <h2 className="text-3xl font-extrabold text-foreground font-sora">La empresa detrás de Clientum</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-6 reveal">
            <div className="bg-card border border-border p-6 rounded-2xl space-y-3">
              <h4 className="text-[#031E43] text-xs font-mono uppercase tracking-widest font-bold">Misión</h4>
              <p className="text-sm text-muted-foreground font-medium leading-relaxed">Democratizar el acceso a la Inteligencia Artificial para que cualquier PyME argentina pueda vender, automatizar procesos contables y optimizar su stock sin requerir conocimientos técnicos ni contratar personal dedicado de IT.</p>
            </div>
            <div className="bg-card border border-border p-6 rounded-2xl space-y-3">
              <h4 className="text-[#031E43] text-xs font-mono uppercase tracking-widest font-bold">Visión</h4>
              <p className="text-sm text-muted-foreground font-medium leading-relaxed">Ser la plataforma de automatización por chat líder del mercado latinoamericano, proveyendo tecnología confiable de nivel corporativo adaptada plenamente a las realidades económicas locales de los emprendedores.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto reveal reveal-delay-1">
            {[
              { icon: '🛡️', title: 'Tecnología accesible', desc: 'Entregamos la solución lista para usar. Olvidate de servidores, configuraciones complejas o mantenimiento técnico.' },
              { icon: '🎯', title: 'Resultados primero', desc: 'El ROI debe ser visible durante el primer mes de uso o reajustamos el sistema de forma bonificada.' },
              { icon: '🤝', title: 'Cercanía y Confianza', desc: 'Hablamos en pesos argentinos, entendemos la coyuntura PyME nacional y te acompañamos paso a paso.' },
            ].map(v => (
              <div key={v.title} className="bg-card border border-border p-6 rounded-2xl space-y-2">
                <span className="text-xl">{v.icon}</span>
                <h4 className="text-sm font-bold text-foreground">{v.title}</h4>
                <p className="text-xs text-muted-foreground font-medium leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 12. Testimonios Section */}
      <section id="casos" className="py-24 bg-background px-4 md:px-8 relative overflow-hidden" data-testid="section-testimonios">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16 reveal">
            <span className="text-foreground font-extrabold uppercase tracking-widest text-sm mb-4 block">Casos Reales</span>
            <h2 className="text-4xl font-extrabold text-foreground font-sora">PyMEs que ya trabajan con IA</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { t: "Antes tardábamos 2 horas en hacer presupuestos. Con Clientum se generan en 30 segundos.", n: "Martín F.", c: "Distribuidora · Córdoba" },
              { t: "El chatbot resuelve el 80% de las preguntas de mis clientes automáticamente. Mis agentes ahora venden más.", n: "Luciana G.", c: "Inmobiliaria · Mendoza" },
              { t: "En 3 días ya tenía todo funcionando. El soporte es increíble y los resultados son reales.", n: "Carlos R.", c: "Taller Mecánico · Neuquén" },
              { t: "Los reportes que antes me llevaban días ahora se hacen solos. Tengo más tiempo para asesorar clientes.", n: "Laura M.", c: "Estudio Contable · Gral. Roca" },
              { t: "El ROI fue visible en la primera semana. Vendemos más porque respondemos más rápido.", n: "Diego M.", c: "Comercio · Bahía Blanca" },
              { t: "No necesité saber nada técnico. El equipo de Clientum hizo todo el setup.", n: "Andrea P.", c: "Agencia · Rosario" }
            ].map((test, i) => (
              <div key={i} className="bg-card border border-border rounded-3xl p-8 hover:-translate-y-2 transition-transform duration-300 reveal shadow-sm" style={{ transitionDelay: `${i * 0.1}s` }} data-testid={`card-testimonio-${i}`}>
                <div className="text-[#f59e0b] mb-4 text-lg tracking-widest">★★★★★</div>
                <p className="text-muted-foreground font-medium leading-relaxed mb-6 italic">"{test.t}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-[#070f24] text-white flex items-center justify-center font-bold">{test.n.charAt(0)}</div>
                  <div>
                    <p className="text-foreground font-bold text-sm">{test.n}</p>
                    <p className="text-muted-foreground text-xs font-medium">{test.c}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 20. FAQ Section */}
      <section id="faq" className="py-24 bg-card px-4 md:px-8 border-y border-border" data-testid="section-faq">
        <div className="max-w-3xl mx-auto reveal">
          <div className="text-center mb-16">
            <span className="text-[#031E43] font-extrabold uppercase tracking-widest text-sm mb-4 block">FAQ</span>
            <h2 className="text-4xl font-extrabold text-foreground font-sora">Preguntas frecuentes</h2>
          </div>

          <div className="space-y-4">
            {[
              { q: '¿Necesito tener conocimientos técnicos previos?', a: 'No. Nosotros realizamos todo el setup de configuración inicial, integraciones de sistemas y modelado del chatbot con IA. Tu equipo comercial solo usará la interfaz de chat habitual, asistida por una breve capacitación guiada de una hora.' },
              { q: '¿Cuánto tiempo lleva la puesta en marcha inicial?', a: 'La mayoría de las PyMEs están operativas en menos de 24 horas hábiles. Para proyectos con sincronización avanzada de ERP o CRM complejos, el tiempo total estimado oscila entre 3 y 5 días hábiles.' },
              { q: '¿Se integra nativamente con WooCommerce o Shopify?', a: 'Sí, contamos con integraciones pre-desarrolladas para Shopify, WooCommerce, Mercado Libre y Dolibarr ERP. Esto nos permite sincronizar consultas de stock, catálogos y flujos de reserva automáticamente.' },
              { q: '¿El chatbot funciona sobre nuestro número de WhatsApp existente?', a: 'Exacto. La conexión se realiza directamente a tu número activo de WhatsApp Business a través del protocolo oficial de Meta, asegurando que conservés tu base de contactos y tus historiales de chat previos.' },
              { q: '¿Los precios están expresados en pesos argentinos?', a: 'Sí, todos nuestros precios están pesificados en ARS. Esto te asegura estabilidad operativa y facturas claras sin depender de variaciones cambiarias abruptas ni recargos por compras en moneda extranjera.' },
              { q: '¿Puedo cancelar si no me convence?', a: 'No hay contratos a largo plazo. Pagás mes a mes y podés cancelar cuando quieras. Además, si el ROI no es visible durante el primer mes, reajustamos el sistema de forma bonificada.' },
            ].map((faq, i) => (
              <div key={i} className={`faq-item bg-background border border-border rounded-2xl overflow-hidden shadow-sm ${openFaq === i ? 'open' : ''}`} data-testid={`faq-item-${i}`}>
                <button 
                  className="w-full px-6 py-5 text-left flex items-center justify-between font-bold text-foreground hover:bg-muted/50 focus:outline-none min-h-[44px] transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  data-testid={`button-faq-toggle-${i}`}
                >
                  <span className="text-lg">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 faq-icon transition-transform ${openFaq === i ? 'text-[#031E43] rotate-180' : 'text-muted-foreground'}`} />
                </button>
                <div className="faq-answer">
                  <div className="px-6 pb-5 pt-0 text-muted-foreground font-medium text-base">
                    {faq.a}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 22. Contacto Final */}
      <section id="contacto" className="py-32 bg-[#070f24] text-center px-4 md:px-8 relative overflow-hidden" data-testid="section-contacto-final">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#031E43]/10 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="max-w-4xl mx-auto relative z-10 reveal">
          <span className="text-blue-400 font-extrabold uppercase tracking-widest text-sm mb-4 block">Contacto</span>
          <h2 className="text-5xl md:text-6xl font-extrabold text-white mb-6 font-sora">¿Listo para automatizar tu PyME?</h2>
          <p className="text-xl text-blue-200/70 font-medium mb-12 max-w-2xl mx-auto">Hablemos. El diagnóstico es 100% gratis y sin compromiso.</p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
            <Button size="lg" className="h-16 px-10 bg-[#1aa260] hover:bg-[#158048] text-white font-bold rounded-full text-lg shadow-[0_0_30px_rgba(26,162,96,0.3)] transition-all hover:scale-105" onClick={() => window.open(WA_URL, '_blank')} data-testid="button-final-wa">
              <span className="mr-2">📱</span> Hablar por WhatsApp
            </Button>
            <Button size="lg" variant="outline" className="h-16 px-10 border-2 border-white/20 text-white hover:bg-white/10 font-bold rounded-full text-lg transition-all" onClick={() => window.location.href='mailto:clientumlatam@gmail.com'} data-testid="button-final-email">
              Enviar Email
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto text-sm font-bold text-blue-100/60 mb-16">
            <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 border border-white/10"><Phone className="w-5 h-5 text-blue-400"/> +54 9 2984 51-0883</div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 border border-white/10"><Mail className="w-5 h-5 text-blue-400"/> clientumlatam@gmail.com</div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 border border-white/10"><MapPin className="w-5 h-5 text-blue-400"/> Patagonia · Argentina</div>
          </div>

          {/* Formulario de contacto */}
          <div className="max-w-xl mx-auto bg-white/5 border border-white/10 p-8 rounded-3xl shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">¿Preferís que te contactemos?</h3>
            <p className="text-blue-200/60 text-sm mb-8">Completá tus datos y te contactamos por WhatsApp en menos de 24 horas hábiles.</p>
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-blue-200/70 block mb-1.5">Nombre *</label>
                  <input name="nombre" type="text" placeholder="Ej: Laura Méndez" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#031E43] transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-blue-200/70 block mb-1.5">Empresa *</label>
                  <input name="empresa" type="text" placeholder="Ej: Distribuidora Sur" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#031E43] transition-colors" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-blue-200/70 block mb-1.5">WhatsApp / Teléfono *</label>
                  <input name="telefono" type="tel" placeholder="+54 9..." required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#031E43] transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-blue-200/70 block mb-1.5">Email</label>
                  <input name="email" type="email" placeholder="hola@empresa.com" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#031E43] transition-colors" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-blue-200/70 block mb-1.5">Rubro del Negocio</label>
                <select name="sector" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#031E43] transition-colors">
                  <option value="" className="bg-[#070f24]">Seleccioná tu rubro</option>
                  {['Distribuidoras','Inmobiliarias','Estudios Contables','Talleres','Comercios','Transporte','Constructoras','Salud y Clínicas','Gastronomía','Agencias'].map(s => (
                    <option key={s} value={s} className="bg-[#070f24]">{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-blue-200/70 block mb-1.5">¿Qué te gustaría automatizar?</label>
                <textarea name="mensaje" placeholder="Ej: Pérdida de tiempo en cotizaciones repetitivas de WhatsApp..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#031E43] transition-colors min-h-[90px]" />
              </div>
              <Button type="submit" className="w-full h-14 bg-[#031E43] hover:bg-blue-600 text-white font-bold text-base rounded-xl shadow-lg shadow-[#031E43]/20">
                Solicitar diagnóstico gratis →
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* 23. Footer */}
      <footer className="bg-[#030917] pt-20 pb-8 px-4 md:px-8 text-blue-100/50 text-sm font-medium border-t border-white/5" data-testid="section-footer">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div className="space-y-6">
              <ClientumLogo variant="pill" size={36} subtitle="IA para PyMEs" className="opacity-90" />
              <p>IA y automatización para PyMEs argentinas.</p>
              <p className="font-bold text-[#031E43]">Sin código. Sin IT. Resultados en semanas.</p>
            </div>

            <div>
              <h4 className="font-extrabold text-white mb-6 uppercase tracking-wider text-xs">Soluciones</h4>
              <ul className="space-y-4 font-semibold">
                <li><button onClick={() => scrollTo('soluciones')} className="hover:text-white transition-colors">CRM + Automatización</button></li>
                <li><button onClick={() => scrollTo('soluciones')} className="hover:text-white transition-colors">Chatbot 24/7</button></li>
                <li><button onClick={() => scrollTo('studio')} className="hover:text-white transition-colors">Clientum Studio</button></li>
              </ul>
            </div>

            <div>
              <h4 className="font-extrabold text-white mb-6 uppercase tracking-wider text-xs">Empresa</h4>
              <ul className="space-y-4 font-semibold">
                <li><button onClick={() => scrollTo('casos')} className="hover:text-white transition-colors">Casos de éxito</button></li>
                <li><button onClick={() => scrollTo('precios')} className="hover:text-white transition-colors">Planes</button></li>
                <li><button onClick={() => scrollTo('contacto')} className="hover:text-white transition-colors">Contacto</button></li>
              </ul>
            </div>

            <div>
              <h4 className="font-extrabold text-white mb-6 uppercase tracking-wider text-xs">Acceso</h4>
              <ul className="space-y-4 font-semibold">
                <li><button onClick={openLogin} className="hover:text-white transition-colors">Ingresar al Dashboard</button></li>
                <li><button onClick={openRegister} className="hover:text-white transition-colors">Crear cuenta</button></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-semibold">
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

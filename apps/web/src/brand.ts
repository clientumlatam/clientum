/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                     CLIENTUM — BRAND KIT v1.0                              ║
 * ║                  Central Design System · Source of Truth                   ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Importá este archivo en cualquier componente para acceder a tokens         ║
 * ║  de color, tipografía, spacing, radius, sombras y animaciones.              ║
 * ║                                                                              ║
 * ║  import { brand, cx, logoSVG } from '@/brand';                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * REGLAS DE USO:
 *  1. NUNCA hardcodear colores hex en un componente. Usá brand.color.*
 *  2. Para clases Tailwind que responden al tema, usá las clases CSS var:
 *     text-foreground, bg-background, border-border, text-primary, etc.
 *  3. brand.color.* es para inline styles o canvas/SVG donde Tailwind no llega.
 *  4. En dark mode el CSS se encarga solo — no crear condicionales de tema en JS
 *     a menos que necesites valores no contemplados en el CSS.
 *  5. Usá brand.tw.* para componer className strings con los patrones del sistema.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. PALETA OFICIAL (5 colores base)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Los 5 colores oficiales de Clientum.
 * Toda la UI deriva de estos valores — no se introducen colores externos.
 *
 * Jerarquía visual:
 *   prussianBlue  →  énfasis máximo, CTAs, headings, íconos activos
 *   duskBlue      →  énfasis secundario, texto muted, labels, borders activos
 *   offWhite      →  fondo de página en light mode, texto sobre fondos oscuros
 *   pureWhite     →  superficies (cards, modales, inputs) en light mode
 *   alabaster     →  bordes, separadores, fondos ultra-sutiles, disabled states
 */
export const color = {
  prussianBlue: '#031E43',   // hsl(215 91% 14%) — Primary / Foreground
  duskBlue:     '#3B506D',   // hsl(215 30% 33%) — Secondary / Muted
  offWhite:     '#FDFDFB',   // hsl(60 1%  99%)  — Background light
  pureWhite:    '#FFFFFF',   // hsl(0   0% 100%) — Card surfaces
  alabaster:    '#DDDFE2',   // hsl(216 4%  88%) — Borders / Dividers

  // Aliases semánticos — mismos valores, nombres por rol
  primary:      '#031E43',   // = prussianBlue
  secondary:    '#3B506D',   // = duskBlue
  background:   '#FDFDFB',   // = offWhite
  surface:      '#FFFFFF',   // = pureWhite
  border:       '#DDDFE2',   // = alabaster
  muted:        '#3B506D',   // texto secundario / placeholders

  // Dark mode — derivados del mismo azul prusiano
  // (No usar directamente; el CSS los aplica vía .dark)
  dark: {
    background:  '#020f21',  // más oscuro que prussianBlue
    layer1:      '#021630',  // profundidad 1
    layer2:      '#031E43',  // profundidad 2 = prussianBlue
    layer3:      '#0d2b52',  // profundidad 3 (cards destacadas)
    text:        '#FDFDFB',  // = offWhite sobre fondos oscuros
    muted:       '#3B506D',  // = duskBlue
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 2. TIPOGRAFÍA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sistema tipográfico de Clientum.
 *
 * FONT STACK
 *  · sans  → Inter (principal — cuerpo, UI, headings)
 *  · serif → Georgia (editorial — quotes, testimonios)
 *  · mono  → Menlo (código, datos técnicos)
 *
 * ESCALA (rem / px a 16px base)
 *  xs:   0.75rem / 12px  → labels, captions, badges
 *  sm:   0.875rem/ 14px  → body secondary, table cells
 *  base: 1rem    / 16px  → body principal
 *  lg:   1.125rem/ 18px  → subtítulos de sección
 *  xl:   1.25rem / 20px  → título de card / módulo
 *  2xl:  1.5rem  / 24px  → heading de página (h2)
 *  3xl:  1.875rem/ 30px  → heading destacado (h1 mobile)
 *  4xl:  2.25rem / 36px  → hero heading (desktop)
 *  5xl:  3rem    / 48px  → super heading / hero principal
 *
 * WEIGHTS
 *  400 regular   → cuerpo de texto largo
 *  500 medium    → énfasis sutil en prosa
 *  600 semibold  → labels de campo, nav links
 *  700 bold      → headings de sección
 *  800 extrabold → display headings, CTAs
 *  900 black     → hero copy, impacto máximo
 *
 * TRACKING (letter-spacing)
 *  tight   → headings grandes (-.025em)
 *  normal  → cuerpo (0)
 *  wide    → 0.05em (subtítulos pequeños)
 *  wider   → 0.1em  (labels uppercase)
 *  widest  → 0.15em (badges, eyebrows)
 */
export const typography = {
  fontFamily: {
    sans:  "'Inter', ui-sans-serif, system-ui, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    mono:  "Menlo, 'Courier New', monospace",
  },
  fontSize: {
    xs:   '0.75rem',
    sm:   '0.875rem',
    base: '1rem',
    lg:   '1.125rem',
    xl:   '1.25rem',
    '2xl':'1.5rem',
    '3xl':'1.875rem',
    '4xl':'2.25rem',
    '5xl':'3rem',
  },
  fontWeight: {
    regular:   '400',
    medium:    '500',
    semibold:  '600',
    bold:      '700',
    extrabold: '800',
    black:     '900',
  },
  lineHeight: {
    tight:   '1.25',
    snug:    '1.375',
    normal:  '1.5',
    relaxed: '1.625',
    loose:   '2',
  },
  letterSpacing: {
    tight:   '-0.025em',
    normal:  '0',
    wide:    '0.05em',
    wider:   '0.1em',
    widest:  '0.15em',
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 3. BORDER RADIUS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Escala de border-radius.
 * Base = 0.75rem (12px) → var(--radius) en el CSS.
 *
 * USO:
 *  none  → sin radio (tablas internas, elementos inline)
 *  sm    → inputs pequeños, badges inline
 *  md    → inputs de formulario, botones secundarios
 *  lg    → botones primarios, cards pequeñas (DEFAULT)
 *  xl    → cards normales, panels
 *  2xl   → cards grandes, modales
 *  3xl   → hero cards, contenedores destacados
 *  full  → pills, avatars, indicadores circulares
 */
export const radius = {
  none: '0',
  sm:   '0.5rem',    //  8px
  md:   '0.625rem',  // 10px
  lg:   '0.75rem',   // 12px ← base --radius
  xl:   '1rem',      // 16px
  '2xl':'1.25rem',   // 20px
  '3xl':'1.5rem',    // 24px
  full: '9999px',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 4. SOMBRAS (box-shadow)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sombras derivadas de prussianBlue para coherencia cromática.
 *
 * USO:
 *  sm  → separación sutil (cards en grid)
 *  md  → cards con hover lift
 *  lg  → modales, dropdowns, tooltips
 *  xl  → hero cards, featured plans
 *  cta → sombra de color en botón CTA al hover
 *  glow → efecto glow sutil para elementos activos/focus
 */
export const shadow = {
  sm:   '0 1px 3px rgba(3,30,67,.06), 0 1px 2px rgba(3,30,67,.04)',
  md:   '0 4px 12px rgba(3,30,67,.08), 0 2px 4px rgba(3,30,67,.05)',
  lg:   '0 10px 30px rgba(3,30,67,.12), 0 4px 8px rgba(3,30,67,.06)',
  xl:   '0 20px 50px rgba(3,30,67,.16), 0 8px 16px rgba(3,30,67,.08)',
  cta:  '0 12px 24px -6px rgba(3,30,67,.30)',
  glow: '0 0 0 3px rgba(3,30,67,.15)',
  none: 'none',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 5. GRADIENTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gradientes oficiales.
 * Siempre de prussianBlue hacia duskBlue (azul oscuro → azul medio).
 *
 * USO:
 *  brand     → fondo de secciones oscuras, botón CTA principal, badges
 *  subtle    → fondo de cards en hover, secciones con énfasis leve
 *  dark      → hero background, headers de página interna
 *  bar       → progress bars, stat fills, timeline dots
 *  annBar    → barra de anuncio animada (animada en CSS)
 */
export const gradient = {
  brand:   'linear-gradient(135deg, #031E43 0%, #3B506D 100%)',
  subtle:  'linear-gradient(135deg, rgba(3,30,67,.06) 0%, rgba(59,80,109,.04) 100%)',
  dark:    'linear-gradient(135deg, #020f21 0%, #031E43 100%)',
  bar:     'linear-gradient(90deg, #031E43 0%, #3B506D 100%)',
  radial:  'radial-gradient(circle, rgba(3,30,67,.08) 0%, transparent 70%)',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 6. ANIMACIONES / TRANSICIONES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tokens de duración y easing para consistencia en micro-interacciones.
 *
 * DURACIONES
 *  instant → feedback inmediato (toggles, checks)
 *  fast    → hovers, active states
 *  base    → transiciones de UI estándar
 *  slow    → reveal on scroll, modales
 *  verySlow→ animaciones de datos (barras, counters)
 *
 * EASING
 *  ease    → salida natural (mayoría de hovers)
 *  spring  → rebote sutil (cards lift, botones)
 *  linear  → loops/tickers, barras de progreso
 *  bounce  → notificaciones, toasts
 */
export const motion = {
  duration: {
    instant:  '100ms',
    fast:     '200ms',
    base:     '250ms',
    slow:     '400ms',
    verySlow: '1200ms',
  },
  easing: {
    ease:   'cubic-bezier(.4, 0, .2, 1)',
    spring: 'cubic-bezier(.455, .03, .515, .955)',
    linear: 'linear',
    bounce: 'cubic-bezier(.34, 1.56, .64, 1)',
  },
  // Clases CSS ya definidas en index.css — referenciar por nombre
  cssClasses: {
    reveal:    '.reveal',       // fade-in + slide-up on scroll
    cardHover: '.card-hover',   // translateY(-5px) + shadow
    ctaHover:  '.cta-primary',  // translateY(-2px) + shadow
    pulseDot:  '.pulse-dot',    // ring pulsante
    statFill:  '.stat-fill',    // progress bar animada
    ticker:    '.mq-track',     // scroll horizontal loop
    gradBar:   '#annBar',       // gradiente animado
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 7. SPACING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Escala de espaciado (compatible con Tailwind p-N, m-N, gap-N).
 * USO TÍPICO en la app:
 *  p-4 (16px)   → padding interno de cards pequeñas
 *  p-5 (20px)   → padding interno de cards de app
 *  p-6 (24px)   → padding interno de panels/sections
 *  p-8 (32px)   → padding de páginas en desktop
 *  gap-4/5/6    → grids de cards y form fields
 *  gap-8        → secciones de página
 */
export const spacing = {
  '0':   '0',
  '1':   '0.25rem',  //  4px
  '2':   '0.5rem',   //  8px
  '3':   '0.75rem',  // 12px
  '4':   '1rem',     // 16px
  '5':   '1.25rem',  // 20px
  '6':   '1.5rem',   // 24px
  '8':   '2rem',     // 32px
  '10':  '2.5rem',   // 40px
  '12':  '3rem',     // 48px
  '16':  '4rem',     // 64px
  '20':  '5rem',     // 80px
  '24':  '6rem',     // 96px
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 8. LOGO SVG
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Logo de Clientum — 4 nodos en posiciones cardinales conectados por líneas.
 * Geometría: diamante / rombo de círculos.
 *
 * Props:
 *  size    → número de px (ancho = alto)
 *  color   → color de relleno/stroke (default: prussianBlue)
 *  variant → 'default' | 'icon'
 *    'default' → SVG plano, transparente de fondo (para nav, inline)
 *    'icon'    → con fondo rounded rect (para app icons, favicons, avatars)
 *
 * EJEMPLO:
 *  <ClientumLogo size={32} />                        → nav / inline
 *  <ClientumLogo size={40} color="#FDFDFB" />        → sobre fondo oscuro
 *  <ClientumLogo size={48} variant="icon" />         → app icon con fondo
 */
export const logo = {
  viewBox: '0 0 48 48',
  nodes: [
    { cx: 24, cy: 8  },   // top
    { cx: 40, cy: 24 },   // right
    { cx: 24, cy: 40 },   // bottom
    { cx: 8,  cy: 24 },   // left
  ],
  edges: [
    [0, 1], [1, 2], [2, 3], [3, 0],  // perímetro del rombo
  ],
  nodeRadius: 4.5,
  strokeWidth: 2.5,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 9. TAILWIND CLASS RECIPES — patrones de componentes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Recetas de clases Tailwind para los patrones más comunes de la UI.
 * Usá estas strings como base y extendelas con clases adicionales.
 *
 * FILOSOFÍA:
 *  · Los componentes reutilizables van en src/components/ui/
 *  · Las recetas son para one-off patterns o variantes inline
 *  · Siempre preferir Tailwind sobre inline styles
 *  · inline styles solo para valores dinámicos (JS variables)
 */
export const tw = {
  // Tipografía
  label:       'text-xs font-bold uppercase tracking-wider',
  labelMuted:  'text-xs font-bold uppercase tracking-wider text-muted-foreground',
  eyebrow:     'text-xs font-semibold uppercase tracking-widest text-muted-foreground',
  heading1:    'text-4xl font-extrabold tracking-tight text-foreground',
  heading2:    'text-2xl font-bold tracking-tight text-foreground',
  heading3:    'text-xl font-bold text-foreground',
  bodyLg:      'text-base leading-relaxed text-foreground',
  bodySm:      'text-sm leading-relaxed text-muted-foreground',
  caption:     'text-xs text-muted-foreground',

  // Botones
  btnPrimary:  'inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-extrabold tracking-wide uppercase text-white shadow-sm transition hover:opacity-90 active:scale-[0.98]',
  btnSecondary:'inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold border transition hover:bg-muted active:scale-[0.98]',
  btnGhost:    'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition hover:bg-muted active:scale-[0.98]',
  btnIcon:     'inline-flex items-center justify-center w-9 h-9 rounded-lg transition hover:bg-muted active:scale-[0.98]',

  // Cards
  card:        'rounded-2xl border bg-card shadow-sm',
  cardBody:    'p-5',
  cardBodyLg:  'p-6',
  cardHover:   'rounded-2xl border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-md',

  // Formularios
  input:       'w-full text-sm px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-1 focus:ring-ring transition',
  inputLabel:  'block text-xs font-bold uppercase tracking-wider mb-1 text-muted-foreground',

  // Badges / Pills
  badge:       'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold',
  badgePrimary:'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground',
  badgeOutline:'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-border text-muted-foreground',
  pill:        'inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border border-border bg-card text-foreground',

  // Sección de página (app)
  pageHeader:  'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6',
  pageTitle:   'text-2xl font-bold tracking-tight text-foreground',
  pageSub:     'text-sm text-muted-foreground mt-0.5',

  // Divisores
  divider:     'border-t border-border my-4',
  dividerV:    'border-l border-border mx-3 h-5',

  // Estados vacíos
  emptyState:  'flex flex-col items-center justify-center text-center p-12 gap-3',
  emptyIcon:   'w-12 h-12 text-muted-foreground/30',
  emptyText:   'text-sm text-muted-foreground',

  // Tablas
  table:       'w-full text-sm border-collapse',
  th:          'text-left py-2 px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border',
  td:          'py-2.5 px-3 border-b border-border text-sm',

  // Tabs
  tabBar:      'flex border-b border-border',
  tabBtn:      'flex items-center gap-2 px-5 py-2.5 text-sm font-bold tracking-wide uppercase transition border-b-2 -mb-px',
  tabActive:   'text-foreground border-primary',
  tabInactive: 'text-muted-foreground border-transparent hover:text-foreground',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 10. BREAKPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Breakpoints responsive (iguales a Tailwind defaults).
 * USO: para lógica JS condicional (no para CSS — usar clases Tailwind directamente).
 */
export const breakpoint = {
  sm:  640,
  md:  768,
  lg:  1024,
  xl:  1280,
  '2xl': 1536,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 11. Z-INDEX
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Escala de z-index para evitar conflictos entre capas.
 *
 * base      → contenido normal
 * dropdown  → menús desplegables, selects custom
 * sticky    → headers sticky, sidebars
 * overlay   → fondos de modales (semitransparentes)
 * modal     → modales / sheets
 * toast     → notificaciones
 * tooltip   → tooltips (siempre al frente)
 */
export const zIndex = {
  base:     0,
  elevated: 10,
  dropdown: 100,
  sticky:   200,
  overlay:  300,
  modal:    400,
  toast:    500,
  tooltip:  600,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 12. ICONOGRAFÍA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Guía de uso de íconos (Lucide React).
 *
 * TAMAÑOS ESTÁNDAR:
 *  xs   → w-3 h-3  (12px) — inline en texto, badges
 *  sm   → w-4 h-4  (16px) — botones, labels, nav items
 *  md   → w-5 h-5  (20px) — panel headers, acciones de card
 *  lg   → w-6 h-6  (24px) — empty states, ilustraciones de sección
 *  xl   → w-8 h-8  (32px) — feature icons, stat cards
 *  hero → w-12 h-12(48px) — ilustraciones hero, onboarding
 *
 * COLOR:
 *  · En botón primario → text-white
 *  · En panel header   → text-muted-foreground (duskBlue)
 *  · En estado activo  → text-primary (prussianBlue)
 *  · En estado error   → text-destructive
 *  · En éxito          → text-emerald-500 (excepción al brand mono)
 */
export const icon = {
  size: {
    xs:   'w-3 h-3',
    sm:   'w-4 h-4',
    md:   'w-5 h-5',
    lg:   'w-6 h-6',
    xl:   'w-8 h-8',
    hero: 'w-12 h-12',
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 13. EXPORT AGRUPADO — objeto brand completo
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Objeto brand completo.
 * Importación recomendada:
 *
 *   import { brand } from '@/brand';
 *   style={{ color: brand.color.prussianBlue }}
 *   className={brand.tw.btnPrimary}
 */
export const brand = {
  color,
  typography,
  radius,
  shadow,
  gradient,
  motion,
  spacing,
  logo,
  tw,
  breakpoint,
  zIndex,
  icon,
} as const;

export default brand;

// ─────────────────────────────────────────────────────────────────────────────
// 14. HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * cx — combina clases Tailwind condicionalmente.
 * Alternativa liviana a clsx/cn para uso inline.
 *
 * Ejemplo:
 *   cx(brand.tw.btnPrimary, isActive && 'ring-2 ring-offset-2')
 */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * alpha — agrega transparencia a un color hex.
 * Útil para sombras y overlays inline.
 *
 * alpha(brand.color.prussianBlue, 0.08) → 'rgba(3,30,67,0.08)'
 */
export function alpha(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

/**
 * Uso del brand kit en componentes:
 *
 * ─── COLORES ────────────────────────────────────────────────────────────────
 *  style={{ color: brand.color.prussianBlue }}
 *  style={{ backgroundColor: brand.color.alabaster }}
 *  style={{ borderColor: brand.color.duskBlue }}
 *  style={{ boxShadow: brand.shadow.lg }}
 *  style={{ background: brand.gradient.brand }}
 *  style={{ backgroundColor: alpha(brand.color.prussianBlue, 0.06) }}
 *
 * ─── TAILWIND (preferido) ───────────────────────────────────────────────────
 *  className="text-foreground bg-background border-border"
 *  className="text-primary bg-primary text-primary-foreground"
 *  className="text-muted-foreground bg-muted"
 *  className={brand.tw.btnPrimary}
 *  className={cx(brand.tw.card, brand.tw.cardBody, 'my-extra-class')}
 *
 * ─── MODO OSCURO (automático vía CSS) ───────────────────────────────────────
 *  El tema se aplica con .dark en <html> — gestionado por useTheme().
 *  Usá clases semánticas (text-foreground, bg-card, etc.) y el dark mode
 *  se maneja solo. Solo usás brand.color.dark.* para SVG/canvas/charts.
 *
 * ─── LOGO ────────────────────────────────────────────────────────────────────
 *  <ClientumLogo size={32} />                   → nav, inline (fondo transparente)
 *  <ClientumLogo size={40} color="#FDFDFB" />   → sobre fondo oscuro
 *  <ClientumLogo size={48} variant="icon" />    → con fondo rounded rect
 *
 * ─── ANIMACIONES ────────────────────────────────────────────────────────────
 *  className="card-hover"              → lift en hover (CSS global)
 *  className="cta-primary"             → lift + sombra en hover
 *  className="reveal anim-start"       → fade-in on scroll
 *  style={{ transition: `all ${brand.motion.duration.base} ${brand.motion.easing.ease}` }}
 */

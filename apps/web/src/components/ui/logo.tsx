/**
 * ClientumLogo — componente unificado del logo de Clientum.
 *
 * Variantes:
 *  "flat"     → SVG plano, sin fondo (nav pública, footer, inline)
 *  "icon"     → con fondo redondeado brand gradient (sidebar app, app icon, Studio)
 *  "wordmark" → flat + nombre "Clientum" a la derecha
 *  "pill"     → ícono + texto en cápsula horizontal con brand gradient
 *               (headers, footers, og-images, badges de marca)
 *
 * Props:
 *  size      → ancho/alto del ícono en px (default: 32)
 *  color     → color del ícono en variante flat/wordmark (default: brand prussianBlue)
 *  variant   → "flat" | "icon" | "wordmark" | "pill" (default: "flat")
 *  subtitle  → texto badge debajo de la pill (solo variante "pill"; ej: "IA para PyMEs")
 *  className → clases adicionales en el wrapper externo
 */

import { color as brandColor } from '@/brand';

interface ClientumLogoProps {
  size?: number;
  color?: string;
  variant?: 'flat' | 'icon' | 'wordmark' | 'pill';
  subtitle?: string;
  className?: string;
}

const NODE_R   = 4.5;
const STROKE_W = 2.5;

function LogoSVG({ size, fill }: { size: number; fill: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
    >
      <circle cx="24" cy="8"  r={NODE_R} fill={fill} />
      <circle cx="40" cy="24" r={NODE_R} fill={fill} />
      <circle cx="24" cy="40" r={NODE_R} fill={fill} />
      <circle cx="8"  cy="24" r={NODE_R} fill={fill} />
      <line x1="24" y1="8"  x2="40" y2="24" stroke={fill} strokeWidth={STROKE_W} strokeLinecap="round" />
      <line x1="40" y1="24" x2="24" y2="40" stroke={fill} strokeWidth={STROKE_W} strokeLinecap="round" />
      <line x1="24" y1="40" x2="8"  y2="24" stroke={fill} strokeWidth={STROKE_W} strokeLinecap="round" />
      <line x1="8"  y1="24" x2="24" y2="8"  stroke={fill} strokeWidth={STROKE_W} strokeLinecap="round" />
    </svg>
  );
}

export function ClientumLogo({
  size      = 32,
  color     = brandColor.prussianBlue,
  variant   = 'flat',
  subtitle,
  className = '',
}: ClientumLogoProps) {

  if (variant === 'flat') {
    return (
      <span className={className} style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
        <LogoSVG size={size} fill={color} />
      </span>
    );
  }

  if (variant === 'icon') {
    const pad      = Math.round(size * 0.18);
    const iconSize = size - pad * 2;
    const rx       = Math.round(size * 0.27);
    return (
      <span
        className={className}
        style={{
          display:        'inline-flex',
          alignItems:     'center',
          justifyContent: 'center',
          flexShrink:     0,
          width:          size,
          height:         size,
          borderRadius:   rx,
          background:     `linear-gradient(135deg, ${brandColor.prussianBlue} 0%, ${brandColor.duskBlue} 100%)`,
        }}
      >
        <LogoSVG size={iconSize} fill="#FDFDFB" />
      </span>
    );
  }

  if (variant === 'wordmark') {
    const textSize = Math.round(size * 0.5625);
    return (
      <span
        className={className}
        style={{ display: 'inline-flex', alignItems: 'center', gap: Math.round(size * 0.3), flexShrink: 0 }}
      >
        <LogoSVG size={size} fill={color} />
        <span
          style={{
            fontSize:      textSize,
            fontWeight:    800,
            letterSpacing: '-0.025em',
            color,
            lineHeight:    1,
            fontFamily:    "'Inter', ui-sans-serif, system-ui, sans-serif",
          }}
        >
          Clientum
        </span>
      </span>
    );
  }

  if (variant === 'pill') {
    const pillH      = Math.round(size * 1.1);
    const iconSize   = Math.round(size * 0.6);
    const textSize   = Math.round(size * 0.44);
    const subSize    = Math.round(size * 0.3);
    const padH       = Math.round(size * 0.38);
    const gap        = Math.round(size * 0.22);

    const pill = (
      <span
        style={{
          display:        'inline-flex',
          alignItems:     'center',
          flexShrink:     0,
          gap,
          height:         pillH,
          paddingLeft:    padH,
          paddingRight:   Math.round(padH * 1.1),
          borderRadius:   pillH,
          background:     `linear-gradient(135deg, ${brandColor.prussianBlue} 0%, ${brandColor.duskBlue} 100%)`,
        }}
      >
        <LogoSVG size={iconSize} fill="#FDFDFB" />
        <span
          style={{
            fontSize:      textSize,
            fontWeight:    800,
            letterSpacing: '-0.02em',
            color:         '#FDFDFB',
            lineHeight:    1,
            fontFamily:    "'Inter', ui-sans-serif, system-ui, sans-serif",
            whiteSpace:    'nowrap',
          }}
        >
          Clientum
        </span>
      </span>
    );

    if (!subtitle) {
      return <span className={className} style={{ display: 'inline-flex', flexShrink: 0 }}>{pill}</span>;
    }

    return (
      <span
        className={className}
        style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: Math.round(size * 0.18), flexShrink: 0 }}
      >
        {pill}
        <span
          style={{
            fontSize:        subSize,
            fontWeight:      700,
            letterSpacing:   '0.08em',
            textTransform:   'uppercase',
            color:           brandColor.duskBlue,
            lineHeight:      1,
            fontFamily:      "'Inter', ui-sans-serif, system-ui, sans-serif",
            whiteSpace:      'nowrap',
            opacity:         0.8,
          }}
        >
          {subtitle}
        </span>
      </span>
    );
  }

  return null;
}

export default ClientumLogo;

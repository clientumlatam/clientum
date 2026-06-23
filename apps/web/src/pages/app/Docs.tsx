import { useState, useEffect, useRef } from "react";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "base",
  themeVariables: {
    primaryColor:          "#031E43",   /* prussianBlue */
    primaryTextColor:      "#FDFDFB",   /* offWhite */
    primaryBorderColor:    "#3B506D",   /* duskBlue */
    lineColor:             "#3B506D",   /* duskBlue */
    secondaryColor:        "#020f21",   /* dark bg */
    tertiaryColor:         "#021630",   /* dark layer1 */
    background:            "#020f21",   /* darkest bg */
    mainBkg:               "#031E43",   /* prussianBlue */
    nodeBorder:            "#3B506D",   /* duskBlue */
    clusterBkg:            "#021630",   /* dark layer1 */
    titleColor:            "#FDFDFB",   /* offWhite */
    edgeLabelBackground:   "#031E43",   /* prussianBlue */
    actorBkg:              "#031E43",   /* prussianBlue */
    actorBorder:           "#3B506D",   /* duskBlue */
    actorTextColor:        "#FDFDFB",   /* offWhite */
    actorLineColor:        "#3B506D",   /* duskBlue */
    signalColor:           "#3B506D",   /* duskBlue */
    signalTextColor:       "#FDFDFB",   /* offWhite */
    labelBoxBkgColor:      "#031E43",   /* prussianBlue */
    labelBoxBorderColor:   "#3B506D",   /* duskBlue */
    labelTextColor:        "#FDFDFB",   /* offWhite */
    loopTextColor:         "#FDFDFB",   /* offWhite */
    noteBkgColor:          "#031E43",   /* prussianBlue */
    noteTextColor:         "#FDFDFB",   /* offWhite */
    noteBorderColor:       "#3B506D",   /* duskBlue */
    activationBkgColor:    "#031E43",   /* prussianBlue */
    activationBorderColor: "#3B506D",   /* duskBlue */
  },
  flowchart: { htmlLabels: true, curve: "basis" },
  sequence: { diagramMarginX: 20, diagramMarginY: 20, actorMargin: 80 },
});

interface DocFile {
  file: string;
  label: string;
  desc: string;
  icon: string;
  color: string;
  group: string;
}

const DOCS: DocFile[] = [
  { file: "docs/PROYECTO_ANALISIS.md",          label: "Análisis Completo del Proyecto", desc: "Arquitectura, rutas, DB, integraciones y diagramas Mermaid",       icon: "ti-topology-star-3",  color: "text-blue-400",    group: "Arquitectura" },
  { file: "README.md",                           label: "Índice de Documentación",        desc: "Mapa de toda la base de conocimiento técnica",                    icon: "ti-book",              color: "text-cl-accent",   group: "Proyecto" },
  { file: "INFORME-EJECUTIVO.md",                label: "Informe Ejecutivo",              desc: "Estado del proyecto y métricas clave de producto",               icon: "ti-presentation",      color: "text-cl-blue",     group: "Proyecto" },
  { file: "INFORME-PROYECTO.md",                 label: "Informe de Estructura",          desc: "Estructura completa del repositorio y archivos clave",            icon: "ti-folder-open",       color: "text-cl-blue",     group: "Proyecto" },
  { file: "ROADMAP-TECNICO.md",                  label: "Roadmap Técnico",               desc: "Próximas features priorizadas con criterio de implementación",    icon: "ti-road",              color: "text-purple-400",  group: "Proyecto" },
  { file: "GAPS-DASHBOARD.md",                   label: "Análisis de Gaps",              desc: "Dashboard real vs promesas del sitio — brechas identificadas",    icon: "ti-alert-triangle",    color: "text-orange-400",  group: "Técnica" },
  { file: "STACK-DECISION.md",                   label: "Decisiones de Stack",           desc: "Evaluación técnica: qué mantener y qué migrar",                   icon: "ti-layers-difference", color: "text-yellow-400",  group: "Técnica" },
  { file: "ARQUITECTURA-REFERENCIA.md",          label: "Arquitectura de Referencia",    desc: "ADRs y patrones arquitecturales de los repos de referencia",      icon: "ti-topology-star",     color: "text-cl-accent",   group: "Técnica" },
  { file: "ANALISIS-REPOS.md",                   label: "Análisis de Repos",             desc: "Análisis de 12+ repos open source relevantes para Clientum",     icon: "ti-git-branch",        color: "text-pink-400",    group: "Técnica" },
  { file: "KNOWLEDGE-BASE-REPOS.md",             label: "Knowledge Base Repos",          desc: "Fichas técnicas de cada repo analizado",                          icon: "ti-database",          color: "text-cl-blue",     group: "Técnica" },
  { file: "GUIA-INFRAESTRUCTURA.md",             label: "Guía de Infraestructura",       desc: "Setup Ubuntu + Cloudflare Tunnel + Evolution API + systemd",      icon: "ti-server",            color: "text-green-400",   group: "Infraestructura" },
];

const SCRIPTS: DocFile[] = [
  { file: "scripts/setup-completo.sh",            label: "setup-completo.sh",              desc: "Setup desde cero: DB, app, Evolution API, servicios systemd",    icon: "ti-player-play",       color: "text-cl-accent",   group: "Scripts" },
  { file: "scripts/instalar-servicios.sh",        label: "instalar-servicios.sh",          desc: "Instala/reinstala los servicios systemd",                         icon: "ti-settings",          color: "text-cl-blue",     group: "Scripts" },
  { file: "scripts/setup-tunnel.sh",              label: "setup-tunnel.sh",                desc: "Configura Cloudflare Tunnel al dominio propio",                   icon: "ti-cloud",             color: "text-purple-400",  group: "Scripts" },
  { file: "scripts/instalar-evolution.sh",        label: "instalar-evolution.sh",          desc: "Instala Evolution API como servicio systemd",                     icon: "ti-brand-whatsapp",    color: "text-green-400",   group: "Scripts" },
  { file: "scripts/rebuild.sh",                   label: "rebuild.sh",                     desc: "Recompila y reinicia servicios tras cambios de código",           icon: "ti-refresh",           color: "text-yellow-400",  group: "Scripts" },
  { file: "scripts/backup-db.sh",                 label: "backup-db.sh",                   desc: "Backup comprimido de PostgreSQL con rotación 7 días",             icon: "ti-database-export",   color: "text-orange-400",  group: "Scripts" },
  { file: "scripts/restore-db.sh",                label: "restore-db.sh",                  desc: "Restaura la DB desde un backup con selección interactiva",        icon: "ti-database-import",   color: "text-cl-accent",   group: "Scripts" },
  { file: "scripts/health-check.sh",              label: "health-check.sh",                desc: "Verifica servicios, DB, tunnel, disco, RAM y backups",            icon: "ti-heart-rate-monitor",color: "text-red-400",     group: "Scripts" },
  { file: "scripts/ubuntu-local.env.example",     label: "ubuntu-local.env.example",       desc: "Template .env para instalación local en Ubuntu (sin secretos)",  icon: "ti-key",               color: "text-cl-accent",   group: "Configuración" },
  { file: "scripts/guias/setup-local.md",         label: "setup-local.md",                 desc: "Instrucciones para setup local en Ubuntu",                        icon: "ti-device-laptop",     color: "text-silver",      group: "Guías" },
  { file: "scripts/guias/setup-evolution.md",     label: "setup-evolution.md",             desc: "Instrucciones para configurar Evolution API",                     icon: "ti-brand-whatsapp",    color: "text-green-400",   group: "Guías" },
  { file: "scripts/guias/produccion-checklist.md",label: "produccion-checklist.md",        desc: "Diferencias .env dev → producción, comandos de operación",        icon: "ti-checklist",         color: "text-yellow-400",  group: "Guías" },
  { file: "scripts/guias/Ayuda-con-setup-de-Clientum.md", label: "Ayuda con Setup",        desc: "Guía de setup paso a paso para el usuario final",                icon: "ti-help",              color: "text-cl-blue",     group: "Guías" },
  { file: "scripts/guias/PUBLICAR-CLOUDFLARE.md", label: "Publicar con Cloudflare",        desc: "Guía completa de publicación + mantenimiento en producción",     icon: "ti-cloud-upload",      color: "text-orange-400",  group: "Guías" },
];

const ALL_FILES = [...DOCS, ...SCRIPTS];

let _mermaidCounter = 0;

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inline(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "<strong class='text-white font-semibold'>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em class='text-silver'>$1</em>")
    .replace(/`([^`]+)`/g, "<code class='bg-silver/10 px-1 py-0.5 rounded text-[11px] font-mono text-cl-accent'>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<a href='$2' target='_blank' rel='noopener' class='text-cl-blue underline'>$1</a>");
}

function renderMarkdown(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let inCode = false;
  let inMermaid = false;
  let mermaidLines: string[] = [];
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```mermaid") && !inCode) {
      inMermaid = true;
      mermaidLines = [];
      continue;
    }

    if (inMermaid) {
      if (line.startsWith("```")) {
        const id = `mermaid-diagram-${++_mermaidCounter}`;
        const encoded = btoa(unescape(encodeURIComponent(mermaidLines.join("\n"))));
        out.push(`<div class="mermaid-wrapper my-6 rounded-xl overflow-hidden border border-silver/20" style="background:#031E43">`);
        out.push(`  <div class="mermaid-diagram" id="${id}" data-mermaid="${encoded}" style="padding:24px;min-height:80px;display:flex;align-items:center;justify-content:center"></div>`);
        out.push(`</div>`);
        inMermaid = false;
        mermaidLines = [];
      } else {
        mermaidLines.push(line);
      }
      continue;
    }

    if (line.startsWith("```")) {
      if (inCode) {
        out.push("</code></pre>");
        inCode = false;
      } else {
        const lang = line.slice(3).trim();
        out.push(`<pre class="bg-navy border border-silver/20 rounded-xl p-4 overflow-x-auto text-xs font-mono text-silver my-3"><code class="language-${lang}">`);
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      out.push(escapeHtml(line));
      continue;
    }

    if (line.startsWith("|")) {
      if (!inTable) {
        out.push('<div class="overflow-x-auto my-4"><table class="w-full text-xs border-collapse">');
        inTable = true;
      }
      if (line.replace(/\|/g, "").trim().replace(/-/g, "").trim() === "") continue;
      const cells = line.split("|").filter((_, i, a) => i > 0 && i < a.length - 1);
      const isHeader = i + 1 < lines.length && lines[i + 1]?.includes("---");
      if (isHeader) {
        out.push(`<tr>${cells.map((c) => `<th class="text-left px-3 py-2 text-cool-steel uppercase tracking-wider border-b border-silver/15 font-bold text-[10px]">${inline(c.trim())}</th>`).join("")}</tr>`);
      } else {
        out.push(`<tr class="border-b border-white/3 hover:bg-deep-space/10">${cells.map((c) => `<td class="px-3 py-2 text-silver">${inline(c.trim())}</td>`).join("")}</tr>`);
      }
      continue;
    } else if (inTable) {
      out.push("</table></div>");
      inTable = false;
    }

    if (line.startsWith("# ")) {
      out.push(`<h1 class="text-2xl font-extrabold text-white mt-6 mb-3">${inline(line.slice(2))}</h1>`);
    } else if (line.startsWith("## ")) {
      out.push(`<h2 class="text-lg font-bold text-white mt-8 mb-3 pb-2 border-b border-silver/15">${inline(line.slice(3))}</h2>`);
    } else if (line.startsWith("### ")) {
      out.push(`<h3 class="text-base font-bold text-silver mt-5 mb-2">${inline(line.slice(4))}</h3>`);
    } else if (line.startsWith("#### ")) {
      out.push(`<h4 class="text-sm font-bold text-silver mt-4 mb-1">${inline(line.slice(5))}</h4>`);
    } else if (line.startsWith("> ")) {
      out.push(`<blockquote class="border-l-2 border-cl-accent/50 pl-4 my-3 text-sm text-cool-steel italic">${inline(line.slice(2))}</blockquote>`);
    } else if (/^- \[[xX]\]/.test(line)) {
      out.push(`<div class="flex items-start gap-2 py-0.5"><span class="w-4 h-4 mt-0.5 flex-shrink-0 rounded bg-cl-accent/20 flex items-center justify-center text-cl-accent text-[10px]">✓</span><span class="text-sm text-cool-steel line-through">${inline(line.replace(/^- \[[xX]\]\s*/, ""))}</span></div>`);
    } else if (/^- \[ \]/.test(line)) {
      out.push(`<div class="flex items-start gap-2 py-0.5"><span class="w-4 h-4 mt-0.5 flex-shrink-0 rounded border border-silver/30"></span><span class="text-sm text-silver">${inline(line.replace(/^- \[ \]\s*/, ""))}</span></div>`);
    } else if (/^[-*] /.test(line)) {
      out.push(`<div class="flex items-start gap-2 py-0.5 pl-1"><span class="w-1.5 h-1.5 mt-2 flex-shrink-0 rounded-full bg-cl-accent/50"></span><span class="text-sm text-silver">${inline(line.replace(/^[-*] /, ""))}</span></div>`);
    } else if (/^\d+\. /.test(line)) {
      const n = line.match(/^(\d+)\./)?.[1];
      out.push(`<div class="flex items-start gap-2 py-0.5 pl-1"><span class="text-xs font-bold text-cl-accent/70 w-5 flex-shrink-0 mt-0.5">${n}.</span><span class="text-sm text-silver">${inline(line.replace(/^\d+\.\s*/, ""))}</span></div>`);
    } else if (line.startsWith("---")) {
      out.push('<hr class="border-silver/15 my-6" />');
    } else if (line.trim() === "") {
      out.push('<div class="h-2"></div>');
    } else {
      out.push(`<p class="text-sm text-silver leading-relaxed my-1">${inline(line)}</p>`);
    }
  }

  if (inTable) out.push("</table></div>");
  if (inCode) out.push("</code></pre>");
  return out.join("\n");
}

const GROUPS = ["Arquitectura", "Proyecto", "Técnica", "Infraestructura", "Scripts", "Configuración", "Guías"];

export default function DocsPage() {
  const [active, setActive] = useState<DocFile>(DOCS[0]);
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [openGroup, setOpenGroup] = useState<string>("Arquitectura");
  const articleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    setContent("");
    fetch(`/${active.file}`)
      .then((r) => { if (!r.ok) throw new Error(`${r.status}`); return r.text(); })
      .then((t) => { setContent(t); setLoading(false); })
      .catch(() => { setContent(""); setLoading(false); });
  }, [active]);

  useEffect(() => {
    if (!content || !articleRef.current) return;

    const diagrams = articleRef.current.querySelectorAll<HTMLElement>(".mermaid-diagram");
    if (!diagrams.length) return;

    diagrams.forEach((el) => {
      const encoded = el.getAttribute("data-mermaid");
      if (!encoded) return;
      try {
        const raw = decodeURIComponent(escape(atob(encoded)));
        el.removeAttribute("data-mermaid");
        el.innerHTML = `<div class="mermaid-loading" style="color:#3B506D;font-size:12px">Renderizando diagrama...</div>`;

        const id = el.id || `mermaid-${Date.now()}`;
        mermaid.render(id + "-svg", raw).then(({ svg }) => {
          el.innerHTML = svg;
          const svgEl = el.querySelector("svg");
          if (svgEl) {
            svgEl.style.maxWidth = "100%";
            svgEl.style.height = "auto";
          }
        }).catch((err) => {
          el.innerHTML = `<pre style="color:#f87171;font-size:11px;white-space:pre-wrap;padding:12px">${String(err)}</pre>`;
        });
      } catch {
        el.innerHTML = `<p style="color:#f87171;font-size:12px;padding:12px">Error al decodificar diagrama</p>`;
      }
    });
  }, [content]);

  return (
    <div className="flex h-full">
      <aside className="w-64 flex-shrink-0 bg-navy border-r border-silver/15 overflow-y-auto">
        <div className="p-4 border-b border-silver/15">
          <h2 className="text-xs font-bold text-cool-steel/55 uppercase tracking-wider">Base de Conocimiento</h2>
          <p className="text-[10px] text-cool-steel/40 mt-1">{ALL_FILES.length} documentos</p>
        </div>
        <nav className="p-2">
          {GROUPS.map((group) => {
            const files = ALL_FILES.filter((f) => f.group === group);
            if (!files.length) return null;
            return (
              <div key={group} className="mb-2">
                <button
                  onClick={() => setOpenGroup(openGroup === group ? "" : group)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold text-cool-steel/55 uppercase tracking-wider hover:text-cool-steel transition"
                >
                  {group}
                  <i className={`ti ${openGroup === group ? "ti-chevron-down" : "ti-chevron-right"} text-xs`} />
                </button>
                {openGroup === group && (
                  <div className="space-y-0.5">
                    {files.map((f) => (
                      <button
                        key={f.file}
                        onClick={() => setActive(f)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center gap-2 ${
                          active.file === f.file
                            ? "bg-cl-accent/10 border border-cl-accent/20"
                            : "hover:bg-silver/10 border border-transparent"
                        }`}
                      >
                        <i className={`ti ${f.icon} text-sm flex-shrink-0 ${active.file === f.file ? "text-cl-accent" : f.color}`} />
                        <span className={`text-xs font-medium truncate ${active.file === f.file ? "text-cl-accent" : "text-silver"}`}>
                          {f.label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-navy border-b border-silver/15 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-silver/10">
              <i className={`ti ${active.icon} text-sm ${active.color}`} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{active.label}</h3>
              <p className="text-[11px] text-cool-steel">{active.desc}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {active.group === "Arquitectura" && (
              <span className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <i className="ti ti-chart-dots-3 text-xs" /> Mermaid
              </span>
            )}
            <a
              href={`/${active.file}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cool-steel hover:text-white bg-silver/10 hover:bg-silver/15 rounded-lg transition-all no-underline"
            >
              <i className="ti ti-external-link text-sm" /> Abrir
            </a>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-32 gap-3">
              <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
              <p className="text-cool-steel text-sm">Cargando documento...</p>
            </div>
          ) : content ? (
            <article
              ref={articleRef}
              className="max-w-4xl"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
              <div className="w-12 h-12 rounded-xl bg-silver/10 flex items-center justify-center">
                <i className="ti ti-file-off text-2xl text-cool-steel/40" />
              </div>
              <div>
                <p className="text-silver text-sm font-medium">Documento no disponible</p>
                <p className="text-cool-steel/50 text-xs mt-1">Este archivo no existe en el servidor actual</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

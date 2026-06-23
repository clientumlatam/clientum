import { useState, useEffect } from "react";
import { mdToHtml } from "../../lib/markdown";

const README_FILES = [
  { id: "akshaytanwar", label: "AI Sales Closer", file: "akshaytanwar_ai-sales-closer.md", color: "text-orange-400", icon: "ti-target" },
  { id: "assist-ai", label: "Assist+ AI Service", file: "assist-plus_ai-service.md", color: "text-cl-accent", icon: "ti-brain" },
  { id: "assist-api", label: "Assist+ API", file: "assist-plus_api.md", color: "text-cl-accent", icon: "ti-api" },
  { id: "assist-web", label: "Assist+ Web App", file: "assist-plus_web-app.md", color: "text-cl-accent", icon: "ti-world" },
  { id: "autonoma", label: "Autonoma Control Tower", file: "autonoma_control-tower.md", color: "text-purple-400", icon: "ti-cpu" },
  { id: "evo-rag", label: "Evolution API + RAG", file: "diegoperea20_evolutionapi-whatsapp-rag.md", color: "text-green-400", icon: "ti-brand-whatsapp" },
  { id: "javier-adr", label: "ADRs WhatsApp SaaS", file: "javier407_architecture-decisions.md", color: "text-cl-blue", icon: "ti-file-code" },
  { id: "javier-main", label: "WhatsApp AI SaaS", file: "javier407_whatsapp-ai-saas.md", color: "text-cl-blue", icon: "ti-network" },
  { id: "jawwad", label: "AI Customer Support", file: "jawwad-ali_ai-customer-support-agent.md", color: "text-yellow-400", icon: "ti-headset" },
  { id: "ai-safe", label: "AI Safe Automation", file: "mharisbaig_ai-safe-business-automation.md", color: "text-red-400", icon: "ti-shield-check" },
  { id: "assist-overview", label: "Assist+ Overview", file: "mu7ammad-3li_assist-plus-overview.md", color: "text-cl-accent", icon: "ti-layout-dashboard" },
  { id: "autonoma-main", label: "Autonoma Platform", file: "muhammadusmanGM_autonoma.md", color: "text-purple-400", icon: "ti-robot" },
  { id: "receptionist", label: "AI Receptionist SaaS", file: "nimalan07_ai-receptionist-saas.md", color: "text-pink-400", icon: "ti-user-check" },
  { id: "wappai", label: "WhatsApp AI Assistant", file: "wappai_whatsapp-ai-assistant.md", color: "text-green-400", icon: "ti-message-chatbot" },
  { id: "whisper", label: "Whisper Models Info", file: "wappai_whisper-models-info.md", color: "text-cool-steel", icon: "ti-microphone" },
];

type Section = "analysis" | "features" | "checklist" | "readme";

export default function ResearchPage() {
  const [section, setSection] = useState<Section>("analysis");
  const [readmeId, setReadmeId] = useState(README_FILES[0].id);
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const activeReadme = README_FILES.find(r => r.id === readmeId) ?? README_FILES[0];

  useEffect(() => {
    if (section === "analysis") {
      setLoading(true);
      fetch("/research/repo_analysis.txt")
        .then(r => r.text())
        .then(t => { setContent(t); setLoading(false); })
        .catch(() => { setContent("Error cargando archivo."); setLoading(false); });
    }
  }, [section]);

  useEffect(() => {
    if (section === "readme") {
      setLoading(true);
      fetch(`/research/readmes/${activeReadme.file}`)
        .then(r => r.text())
        .then(t => { setContent(t); setLoading(false); })
        .catch(() => { setContent("Error cargando README."); setLoading(false); });
    }
  }, [section, readmeId]);

  const tabs: { id: Section; label: string; icon: string }[] = [
    { id: "analysis", label: "Análisis de Repos", icon: "ti-file-analytics" },
    { id: "features", label: "Features vs Repos", icon: "ti-table" },
    { id: "checklist", label: "Checklist vs Repos", icon: "ti-checklist" },
    { id: "readme", label: "READMEs de Referencia", icon: "ti-book-2" },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1 px-5 pt-4 pb-0 border-b border-silver/15 flex-shrink-0">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setSection(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border border-b-0 ${
              section === t.id
                ? "bg-navy border-silver/20 text-cl-accent"
                : "bg-transparent border-transparent text-cool-steel hover:text-silver"
            }`}
          >
            <i className={`ti ${t.icon} text-sm`} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden flex">
        {section === "readme" && (
          <aside className="w-60 flex-shrink-0 bg-navy border-r border-silver/15 overflow-y-auto">
            <div className="p-3 border-b border-silver/15">
              <p className="text-[10px] font-bold text-cool-steel/55 uppercase tracking-wider">
                {README_FILES.length} READMEs
              </p>
            </div>
            <nav className="p-2 space-y-0.5">
              {README_FILES.map(r => (
                <button
                  key={r.id}
                  onClick={() => setReadmeId(r.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center gap-2 ${
                    readmeId === r.id
                      ? "bg-cl-accent/10 text-cl-accent border border-cl-accent/20"
                      : "text-cool-steel hover:text-white hover:bg-silver/10 border border-transparent"
                  }`}
                >
                  <i className={`ti ${r.icon} text-sm ${readmeId === r.id ? "text-cl-accent" : r.color}`} />
                  <span className="truncate font-semibold">{r.label}</span>
                </button>
              ))}
            </nav>
          </aside>
        )}

        <div className="flex-1 overflow-hidden">
          {(section === "features" || section === "checklist") && (
            <iframe
              key={section}
              src={section === "features" ? "/research/features_vs_repos.html" : "/research/checklist_vs_repos.html"}
              className="w-full h-full border-0 bg-white"
              title={section === "features" ? "Features vs Repos" : "Checklist vs Repos"}
            />
          )}

          {(section === "analysis" || section === "readme") && (
            <div className="h-full overflow-y-auto p-6">
              {loading ? (
                <div className="flex items-center gap-3 text-cool-steel text-sm">
                  <i className="ti ti-loader-2 animate-spin text-lg" /> Cargando…
                </div>
              ) : (
                <>
                  {section === "readme" && (
                    <div className="flex items-center gap-3 mb-5 pb-4 border-b border-silver/15">
                      <div className={`w-9 h-9 rounded-lg bg-silver/10 flex items-center justify-center`}>
                        <i className={`ti ${activeReadme.icon} text-base ${activeReadme.color}`} />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-white">{activeReadme.label}</h2>
                        <p className="text-[10px] text-cool-steel font-mono">{activeReadme.file}</p>
                      </div>
                      <a
                        href={`/research/readmes/${activeReadme.file}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs text-cool-steel hover:text-white bg-silver/10 hover:bg-silver/15 rounded-lg transition-all no-underline"
                      >
                        <i className="ti ti-external-link text-sm" /> Abrir
                      </a>
                    </div>
                  )}
                  <div
                    className="md-body"
                    dangerouslySetInnerHTML={{ __html: mdToHtml(content) }}
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

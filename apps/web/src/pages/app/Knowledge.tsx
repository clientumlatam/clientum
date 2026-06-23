import { useState } from "react";

const indexed = [
  { name: "Catálogo_Pinturas_2026.pdf", chunks: 124, size: "2.3 MB" },
  { name: "FAQ_Herramientas.docx", chunks: 38, size: "412 KB" },
  { name: "Lista_Precios_Mayoristas.xlsx", chunks: 312, size: "1.8 MB" },
  { name: "Politica_Devoluciones.md", chunks: 8, size: "12 KB" },
];

const logs = [
  "> Iniciando carga de archivo...",
  "> Ejecutando splitter de texto (500 chars)...",
  "> Generando embeddings (text-embedding-3-small)...",
  "> Guardando vectores en ChromaDB... ¡Éxito!",
];

export default function Knowledge() {
  const [indexing, setIndexing] = useState(false);

  return (
    <section className="p-8 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div className="bg-navy-card border border-silver/15 rounded-2xl p-6 space-y-6">
          <h3 className="text-sm font-bold text-silver uppercase tracking-wider">Documentos de la Base RAG</h3>

          <button
            onClick={() => {
              setIndexing(true);
              setTimeout(() => setIndexing(false), 3000);
            }}
            className="w-full border-2 border-dashed border-silver/20 rounded-2xl p-6 text-center bg-navy-card2 hover:border-cl-accent/30 transition-all"
          >
            <i className="ti ti-upload text-3xl text-cl-accent block mb-2" />
            <p className="text-xs font-bold text-white/90">Subir documento a la base RAG</p>
            <p className="text-[10px] text-cool-steel mt-1">PDF, DOCX, XLSX o MD — split de chunks y embeddings en ChromaDB</p>
            {indexing && (
              <div className="text-left font-mono text-[10px] bg-navy p-3 rounded-lg mt-3 text-cl-accent border border-cl-accent/20 space-y-1">
                {logs.map((l, i) => (
                  <div key={i} className="animate-pulse" style={{ animationDelay: `${i * 0.3}s` }}>
                    {l}
                  </div>
                ))}
              </div>
            )}
          </button>

          <div className="space-y-3">
            <div className="text-[10px] font-bold text-cool-steel/55 uppercase tracking-wider">Archivos Indexados</div>
            <div className="space-y-2">
              {indexed.map((f) => (
                <div
                  key={f.name}
                  className="bg-navy-3/50 border border-silver/15 rounded-xl px-4 py-3 flex items-center justify-between hover:border-silver/20 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-cl-blue/10 text-cl-blue rounded-lg flex items-center justify-center">
                      <i className="ti ti-file-text" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{f.name}</div>
                      <div className="text-[10px] text-cool-steel">
                        {f.chunks} chunks · {f.size}
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-cl-accent/10 text-cl-accent text-[9px] font-bold uppercase rounded-full">
                    Indexado
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-navy-card border border-silver/15 rounded-2xl p-6 space-y-5 h-fit">
          <h3 className="text-sm font-bold text-silver uppercase tracking-wider border-b border-silver/15 pb-3">
            Información Corporativa de Prioridad
          </h3>
          <p className="text-[11px] text-cool-steel leading-relaxed">
            Datos del negocio que el bot responderá inmediatamente sin necesidad de buscar en la base vectorial.
          </p>
          <CorporateField label="CEO / Fundador" defaultValue="Carlos Robles" />
          <CorporateField label="Sede Central / Local" defaultValue="Rosario, Santa Fe" />
          <CorporateField label="Contacto de Soporte" defaultValue="soporte@ferreteriarobles.ar" />
          <button className="w-full bg-cl-accent text-navy py-2 rounded-lg font-bold text-xs hover:bg-cl-accent-hover transition-all flex items-center justify-center gap-2">
            <i className="ti ti-device-floppy" /> Guardar Datos Corporativos
          </button>
        </div>
      </div>
    </section>
  );
}

function CorporateField({ label, defaultValue }: { label: string; defaultValue: string }) {
  return (
    <div>
      <label className="text-[11px] font-bold text-cool-steel block mb-1">{label}</label>
      <input
        type="text"
        defaultValue={defaultValue}
        className="w-full bg-navy-3 border border-silver/20 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cl-accent"
      />
    </div>
  );
}

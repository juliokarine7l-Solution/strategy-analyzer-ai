import { useMemo, useState } from "react";
import type { Presentation, Slide } from "@/lib/apresentacao";
import { presentationToOutline } from "@/lib/apresentacao";

export function Apresentacao({ presentation }: { presentation: Presentation }) {
  const [idx, setIdx] = useState(0);
  const slide = presentation.slides[idx];
  const outline = useMemo(() => presentationToOutline(presentation), [presentation]);
  const jsonStr = useMemo(() => JSON.stringify(presentation, null, 2), [presentation]);

  function download(filename: string, content: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copy(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    alert(`${label} copiado para a área de transferência.`);
  }

  return (
    <div className="grid md:grid-cols-[260px_1fr] gap-6">
      {/* Sidebar */}
      <aside className="space-y-1 md:sticky md:top-4 self-start max-h-[80vh] overflow-y-auto pr-2">
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 px-2">Slides</div>
        {presentation.slides.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setIdx(i)}
            className={`w-full text-left rounded-md px-3 py-2 text-sm transition border ${
              i === idx
                ? "bg-brand text-brand-foreground border-brand"
                : "bg-surface border-border hover:border-brand/60 hover:bg-surface-elevated text-foreground"
            }`}
          >
            <span className="font-mono text-xs opacity-70 mr-2">{String(i + 1).padStart(2, "0")}</span>
            {s.title}
          </button>
        ))}

        <div className="pt-4 mt-4 border-t border-border space-y-2">
          <div className="text-xs uppercase tracking-widest text-muted-foreground px-2 mb-1">Exportar</div>
          <ExportBtn onClick={() => download(`apresentacao-${slugify(presentation.title)}.json`, jsonStr, "application/json")}>
            ⬇ JSON estruturado
          </ExportBtn>
          <ExportBtn onClick={() => download(`apresentacao-${slugify(presentation.title)}.md`, outline, "text/markdown")}>
            ⬇ Outline (Gamma / Slides)
          </ExportBtn>
          <ExportBtn onClick={() => copy(outline, "Outline")}>📋 Copiar outline</ExportBtn>
          <ExportBtn onClick={() => copy(jsonStr, "JSON")}>📋 Copiar JSON</ExportBtn>
        </div>
      </aside>

      {/* Slide canvas */}
      <div>
        <div className="aspect-[16/9] rounded-xl border border-border bg-gradient-to-br from-surface to-background p-8 md:p-12 shadow-2xl">
          <SlideView slide={slide} index={idx} total={presentation.slides.length} brand={presentation.title} />
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="px-4 py-2 rounded-md border border-border bg-surface hover:bg-surface-elevated disabled:opacity-40"
          >
            ← Anterior
          </button>
          <span className="font-mono text-muted-foreground">
            {String(idx + 1).padStart(2, "0")} / {String(presentation.slides.length).padStart(2, "0")}
          </span>
          <button
            onClick={() => setIdx((i) => Math.min(presentation.slides.length - 1, i + 1))}
            disabled={idx === presentation.slides.length - 1}
            className="px-4 py-2 rounded-md border border-border bg-surface hover:bg-surface-elevated disabled:opacity-40"
          >
            Próximo →
          </button>
        </div>

        {/* Visual notes */}
        {slide.visualNotes && (
          <p className="mt-4 text-xs text-muted-foreground italic">📐 {slide.visualNotes}</p>
        )}
      </div>
    </div>
  );
}

function ExportBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left text-sm rounded-md border border-border bg-surface px-3 py-2 hover:border-brand/60 hover:bg-surface-elevated transition"
    >
      {children}
    </button>
  );
}

function SlideView({ slide, index, total, brand }: { slide: Slide; index: number; total: number; brand: string }) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-brand">
            {slide.type.replace("-", " ")}
          </div>
          <h3 className="mt-2 text-2xl md:text-4xl font-display uppercase leading-tight">{slide.title}</h3>
          {slide.subtitle && <p className="mt-1 text-sm md:text-base text-muted-foreground">{slide.subtitle}</p>}
        </div>
        <div className="text-right text-xs text-muted-foreground font-mono">
          <div>{String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 flex-1 min-h-0 overflow-auto">
        {slide.metrics.length > 0 && (
          <div className={`grid gap-3 ${slide.metrics.length >= 4 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-1 md:grid-cols-3"}`}>
            {slide.metrics.map((m, i) => (
              <div key={i} className="rounded-lg border border-border bg-surface/60 p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{m.label}</div>
                <div className="mt-1 text-2xl font-display text-brand">{m.value}</div>
                {m.hint && <div className="text-xs text-muted-foreground mt-1">{m.hint}</div>}
              </div>
            ))}
          </div>
        )}

        {slide.charts.map((c, i) => (
          <div key={i} className="rounded-lg border border-border bg-surface/40 p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">{c.title}</div>
            <div className="space-y-2">
              {c.data.map((d, j) => {
                const pct = Math.min(100, (d.value / (d.max || 5)) * 100);
                return (
                  <div key={j}>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{d.label}</span>
                      <span className="font-mono text-brand">{d.value.toFixed(1)}{d.max ? `/${d.max}` : ""}</span>
                    </div>
                    <div className="h-2 rounded-full bg-input overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand to-brand/60"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {slide.keyPoints.length > 0 && (
          <ul className="space-y-2">
            {slide.keyPoints.map((k, i) => (
              <li key={i} className="flex gap-3 text-sm md:text-base">
                <span className="text-brand font-mono shrink-0">→</span>
                <span>{k}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-border flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>{brand}</span>
        <span>Diagnóstico STEP</span>
      </div>
    </div>
  );
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

import { useMemo, useRef, useState } from "react";
import type { Presentation, Slide } from "@/lib/apresentacao";
import { presentationToOutline } from "@/lib/apresentacao";

export function Apresentacao({ presentation }: { presentation: Presentation }) {
  const [idx, setIdx] = useState(0);
  const slide = presentation.slides[idx];
  const outline = useMemo(() => presentationToOutline(presentation), [presentation]);
  const jsonStr = useMemo(() => JSON.stringify(presentation, null, 2), [presentation]);
  const pdfStageRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

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

  async function exportPDF() {
    if (!pdfStageRef.current) return;
    setExporting(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);
      const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [1920, 1080] });
      const nodes = Array.from(
        pdfStageRef.current.querySelectorAll<HTMLDivElement>("[data-pdf-slide]"),
      );
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const canvas = await html2canvas(node, {
          backgroundColor: "#1a0808",
          scale: 1,
          width: 1920,
          height: 1080,
          windowWidth: 1920,
          windowHeight: 1080,
          logging: false,
          useCORS: true,
        });
        const img = canvas.toDataURL("image/jpeg", 0.92);
        if (i > 0) pdf.addPage([1920, 1080], "landscape");
        pdf.addImage(img, "JPEG", 0, 0, 1920, 1080);
      }
      pdf.save(`apresentacao-${slugify(presentation.title)}.pdf`);
    } catch (e) {
      alert("Falha ao gerar PDF: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setExporting(false);
    }
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
          <ExportBtn onClick={exportPDF} disabled={exporting}>
            {exporting ? "⏳ Gerando PDF..." : "⬇ PDF (16:9)"}
          </ExportBtn>
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

      {/* Slide canvas (preview) */}
      <div>
        <div className="aspect-[16/9] rounded-xl border border-border bg-gradient-to-br from-surface to-background overflow-hidden shadow-2xl">
          <PdfSlide slide={slide} index={idx} total={presentation.slides.length} brand={presentation.title} scale="responsive" />
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

        {slide.visualNotes && (
          <p className="mt-4 text-xs text-muted-foreground italic">📐 {slide.visualNotes}</p>
        )}
      </div>

      {/* Offscreen PDF stage — 1920x1080 cada slide */}
      <div
        ref={pdfStageRef}
        aria-hidden
        style={{
          position: "fixed",
          left: "-99999px",
          top: 0,
          width: 1920,
          pointerEvents: "none",
          opacity: 0,
        }}
      >
        {presentation.slides.map((s, i) => (
          <div key={s.id} data-pdf-slide>
            <PdfSlide
              slide={s}
              index={i}
              total={presentation.slides.length}
              brand={presentation.title}
              scale="full"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ExportBtn({
  onClick,
  children,
  disabled,
}: {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full text-left text-sm rounded-md border border-border bg-surface px-3 py-2 hover:border-brand/60 hover:bg-surface-elevated transition disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

/**
 * Slide renderizado com tipografia semelhante a slides reais.
 * - scale="full" → fixo 1920x1080 (para captura PDF)
 * - scale="responsive" → preenche o container do preview
 */
function PdfSlide({
  slide,
  index,
  total,
  brand,
  scale,
}: {
  slide: Slide;
  index: number;
  total: number;
  brand: string;
  scale: "full" | "responsive";
}) {
  const isFull = scale === "full";
  const root: React.CSSProperties = isFull
    ? {
        width: 1920,
        height: 1080,
        padding: 96,
        background: "linear-gradient(135deg, #2a0e0e 0%, #1a0808 100%)",
        color: "#fafafa",
        fontFamily: "Inter, system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }
    : {
        width: "100%",
        height: "100%",
        padding: "clamp(20px, 4vw, 60px)",
        background: "linear-gradient(135deg, #2a0e0e 0%, #1a0808 100%)",
        color: "#fafafa",
        fontFamily: "Inter, system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      };

  const f = (px: number) => (isFull ? `${px}px` : `clamp(${px * 0.35}px, ${(px / 1920) * 100}vw, ${px}px)`);
  const brandColor = "#e63946";

  return (
    <div style={root}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 32 }}>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: f(22),
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: brandColor,
              fontWeight: 600,
            }}
          >
            {slide.type.replace(/-/g, " ")}
          </div>
          <h1
            style={{
              fontFamily: "Anton, Impact, sans-serif",
              fontSize: f(88),
              lineHeight: 1.0,
              letterSpacing: "-0.02em",
              textTransform: "uppercase",
              margin: `${f(16)} 0 0`,
              color: "#fafafa",
            }}
          >
            {slide.title}
          </h1>
          {slide.subtitle && (
            <p style={{ fontSize: f(32), lineHeight: 1.2, color: "#bdb5b5", margin: `${f(12)} 0 0` }}>
              {slide.subtitle}
            </p>
          )}
        </div>
        <div
          style={{
            fontSize: f(20),
            fontFamily: "JetBrains Mono, ui-monospace, monospace",
            color: "#8b7a7a",
            letterSpacing: "0.1em",
          }}
        >
          {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </div>
      </div>

      {/* Body */}
      <div style={{ marginTop: f(48), flex: 1, display: "flex", flexDirection: "column", gap: f(32), minHeight: 0 }}>
        {slide.metrics.length > 0 && (
          <div
            style={{
              display: "grid",
              gap: f(20),
              gridTemplateColumns: `repeat(${Math.min(slide.metrics.length, 4)}, 1fr)`,
            }}
          >
            {slide.metrics.map((m, i) => (
              <div
                key={i}
                style={{
                  borderRadius: f(12),
                  border: "1px solid rgba(230,57,70,0.25)",
                  background: "rgba(255,255,255,0.04)",
                  padding: f(24),
                }}
              >
                <div
                  style={{
                    fontSize: f(20),
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    color: "#bdb5b5",
                  }}
                >
                  {m.label}
                </div>
                <div
                  style={{
                    fontFamily: "Anton, Impact, sans-serif",
                    fontSize: f(56),
                    color: brandColor,
                    marginTop: f(8),
                    lineHeight: 1,
                  }}
                >
                  {m.value}
                </div>
                {m.hint && (
                  <div style={{ fontSize: f(18), color: "#8b7a7a", marginTop: f(6) }}>{m.hint}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {slide.charts.map((c, i) => (
          <div
            key={i}
            style={{
              borderRadius: f(12),
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(0,0,0,0.25)",
              padding: f(24),
            }}
          >
            <div
              style={{
                fontSize: f(22),
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "#bdb5b5",
                marginBottom: f(16),
              }}
            >
              {c.title}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: f(12) }}>
              {c.data.map((d, j) => {
                const pct = Math.min(100, (d.value / (d.max || 5)) * 100);
                return (
                  <div key={j}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: f(22),
                        marginBottom: f(6),
                        color: "#fafafa",
                      }}
                    >
                      <span>{d.label}</span>
                      <span style={{ fontFamily: "JetBrains Mono, monospace", color: brandColor }}>
                        {d.value.toFixed(1)}
                        {d.max ? `/${d.max}` : ""}
                      </span>
                    </div>
                    <div
                      style={{
                        height: f(12),
                        borderRadius: f(999),
                        background: "rgba(255,255,255,0.08)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, ${brandColor}, rgba(230,57,70,0.5))`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {slide.keyPoints.length > 0 && (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: f(14) }}>
            {slide.keyPoints.slice(0, 6).map((k, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  gap: f(16),
                  fontSize: f(28),
                  lineHeight: 1.32,
                  color: "#fafafa",
                }}
              >
                <span style={{ color: brandColor, fontFamily: "JetBrains Mono, monospace", flexShrink: 0 }}>→</span>
                <span>{k}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: f(32),
          paddingTop: f(20),
          borderTop: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          justifyContent: "space-between",
          fontSize: f(16),
          textTransform: "uppercase",
          letterSpacing: "0.2em",
          color: "#8b7a7a",
        }}
      >
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

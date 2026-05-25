import { useEffect, useMemo, useRef, useState } from "react";
import type { Presentation, Slide } from "@/lib/apresentacao";
import { presentationToOutline } from "@/lib/apresentacao";

export function Apresentacao({ presentation }: { presentation: Presentation }) {
  // Editable local copy of the presentation
  const [draft, setDraft] = useState<Presentation>(presentation);
  useEffect(() => setDraft(presentation), [presentation]);

  const [idx, setIdx] = useState(0);
  const [editing, setEditing] = useState(false);
  const slide = draft.slides[idx];
  const outline = useMemo(() => presentationToOutline(draft), [draft]);
  const jsonStr = useMemo(() => JSON.stringify(draft, null, 2), [draft]);
  const pdfStageRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<"pdf" | "pptx" | null>(null);

  function patchSlide(i: number, patch: Partial<Slide>) {
    setDraft((d) => ({
      ...d,
      slides: d.slides.map((s, k) => (k === i ? { ...s, ...patch } : s)),
    }));
  }

  function download(filename: string, content: string | Blob, mime: string) {
    const blob = typeof content === "string" ? new Blob([content], { type: mime }) : content;
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
    setExporting("pdf");
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
        const canvas = await html2canvas(nodes[i], {
          backgroundColor: draft.brandStyle.palette.background,
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
      pdf.save(`apresentacao-${slugify(draft.title)}.pdf`);
    } catch (e) {
      alert("Falha ao gerar PDF: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setExporting(null);
    }
  }

  async function exportPPTX() {
    setExporting("pptx");
    try {
      const PptxGenJS = (await import("pptxgenjs")).default;
      const pptx = new PptxGenJS();
      pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in (16:9)
      pptx.title = draft.title;
      pptx.subject = draft.subtitle;

      const hexFromCss = (css: string, fallback: string) => {
        if (!css) return fallback;
        if (css.startsWith("#")) return css.replace("#", "").slice(0, 6).toUpperCase();
        // hsl(h s% l%) → render via canvas to extract rgb
        try {
          const c = document.createElement("canvas");
          c.width = c.height = 1;
          const ctx = c.getContext("2d")!;
          ctx.fillStyle = css;
          ctx.fillRect(0, 0, 1, 1);
          const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
          return [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
        } catch {
          return fallback;
        }
      };
      const BG = hexFromCss(draft.brandStyle.palette.background, "1A0808");
      const BG2 = hexFromCss(draft.brandStyle.palette.surface, "2A0E0E");
      const BRAND = hexFromCss(draft.brandStyle.palette.accent, "E63946");
      const TEXT = "FAFAFA";
      const MUTED = "BDB5B5";
      const DIM = "8B7A7A";

      draft.slides.forEach((s, i) => {
        const slide = pptx.addSlide();
        slide.background = { color: BG };

        // Top color bar
        slide.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.12, fill: { color: BRAND } });

        // Kicker
        slide.addText(s.type.replace(/-/g, " ").toUpperCase(), {
          x: 0.6, y: 0.35, w: 10, h: 0.35,
          fontSize: 11, color: BRAND, bold: true, charSpacing: 4,
          fontFace: "Calibri",
        });

        // Title
        slide.addText(s.title, {
          x: 0.6, y: 0.7, w: 11.5, h: 1.2,
          fontSize: 36, bold: true, color: TEXT, fontFace: "Calibri",
        });

        // Subtitle
        if (s.subtitle) {
          slide.addText(s.subtitle, {
            x: 0.6, y: 1.85, w: 11.5, h: 0.5,
            fontSize: 16, color: MUTED, fontFace: "Calibri",
          });
        }

        // Page number
        slide.addText(`${String(i + 1).padStart(2, "0")} / ${String(draft.slides.length).padStart(2, "0")}`, {
          x: 11.8, y: 0.35, w: 1.2, h: 0.35,
          fontSize: 10, color: DIM, align: "right", fontFace: "Consolas",
        });

        let yCursor = 2.6;

        // Metrics row
        if (s.metrics.length) {
          const n = Math.min(s.metrics.length, 4);
          const totalW = 12.13;
          const gap = 0.2;
          const w = (totalW - gap * (n - 1)) / n;
          s.metrics.slice(0, n).forEach((m, k) => {
            const x = 0.6 + k * (w + gap);
            slide.addShape("roundRect", {
              x, y: yCursor, w, h: 1.5,
              fill: { color: BG2 },
              line: { color: BRAND, width: 0.75, transparency: 70 },
              rectRadius: 0.08,
            });
            slide.addText(m.label.toUpperCase(), {
              x: x + 0.2, y: yCursor + 0.15, w: w - 0.4, h: 0.35,
              fontSize: 10, color: MUTED, charSpacing: 2, fontFace: "Calibri",
            });
            slide.addText(m.value, {
              x: x + 0.2, y: yCursor + 0.5, w: w - 0.4, h: 0.7,
              fontSize: 28, bold: true, color: BRAND, fontFace: "Calibri",
            });
            if (m.hint) {
              slide.addText(m.hint, {
                x: x + 0.2, y: yCursor + 1.15, w: w - 0.4, h: 0.3,
                fontSize: 9, color: DIM, fontFace: "Calibri",
              });
            }
          });
          yCursor += 1.7;
        }

        // Charts (bars)
        s.charts.forEach((c) => {
          slide.addText(c.title.toUpperCase(), {
            x: 0.6, y: yCursor, w: 12, h: 0.3,
            fontSize: 11, color: MUTED, charSpacing: 2, fontFace: "Calibri",
          });
          yCursor += 0.4;
          const rowH = 0.4;
          c.data.forEach((d) => {
            slide.addText(d.label, {
              x: 0.6, y: yCursor, w: 3, h: rowH,
              fontSize: 12, color: TEXT, fontFace: "Calibri",
            });
            slide.addText(`${d.value.toFixed(1)}${d.max ? `/${d.max}` : ""}`, {
              x: 11.5, y: yCursor, w: 1.3, h: rowH,
              fontSize: 12, color: BRAND, align: "right", fontFace: "Consolas",
            });
            const barX = 3.8;
            const barW = 7.5;
            slide.addShape("roundRect", {
              x: barX, y: yCursor + 0.12, w: barW, h: 0.16,
              fill: { color: "2A1414" }, line: { color: "2A1414", width: 0 }, rectRadius: 0.08,
            });
            const pct = Math.min(1, d.value / (d.max || 5));
            slide.addShape("roundRect", {
              x: barX, y: yCursor + 0.12, w: Math.max(0.05, barW * pct), h: 0.16,
              fill: { color: BRAND }, line: { color: BRAND, width: 0 }, rectRadius: 0.08,
            });
            yCursor += rowH;
          });
          yCursor += 0.2;
        });

        // Key points
        if (s.keyPoints.length && yCursor < 6.8) {
          const remaining = 6.9 - yCursor;
          slide.addText(
            s.keyPoints.slice(0, 6).map((k) => ({ text: k, options: { bullet: { code: "2192" } } })),
            {
              x: 0.6, y: yCursor, w: 12.13, h: remaining,
              fontSize: 14, color: TEXT, fontFace: "Calibri",
              paraSpaceAfter: 6, valign: "top",
            },
          );
        }

        // Footer
        slide.addText(draft.title, {
          x: 0.6, y: 7.05, w: 8, h: 0.3,
          fontSize: 9, color: DIM, charSpacing: 3, fontFace: "Calibri",
        });
        slide.addText("DIAGNÓSTICO STEP", {
          x: 8.6, y: 7.05, w: 4.13, h: 0.3,
          fontSize: 9, color: DIM, charSpacing: 3, align: "right", fontFace: "Calibri",
        });
      });

      await pptx.writeFile({ fileName: `apresentacao-${slugify(draft.title)}.pptx` });
    } catch (e) {
      alert("Falha ao gerar PPTX: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="grid md:grid-cols-[260px_1fr] gap-6">
      {/* Sidebar */}
      <aside className="space-y-1 md:sticky md:top-4 self-start max-h-[85vh] overflow-y-auto pr-2">
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 px-2">
          Slides ({draft.slides.length})
        </div>
        {draft.slides.map((s, i) => (
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
          <div className="text-xs uppercase tracking-widest text-muted-foreground px-2 mb-1">Modo</div>
          <ExportBtn onClick={() => setEditing((e) => !e)}>
            {editing ? "✓ Concluir edição" : "✎ Editar slide"}
          </ExportBtn>

          <div className="text-xs uppercase tracking-widest text-muted-foreground px-2 mt-3 mb-1">Exportar</div>
          <ExportBtn onClick={exportPDF} disabled={exporting !== null}>
            {exporting === "pdf" ? "⏳ Gerando PDF..." : "⬇ PDF (16:9)"}
          </ExportBtn>
          <ExportBtn onClick={exportPPTX} disabled={exporting !== null}>
            {exporting === "pptx" ? "⏳ Gerando PPTX..." : "⬇ PowerPoint (.pptx)"}
          </ExportBtn>
          <ExportBtn onClick={() => download(`apresentacao-${slugify(draft.title)}.json`, jsonStr, "application/json")}>
            ⬇ JSON estruturado
          </ExportBtn>
          <ExportBtn onClick={() => download(`apresentacao-${slugify(draft.title)}.md`, outline, "text/markdown")}>
            ⬇ Outline (Gamma / Slides)
          </ExportBtn>
          <ExportBtn onClick={() => copy(outline, "Outline")}>📋 Copiar outline</ExportBtn>
          <ExportBtn onClick={() => copy(jsonStr, "JSON")}>📋 Copiar JSON</ExportBtn>
        </div>
      </aside>

      {/* Slide canvas (preview) */}
      <div>
        <div className="aspect-[16/9] rounded-xl border border-border bg-gradient-to-br from-surface to-background overflow-hidden shadow-2xl">
          <PdfSlide
            slide={slide}
            index={idx}
            total={draft.slides.length}
            brand={draft.title}
            scale="responsive"
          />
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
            {String(idx + 1).padStart(2, "0")} / {String(draft.slides.length).padStart(2, "0")}
          </span>
          <button
            onClick={() => setIdx((i) => Math.min(draft.slides.length - 1, i + 1))}
            disabled={idx === draft.slides.length - 1}
            className="px-4 py-2 rounded-md border border-border bg-surface hover:bg-surface-elevated disabled:opacity-40"
          >
            Próximo →
          </button>
        </div>

        {editing && (
          <SlideEditor
            slide={slide}
            onChange={(patch) => patchSlide(idx, patch)}
          />
        )}

        {!editing && slide.visualNotes && (
          <p className="mt-4 text-xs text-muted-foreground italic">📐 {slide.visualNotes}</p>
        )}
      </div>

      {/* Offscreen PDF stage — 1920x1080 each slide */}
      <div
        ref={pdfStageRef}
        aria-hidden
        style={{ position: "fixed", left: "-99999px", top: 0, width: 1920, pointerEvents: "none", opacity: 0 }}
      >
        {draft.slides.map((s, i) => (
          <div key={s.id} data-pdf-slide>
            <PdfSlide slide={s} index={i} total={draft.slides.length} brand={draft.title} scale="full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideEditor({ slide, onChange }: { slide: Slide; onChange: (patch: Partial<Slide>) => void }) {
  return (
    <div className="mt-6 rounded-lg border border-brand/40 bg-surface p-5 space-y-4">
      <div className="text-xs uppercase tracking-widest text-brand">Edição do slide</div>

      <label className="block">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Título</div>
        <input
          className="input"
          value={slide.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </label>

      <label className="block">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Subtítulo</div>
        <input
          className="input"
          value={slide.subtitle ?? ""}
          onChange={(e) => onChange({ subtitle: e.target.value })}
        />
      </label>

      <label className="block">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
          Bullet points (1 por linha)
        </div>
        <textarea
          className="input min-h-32 resize-y"
          value={slide.keyPoints.join("\n")}
          onChange={(e) =>
            onChange({ keyPoints: e.target.value.split("\n").map((s) => s).filter((s) => s.trim().length > 0) })
          }
        />
      </label>

      {slide.metrics.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Métricas</div>
          <div className="grid gap-2">
            {slide.metrics.map((m, i) => (
              <div key={i} className="grid grid-cols-[1fr_120px_1fr] gap-2">
                <input
                  className="input"
                  value={m.label}
                  onChange={(e) => {
                    const ms = [...slide.metrics];
                    ms[i] = { ...m, label: e.target.value };
                    onChange({ metrics: ms });
                  }}
                />
                <input
                  className="input"
                  value={m.value}
                  onChange={(e) => {
                    const ms = [...slide.metrics];
                    ms[i] = { ...m, value: e.target.value };
                    onChange({ metrics: ms });
                  }}
                />
                <input
                  className="input"
                  placeholder="dica (opcional)"
                  value={m.hint ?? ""}
                  onChange={(e) => {
                    const ms = [...slide.metrics];
                    ms[i] = { ...m, hint: e.target.value };
                    onChange({ metrics: ms });
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
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
 * Slide rendered with realistic slide typography.
 * - scale="full"       → fixed 1920x1080 (PDF capture)
 * - scale="responsive" → fills preview container
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
  const root: React.CSSProperties = {
    width: isFull ? 1920 : "100%",
    height: isFull ? 1080 : "100%",
    padding: isFull ? 96 : "clamp(20px, 4vw, 60px)",
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
                <div style={{ fontSize: f(20), textTransform: "uppercase", letterSpacing: "0.12em", color: "#bdb5b5" }}>
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
                {m.hint && <div style={{ fontSize: f(18), color: "#8b7a7a", marginTop: f(6) }}>{m.hint}</div>}
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
                style={{ display: "flex", gap: f(16), fontSize: f(28), lineHeight: 1.32, color: "#fafafa" }}
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

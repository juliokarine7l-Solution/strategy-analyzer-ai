import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  analisarDiagnostico,
  type DiagnosticResult,
  type PillarKey,
} from "@/lib/diagnostico.functions";
import { StepStaircase } from "@/components/StepStaircase";
import { Apresentacao } from "@/components/Apresentacao";
import { buildPresentation } from "@/lib/apresentacao";


export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Diagnóstico STEP — Maturidade B2B" },
      {
        name: "description",
        content:
          "Avalie a maturidade do seu negócio B2B pela metodologia STEP: Saber, Ter, Executar e Performar. Diagnóstico clínico e plano de ação.",
      },
    ],
  }),
});

const PILLARS: { key: PillarKey; titulo: string; pergunta: string; placeholder: string }[] = [
  {
    key: "atrair",
    titulo: "Atrair",
    pergunta: "Como sua empresa gera leads e tráfego qualificado? Quais canais usa e qual o custo por lead?",
    placeholder: "Ex.: Rodamos Google Ads e LinkedIn Ads, CPL médio R$ 120, SEO em construção...",
  },
  {
    key: "vender",
    titulo: "Vender",
    pergunta: "Descreva seu processo de vendas do primeiro contato ao fechamento. Existe script, playbook ou CRM?",
    placeholder: "Ex.: SDR qualifica via Pipedrive, Closer com playbook em 3 reuniões, ciclo médio 28 dias...",
  },
  {
    key: "saber",
    titulo: "Saber",
    pergunta: "Quais métricas você monitora semanalmente? Cite CAC, LTV, taxa de conversão e faturamento por canal.",
    placeholder: "Ex.: CAC R$ 1.800, LTV R$ 14.000, conv. SQL→Venda 22%, faturamento segmentado por origem...",
  },
  {
    key: "potencializar",
    titulo: "Potencializar",
    pergunta: "Como sua operação escala? Existe automação, equipe estruturada e processos replicáveis?",
    placeholder: "Ex.: Automação RD Station + n8n, squad de 6 pessoas, SOPs documentados, ramp-up de 45 dias...",
  },
];

function Index() {
  const fn = useServerFn(analisarDiagnostico);
  const [form, setForm] = useState({
    empresa: "",
    setor: "",
    atrair: "",
    vender: "",
    saber: "",
    potencializar: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [tab, setTab] = useState<"diagnostico" | "apresentacao">("diagnostico");

  const presentation = useMemo(
    () =>
      result
        ? buildPresentation({
            empresa: form.empresa,
            setor: form.setor,
            respostas: {
              atrair: form.atrair,
              vender: form.vender,
              saber: form.saber,
              potencializar: form.potencializar,
            },
            diagnostico: result,
          })
        : null,
    [result, form],
  );


  const canSubmit =
    form.atrair.trim().length > 20 &&
    form.vender.trim().length > 20 &&
    form.saber.trim().length > 20 &&
    form.potencializar.trim().length > 20;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await fn({ data: form });
      setResult(r);
      setTimeout(() => document.getElementById("resultado")?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.32_0.12_25/0.45),transparent_60%)] pointer-events-none" />
        <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
            Metodologia STEP · Diagnóstico Executivo
          </div>
          <h1 className="mt-6 text-5xl md:text-7xl font-display uppercase leading-[0.95]">
            O modelo de maturidade
            <br />
            <span className="text-brand">do cliente B2B</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base md:text-lg text-muted-foreground">
            Cada estágio exige uma entrega diferente. Vender o serviço errado para o estágio errado
            do cliente é a causa mais previsível de churn. Responda aos 4 pilares e receba um
            diagnóstico clínico do seu nível de maturidade.
          </p>

          <div className="mt-12">
            <StepStaircase currentPhase={result?.faseStep} />
          </div>
        </div>
      </section>

      {/* METODOLOGIA */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-3xl md:text-4xl font-display uppercase">As 4 fases do STEP</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            A aplicação garante atuação como braço estratégico evolutivo — o serviço se molda às
            dores reais de cada fase, permitindo escalar com segurança técnica e financeira.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {[
              { t: "Saber",     s: "Fundacional",  d: "Foco em diagnóstico e métricas. Sem dados, não há o que executar." },
              { t: "Ter",       s: "Emergente",    d: "Integração entre marketing e vendas para consolidar informações." },
              { t: "Executar",  s: "Crescimento",  d: "Otimização do funil e expansão para novos canais de mídia." },
              { t: "Performar", s: "Otimização",   d: "Inteligência de dados avançada e modelos de risco compartilhado." },
            ].map((p) => (
              <article key={p.t} className="rounded-lg border border-border bg-surface p-6 transition hover:border-brand/60 hover:bg-surface-elevated">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">{p.s}</div>
                <div className="mt-2 text-2xl font-display uppercase text-brand">{p.t}</div>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{p.d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FORM */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <div className="mb-10">
            <span className="text-xs uppercase tracking-widest text-brand">Auto-diagnóstico</span>
            <h2 className="mt-2 text-3xl md:text-4xl font-display uppercase">
              Responda aos 4 pilares
            </h2>
            <p className="mt-3 text-muted-foreground">
              Seja específico. Cite métricas, ferramentas e processos. Respostas vagas reduzem sua nota.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Empresa (opcional)">
                <input
                  className="input"
                  value={form.empresa}
                  onChange={(e) => setForm({ ...form, empresa: e.target.value })}
                  placeholder="Nome da empresa"
                />
              </Field>
              <Field label="Setor (opcional)">
                <input
                  className="input"
                  value={form.setor}
                  onChange={(e) => setForm({ ...form, setor: e.target.value })}
                  placeholder="Ex.: SaaS B2B, Indústria, Serviços..."
                />
              </Field>
            </div>

            {PILLARS.map((p, i) => (
              <Field
                key={p.key}
                label={`${String(i + 1).padStart(2, "0")} · ${p.titulo}`}
                hint={p.pergunta}
              >
                <textarea
                  className="input min-h-32 resize-y"
                  value={form[p.key]}
                  onChange={(e) => setForm({ ...form, [p.key]: e.target.value })}
                  placeholder={p.placeholder}
                />
              </Field>
            ))}

            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive-foreground">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit || loading}
              className="w-full md:w-auto inline-flex items-center justify-center rounded-md bg-brand px-8 py-4 font-semibold text-brand-foreground transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Analisando respostas..." : "Gerar diagnóstico executivo"}
            </button>
          </form>
        </div>
      </section>

      {/* RESULTADO */}
      {result && (
        <section id="resultado" className="border-b border-border bg-surface/40">
          <div className="mx-auto max-w-6xl px-6 py-12">
            {/* Tabs */}
            <div className="flex gap-2 mb-8 border-b border-border">
              {([
                ["diagnostico", "Diagnóstico"],
                ["apresentacao", "Apresentação"],
              ] as const).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={`px-5 py-3 text-sm font-semibold uppercase tracking-wider transition border-b-2 -mb-px ${
                    tab === k
                      ? "border-brand text-brand"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === "apresentacao" && presentation && <Apresentacao presentation={presentation} />}

            {tab === "diagnostico" && (
              <div className="max-w-5xl space-y-12">
                <header>
                  <span className="text-xs uppercase tracking-widest text-brand">Diagnóstico</span>
                  <h2 className="mt-2 text-3xl md:text-4xl font-display uppercase">
                    Fase atual: <span className="text-brand">{result.faseStep}</span>
                  </h2>
                  <p className="mt-3 max-w-3xl text-muted-foreground">{result.faseDescricao}</p>
                </header>

                {/* Pilares */}
                <div>
                  <h3 className="text-xl font-display uppercase mb-4">📊 Diagnóstico por pilar</h3>
                  <div className="overflow-hidden rounded-lg border border-border">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-surface-elevated">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Pilar</th>
                          <th className="px-4 py-3 font-semibold w-32">Nota</th>
                          <th className="px-4 py-3 font-semibold">Justificativa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(Object.keys(result.pilares) as PillarKey[]).map((k) => {
                          const p = result.pilares[k];
                          return (
                            <tr key={k} className="border-t border-border">
                              <td className="px-4 py-3 capitalize font-medium">{k}</td>
                              <td className="px-4 py-3">
                                <NotaBadge nota={p.nota} />
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">{p.justificativa}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Riscos */}
                <div>
                  <h3 className="text-xl font-display uppercase mb-4">⚠️ Riscos identificados</h3>
                  <ul className="space-y-3">
                    {result.riscos.map((r, i) => (
                      <li key={i} className="flex gap-3 rounded-md border border-border bg-surface p-4">
                        <span className="text-brand font-mono">0{i + 1}</span>
                        <span className="text-sm">{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Ações */}
                <div>
                  <h3 className="text-xl font-display uppercase mb-2">🚀 Plano de ação</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Pilar prioritário: <span className="text-brand font-semibold capitalize">{result.pilarPrioritario}</span>
                  </p>
                  <div className="grid gap-4 md:grid-cols-3">
                    {result.acoes.map((a, i) => (
                      <div key={i} className="rounded-lg border border-border bg-surface p-5">
                        <div className="text-xs uppercase tracking-widest text-brand">Prazo {a.prazo}</div>
                        <p className="mt-2 text-sm">{a.acao}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Parecer */}
                <div className="rounded-lg border border-brand/40 bg-brand/10 p-6">
                  <h3 className="text-xl font-display uppercase mb-3">🎯 Parecer executivo global</h3>
                  <p className="text-base leading-relaxed">{result.parecerExecutivo}</p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}


      <footer className="mx-auto max-w-6xl px-6 py-8 text-xs text-muted-foreground">
        Diagnóstico STEP · Análise gerada por IA com base nas suas respostas. Use como instrumento estratégico, não como substituto de auditoria financeira.
      </footer>
    </main>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-sm font-semibold uppercase tracking-wider text-foreground">{label}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      <div className="mt-2">{children}</div>
    </label>
  );
}

function NotaBadge({ nota }: { nota: number }) {
  const color =
    nota >= 4 ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" :
    nota >= 3 ? "bg-amber-500/20 text-amber-200 border-amber-500/40" :
                "bg-destructive/20 text-destructive-foreground border-destructive/40";
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-sm ${color}`}>
      {nota.toFixed(1)}
    </span>
  );
}

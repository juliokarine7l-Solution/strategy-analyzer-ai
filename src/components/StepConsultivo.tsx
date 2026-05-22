import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  analisarDiagnostico,
  type DiagnosticResult,
  type PillarKey,
} from "@/lib/diagnostico.functions";

/**
 * Módulo isolado: STEP — Envio e Diagnóstico Consultivo.
 * - Cadastro do cliente
 * - Geração do e-mail / formulário STEP
 * - Colagem de respostas
 * - Geração do diagnóstico (reusa analisarDiagnostico)
 * - Exportação JSON
 * - Histórico em localStorage (sem backend novo)
 */

const PERGUNTAS: { key: PillarKey; titulo: string; pergunta: string }[] = [
  {
    key: "atrair",
    titulo: "01 · Atrair",
    pergunta:
      "Como sua empresa gera leads e tráfego qualificado? Quais canais usa e qual o custo por lead?",
  },
  {
    key: "vender",
    titulo: "02 · Vender",
    pergunta:
      "Descreva seu processo de vendas do primeiro contato ao fechamento. Existe script, playbook ou CRM?",
  },
  {
    key: "saber",
    titulo: "03 · Saber",
    pergunta:
      "Quais métricas você monitora semanalmente? Cite CAC, LTV, taxa de conversão e faturamento por canal.",
  },
  {
    key: "potencializar",
    titulo: "04 · Potencializar",
    pergunta:
      "Como sua operação escala? Existe automação, equipe estruturada e processos replicáveis?",
  },
];

interface Cliente {
  nome: string;
  empresa: string;
  setor: string;
  email: string;
  remetente: string;
}

interface HistoricoItem {
  id: string;
  criadoEm: string;
  cliente: Cliente;
  respostas: Record<PillarKey, string>;
  diagnostico: DiagnosticResult | null;
}

const STORAGE_KEY = "step-consultivo-historico-v1";

function montarCorpoEmail(c: Cliente): string {
  const intro = `Olá${c.nome ? `, ${c.nome}` : ""},

Para preparar seu diagnóstico estratégico STEP (Saber → Ter → Executar → Performar), preciso de respostas objetivas aos 4 pilares abaixo. Seja específico — cite métricas, ferramentas e processos. Respostas vagas reduzem a precisão do diagnóstico.

`;
  const blocos = PERGUNTAS.map(
    (p) => `${p.titulo}\n${p.pergunta}\nR:\n\n`,
  ).join("\n");
  const fim = `\nResponda neste mesmo e-mail. Obrigado.`;
  return intro + blocos + fim;
}

function montarMailto(c: Cliente, corpo: string): string {
  const assunto = `Formulário STEP — Diagnóstico Consultivo${
    c.empresa ? ` · ${c.empresa}` : ""
  }`;
  const params = new URLSearchParams();
  params.set("subject", assunto);
  params.set("body", corpo);
  return `mailto:${encodeURIComponent(c.email)}?${params.toString().replace(/\+/g, "%20")}`;
}

function montarGmailUrl(
  c: Cliente,
  corpo: string,
  assuntoOverride?: string,
): string {
  const assunto =
    assuntoOverride ??
    `Formulário STEP — Diagnóstico Consultivo${
      c.empresa ? ` · ${c.empresa}` : ""
    }`;
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    tf: "1",
    to: c.email,
    su: assunto,
    body: corpo,
  });
  const remetente = (c.remetente || "").trim();
  const authuser = remetente.includes("@") ? remetente : "juliokarine7l@gmail.com";
  return `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(authuser)}&${params.toString()}`;
}

function montarCorpoDiagnostico(c: Cliente, d: DiagnosticResult): string {
  const saud = `Olá${c.nome ? `, ${c.nome}` : ""},\n\nSegue abaixo o diagnóstico executivo STEP${
    c.empresa ? ` da ${c.empresa}` : ""
  }, com base nas respostas enviadas.\n`;
  const fase = `\n— FASE STEP: ${d.faseStep} —\n${d.faseDescricao}\n`;
  const pilares =
    `\n— MATURIDADE POR PILAR —\n` +
    (Object.keys(d.pilares) as PillarKey[])
      .map((k) => {
        const p = d.pilares[k];
        return `• ${k.toUpperCase()} — ${p.nota.toFixed(1)}/5\n  ${p.justificativa}`;
      })
      .join("\n");
  const riscos =
    `\n\n— RISCOS CRÍTICOS —\n` +
    d.riscos.map((r, i) => `${i + 1}. ${r}`).join("\n");
  const acoes =
    `\n\n— PLANO DE AÇÃO (30 DIAS) —\n` +
    d.acoes.map((a) => `• [${a.prazo}] ${a.acao}`).join("\n");
  const parecer = `\n\n— PARECER EXECUTIVO —\n${d.parecerExecutivo}\n`;
  const fim = `\nQualquer dúvida, respondo neste mesmo e-mail.\nAbraço.`;
  return saud + fase + pilares + riscos + acoes + parecer + fim;
}

/** Heurística leve para separar respostas coladas em texto livre. */
function parseRespostas(texto: string): Record<PillarKey, string> {
  const out: Record<PillarKey, string> = {
    atrair: "",
    vender: "",
    saber: "",
    potencializar: "",
  };
  const re = /(01|02|03|04|atrair|vender|saber|potencializar)/i;
  const linhas = texto.split(/\r?\n/);
  let atual: PillarKey | null = null;
  const map: Record<string, PillarKey> = {
    "01": "atrair",
    "02": "vender",
    "03": "saber",
    "04": "potencializar",
    atrair: "atrair",
    vender: "vender",
    saber: "saber",
    potencializar: "potencializar",
  };
  for (const l of linhas) {
    const m = l.match(re);
    const cabecalho = m && /[·\-:|]/.test(l);
    if (cabecalho) {
      atual = map[m![1].toLowerCase()] ?? atual;
      continue;
    }
    if (atual) {
      const limpo = l.replace(/^\s*r:\s*/i, "");
      out[atual] += (out[atual] ? "\n" : "") + limpo;
    }
  }
  // se nada foi parseado, devolve tudo no campo "atrair" como fallback
  if (!out.atrair && !out.vender && !out.saber && !out.potencializar) {
    out.atrair = texto.trim();
  }
  (Object.keys(out) as PillarKey[]).forEach((k) => (out[k] = out[k].trim()));
  return out;
}

export function StepConsultivo() {
  const fn = useServerFn(analisarDiagnostico);

  const [cliente, setCliente] = useState<Cliente>({
    nome: "",
    empresa: "",
    setor: "",
    email: "",
    remetente: "",
  });
  const [respostasTexto, setRespostasTexto] = useState("");
  const [respostas, setRespostas] = useState<Record<PillarKey, string>>({
    atrair: "",
    vender: "",
    saber: "",
    potencializar: "",
  });
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [diag, setDiag] = useState<DiagnosticResult | null>(null);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [copiado, setCopiado] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setHistorico(JSON.parse(raw));
    } catch {
      /* noop */
    }
  }, []);

  const corpoEmail = useMemo(() => montarCorpoEmail(cliente), [cliente]);
  const mailto = useMemo(
    () => montarMailto(cliente, corpoEmail),
    [cliente, corpoEmail],
  );
  const gmailUrl = useMemo(
    () => montarGmailUrl(cliente, corpoEmail),
    [cliente, corpoEmail],
  );

  function copiar(texto: string, marca: string) {
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(marca);
      setTimeout(() => setCopiado(null), 1800);
    });
  }

  function aplicarParse() {
    setRespostas(parseRespostas(respostasTexto));
  }

  async function gerarDiagnostico() {
    setLoading(true);
    setErro(null);
    setDiag(null);
    const base =
      respostas.atrair || respostas.vender || respostas.saber || respostas.potencializar
        ? respostas
        : parseRespostas(respostasTexto);
    if (
      !base.atrair.trim() &&
      !base.vender.trim() &&
      !base.saber.trim() &&
      !base.potencializar.trim()
    ) {
      setErro("Cole as respostas antes de gerar o diagnóstico.");
      setLoading(false);
      return;
    }
    try {
      const r = await fn({
        data: {
          empresa: cliente.empresa,
          setor: cliente.setor,
          atrair: base.atrair || "(sem resposta)",
          vender: base.vender || "(sem resposta)",
          saber: base.saber || "(sem resposta)",
          potencializar: base.potencializar || "(sem resposta)",
        },
      });
      setDiag(r);
      setRespostas(base);
      const item: HistoricoItem = {
        id: crypto.randomUUID(),
        criadoEm: new Date().toISOString(),
        cliente,
        respostas: base,
        diagnostico: r,
      };
      const novo = [item, ...historico].slice(0, 30);
      setHistorico(novo);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(novo));
      } catch {
        /* noop */
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  function exportarJson() {
    const payload = {
      versao: "step-consultivo/v1",
      geradoEm: new Date().toISOString(),
      cliente,
      formulario: {
        perguntas: PERGUNTAS,
        respostas,
      },
      diagnostico: diag,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `step-${(cliente.empresa || "cliente")
      .toLowerCase()
      .replace(/\s+/g, "-")}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function carregarHistorico(h: HistoricoItem) {
    setCliente(h.cliente);
    setRespostas(h.respostas);
    setDiag(h.diagnostico);
    setRespostasTexto("");
  }

  function limparHistorico() {
    setHistorico([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
  }

  const podeGerarEmail = cliente.email.includes("@");

  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-10">
          <span className="text-xs uppercase tracking-widest text-brand">
            STEP · Consultivo
          </span>
          <h2 className="mt-2 text-3xl md:text-4xl font-display uppercase">
            Envio e diagnóstico do cliente
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Cadastre o cliente, envie o formulário STEP, cole as respostas e
            gere um diagnóstico executivo pronto para apresentação.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          {/* COLUNA ESQUERDA — fluxo principal */}
          <div className="space-y-8">
            {/* 1. CLIENTE */}
            <div className="rounded-lg border border-border bg-surface p-6">
              <h3 className="text-lg font-display uppercase mb-4">
                1 · Cadastro do cliente
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <Campo label="Nome do contato">
                  <input
                    className="input"
                    value={cliente.nome}
                    onChange={(e) =>
                      setCliente({ ...cliente, nome: e.target.value })
                    }
                    placeholder="Ex.: Marina Souza"
                  />
                </Campo>
                <Campo label="E-mail do cliente">
                  <input
                    className="input"
                    type="email"
                    value={cliente.email}
                    onChange={(e) =>
                      setCliente({ ...cliente, email: e.target.value })
                    }
                    placeholder="cliente@empresa.com"
                  />
                </Campo>
                <Campo label="Empresa">
                  <input
                    className="input"
                    value={cliente.empresa}
                    onChange={(e) =>
                      setCliente({ ...cliente, empresa: e.target.value })
                    }
                    placeholder="Razão social ou marca"
                  />
                </Campo>
                <Campo label="Setor">
                  <input
                    className="input"
                    value={cliente.setor}
                    onChange={(e) =>
                      setCliente({ ...cliente, setor: e.target.value })
                    }
                    placeholder="Ex.: SaaS B2B, Indústria..."
                  />
                </Campo>
                <Campo label="Remetente (seu domínio)">
                  <input
                    className="input"
                    value={cliente.remetente}
                    onChange={(e) =>
                      setCliente({ ...cliente, remetente: e.target.value })
                    }
                    placeholder="voce@seudominio.com"
                  />
                </Campo>
              </div>
            </div>

            {/* 2. FORMULÁRIO / E-MAIL */}
            <div className="rounded-lg border border-border bg-surface p-6">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <h3 className="text-lg font-display uppercase">
                  2 · Gerar formulário STEP
                </h3>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => copiar(corpoEmail, "corpo")}
                    className="rounded-md border border-border bg-surface-elevated px-3 py-2 text-xs uppercase tracking-wider hover:border-brand/60"
                  >
                    {copiado === "corpo" ? "Copiado!" : "Copiar e-mail"}
                  </button>
                  <a
                    href={podeGerarEmail ? gmailUrl : undefined}
                    target="_blank"
                    rel="noreferrer"
                    aria-disabled={!podeGerarEmail}
                    className={`rounded-md px-3 py-2 text-xs uppercase tracking-wider border ${
                      podeGerarEmail
                        ? "border-brand/60 bg-brand/10 text-brand hover:bg-brand/20"
                        : "border-border text-muted-foreground pointer-events-none opacity-50"
                    }`}
                  >
                    Abrir no Gmail
                  </a>
                  <a
                    href={podeGerarEmail ? mailto : undefined}
                    aria-disabled={!podeGerarEmail}
                    className={`rounded-md px-3 py-2 text-xs uppercase tracking-wider border ${
                      podeGerarEmail
                        ? "border-border hover:border-brand/60"
                        : "border-border text-muted-foreground pointer-events-none opacity-50"
                    }`}
                  >
                    Cliente de e-mail
                  </a>
                </div>
              </div>
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-background p-4 text-xs leading-relaxed text-muted-foreground">
{corpoEmail}
              </pre>
            </div>

            {/* 3. RESPOSTAS */}
            <div className="rounded-lg border border-border bg-surface p-6">
              <h3 className="text-lg font-display uppercase mb-4">
                3 · Colar respostas recebidas
              </h3>
              <textarea
                className="input min-h-40 resize-y"
                value={respostasTexto}
                onChange={(e) => setRespostasTexto(e.target.value)}
                placeholder="Cole aqui o e-mail de resposta inteiro. Vamos separar por pilar automaticamente."
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={aplicarParse}
                  className="rounded-md border border-border bg-surface-elevated px-3 py-2 text-xs uppercase tracking-wider hover:border-brand/60"
                >
                  Separar por pilar
                </button>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {PERGUNTAS.map((p) => (
                  <Campo key={p.key} label={p.titulo}>
                    <textarea
                      className="input min-h-24 resize-y"
                      value={respostas[p.key]}
                      onChange={(e) =>
                        setRespostas({ ...respostas, [p.key]: e.target.value })
                      }
                      placeholder={p.pergunta}
                    />
                  </Campo>
                ))}
              </div>

              {erro && (
                <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-foreground">
                  {erro}
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={gerarDiagnostico}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-md bg-brand px-6 py-3 font-semibold text-brand-foreground transition hover:opacity-90 disabled:opacity-40"
                >
                  {loading ? "Analisando..." : "Gerar diagnóstico"}
                </button>
                <button
                  onClick={exportarJson}
                  disabled={!diag}
                  className="inline-flex items-center justify-center rounded-md border border-border bg-surface-elevated px-6 py-3 text-sm uppercase tracking-wider hover:border-brand/60 disabled:opacity-40"
                >
                  Exportar JSON
                </button>
              </div>
            </div>

            {/* 4. DIAGNÓSTICO */}
            {diag && (
              <div className="rounded-lg border border-brand/40 bg-surface p-6 space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <span className="text-xs uppercase tracking-widest text-brand">
                      Diagnóstico
                    </span>
                    <h3 className="mt-1 text-2xl font-display uppercase">
                      Fase: <span className="text-brand">{diag.faseStep}</span>
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {diag.faseDescricao}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={
                        podeGerarEmail
                          ? montarGmailUrl(
                              cliente,
                              montarCorpoDiagnostico(cliente, diag),
                              `Diagnóstico STEP${cliente.empresa ? ` · ${cliente.empresa}` : ""} — Fase ${diag.faseStep}`,
                            )
                          : undefined
                      }
                      target="_blank"
                      rel="noreferrer"
                      aria-disabled={!podeGerarEmail}
                      className={`rounded-md px-3 py-2 text-xs uppercase tracking-wider border ${
                        podeGerarEmail
                          ? "border-brand/60 bg-brand text-brand-foreground hover:opacity-90"
                          : "border-border text-muted-foreground pointer-events-none opacity-50"
                      }`}
                    >
                      Enviar diagnóstico no Gmail
                    </a>
                    <button
                      onClick={() =>
                        copiar(montarCorpoDiagnostico(cliente, diag), "diag")
                      }
                      className="rounded-md border border-border bg-surface-elevated px-3 py-2 text-xs uppercase tracking-wider hover:border-brand/60"
                    >
                      {copiado === "diag" ? "Copiado!" : "Copiar diagnóstico"}
                    </button>
                  </div>
                </div>


                <div className="grid gap-3 md:grid-cols-2">
                  {(Object.keys(diag.pilares) as PillarKey[]).map((k) => {
                    const p = diag.pilares[k];
                    return (
                      <div
                        key={k}
                        className="rounded-md border border-border bg-background p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold uppercase tracking-wider capitalize">
                            {k}
                          </div>
                          <span className="font-mono text-brand">
                            {p.nota.toFixed(1)}/5
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                          {p.justificativa}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wider mb-2">
                    Riscos
                  </h4>
                  <ul className="space-y-2">
                    {diag.riscos.map((r, i) => (
                      <li
                        key={i}
                        className="rounded-md border border-border bg-background p-3 text-sm"
                      >
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wider mb-2">
                    Ações
                  </h4>
                  <div className="grid gap-3 md:grid-cols-3">
                    {diag.acoes.map((a, i) => (
                      <div
                        key={i}
                        className="rounded-md border border-border bg-background p-3"
                      >
                        <div className="text-xs uppercase tracking-widest text-brand">
                          {a.prazo}
                        </div>
                        <p className="mt-1 text-sm">{a.acao}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-md border border-brand/40 bg-brand/10 p-4 text-sm">
                  {diag.parecerExecutivo}
                </div>
              </div>
            )}
          </div>

          {/* COLUNA DIREITA — histórico */}
          <aside className="space-y-4">
            <div className="rounded-lg border border-border bg-surface p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-display uppercase">Histórico</h3>
                {historico.length > 0 && (
                  <button
                    onClick={limparHistorico}
                    className="text-xs uppercase tracking-wider text-muted-foreground hover:text-destructive-foreground"
                  >
                    Limpar
                  </button>
                )}
              </div>
              {historico.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma interação salva ainda. Os diagnósticos gerados ficam
                  aqui (no seu navegador).
                </p>
              ) : (
                <ul className="space-y-2 max-h-[600px] overflow-auto pr-1">
                  {historico.map((h) => (
                    <li key={h.id}>
                      <button
                        onClick={() => carregarHistorico(h)}
                        className="w-full text-left rounded-md border border-border bg-background p-3 hover:border-brand/60 transition"
                      >
                        <div className="text-sm font-semibold">
                          {h.cliente.empresa || h.cliente.nome || "Sem nome"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {h.cliente.email || "sem e-mail"} ·{" "}
                          {new Date(h.criadoEm).toLocaleString("pt-BR")}
                        </div>
                        {h.diagnostico && (
                          <div className="mt-1 text-xs text-brand uppercase tracking-wider">
                            Fase {h.diagnostico.faseStep}
                          </div>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function Campo({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1">{children}</div>
    </label>
  );
}

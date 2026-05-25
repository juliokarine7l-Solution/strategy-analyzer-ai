import type { DiagnosticResult, PillarKey } from "./diagnostico.functions";

export interface Slide {
  id: string;
  type:
    | "cover"
    | "context"
    | "diagnosis"
    | "pains"
    | "opportunities"
    | "kpis"
    | "impact"
    | "recommendations"
    | "action-plan"
    | "executive-summary";
  title: string;
  subtitle?: string;
  keyPoints: string[];
  metrics: { label: string; value: string; hint?: string }[];
  charts: { kind: "bar" | "radar"; title: string; data: { label: string; value: number; max?: number }[] }[];
  recommendations: string[];
  visualNotes: string;
}

export interface Presentation {
  title: string;
  subtitle: string;
  audience: string;
  brandStyle: {
    palette: { background: string; surface: string; accent: string; text: string };
    fontDisplay: string;
    fontBody: string;
    tone: string;
  };
  slides: Slide[];
}

const PILLAR_LABEL: Record<PillarKey, string> = {
  atrair: "Atrair",
  vender: "Vender",
  saber: "Saber",
  potencializar: "Potencializar",
};

interface BuildInput {
  empresa?: string;
  setor?: string;
  respostas: Record<PillarKey, string>;
  diagnostico: DiagnosticResult;
}

export function buildPresentation({ empresa, setor, respostas, diagnostico }: BuildInput): Presentation {
  const empresaNome = empresa?.trim() || "Cliente B2B";
  const setorTxt = setor?.trim() || "[setor não informado]";
  const fase = diagnostico.faseStep;
  const notas = (Object.keys(diagnostico.pilares) as PillarKey[]).map((k) => ({
    pillar: k,
    nota: diagnostico.pilares[k].nota,
    just: diagnostico.pilares[k].justificativa,
  }));
  const mediaGeral =
    notas.reduce((s, n) => s + n.nota, 0) / notas.length;

  const pilarFraco = notas.reduce((a, b) => (a.nota <= b.nota ? a : b));
  const pilarForte = notas.reduce((a, b) => (a.nota >= b.nota ? a : b));

  const slides: Slide[] = [
    {
      id: "s01-cover",
      type: "cover",
      title: `Diagnóstico STEP — ${empresaNome}`,
      subtitle: `Avaliação de maturidade B2B · Fase atual: ${fase}`,
      keyPoints: [
        `Setor: ${setorTxt}`,
        `Maturidade média: ${mediaGeral.toFixed(1)} / 5.0`,
        `Pilar prioritário: ${PILLAR_LABEL[diagnostico.pilarPrioritario]}`,
      ],
      metrics: [],
      charts: [],
      recommendations: [],
      visualNotes: "Capa em fundo escuro, headline display, badge da fase STEP em destaque.",
    },
    {
      id: "s02-context",
      type: "context",
      title: "Contexto do cliente",
      subtitle: `${empresaNome} · ${setorTxt}`,
      keyPoints: [
        `Empresa avaliada nos 4 pilares: Atrair, Vender, Saber e Potencializar.`,
        `Fase STEP identificada: ${fase} — ${diagnostico.faseDescricao}`,
        `Base de análise: respostas declarativas do cliente, sem auditoria externa.`,
      ],
      metrics: [
        { label: "Fase STEP", value: fase },
        { label: "Maturidade média", value: mediaGeral.toFixed(1), hint: "escala 1.0 – 5.0" },
        { label: "Pilar prioritário", value: PILLAR_LABEL[diagnostico.pilarPrioritario] },
      ],
      charts: [],
      recommendations: [],
      visualNotes: "3 KPIs no topo + parágrafo curto de contexto. Sem gráfico.",
    },
    {
      id: "s03-diagnosis",
      type: "diagnosis",
      title: "Diagnóstico atual por pilar",
      subtitle: "Notas e justificativas críticas",
      keyPoints: notas.map(
        (n) => `${PILLAR_LABEL[n.pillar]} — ${n.nota.toFixed(1)}/5.0: ${n.just}`,
      ),
      metrics: notas.map((n) => ({
        label: PILLAR_LABEL[n.pillar],
        value: n.nota.toFixed(1),
      })),
      charts: [
        {
          kind: "bar",
          title: "Maturidade por pilar",
          data: notas.map((n) => ({ label: PILLAR_LABEL[n.pillar], value: n.nota, max: 5 })),
        },
      ],
      recommendations: [],
      visualNotes: "Gráfico de barras horizontais, 4 pilares, escala 0-5. Cores quentes para notas <3.",
    },
    {
      id: "s04-pains",
      type: "pains",
      title: "Principais dores e riscos",
      subtitle: "Gargalos que travam o avanço de maturidade",
      keyPoints: diagnostico.riscos,
      metrics: [],
      charts: [],
      recommendations: [],
      visualNotes: "Lista de cards com ícone de alerta. Um card por risco.",
    },
    {
      id: "s05-opportunities",
      type: "opportunities",
      title: "Oportunidades encontradas",
      subtitle: `Alavancas no pilar ${PILLAR_LABEL[pilarForte.pillar]} (mais maduro)`,
      keyPoints: [
        `${PILLAR_LABEL[pilarForte.pillar]} é o pilar mais avançado (${pilarForte.nota.toFixed(1)}/5.0). Use como base de tração.`,
        `Equilibrar com ${PILLAR_LABEL[pilarFraco.pillar]} libera escala sem aumentar risco operacional.`,
        `Fase ${fase}: foco em consolidar entregas dessa fase antes de pular para a próxima.`,
      ],
      metrics: [],
      charts: [],
      recommendations: [],
      visualNotes: "Bloco de 3 oportunidades em coluna, ícone de seta para cima.",
    },
    {
      id: "s06-kpis",
      type: "kpis",
      title: "KPIs de maturidade",
      subtitle: "Snapshot de indicadores estratégicos",
      keyPoints: [],
      metrics: notas
        .map((n) => ({
          label: PILLAR_LABEL[n.pillar],
          value: `${n.nota.toFixed(1)}/5`,
          hint: n.nota >= 4 ? "Forte" : n.nota >= 3 ? "Em evolução" : "Crítico",
        }))
        .concat([{ label: "Média geral", value: mediaGeral.toFixed(1), hint: "Maturidade STEP" }]),
      charts: [
        {
          kind: "radar",
          title: "Radar de maturidade STEP",
          data: notas.map((n) => ({ label: PILLAR_LABEL[n.pillar], value: n.nota, max: 5 })),
        },
      ],
      recommendations: [],
      visualNotes: "Grid 2x2 de KPIs + radar à direita.",
    },
    {
      id: "s07-impact",
      type: "impact",
      title: "Impacto estimado",
      subtitle: "Consequências de manter o status atual",
      keyPoints: [
        `Risco de churn elevado se o serviço entregue não respeitar a fase ${fase}.`,
        `Pilar ${PILLAR_LABEL[diagnostico.pilarPrioritario]} sub-investido representa custo de oportunidade contínuo.`,
        `Sem evolução de maturidade, o CAC tende a subir e o LTV a estagnar.`,
      ],
      metrics: [
        { label: "Pilar prioritário", value: PILLAR_LABEL[diagnostico.pilarPrioritario] },
        { label: "Nota crítica", value: pilarFraco.nota.toFixed(1), hint: PILLAR_LABEL[pilarFraco.pillar] },
        { label: "Gap até 5.0", value: (5 - mediaGeral).toFixed(1), hint: "potencial de evolução" },
      ],
      charts: [],
      recommendations: [],
      visualNotes: "3 KPIs no topo, 3 bullets de impacto abaixo. Sem dados financeiros inventados.",
    },
    {
      id: "s08-recommendations",
      type: "recommendations",
      title: "Recomendações priorizadas",
      subtitle: `Foco no pilar ${PILLAR_LABEL[diagnostico.pilarPrioritario]}`,
      keyPoints: diagnostico.acoes.map((a) => `[${a.prazo}] ${a.acao}`),
      metrics: [],
      charts: [],
      recommendations: diagnostico.acoes.map((a) => a.acao),
      visualNotes: "Timeline horizontal: 48h → 1 semana → 2 semanas.",
    },
    {
      id: "s09-action-plan",
      type: "action-plan",
      title: "Plano de ação 30 dias",
      subtitle: "Execução sequenciada",
      keyPoints: [
        ...diagnostico.acoes.map((a, i) => `Sprint ${i + 1} (${a.prazo}): ${a.acao}`),
        `Checkpoint: revisão semanal de métricas do pilar ${PILLAR_LABEL[diagnostico.pilarPrioritario]}.`,
      ],
      metrics: [],
      charts: [],
      recommendations: [],
      visualNotes: "Cards em coluna numerados, com prazo destacado em cor de marca.",
    },
    {
      id: "s10-executive-summary",
      type: "executive-summary",
      title: "Resumo executivo",
      subtitle: `${empresaNome} · Fase ${fase}`,
      keyPoints: [
        diagnostico.parecerExecutivo,
        `Pilar prioritário: ${PILLAR_LABEL[diagnostico.pilarPrioritario]} (${pilarFraco.nota.toFixed(1)}/5.0).`,
        `Próximo marco: avançar da fase ${fase} apenas após consolidar entregas dessa fase.`,
      ],
      metrics: [
        { label: "Maturidade média", value: mediaGeral.toFixed(1), hint: "atual" },
        { label: "Fase STEP", value: fase },
        { label: "Ações no plano", value: String(diagnostico.acoes.length), hint: "30 dias" },
      ],
      charts: [],
      recommendations: [],
      visualNotes: "Slide de fechamento, parecer em destaque, 3 KPIs finais.",
    },
  ];

  return {
    title: `Diagnóstico STEP — ${empresaNome}`,
    subtitle: `Maturidade B2B · Fase ${fase}`,
    audience: "Executivos C-level e liderança comercial/marketing",
    brandStyle: {
      palette: paletteFromName(empresaNome),
      fontDisplay: "Anton",
      fontBody: "Inter",
      tone: "Executivo, clínico, direto.",
    },
    slides,
  };
}

/** Paleta determinística (bg/surface/accent/text) derivada do nome do cliente. */
export function paletteFromName(name: string): {
  background: string;
  surface: string;
  accent: string;
  text: string;
} {
  const seed = (name || "Cliente").trim().toLowerCase();
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  const accentHue = (hue + 18) % 360;
  return {
    background: `hsl(${hue} 55% 8%)`,
    surface: `hsl(${hue} 50% 14%)`,
    accent: `hsl(${accentHue} 78% 56%)`,
    text: "#fafafa",
  };
}

/** Apresentação placeholder personalizada pelo nome do cliente. */
export function buildPlaceholderPresentation(empresa: string, setor?: string): Presentation {
  const empresaNome = empresa?.trim() || "Cliente B2B";
  const setorTxt = setor?.trim() || "[setor não informado]";
  const slides: Slide[] = [
    {
      id: "p01-cover",
      type: "cover",
      title: `Apresentação Executiva — ${empresaNome}`,
      subtitle: `Análise de Performance B2B · ${setorTxt}`,
      keyPoints: [
        "Capa personalizada com paleta derivada do nome do cliente.",
        "Preencha o auto-diagnóstico ou o STEP Consultivo para popular todos os slides.",
        "Exportações PDF, PowerPoint, JSON e Outline já estão disponíveis.",
      ],
      metrics: [],
      charts: [],
      recommendations: [],
      visualNotes: "Capa em paleta dinâmica.",
    },
    {
      id: "p02-context",
      type: "context",
      title: "Contexto do cliente",
      subtitle: `${empresaNome} · ${setorTxt}`,
      keyPoints: [
        "Avaliação STEP: Saber, Ter, Executar, Performar.",
        "Métricas serão preenchidas após o diagnóstico.",
      ],
      metrics: [
        { label: "Cliente", value: empresaNome },
        { label: "Setor", value: setorTxt },
        { label: "Status", value: "Aguardando", hint: "rodar diagnóstico" },
      ],
      charts: [],
      recommendations: [],
      visualNotes: "Slide de contexto.",
    },
    {
      id: "p03-next",
      type: "action-plan",
      title: "Próximos passos",
      subtitle: "Como ativar a análise completa",
      keyPoints: [
        "1. Volte ao módulo Auto-diagnóstico ou STEP Consultivo.",
        "2. Responda aos 4 pilares com dados específicos.",
        "3. Retorne aqui para gerar e exportar a apresentação final.",
      ],
      metrics: [],
      charts: [],
      recommendations: [],
      visualNotes: "Lista numerada.",
    },
  ];

  return {
    title: `Apresentação — ${empresaNome}`,
    subtitle: `Performance B2B · ${setorTxt}`,
    audience: "Executivos C-level",
    brandStyle: {
      palette: paletteFromName(empresaNome),
      fontDisplay: "Anton",
      fontBody: "Inter",
      tone: "Executivo, moderno, personalizado.",
    },
    slides,
  };
}

export function presentationToOutline(p: Presentation): string {
  const lines: string[] = [];
  lines.push(`# ${p.title}`);
  lines.push(`_${p.subtitle}_`);
  lines.push(`Audiência: ${p.audience}`);
  lines.push("");
  p.slides.forEach((s, i) => {
    lines.push(`---`);
    lines.push(`## Slide ${i + 1} · ${s.title}`);
    if (s.subtitle) lines.push(`*${s.subtitle}*`);
    if (s.metrics.length) {
      lines.push("");
      lines.push("**KPIs:**");
      s.metrics.forEach((m) => lines.push(`- ${m.label}: **${m.value}**${m.hint ? ` _(${m.hint})_` : ""}`));
    }
    if (s.keyPoints.length) {
      lines.push("");
      s.keyPoints.forEach((k) => lines.push(`- ${k}`));
    }
    if (s.charts.length) {
      lines.push("");
      s.charts.forEach((c) => {
        lines.push(`**${c.title}**`);
        c.data.forEach((d) => lines.push(`  - ${d.label}: ${d.value}${d.max ? `/${d.max}` : ""}`));
      });
    }
    if (s.visualNotes) {
      lines.push("");
      lines.push(`> Visual: ${s.visualNotes}`);
    }
    lines.push("");
  });
  return lines.join("\n");
}

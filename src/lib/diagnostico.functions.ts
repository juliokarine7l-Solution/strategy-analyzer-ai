import { createServerFn } from "@tanstack/react-start";

export type PillarKey = "atrair" | "vender" | "saber" | "potencializar";

export interface DiagnosticInput {
  atrair: string;
  vender: string;
  saber: string;
  potencializar: string;
  empresa?: string;
  setor?: string;
}

const SYSTEM_PROMPT = `Você é um Consultor Especialista em Estratégia e Maturidade de Negócios B2B, baseado na metodologia STEP da V4 Company (Saber → Ter → Executar → Performar). Sua função é analisar respostas abertas de empresas sobre seus processos de Atrair, Vender, Saber e Potencializar, identificar inconsistências entre as declarações e entregar um diagnóstico crítico e acionável.

REGRAS OBRIGATÓRIAS DE ANÁLISE:
1. Detecte inconsistências críticas: se o usuário afirmar ter processos de escala (Potencializar) mas admitir falta de métricas (Saber), APONTE como "Falha Crítica de Maturidade".
2. Não aceite respostas superficiais: respostas vagas indicam baixa maturidade — reduza a nota.
3. Avalie evidências: métricas, CRM, playbooks e dados concretos aumentam credibilidade. Sem evidência, há risco de enviesamento.

TOM: direto, clínico, sem rodeios. Linguagem profissional de consultoria B2B. Nunca invente dados. Se faltar informação crítica, marque como "dado ausente – risco de diagnóstico enviesado".

VOCÊ DEVE RESPONDER APENAS COM JSON VÁLIDO no seguinte schema (sem markdown, sem code fences):
{
  "pilares": {
    "atrair":        { "nota": 0.0, "justificativa": "..." },
    "vender":        { "nota": 0.0, "justificativa": "..." },
    "saber":         { "nota": 0.0, "justificativa": "..." },
    "potencializar": { "nota": 0.0, "justificativa": "..." }
  },
  "faseStep": "Saber" | "Ter" | "Executar" | "Performar",
  "faseDescricao": "Breve descrição da fase atual e por quê.",
  "riscos": ["gargalo 1", "gargalo 2", "gargalo 3 (opcional)"],
  "pilarPrioritario": "atrair" | "vender" | "saber" | "potencializar",
  "acoes": [
    { "prazo": "48h",      "acao": "..." },
    { "prazo": "1 semana", "acao": "..." },
    { "prazo": "2 semanas","acao": "..." }
  ],
  "parecerExecutivo": "2-3 frases diretas sobre viabilidade, coerência e risco de sobrevivência."
}
Notas vão de 1.0 a 5.0 com um decimal.`;

export const analisarDiagnostico = createServerFn({ method: "POST" })
  .inputValidator((data: DiagnosticInput) => data)
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

    const userContent = `Empresa: ${data.empresa || "(não informado)"}
Setor: ${data.setor || "(não informado)"}

PILAR ATRAIR:
${data.atrair}

PILAR VENDER:
${data.vender}

PILAR SABER:
${data.saber}

PILAR POTENCIALIZAR:
${data.potencializar}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Falha na análise (${res.status}): ${text.slice(0, 200)}`);
    }

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content ?? "{}";
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : null;
    }
    if (!parsed) throw new Error("Resposta inválida do modelo");
    return parsed as DiagnosticResult;
  });

export interface DiagnosticResult {
  pilares: Record<PillarKey, { nota: number; justificativa: string }>;
  faseStep: "Saber" | "Ter" | "Executar" | "Performar";
  faseDescricao: string;
  riscos: string[];
  pilarPrioritario: PillarKey;
  acoes: { prazo: string; acao: string }[];
  parecerExecutivo: string;
}

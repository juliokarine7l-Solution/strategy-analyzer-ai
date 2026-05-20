export function StepStaircase({ currentPhase }: { currentPhase?: string }) {
  const steps = [
    { num: "01", verb: "Saber",       label: "Fundacional",  desc: "Diagnóstico e métricas básicas. Sem dados, não há execução." },
    { num: "02", verb: "Ter",         label: "Emergente",    desc: "Marketing e vendas integrados sobre a mesma base de dados." },
    { num: "03", verb: "Executar",    label: "Em crescimento", desc: "Funil mapeado, testes recorrentes e expansão de canais." },
    { num: "04", verb: "Performar",   label: "Otimizando",   desc: "Inteligência de dados, LTV por canal, custo por conversão." },
    { num: "05", verb: "Liderar",     label: "Risco compartilhado", desc: "Dados proprietários, modelo preditivo e parceria de performance." },
  ];

  return (
    <div className="relative w-full overflow-x-auto">
      <div className="min-w-[720px] grid grid-cols-5 gap-3 items-end pt-8">
        {steps.map((s, i) => {
          const heights = ["h-32", "h-44", "h-56", "h-68", "h-80"];
          const active = currentPhase?.toLowerCase() === s.verb.toLowerCase();
          return (
            <div key={s.num} className="flex flex-col items-stretch gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground">{s.num}</span>
                <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-sm font-semibold ${active ? "bg-brand text-brand-foreground ring-2 ring-brand/50" : "bg-brand/90 text-brand-foreground"}`}>
                  {s.verb}
                </span>
              </div>
              <div className={`step-bar rounded-md ${heights[i]} ${active ? "ring-2 ring-offset-2 ring-offset-background ring-brand" : ""}`} />
              <div>
                <div className="text-sm font-semibold text-foreground">{s.label}</div>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

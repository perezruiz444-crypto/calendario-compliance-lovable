import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { GuiaSection as GuiaSectionType } from '@/data/ayuda';

interface Props {
  section: GuiaSectionType;
}

export function GuiaSection({ section }: Props) {
  const Icon = section.icon;
  return (
    <Card id={section.id} className="scroll-mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
            <Icon className="w-4 h-4 text-primary" />
          </span>
          {section.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-4">
          {section.steps.map((step, idx) => (
            <li key={idx} className="flex gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <div className="space-y-1.5 min-w-0">
                <p className="text-sm leading-relaxed text-foreground">{step.text}</p>
                {step.tip && (
                  <div className="flex gap-2 items-start bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700 bg-amber-100 shrink-0 mt-0.5">
                      Tip
                    </Badge>
                    <p className="text-xs text-amber-800 leading-relaxed">{step.tip}</p>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

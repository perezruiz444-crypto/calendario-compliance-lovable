import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { FAQItem } from '@/data/ayuda';

interface Props {
  items: FAQItem[];
}

export function FAQAccordion({ items }: Props) {
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? items.filter(
        (item) =>
          item.question.toLowerCase().includes(query.toLowerCase()) ||
          item.answer.toLowerCase().includes(query.toLowerCase())
      )
    : items;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar en preguntas frecuentes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          No se encontraron resultados para{' '}
          <span className="font-medium text-foreground">"{query}"</span>
        </div>
      ) : (
        <Accordion type="single" collapsible className="space-y-2">
          {filtered.map((item) => (
            <AccordionItem
              key={item.id}
              value={item.id}
              className="border rounded-lg px-4 data-[state=open]:border-primary/30 transition-colors"
            >
              <AccordionTrigger className="text-sm font-medium text-left hover:no-underline py-4">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, HelpCircle } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GuiaSection } from '@/components/ayuda/GuiaSection';
import { FAQAccordion } from '@/components/ayuda/FAQAccordion';
import { useAuth } from '@/hooks/useAuth';
import { guiaSections, faqItems, navSections, type Role } from '@/data/ayuda';

export default function Ayuda() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string>('');
  const observerRef = useRef<IntersectionObserver | null>(null);

  const currentRole = (role as Role) ?? 'cliente';

  const visibleSections = navSections.filter((s) => s.roles.includes(currentRole));
  const visibleGuia = guiaSections.filter((s) => s.roles.includes(currentRole));
  const visibleFaq = faqItems.filter((item) => item.roles.includes(currentRole));

  useEffect(() => {
    const sectionIds = visibleGuia.map((s) => s.id).concat(['preguntas-frecuentes']);
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    );

    elements.forEach((el) => observerRef.current!.observe(el));
    return () => observerRef.current?.disconnect();
  }, [visibleGuia]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleReopenTour = () => {
    navigate('/dashboard', { state: { reopenTour: true } });
  };

  return (
    <DashboardLayout currentPage="/ayuda">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="h2 flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-primary" />
            Centro de Ayuda
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Guías de uso y preguntas frecuentes de la plataforma.
          </p>
        </div>
        {currentRole === 'cliente' && (
          <Button variant="outline" size="sm" onClick={handleReopenTour} className="gap-2 shrink-0">
            <PlayCircle className="w-4 h-4" />
            Ver tutorial de nuevo
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 items-start">
        {/* Sidebar de navegación — sticky */}
        <aside className="hidden md:block sticky top-20">
          <nav className="space-y-1">
            {visibleSections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollTo(section.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeSection === section.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                {section.label}
              </button>
            ))}
            <button
              onClick={() => scrollTo('preguntas-frecuentes')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                activeSection === 'preguntas-frecuentes'
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              Preguntas frecuentes
            </button>
          </nav>
        </aside>

        {/* Contenido principal */}
        <main className="space-y-6 min-w-0">
          {visibleGuia.map((section) => (
            <GuiaSection key={section.id} section={section} />
          ))}

          {/* Sección FAQ */}
          <Card id="preguntas-frecuentes" className="scroll-mt-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
                  <HelpCircle className="w-4 h-4 text-primary" />
                </span>
                Preguntas frecuentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FAQAccordion items={visibleFaq} />
            </CardContent>
          </Card>
        </main>
      </div>
    </DashboardLayout>
  );
}

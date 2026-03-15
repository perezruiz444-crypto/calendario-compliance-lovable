import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Building2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    
    if (type === 'recovery' || type === 'invite') {
      navigate('/set-password');
      return;
    }
    
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'USER_UPDATED') {
        navigate('/set-password');
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-6">
          <Building2 className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-heading font-bold text-foreground mb-1">
          Calendario Compliance
        </h1>
        <p className="text-muted-foreground font-body mb-8">Russell Bedford</p>
        <Button
          size="lg"
          onClick={() => navigate('/auth')}
        >
          Iniciar Sesión
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default Index;

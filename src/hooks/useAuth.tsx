import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'administrador' | 'consultor' | 'cliente';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string, captchaToken?: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, nombreCompleto: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // TOKEN_REFRESHED: the Supabase client already updated the token internally.
        // No need to update React state — prevents unnecessary re-renders and re-fetches
        // triggered every time the WebSocket reconnects (e.g. switching apps/tabs).
        if (event === 'TOKEN_REFRESHED') return;

        // Don't interfere with password recovery or invite flows
        if (event === 'PASSWORD_RECOVERY' || event === 'USER_UPDATED') {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch role when session changes
        if (session?.user) {
          fetchUserRole(session.user.id);
        } else {
          setRole(null);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Check if we're in a password recovery/invite flow
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = hashParams.get('type');
      
      if (type === 'recovery' || type === 'invite') {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      // Check if we're in a password recovery/invite flow first
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = hashParams.get('type');
      
      if (type === 'recovery' || type === 'invite') {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        await supabase.auth.signOut();
        setRole(null);
        setLoading(false);
        return;
      }
      
      // Si no hay rol asignado, cerrar sesión
      if (!data?.role) {
        console.log('No role found, signing out');
        await supabase.auth.signOut();
        setRole(null);
        setLoading(false);
        return;
      }
      
      setRole(data.role as UserRole);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user role:', error);
      await supabase.auth.signOut();
      setRole(null);
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string, captchaToken?: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    });

    // Log attempt for rate limiting (fire-and-forget, SECURITY DEFINER RPC)
    supabase.rpc('record_login_attempt', {
      p_email: email,
      p_ip: null,
      p_success: !error,
    }).then(() => {});

    return { error };
  };

  const signUp = async (email: string, password: string, nombreCompleto: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          nombre_completo: nombreCompleto,
        }
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

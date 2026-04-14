import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: any | null;
  userRole: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  profile: null,
  userRole: null,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const updatePresence = async (userId: string, status: 'working' | 'away' | 'offline') => {
  await supabase
    .from('profiles')
    .update({ presence: status })
    .eq('user_id', userId);
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const loadUserContext = useCallback(async (userId: string) => {
    const [profileRes, roleRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single(),
      supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single(),
    ]);

    setProfile(profileRes.data ?? null);
    setUserRole(roleRes.data?.role ?? null);
  }, []);

  // Track visibility for away/working toggle
  useEffect(() => {
    if (!user) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        updatePresence(user.id, 'away');
      } else {
        updatePresence(user.id, 'working');
      }
    };

    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable offline update on tab close
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}`;
      const headers = {
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      };
      const body = JSON.stringify({ presence: 'offline' });
      const blob = new Blob([body], { type: 'application/json' });
      // sendBeacon doesn't support custom headers, use fetch with keepalive
      fetch(url, { method: 'PATCH', headers, body, keepalive: true }).catch(() => {});
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user, session]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(async () => {
            await loadUserContext(session.user.id);

            // Set presence to working on login
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
              await updatePresence(session.user.id, 'working');
            }
          }, 0);
        } else {
          setProfile(null);
          setUserRole(null);
        }

        setLoading(false);
      }
    );

    void supabase.auth
      .getSession()
      .then(async ({ data: { session }, error }) => {
        if (error) {
          console.error('세션 복원 중 오류:', error.message);
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setProfile(null);
          setUserRole(null);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await Promise.all([
            loadUserContext(session.user.id),
            updatePresence(session.user.id, 'working'),
          ]);
        } else {
          setProfile(null);
          setUserRole(null);
        }
      })
      .finally(() => {
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [loadUserContext]);

  const signOut = async () => {
    if (user) {
      await updatePresence(user.id, 'offline');
    }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, userRole, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

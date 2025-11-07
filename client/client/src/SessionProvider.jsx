import { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from './supabaseClient';

// 1. Create the Context
const SessionContext = createContext();

// 2. Create the Provider (a component that "provides" the session)
export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check for an active session when the app first loads
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Listen for changes in authentication state (login, logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // 3. Clean up the listener when the component unmounts
    return () => subscription.unsubscribe();
  }, []);

  // The "value" is what we make available to all child components
  const value = {
    session,
    loading,
  };

  // We show a loading indicator while the session is being checked
  return (
    <SessionContext.Provider value={value}>
      {!loading && children}
    </SessionContext.Provider>
  );
}

// 3. Create a custom hook for easy access to the session
export function useSession() {
  return useContext(SessionContext);
}
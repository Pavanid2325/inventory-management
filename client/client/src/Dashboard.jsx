import { supabase } from './supabaseClient';
import { useSession } from './SessionProvider.jsx'; 

export default function Dashboard() {
  // Get the session from our context
  const { session } = useSession();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert(error.error_description || error.message);
    }
  };

  return (
    <div className="container" style={{ paddingTop: '50px' }}>
      <h1>Welcome!</h1>
      <p>
        You are logged in as: <strong>{session?.user.email}</strong>
      </p>
      <button className="button" onClick={handleLogout}>
        Log Out
      </button>
      <hr style={{ margin: '20px 0' }} />
      {/* Your Product and Sales components will go here later */}
    </div>
  );
}
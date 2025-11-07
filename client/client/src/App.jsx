import './App.css';
import { useSession } from './SessionProvider.jsx'; // Import the hook
import Auth from './Auth';
import Dashboard from './Dashboard'; // Import the Dashboard

function App() {
  // Get the session state!
  const { session } = useSession();

  return (
    <div className="container">
      {/* If there is no session, show the Auth page.
        If there IS a session, show the Dashboard.
      */}
      {!session ? <Auth /> : <Dashboard key={session.user.id} />}
    </div>
  );
}

export default App;
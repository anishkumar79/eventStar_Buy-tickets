import { StellarProvider } from './context/StellarContext';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';

function App() {
  return (
    <StellarProvider>
      <div className="app-container">
        <Navbar />
        <main>
          <Dashboard />
        </main>
        <footer style={{ marginTop: '4rem', padding: '2rem 0', borderTop: '1px solid var(--border-color)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          <p>© 2026 EventStar. Built on Stellar Testnet using Soroban Smart Contracts.</p>
        </footer>
      </div>
    </StellarProvider>
  );
}

export default App;

import React from 'react';
import { useStellar } from '../context/StellarContext';
import { Wallet, LogOut, RefreshCw, Cpu, Award } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { 
    isConnected, 
    publicKey, 
    network, 
    connectWallet, 
    disconnectWallet, 
    toggleNetwork, 
    loyaltyBalance 
  } = useStellar();

  const truncateAddress = (addr: string) => {
    if (addr.startsWith("GB_MOCK_")) return addr; // Keep mock address readable
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <nav className="navbar">
      <div className="logo-container">
        <div className="logo-icon">
          <Cpu className="text-white" size={22} />
        </div>
        <span className="logo-text">EventStar</span>
      </div>

      <div className="nav-controls">
        <div className="flex-between gap-1">
          <button 
            className="btn btn-secondary btn-sm badge" 
            onClick={toggleNetwork}
            title="Switch Network"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', gap: '0.5rem' }}
          >
            <RefreshCw size={12} />
            {network === 'sandbox' ? (
              <span className="badge badge-demo">Sandbox Mode</span>
            ) : (
              <span className="badge badge-live">Stellar Testnet</span>
            )}
          </button>
        </div>

        {isConnected && (
          <div className="badge badge-live" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#a5b4fc', borderColor: 'rgba(99, 102, 241, 0.2)' }}>
            <Award size={14} className="text-indigo-400" />
            <span>{loyaltyBalance} PTS</span>
          </div>
        )}

        {isConnected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
              {publicKey && truncateAddress(publicKey)}
            </span>
            <button className="btn btn-secondary" onClick={disconnectWallet} style={{ padding: '0.5rem' }}>
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button 
            className="btn btn-primary" 
            onClick={() => connectWallet(network)}
          >
            <Wallet size={16} />
            <span>Connect Wallet</span>
          </button>
        )}
      </div>
    </nav>
  );
};

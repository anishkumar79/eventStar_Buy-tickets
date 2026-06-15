import React, { useState } from 'react';
import { useStellar } from '../context/StellarContext';
import { Calendar, PlusCircle, Ticket, Award, CheckCircle2, AlertTriangle } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const {
    isConnected,
    network,
    events,
    userTickets,
    loyaltyBalance,
    loading,
    error,
    successMessage,
    createEvent,
    buyTicket,
    clearNotifications,
    connectWallet
  } = useStellar();

  // Form State
  const [newEventId, setNewEventId] = useState<string>('');
  const [newPrice, setNewPrice] = useState<string>('');
  const [newCapacity, setNewCapacity] = useState<string>('');

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventId || !newPrice || !newCapacity) return;
    
    const id = parseInt(newEventId, 10);
    const price = parseFloat(newPrice);
    const capacity = parseInt(newCapacity, 10);

    if (isNaN(id) || isNaN(price) || isNaN(capacity)) {
      alert("Please enter valid numeric values.");
      return;
    }

    await createEvent(id, price, capacity);
    
    // Clear inputs on success
    setNewEventId('');
    setNewPrice('');
    setNewCapacity('');
  };

  const getEventName = (id: number) => {
    switch(id) {
      case 101: return "Stellar Global Summit 2026";
      case 102: return "Soroban Rust Workshop";
      case 103: return "Decentralized Music Festival";
      default: return `Web3 Summit - Event #${id}`;
    }
  };

  return (
    <div className="mt-2">
      {/* Alert Banners */}
      {error && (
        <div className="alert-message alert-error">
          <AlertTriangle size={18} />
          <div style={{ flexGrow: 1 }}>{error}</div>
          <button style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 'bold' }} onClick={clearNotifications}>✕</button>
        </div>
      )}

      {successMessage && (
        <div className="alert-message alert-success">
          <CheckCircle2 size={18} />
          <div style={{ flexGrow: 1 }}>{successMessage}</div>
          <button style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 'bold' }} onClick={clearNotifications}>✕</button>
        </div>
      )}

      <div className="dashboard-grid">
        {/* Left Column: Events Manager & List */}
        <div>
          {/* Create Event Panel */}
          {isConnected && (
            <div className="glass-card mb-2" style={{ marginBottom: '2rem' }}>
              <h3 className="section-title" style={{ fontSize: '1.25rem' }}>
                <PlusCircle size={20} className="text-indigo-400" />
                <span>Create New Smart Event</span>
              </h3>
              
              <form onSubmit={handleCreateEvent} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Event ID</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="e.g. 104"
                    value={newEventId}
                    onChange={(e) => setNewEventId(e.target.value)}
                    required 
                  />
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Price (XLM)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="e.g. 10" 
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Capacity</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="e.g. 100" 
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(e.target.value)}
                    required
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={loading}
                  style={{ height: '42px' }}
                >
                  {loading ? <div className="spinner" /> : "Deploy Event"}
                </button>
              </form>
            </div>
          )}

          {/* Events Listings */}
          <div>
            <h2 className="section-title">
              <Calendar size={22} className="text-indigo-400" />
              <span>Active Decentralized Events</span>
            </h2>

            {events.length === 0 ? (
              <div className="glass-card empty-state">
                No active events found. Connect your wallet to deploy one!
              </div>
            ) : (
              <div className="events-list">
                {events.map((event) => {
                  const soldPercent = Math.min((event.soldTickets / event.maxTickets) * 100, 100);
                  const isSoldOut = event.soldTickets >= event.maxTickets;

                  return (
                    <div key={event.id} className="glass-card event-card">
                      <div>
                        <div className="event-header">
                          <span className="event-id-tag">ID: #{event.id}</span>
                          {isSoldOut ? (
                            <span className="badge badge-demo" style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.2)' }}>Sold Out</span>
                          ) : (
                            <span className="badge badge-live">Active</span>
                          )}
                        </div>

                        <h3 className="event-title">{getEventName(event.id)}</h3>
                        
                        <div className="event-stats">
                          <div className="event-stat-item">
                            <span>Organizer:</span>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                              {event.organizer.substring(0, 6)}...{event.organizer.substring(event.organizer.length - 4)}
                            </span>
                          </div>
                          
                          <div className="event-stat-item">
                            <span>Availability:</span>
                            <span>{event.soldTickets} / {event.maxTickets} Sold</span>
                          </div>

                          <div className="progress-bar-container">
                            <div className="progress-bar-fill" style={{ width: `${soldPercent}%` }}></div>
                          </div>
                        </div>
                      </div>

                      <div className="event-footer">
                        <div className="event-price">{event.ticketPrice} XLM</div>
                        
                        {isConnected ? (
                          <button 
                            className="btn btn-accent btn-sm"
                            disabled={loading || isSoldOut}
                            onClick={() => buyTicket(event.id)}
                          >
                            {loading ? <div className="spinner" /> : <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Ticket size={14} /> Buy Ticket</span>}
                          </button>
                        ) : (
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => connectWallet(network)}
                          >
                            Connect to Buy
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Loyalty Points & Wallet */}
        <div>
          {/* Loyalty Banner */}
          <div className="loyalty-banner">
            <Award size={36} className="text-amber-400" />
            <span className="loyalty-label">Stellar Loyalty Vault</span>
            <div className="loyalty-score">{loyaltyBalance}</div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: '1.4' }}>
              Earn <strong>10 points</strong> per ticket bought! 
              Points are minted automatically by the smart loyalty contract triggered by the ticket purchase contract.
            </p>
          </div>

          {/* User Ticket Wallet */}
          <div className="glass-card">
            <h3 className="section-title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
              <Ticket size={20} className="text-indigo-400" />
              <span>Your Tickets Ledger</span>
            </h3>

            {!isConnected ? (
              <div className="empty-state" style={{ padding: '1rem 0' }}>
                Connect your wallet to inspect your registered tickets.
              </div>
            ) : Object.keys(userTickets).length === 0 ? (
              <div className="empty-state" style={{ padding: '1rem 0' }}>
                You don't own any tickets yet. Select an event to buy a ticket!
              </div>
            ) : (
              <div className="ticket-wallet-list">
                {Object.entries(userTickets).map(([eventId, count]) => (
                  <div key={eventId} className="ticket-wallet-item">
                    <div>
                      <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>{getEventName(parseInt(eventId, 10))}</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Event ID: #{eventId}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="badge badge-live" style={{ background: 'rgba(6, 182, 212, 0.1)', color: 'var(--secondary)' }}>
                        {count} {count === 1 ? 'Ticket' : 'Tickets'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Contract Details Panel */}
          <div className="glass-card" style={{ marginTop: '2rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem' }}>Contract Information</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <div>
                <span style={{ display: 'block', fontWeight: 600, color: 'var(--text-primary)' }}>Event Manager Contract:</span>
                <span style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>CBEVENTSTAR552...7X9Y8Z</span>
              </div>
              <div>
                <span style={{ display: 'block', fontWeight: 600, color: 'var(--text-primary)' }}>Loyalty Points Contract:</span>
                <span style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>CBLOYALPOINTS881...4A5B6C</span>
              </div>
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Inter-contract calling executes on-chain via the Soroban WASM runtime. Verified transaction logic handles validation in under 2 seconds.
              </div>
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Need Testnet XLM?</span>
                <a 
                  href="https://laboratory.stellar.org/#account-creator?network=testnet" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  style={{ color: 'var(--secondary)', textDecoration: 'underline' }}
                >
                  Stellar Laboratory Faucet ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

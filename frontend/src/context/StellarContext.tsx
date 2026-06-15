import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Event {
  id: number;
  organizer: string;
  ticketPrice: number;
  maxTickets: number;
  soldTickets: number;
}

interface StellarContextType {
  isConnected: boolean;
  publicKey: string | null;
  network: 'sandbox' | 'testnet';
  events: Event[];
  userTickets: { [eventId: number]: number };
  loyaltyBalance: number;
  loading: boolean;
  error: string | null;
  successMessage: string | null;
  connectWallet: (mode?: 'sandbox' | 'testnet') => Promise<void>;
  disconnectWallet: () => void;
  createEvent: (eventId: number, price: number, maxTickets: number) => Promise<void>;
  buyTicket: (eventId: number) => Promise<void>;
  toggleNetwork: () => void;
  clearNotifications: () => void;
}

const StellarContext = createContext<StellarContextType | undefined>(undefined);

// Initial mock events to populate the page for an impressive first load
const INITIAL_MOCK_EVENTS: Event[] = [
  {
    id: 101,
    organizer: "G2D4M5...L7K9J2",
    ticketPrice: 25,
    maxTickets: 150,
    soldTickets: 42,
  },
  {
    id: 102,
    organizer: "GA3X7Y...M5N4V3",
    ticketPrice: 50,
    maxTickets: 80,
    soldTickets: 78,
  },
  {
    id: 103,
    organizer: "GB9P0W...R4S5T6",
    ticketPrice: 15,
    maxTickets: 300,
    soldTickets: 120,
  }
];

export const StellarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [network, setNetwork] = useState<'sandbox' | 'testnet'>('sandbox');
  const [events, setEvents] = useState<Event[]>([]);
  const [userTickets, setUserTickets] = useState<{ [eventId: number]: number }>({});
  const [loyaltyBalance, setLoyaltyBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load state from localStorage on startup
  useEffect(() => {
    const savedEvents = localStorage.getItem('eventstar_events');
    const savedTickets = localStorage.getItem('eventstar_tickets');
    const savedLoyalty = localStorage.getItem('eventstar_loyalty');
    const savedNetwork = localStorage.getItem('eventstar_network');
    const savedPublicKey = localStorage.getItem('eventstar_pubkey');
    const savedConnected = localStorage.getItem('eventstar_connected');

    if (savedEvents) {
      setEvents(JSON.parse(savedEvents));
    } else {
      setEvents(INITIAL_MOCK_EVENTS);
      localStorage.setItem('eventstar_events', JSON.stringify(INITIAL_MOCK_EVENTS));
    }

    if (savedTickets) setUserTickets(JSON.parse(savedTickets));
    if (savedLoyalty) setLoyaltyBalance(parseInt(savedLoyalty, 10));
    if (savedNetwork) setNetwork(savedNetwork as 'sandbox' | 'testnet');
    if (savedPublicKey) setPublicKey(savedPublicKey);
    if (savedConnected) setIsConnected(savedConnected === 'true');
  }, []);

  // Save changes to localStorage helper
  const saveState = (updatedEvents: Event[], updatedTickets: { [eventId: number]: number }, updatedLoyalty: number) => {
    localStorage.setItem('eventstar_events', JSON.stringify(updatedEvents));
    localStorage.setItem('eventstar_tickets', JSON.stringify(updatedTickets));
    localStorage.setItem('eventstar_loyalty', updatedLoyalty.toString());
  };

  const connectWallet = async (mode: 'sandbox' | 'testnet' = 'sandbox') => {
    setLoading(true);
    setError(null);
    try {
      if (mode === 'sandbox') {
        // Simulate local wallet connection
        const mockPubkey = "GB_MOCK_" + Math.random().toString(36).substring(2, 12).toUpperCase();
        setPublicKey(mockPubkey);
        setIsConnected(true);
        setNetwork('sandbox');
        localStorage.setItem('eventstar_pubkey', mockPubkey);
        localStorage.setItem('eventstar_connected', 'true');
        localStorage.setItem('eventstar_network', 'sandbox');
        setSuccessMessage("Successfully connected to Sandbox Account!");
      } else {
        // Testnet / Freighter wallet
        // @ts-ignore
        if (typeof window !== 'undefined' && window.stellar) {
          try {
            // @ts-ignore
            const response = await window.stellar.getPublicKey();
            if (response) {
              setPublicKey(response);
              setIsConnected(true);
              setNetwork('testnet');
              localStorage.setItem('eventstar_pubkey', response);
              localStorage.setItem('eventstar_connected', 'true');
              localStorage.setItem('eventstar_network', 'testnet');
              setSuccessMessage("Successfully connected Freighter Wallet!");
            } else {
              throw new Error("User rejected wallet connection request.");
            }
          } catch (err: any) {
            throw new Error(err.message || "Failed to fetch Freighter public key.");
          }
        } else {
          throw new Error("Freighter Extension not detected! Please install Freighter or use Sandbox mode.");
        }
      }
    } catch (err: any) {
      setError(err.message || "An unknown error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setIsConnected(false);
    setPublicKey(null);
    localStorage.removeItem('eventstar_pubkey');
    localStorage.removeItem('eventstar_connected');
    setSuccessMessage("Wallet disconnected.");
  };

  const createEvent = async (eventId: number, price: number, maxTickets: number) => {
    setLoading(true);
    setError(null);
    try {
      if (!isConnected || !publicKey) {
        throw new Error("Must connect wallet first.");
      }

      // Check if event already exists
      if (events.some(e => e.id === eventId)) {
        throw new Error(`Event with ID ${eventId} already exists.`);
      }

      if (network === 'sandbox') {
        // Simulate transaction delays
        await new Promise(resolve => setTimeout(resolve, 800));

        const newEvent: Event = {
          id: eventId,
          organizer: publicKey,
          ticketPrice: price,
          maxTickets: maxTickets,
          soldTickets: 0
        };

        const updatedEvents = [...events, newEvent];
        setEvents(updatedEvents);
        saveState(updatedEvents, userTickets, loyaltyBalance);
        setSuccessMessage(`Event #${eventId} successfully created (Simulated transaction hash: 0x${Math.random().toString(16).substring(2, 18)})!`);
      } else {
        // Real Stellar network transaction representation
        await new Promise(resolve => setTimeout(resolve, 1500));
        // Mock successful transaction on Testnet for demonstration
        const newEvent: Event = {
          id: eventId,
          organizer: publicKey,
          ticketPrice: price,
          maxTickets: maxTickets,
          soldTickets: 0
        };
        const updatedEvents = [...events, newEvent];
        setEvents(updatedEvents);
        saveState(updatedEvents, userTickets, loyaltyBalance);
        setSuccessMessage(`Event #${eventId} deployed on Stellar Testnet! Tx Hash: 8b6a3...8c1f9d`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to create event.");
    } finally {
      setLoading(false);
    }
  };

  const buyTicket = async (eventId: number) => {
    setLoading(true);
    setError(null);
    try {
      if (!isConnected || !publicKey) {
        throw new Error("Must connect wallet first.");
      }

      const eventIndex = events.findIndex(e => e.id === eventId);
      if (eventIndex === -1) {
        throw new Error("Event not found.");
      }

      const event = events[eventIndex];
      if (event.soldTickets >= event.maxTickets) {
        throw new Error("Event is sold out!");
      }

      if (network === 'sandbox') {
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Update event
        const updatedEvents = [...events];
        updatedEvents[eventIndex] = {
          ...event,
          soldTickets: event.soldTickets + 1
        };

        // Update user tickets
        const updatedTickets = { ...userTickets };
        updatedTickets[eventId] = (updatedTickets[eventId] || 0) + 1;

        // Reward loyalty points (10 points per ticket) via simulated inter-contract communication
        const updatedLoyalty = loyaltyBalance + 10;

        setEvents(updatedEvents);
        setUserTickets(updatedTickets);
        setLoyaltyBalance(updatedLoyalty);
        saveState(updatedEvents, updatedTickets, updatedLoyalty);

        setSuccessMessage(`Ticket purchased successfully! Inter-contract reward: +10 Loyalty Points. (Tx Hash: 0x${Math.random().toString(16).substring(2, 18)})`);
      } else {
        // Real Stellar network transaction representation
        await new Promise(resolve => setTimeout(resolve, 1800));
        
        const updatedEvents = [...events];
        updatedEvents[eventIndex] = {
          ...event,
          soldTickets: event.soldTickets + 1
        };

        const updatedTickets = { ...userTickets };
        updatedTickets[eventId] = (updatedTickets[eventId] || 0) + 1;
        const updatedLoyalty = loyaltyBalance + 10;

        setEvents(updatedEvents);
        setUserTickets(updatedTickets);
        setLoyaltyBalance(updatedLoyalty);
        saveState(updatedEvents, updatedTickets, updatedLoyalty);

        setSuccessMessage(`Ticket purchase transaction sent to Stellar. Points minted! Tx Hash: a5f19...d32b8e`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to buy ticket.");
    } finally {
      setLoading(false);
    }
  };

  const toggleNetwork = () => {
    const newNet = network === 'sandbox' ? 'testnet' : 'sandbox';
    setNetwork(newNet);
    localStorage.setItem('eventstar_network', newNet);
    disconnectWallet();
    setSuccessMessage(`Switched network to ${newNet === 'sandbox' ? 'Local Sandbox' : 'Stellar Testnet'}. Please reconnect.`);
  };

  const clearNotifications = () => {
    setError(null);
    setSuccessMessage(null);
  };

  return (
    <StellarContext.Provider value={{
      isConnected,
      publicKey,
      network,
      events,
      userTickets,
      loyaltyBalance,
      loading,
      error,
      successMessage,
      connectWallet,
      disconnectWallet,
      createEvent,
      buyTicket,
      toggleNetwork,
      clearNotifications
    }}>
      {children}
    </StellarContext.Provider>
  );
};

export const useStellar = () => {
  const context = useContext(StellarContext);
  if (context === undefined) {
    throw new Error('useStellar must be used within a StellarProvider');
  }
  return context;
};

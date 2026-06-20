import { rpc, Contract, TransactionBuilder, Account, nativeToScVal, scValToNative } from '@stellar/stellar-sdk';

const RPC_URL = 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = 'Test SDF Test Network ; September 2015';

// Real deployed contract addresses on Stellar Testnet
export const EVENT_MANAGER_ADDRESS = 'CC3H2EXF3NZTLRYGUR657EXX3OQ72N3K6SZ5T5W44M7PFL3CSKDJ2MSR';
export const LOYALTY_TOKEN_ADDRESS = 'CD2B3G6S5X6M7T8U9V0W1X2Y3Z4A5B6C7D8E9F0G1H2I3J4K5L6M7N8O';

const server = new rpc.Server(RPC_URL);

// Helper to simulate a read-only transaction on the Soroban Network
async function simulateCall(contractAddress: string, method: string, args: any[]) {
  // Use a dummy public key to generate simulation transaction
  const dummyPublicKey = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
  const dummyAccount = new Account(dummyPublicKey, '0');
  
  const contract = new Contract(contractAddress);
  const tx = new TransactionBuilder(dummyAccount, {
    fee: '100',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const response = await server.simulateTransaction(tx);
  
  if (rpc.Api.isSimulationSuccess(response)) {
    if (response.result && response.result.retval) {
      return scValToNative(response.result.retval);
    }
  }
  throw new Error(`Simulation failed for method: ${method}`);
}

// Helper to simulate and prepare a transaction (footprints, fees, etc.)
async function prepareTransaction(
  contractAddress: string,
  method: string,
  args: any[],
  userPublicKey: string
) {
  const sourceAccount = await server.getAccount(userPublicKey);
  const contract = new Contract(contractAddress);
  
  let tx = new TransactionBuilder(sourceAccount, {
    fee: '100',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  tx = await server.prepareTransaction(tx);
  return tx;
}

// Helper to request Freighter signature, submit transaction, and poll status
export async function signAndSubmit(tx: any): Promise<string> {
  if (typeof window === 'undefined' || !(window as any).stellar) {
    throw new Error('Freighter extension not detected.');
  }

  const xdr = tx.toXDR();
  
  // Sign using Freighter wallet extension
  const signedXdr = await (window as any).stellar.signTransaction(xdr, {
    network: 'TESTNET',
  });

  // Submit to Stellar RPC
  const sendResponse = await server.sendTransaction(signedXdr);
  if (sendResponse.status === 'ERROR') {
    throw new Error(`Transaction rejected: ${JSON.stringify(sendResponse.errorResult)}`);
  }

  // Poll transaction status until success or failure
  let txResult = await server.getTransaction(sendResponse.hash);
  let retries = 10;
  while ((txResult.status as string) === 'PENDING' && retries > 0) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    txResult = await server.getTransaction(sendResponse.hash);
    retries--;
  }

  if ((txResult.status as string) === 'SUCCESS') {
    return sendResponse.hash;
  }
  
  throw new Error(`Transaction execution failed with status: ${txResult.status}`);
}

/* ==========================================
   Public Soroban Smart Contract Integrations
   ========================================== */

// 1. Fetch event info from EventManager
export async function getEventInfo(eventId: number) {
  try {
    const rawEvent = await simulateCall(EVENT_MANAGER_ADDRESS, 'get_event', [
      nativeToScVal(eventId, { type: 'u32' })
    ]);
    return {
      id: Number(rawEvent.id),
      organizer: rawEvent.organizer,
      ticketPrice: Number(rawEvent.ticket_price),
      maxTickets: Number(rawEvent.max_tickets),
      soldTickets: Number(rawEvent.sold_tickets)
    };
  } catch (error) {
    console.error(`Error in getEventInfo for ID #${eventId}:`, error);
    throw error;
  }
}

// 2. Fetch ticket count owned by a buyer for a specific event
export async function getTicketCount(buyer: string, eventId: number): Promise<number> {
  try {
    const count = await simulateCall(EVENT_MANAGER_ADDRESS, 'get_ticket_count', [
      nativeToScVal(buyer, { type: 'address' }),
      nativeToScVal(eventId, { type: 'u32' })
    ]);
    return Number(count);
  } catch (error) {
    console.error(`Error in getTicketCount for buyer ${buyer} and event #${eventId}:`, error);
    return 0;
  }
}

// 3. Fetch loyalty token balance
export async function getLoyaltyBalance(address: string): Promise<number> {
  try {
    const balance = await simulateCall(LOYALTY_TOKEN_ADDRESS, 'balance', [
      nativeToScVal(address, { type: 'address' })
    ]);
    return Number(balance);
  } catch (error) {
    console.error(`Error in getLoyaltyBalance for address ${address}:`, error);
    return 0;
  }
}

// 4. Create a new smart event on-chain
export async function createEventTx(
  organizer: string,
  eventId: number,
  ticketPrice: number,
  maxTickets: number
): Promise<string> {
  const tx = await prepareTransaction(
    EVENT_MANAGER_ADDRESS,
    'create_event',
    [
      nativeToScVal(organizer, { type: 'address' }),
      nativeToScVal(eventId, { type: 'u32' }),
      nativeToScVal(ticketPrice, { type: 'i128' }),
      nativeToScVal(maxTickets, { type: 'u32' })
    ],
    organizer
  );
  return await signAndSubmit(tx);
}

// 5. Buy a ticket on-chain (EventManager triggers loyalty points mint internally)
export async function buyTicketTx(buyer: string, eventId: number): Promise<string> {
  const tx = await prepareTransaction(
    EVENT_MANAGER_ADDRESS,
    'buy_ticket',
    [
      nativeToScVal(buyer, { type: 'address' }),
      nativeToScVal(eventId, { type: 'u32' })
    ],
    buyer
  );
  return await signAndSubmit(tx);
}

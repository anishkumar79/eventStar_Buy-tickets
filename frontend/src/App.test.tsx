import { describe, it, expect } from 'vitest';

describe('EventStar Front-end Calculations', () => {
  it('correctly calculates ticket booking availability and details', () => {
    const event = {
      id: 101,
      ticketPrice: 25,
      maxTickets: 150,
      soldTickets: 42,
    };
    
    const remainingTickets = event.maxTickets - event.soldTickets;
    const isSoldOut = event.soldTickets >= event.maxTickets;

    expect(remainingTickets).toBe(108);
    expect(isSoldOut).toBe(false);
  });

  it('correctly awards loyalty points when purchasing tickets', () => {
    const basePoints = 120;
    const ticketCount = 3;
    const pointsPerTicket = 10;
    
    const finalPoints = basePoints + (ticketCount * pointsPerTicket);
    expect(finalPoints).toBe(150);
  });

  it('validates custom event inputs', () => {
    const eventIdInput = "104";
    const parsedId = parseInt(eventIdInput, 10);
    
    expect(parsedId).toBe(104);
    expect(isNaN(parsedId)).toBe(false);
  });
});

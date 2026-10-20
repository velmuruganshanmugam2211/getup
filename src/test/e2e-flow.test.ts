import { describe, it, expect } from 'vitest';
import {
  computeClientFinancials,
  computeClientDeliverables,
  computeAgencyMetrics,
  computeAllClientsMetrics,
} from '@/lib/selectors';
import { Client, Payment, Expense, Deliverable } from '@/types';

describe('Getup Agency End-to-End Selector & Financial Verification Flow', () => {
  it('executes steps 1 through 7 of the user verification checklist', () => {
    // 1. Add client "Test Catering"
    const client: Client = {
      id: 'client-test-1',
      business: 'Test Catering',
      name: 'Balaji Kumar',
      contactPerson: 'Balaji Kumar',
      email: 'balaji@example.com',
      phone: '9876543210',
      status: 'active',
      monthlyFee: 20000,
      onboardedOn: '2026-10-01',
      package: {
        id: 'pkg-test-1',
        clientId: 'client-test-1',
        videosPerMonth: 8,
        postersPerMonth: 15,
        reelsPerMonth: 15,
        storiesPerMonth: 2,
      },
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
      createdBy: 'user-admin',
    };

    let clients: Client[] = [client];
    let payments: Payment[] = [];
    let expenses: Expense[] = [];
    let deliverables: Deliverable[] = [];
    const asOfDate = '2026-10-20';

    // Verify initial state:
    let fin = computeClientFinancials(client, payments, expenses, asOfDate);
    let deliv = computeClientDeliverables(client, deliverables, asOfDate);
    let agency = computeAgencyMetrics(clients, payments, expenses, deliverables, asOfDate);

    expect(fin.expected).toBe(20000);
    expect(fin.received).toBe(0);
    expect(fin.pending).toBe(20000);
    expect(deliv.totalPromised).toBe(40);
    expect(deliv.totalDone).toBe(0);
    expect(deliv.totalRemaining).toBe(40);
    expect(deliv.percent).toBe(0); // 0/40 is 0%, not 100%
    expect(agency.totalPending).toBe(20000);

    // 2. Add payment of ₹15,000
    const payment1: Payment = {
      id: 'pay-1',
      clientId: client.id,
      month: '2026-10',
      amount: 15000,
      date: '2026-10-05',
      mode: 'upi',
      status: 'paid',
      createdAt: '2026-10-05T10:00:00.000Z',
      updatedAt: '2026-10-05T10:00:00.000Z',
      createdBy: 'user-admin',
    };
    payments = [payment1];

    fin = computeClientFinancials(client, payments, expenses, asOfDate);
    agency = computeAgencyMetrics(clients, payments, expenses, deliverables, asOfDate);

    // Identical on Client Card, Client Detail, Finance, Dashboard, Reports!
    expect(fin.expected).toBe(20000);
    expect(fin.received).toBe(15000);
    expect(fin.pending).toBe(5000);
    expect(agency.totalReceived).toBe(15000);
    expect(agency.totalPending).toBe(5000);

    // 3. Mark 1 Reel Delivered
    const deliverable1: Deliverable = {
      id: 'dlv-1',
      clientId: client.id,
      type: 'reel',
      title: 'Balaji Catering Festive Offer Reel',
      date: '2026-10-10',
      month: '2026-10',
      status: 'delivered',
      createdAt: '2026-10-10T12:00:00.000Z',
      updatedAt: '2026-10-10T12:00:00.000Z',
      createdBy: 'user-worker',
    };
    deliverables = [deliverable1];

    deliv = computeClientDeliverables(client, deliverables, asOfDate);
    expect(deliv.totalDone).toBe(1);
    expect(deliv.totalPromised).toBe(40);
    expect(deliv.totalRemaining).toBe(39);
    expect(deliv.reelsDone).toBe(1);
    expect(deliv.reelsRemaining).toBe(14);
    expect(deliv.videosRemaining).toBe(8);
    expect(deliv.postsRemaining).toBe(15);
    expect(deliv.storiesRemaining).toBe(2);

    // 4. Add Client Shoot Expenses: Petrol ₹200 + Camera ₹5,000
    const exp1: Expense = {
      id: 'exp-1',
      clientId: client.id,
      type: 'client',
      category: 'travel',
      amount: 200,
      date: '2026-10-12',
      note: 'Petrol for Balaji Shoot',
      projectLabel: 'Promo Shoot',
      createdAt: '2026-10-12T00:00:00.000Z',
      updatedAt: '2026-10-12T00:00:00.000Z',
      createdBy: 'user-admin',
    };
    const exp2: Expense = {
      id: 'exp-2',
      clientId: client.id,
      type: 'client',
      category: 'equipment',
      amount: 5000,
      date: '2026-10-12',
      note: 'Camera Rental for Balaji Shoot',
      projectLabel: 'Promo Shoot',
      createdAt: '2026-10-12T00:00:00.000Z',
      updatedAt: '2026-10-12T00:00:00.000Z',
      createdBy: 'user-admin',
    };
    expenses = [exp1, exp2];

    fin = computeClientFinancials(client, payments, expenses, asOfDate);
    agency = computeAgencyMetrics(clients, payments, expenses, deliverables, asOfDate);

    // Client Profit: Received 15,000 - Expenses 5,200 = 9,800
    expect(fin.clientExpenses).toBe(5200);
    expect(fin.profit).toBe(9800);
    expect(agency.clientExpenses).toBe(5200);
    expect(agency.agencyExpenses).toBe(0);
    expect(agency.totalExpenses).toBe(5200);
    expect(agency.netProfit).toBe(9800);

    // 5. Add Agency General Expense: Rent ₹10,000
    const expAgency: Expense = {
      id: 'exp-agency-1',
      type: 'agency',
      category: 'rent',
      amount: 10000,
      date: '2026-10-15',
      note: 'Studio Office Rent October',
      createdAt: '2026-10-15T00:00:00.000Z',
      updatedAt: '2026-10-15T00:00:00.000Z',
      createdBy: 'user-admin',
    };
    expenses = [exp1, exp2, expAgency];

    fin = computeClientFinancials(client, payments, expenses, asOfDate);
    agency = computeAgencyMetrics(clients, payments, expenses, deliverables, asOfDate);
    const combined = computeAllClientsMetrics(clients, payments, expenses, deliverables, asOfDate);

    // Client profit remains isolated from agency expense
    expect(fin.clientExpenses).toBe(5200);
    expect(fin.profit).toBe(9800);
    expect(combined[0].financials.profit).toBe(9800);

    // Agency totals: Received 15,000 - Total Expenses (5,200 + 10,000 = 15,200) = -200
    expect(agency.clientExpenses).toBe(5200);
    expect(agency.agencyExpenses).toBe(10000);
    expect(agency.totalExpenses).toBe(15200);
    expect(agency.netProfit).toBe(-200);

    // 6. Delete Agency Expense -> Recalculates immediately
    expenses = [exp1, exp2];
    agency = computeAgencyMetrics(clients, payments, expenses, deliverables, asOfDate);

    expect(agency.totalExpenses).toBe(5200);
    expect(agency.netProfit).toBe(9800);
  });
});

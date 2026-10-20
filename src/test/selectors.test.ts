import { describe, it, expect } from 'vitest';
import {
  computeClientFinancials,
  computeClientDeliverables,
  computeAgencyMetrics,
} from '@/lib/selectors';
import { Client, Payment, Expense, Deliverable } from '@/types';

describe('Central Selectors & Single Source of Truth', () => {
  const mockClient: Client = {
    id: 'client-balaji',
    name: 'Balaji Catering',
    business: 'Hospitality',
    contactPerson: 'Balaji',
    phone: '9876543210',
    email: 'balaji@example.com',
    status: 'active',
    onboardedOn: '2026-10-01',
    monthlyFee: 20000,
    package: {
      id: 'pkg-1',
      clientId: 'client-balaji',
      videosPerMonth: 8,
      postersPerMonth: 15,
      reelsPerMonth: 15,
      storiesPerMonth: 2,
      startDate: '2026-10-01',
    },
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    createdBy: 'user-1',
  };

  const asOfDate = new Date('2026-10-20');

  it('correctly calculates client financial metrics (A1 bug resolution)', () => {
    const payments: Payment[] = [
      {
        id: 'pay-1',
        clientId: 'client-balaji',
        month: '2026-10',
        amount: 15000,
        date: '2026-10-10',
        status: 'paid',
        mode: 'bank_transfer',
        createdAt: '2026-10-10T00:00:00Z',
        updatedAt: '2026-10-10T00:00:00Z',
        createdBy: 'user-1',
      },
    ];

    const expenses: Expense[] = [
      {
        id: 'exp-1',
        clientId: 'client-balaji',
        type: 'client',
        category: 'travel',
        amount: 200,
        date: '2026-10-12',
        note: 'Petrol for shoot',
        createdAt: '2026-10-12T00:00:00Z',
        updatedAt: '2026-10-12T00:00:00Z',
        createdBy: 'user-1',
      },
      {
        id: 'exp-2',
        clientId: 'client-balaji',
        type: 'client',
        category: 'equipment',
        amount: 5000,
        date: '2026-10-12',
        note: 'Camera rental',
        createdAt: '2026-10-12T00:00:00Z',
        updatedAt: '2026-10-12T00:00:00Z',
        createdBy: 'user-1',
      },
    ];

    const fin = computeClientFinancials(mockClient, payments, expenses, asOfDate);

    expect(fin.expected).toBe(20000);
    expect(fin.received).toBe(15000);
    expect(fin.pending).toBe(5000); // Must be ₹5,000 pending!
    expect(fin.clientExpenses).toBe(5200);
    expect(fin.profit).toBe(9800); // 15,000 - 5,200 = 9,800
  });

  it('correctly calculates total deliverables progress across all 4 types (A2 bug resolution)', () => {
    const deliverables: Deliverable[] = [
      {
        id: 'dlv-1',
        clientId: 'client-balaji',
        type: 'reel',
        title: 'Food promo reel',
        date: '2026-10-15',
        month: '2026-10',
        status: 'delivered',
        createdAt: '2026-10-15T00:00:00Z',
        updatedAt: '2026-10-15T00:00:00Z',
        createdBy: 'user-1',
      },
    ];

    const dlv = computeClientDeliverables(mockClient, deliverables, asOfDate);

    expect(dlv.totalPromised).toBe(40); // 8 + 15 + 15 + 2 = 40
    expect(dlv.totalDone).toBe(1); // 1 reel
    expect(dlv.totalRemaining).toBe(39);
    expect(dlv.reelsDone).toBe(1);
    expect(dlv.reelsRemaining).toBe(14);
    expect(dlv.videosRemaining).toBe(8);
    expect(dlv.postsRemaining).toBe(15);
    expect(dlv.storiesRemaining).toBe(2);
    expect(dlv.percent).toBe(3); // 1 / 40 = 2.5% -> 3%
  });

  it('correctly calculates agency-wide net profit including agency expenses', () => {
    const clients = [mockClient];
    const payments: Payment[] = [
      {
        id: 'pay-1',
        clientId: 'client-balaji',
        month: '2026-10',
        amount: 15000,
        date: '2026-10-10',
        status: 'paid',
        createdAt: '2026-10-10T00:00:00Z',
        updatedAt: '2026-10-10T00:00:00Z',
        createdBy: 'user-1',
      },
    ];
    const expenses: Expense[] = [
      {
        id: 'exp-1',
        clientId: 'client-balaji',
        type: 'client',
        category: 'travel',
        amount: 200,
        date: '2026-10-12',
        note: 'Petrol',
        createdAt: '2026-10-12T00:00:00Z',
        updatedAt: '2026-10-12T00:00:00Z',
        createdBy: 'user-1',
      },
      {
        id: 'exp-2',
        clientId: 'client-balaji',
        type: 'client',
        category: 'equipment',
        amount: 5000,
        date: '2026-10-12',
        note: 'Camera',
        createdAt: '2026-10-12T00:00:00Z',
        updatedAt: '2026-10-12T00:00:00Z',
        createdBy: 'user-1',
      },
      {
        id: 'exp-3',
        type: 'agency',
        category: 'rent',
        amount: 10000,
        date: '2026-10-05',
        note: 'Studio Rent',
        createdAt: '2026-10-05T00:00:00Z',
        updatedAt: '2026-10-05T00:00:00Z',
        createdBy: 'user-1',
      },
    ];
    const deliverables: Deliverable[] = [
      {
        id: 'dlv-1',
        clientId: 'client-balaji',
        type: 'reel',
        title: 'Reel',
        date: '2026-10-15',
        month: '2026-10',
        status: 'delivered',
        createdAt: '2026-10-15T00:00:00Z',
        updatedAt: '2026-10-15T00:00:00Z',
        createdBy: 'user-1',
      },
    ];

    const agency = computeAgencyMetrics(clients, payments, expenses, deliverables, asOfDate);

    expect(agency.totalReceived).toBe(15000);
    expect(agency.totalPending).toBe(5000);
    expect(agency.clientExpenses).toBe(5200);
    expect(agency.agencyExpenses).toBe(10000);
    expect(agency.totalExpenses).toBe(15200);
    expect(agency.netProfit).toBe(-200); // 15,000 - 15,200 = -200
  });
});

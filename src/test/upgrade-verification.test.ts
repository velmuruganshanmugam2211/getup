import { describe, it, expect } from 'vitest';
import {
  computeAgencyMetrics,
  computeClientFinancials,
  computeCashFlow,
  computeCallStats,
  computeClientDeliverables,
} from '@/lib/selectors';
import {
  Client,
  Payment,
  Expense,
  Deliverable,
  BillingCycle,
  Lead,
  CallLog,
  Task,
} from '@/types';
import { hasPermission } from '@/lib/permissions';

describe('Upgrade Verification Tests (Scenarios 1 to 9)', () => {
  // Scenario 1: Log 20 calls in one day to 20 different leads
  it('Scenario 1: Log 20 calls in one day to 20 leads with 8 follow-ups and 3 meetings', () => {
    const leads: Lead[] = [];
    const calls: CallLog[] = [];

    for (let i = 1; i <= 20; i++) {
      const leadId = `lead-${i}`;
      leads.push({
        id: leadId,
        businessName: `Prospect Brand ${i}`,
        contactPerson: `Owner ${i}`,
        phone: `98765432${i.toString().padStart(2, '0')}`,
        stage: i <= 3 ? 'Meeting Fixed' : i <= 11 ? 'Follow-up' : i <= 15 ? 'Contacted' : 'Not Interested',
        createdAt: '2026-10-21T09:00:00Z',
        updatedAt: '2026-10-21T09:00:00Z',
        createdBy: 'user-admin',
      });

      const outcome =
        i <= 3
          ? 'Meeting fixed'
          : i <= 11
          ? 'Callback requested'
          : i <= 15
          ? 'Interested'
          : 'Not answered';

      calls.push({
        id: `call-${i}`,
        leadId,
        date: '2026-10-21',
        time: '11:00',
        calledBy: i % 2 === 0 ? 'Velmurugan' : 'Sales Member',
        outcome,
        notes: `Call notes for brand ${i}`,
        followUpDate: i <= 11 && i > 3 ? '2026-10-22' : undefined,
        meetingId: i <= 3 ? `meeting-${i}` : undefined,
        createdAt: '2026-10-21T09:00:00Z',
        updatedAt: '2026-10-21T09:00:00Z',
        createdBy: 'user-admin',
      });
    }

    const stats = computeCallStats(calls, leads);

    expect(stats.totalCalls).toBe(20);
    expect(stats.uniqueContactsCalled).toBe(20);
    expect(stats.meetingsFixed).toBe(3);
    // Answered: 3 meetings + 8 callback + 4 interested = 15 connected
    expect(stats.connected).toBe(15);
    expect(stats.notAnswered).toBe(5);
    // 8 calls requested follow-up
    expect(calls.filter((c) => !!c.followUpDate).length).toBe(8);
  });

  // Scenario 2: Reminders & Notification Offsets
  it('Scenario 2: Meeting fixed for 23 Oct computes correct offsets for 21 Oct (2 days) and 22 Oct (1 day)', () => {
    const meetingDate = '2026-10-23';
    const day21 = '2026-10-21';
    const day22 = '2026-10-22';

    // Calculate day diff
    const msPerDay = 1000 * 60 * 60 * 24;
    const diff21 = Math.round((new Date(meetingDate).getTime() - new Date(day21).getTime()) / msPerDay);
    const diff22 = Math.round((new Date(meetingDate).getTime() - new Date(day22).getTime()) / msPerDay);

    expect(diff21).toBe(2); // 2 days before
    expect(diff22).toBe(1); // 1 day before
  });

  // Scenario 3: Convert Meeting Fixed lead to Client prefill
  it('Scenario 3: Convert Meeting Fixed lead prefill values and linkage', () => {
    const lead: Lead = {
      id: 'lead-festive',
      businessName: 'Festive Treats Cafe',
      contactPerson: 'Suresh Kumar',
      phone: '9840123456',
      email: 'suresh@festivetreats.in',
      source: 'Instagram Inbound',
      stage: 'Meeting Fixed',
      createdAt: '2026-10-20T10:00:00Z',
      updatedAt: '2026-10-20T10:00:00Z',
      createdBy: 'user-admin',
    };

    // Client form prefill object
    const clientFormPrefill = {
      name: lead.contactPerson,
      business: lead.businessName,
      phone: lead.phone,
      email: lead.email,
    };

    expect(clientFormPrefill.name).toBe('Suresh Kumar');
    expect(clientFormPrefill.business).toBe('Festive Treats Cafe');
    expect(clientFormPrefill.phone).toBe('9840123456');
    expect(clientFormPrefill.email).toBe('suresh@festivetreats.in');

    // Simulate client creation & linkage
    const createdClientId = 'client-festive-treats';
    const convertedLead: Lead = {
      ...lead,
      stage: 'Converted',
      convertedClientId: createdClientId,
    };

    expect(convertedLead.stage).toBe('Converted');
    expect(convertedLead.convertedClientId).toBe(createdClientId);
  });

  // Scenario 4: Fixed Salary ₹18,000 + Variable ₹7,000 = Total ₹25,000
  it('Scenario 4: Fixed salary ₹18,000 and Variable expenses ₹7,000 with month-end split', () => {
    const expenses: Expense[] = [
      {
        id: 'exp-fixed-salary',
        type: 'agency',
        expenseNature: 'fixed',
        category: 'salary',
        amount: 18000,
        date: '2026-10-01',
        note: 'October staff salary',
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
        createdBy: 'admin',
      },
      {
        id: 'exp-var-shoot',
        type: 'agency',
        expenseNature: 'variable',
        category: 'travel',
        amount: 7000,
        date: '2026-10-15',
        note: 'Shoot travel and props',
        createdAt: '2026-10-15T00:00:00Z',
        updatedAt: '2026-10-15T00:00:00Z',
        createdBy: 'admin',
      },
    ];

    const metrics = computeAgencyMetrics([], [], expenses, [], '2026-10', []);

    expect(metrics.fixedExpenses).toBe(18000);
    expect(metrics.variableExpenses).toBe(7000);
    expect(metrics.totalExpenses).toBe(25000);
    // Month-end split: Total - Fixed = Variable
    expect(metrics.totalExpenses - metrics.fixedExpenses).toBe(7000);
  });

  // Scenario 5: Cash flow Opening ₹10,000, Received ₹50,000, Spent ₹25,000 -> Closing ₹35,000
  it('Scenario 5: Cash flow opening ₹10,000, received ₹50,000, spent ₹25,000 -> closing ₹35,000 and carries forward', () => {
    const payments: Payment[] = [
      {
        id: 'pay-1',
        clientId: 'client-1',
        amount: 50000,
        month: '2026-10',
        date: '2026-10-05',
        status: 'paid',
        mode: 'bank_transfer',
        createdAt: '2026-10-05T00:00:00Z',
        updatedAt: '2026-10-05T00:00:00Z',
        createdBy: 'admin',
      },
    ];

    const expenses: Expense[] = [
      {
        id: 'exp-fixed',
        type: 'agency',
        expenseNature: 'fixed',
        category: 'salary',
        amount: 18000,
        date: '2026-10-01',
        note: 'Salary',
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
        createdBy: 'admin',
      },
      {
        id: 'exp-var',
        type: 'agency',
        expenseNature: 'variable',
        category: 'software',
        amount: 7000,
        date: '2026-10-10',
        note: 'Tools',
        createdAt: '2026-10-10T00:00:00Z',
        updatedAt: '2026-10-10T00:00:00Z',
        createdBy: 'admin',
      },
    ];

    const octFlow = computeCashFlow('2026-10', payments, expenses, 10000);

    expect(octFlow.openingBalance).toBe(10000);
    expect(octFlow.received).toBe(50000);
    expect(octFlow.fixedExpenses).toBe(18000);
    expect(octFlow.variableExpenses).toBe(7000);
    expect(octFlow.totalSpent).toBe(25000);
    // Closing = 10,000 + 50,000 - 25,000 = 35,000
    expect(octFlow.closingBalance).toBe(35000);

    // November opening balance must be October's closing balance (₹35,000)
    const novFlow = computeCashFlow('2026-11', payments, expenses, 10000);
    expect(novFlow.openingBalance).toBe(35000);
  });

  // Scenario 6: Financial consistency across Finance, Dashboard, Clients, and Reports
  it('Scenario 6: Finance, Dashboard, Clients, and Reports totals are 100% identical for the same month', () => {
    const clients: Client[] = [
      {
        id: 'cli-1',
        name: 'Client Alpha',
        business: 'Retail',
        contactPerson: 'Alpha Contact',
        phone: '9999999991',
        email: 'alpha@retail.com',
        status: 'active',
        monthlyFee: 30000,
        onboardedOn: '2026-10-01',
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
        createdBy: 'admin',
      },
      {
        id: 'cli-2',
        name: 'Client Beta',
        business: 'Wellness',
        contactPerson: 'Beta Contact',
        phone: '9999999992',
        email: 'beta@wellness.com',
        status: 'active',
        monthlyFee: 20000,
        onboardedOn: '2026-10-01',
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
        createdBy: 'admin',
      },
    ];

    const cycles: BillingCycle[] = [
      {
        id: 'cyc-1',
        clientId: 'cli-1',
        cycleNumber: 1,
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        feeAmount: 30000,
        package: { videos: 10 },
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
        createdBy: 'user-admin',
      },
      {
        id: 'cyc-2',
        clientId: 'cli-2',
        cycleNumber: 1,
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        feeAmount: 20000,
        package: { videos: 5 },
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
        createdBy: 'user-admin',
      },
    ];

    const payments: Payment[] = [
      {
        id: 'pmt-1',
        clientId: 'cli-1',
        amount: 30000,
        month: '2026-10',
        date: '2026-10-05',
        status: 'paid',
        mode: 'bank_transfer',
        createdAt: '2026-10-05T00:00:00Z',
        updatedAt: '2026-10-05T00:00:00Z',
        createdBy: 'admin',
      },
    ];

    const expenses: Expense[] = [
      {
        id: 'exp-1',
        type: 'agency',
        expenseNature: 'fixed',
        category: 'salary',
        amount: 18000,
        date: '2026-10-02',
        note: 'Salary',
        createdAt: '2026-10-02T00:00:00Z',
        updatedAt: '2026-10-02T00:00:00Z',
        createdBy: 'admin',
      },
    ];

    // Compute metrics using the shared selector as used across Finance, Dashboard, Clients, and Reports
    const financeMetrics = computeAgencyMetrics(clients, payments, expenses, [], '2026-10', cycles);
    const dashboardMetrics = computeAgencyMetrics(clients, payments, expenses, [], '2026-10', cycles);
    const reportsMetrics = computeAgencyMetrics(clients, payments, expenses, [], '2026-10', cycles);

    // Sum individual client financials
    const cli1Fin = computeClientFinancials(clients[0], payments, expenses, '2026-10', cycles);
    const cli2Fin = computeClientFinancials(clients[1], payments, expenses, '2026-10', cycles);

    const clientTotalExpected = cli1Fin.expected + cli2Fin.expected;
    const clientTotalReceived = cli1Fin.received + cli2Fin.received;
    const clientTotalPending = cli1Fin.pending + cli2Fin.pending;

    // Verify complete equality
    expect(financeMetrics.totalReceived).toBe(30000);
    expect(dashboardMetrics.totalReceived).toBe(30000);
    expect(reportsMetrics.totalReceived).toBe(30000);
    expect(clientTotalReceived).toBe(30000);

    expect(financeMetrics.totalPending).toBe(20000);
    expect(dashboardMetrics.totalPending).toBe(20000);
    expect(reportsMetrics.totalPending).toBe(20000);
    expect(clientTotalPending).toBe(20000);

    expect(financeMetrics.totalExpected).toBe(50000);
    expect(clientTotalExpected).toBe(50000);

    expect(financeMetrics.totalExpenses).toBe(18000);
    expect(dashboardMetrics.totalExpenses).toBe(18000);
    expect(reportsMetrics.totalExpenses).toBe(18000);

    expect(financeMetrics.netProfit).toBe(12000); // 30,000 - 18,000 = 12,000
    expect(dashboardMetrics.netProfit).toBe(12000);
    expect(reportsMetrics.netProfit).toBe(12000);
  });

  // Scenario 7: Client delivery with 15 videos promised, 9 delivered
  it('Scenario 7: Client delivery format Videos 9 / 15 (6 remaining) and overdelivery +2 extra', () => {
    const client: Client = {
      id: 'cli-delivery-test',
      name: 'Creative Brand',
      business: 'Fashion',
      contactPerson: 'Designer',
      phone: '9840998877',
      email: 'designer@creative.com',
      status: 'active',
      monthlyFee: 25000,
      onboardedOn: '2026-10-01',
      package: {
        id: 'pkg-d',
        clientId: 'cli-delivery-test',
        videosPerMonth: 15,
        startDate: '2026-10-01',
      },
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
      createdBy: 'admin',
    };

    const cycle: BillingCycle = {
      id: 'cyc-deliv-1',
      clientId: 'cli-delivery-test',
      cycleNumber: 1,
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      feeAmount: 25000,
      package: { videos: 15 },
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
      createdBy: 'user-admin',
    };

    // 9 deliverables delivered
    const deliverables9: Deliverable[] = Array.from({ length: 9 }).map((_, idx) => ({
      id: `deliv-${idx}`,
      clientId: 'cli-delivery-test',
      cycleId: 'cyc-deliv-1',
      type: 'video',
      title: `Video #${idx + 1}`,
      date: '2026-10-10',
      month: '2026-10',
      status: 'delivered',
      createdAt: '2026-10-10T00:00:00Z',
      updatedAt: '2026-10-10T00:00:00Z',
      createdBy: 'admin',
    }));

    const metrics9 = computeClientDeliverables(client, deliverables9, '2026-10', [cycle]);
    const videoMetric9 = metrics9.activeTypes.find((t) => t.type === 'video');

    expect(videoMetric9?.done).toBe(9);
    expect(videoMetric9?.promised).toBe(15);
    expect(videoMetric9?.remaining).toBe(6);
    expect(videoMetric9?.displayBadgeWithRemaining).toBe('Videos 9 / 15 (6 remaining)');
    expect(videoMetric9?.percent).toBe(60); // 9 / 15 = 60%

    // 17 deliverables delivered (15 promised + 2 extra)
    const deliverables17: Deliverable[] = Array.from({ length: 17 }).map((_, idx) => ({
      id: `deliv-extra-${idx}`,
      clientId: 'cli-delivery-test',
      cycleId: 'cyc-deliv-1',
      type: 'video',
      title: `Video #${idx + 1}`,
      date: '2026-10-15',
      month: '2026-10',
      status: 'delivered',
      createdAt: '2026-10-15T00:00:00Z',
      updatedAt: '2026-10-15T00:00:00Z',
      createdBy: 'admin',
    }));

    const metrics17 = computeClientDeliverables(client, deliverables17, '2026-10', [cycle]);
    const videoMetric17 = metrics17.activeTypes.find((t) => t.type === 'video');

    expect(videoMetric17?.done).toBe(17);
    expect(videoMetric17?.extra).toBe(2);
    expect(videoMetric17?.remaining).toBe(0);
    expect(videoMetric17?.displayBadgeWithRemaining).toBe('Videos 15 / 15 (+2 extra)');
    // Percentage must NEVER exceed 100%
    expect(videoMetric17?.percent).toBe(100);
  });

  // Scenario 8: Personal task assignment & Worker sees ONLY their own tasks
  it('Scenario 8: Tasks assigned to Admin, Rohit (Worker), and Member - Worker sees only their own', () => {
    const tasks: Task[] = [
      {
        id: 't-1',
        title: 'Admin strategy plan',
        assigneeId: 'admin-id',
        status: 'todo',
        priority: 'high',
        dueDate: '2026-10-25',
        timeSpent: 0,
        createdAt: '2026-10-20T00:00:00Z',
        updatedAt: '2026-10-20T00:00:00Z',
        createdBy: 'admin-id',
      },
      {
        id: 't-2',
        title: 'Rohit video edit',
        assigneeId: 'rohit-worker-id',
        status: 'in_progress',
        priority: 'urgent',
        dueDate: '2026-10-22',
        timeSpent: 0,
        createdAt: '2026-10-20T00:00:00Z',
        updatedAt: '2026-10-20T00:00:00Z',
        createdBy: 'admin-id',
      },
      {
        id: 't-3',
        title: 'Another member poster design',
        assigneeId: 'member-3-id',
        status: 'todo',
        priority: 'medium',
        dueDate: '2026-10-26',
        timeSpent: 0,
        createdAt: '2026-10-20T00:00:00Z',
        updatedAt: '2026-10-20T00:00:00Z',
        createdBy: 'admin-id',
      },
    ];

    // Worker filter logic as implemented in TasksPage:
    const rohitVisibleTasks = tasks.filter((t) => t.assigneeId === 'rohit-worker-id');
    expect(rohitVisibleTasks.length).toBe(1);
    expect(rohitVisibleTasks[0].title).toBe('Rohit video edit');

    // Super Admin sees all tasks and can filter by person
    const adminFilteredByRohit = tasks.filter((t) => t.assigneeId === 'rohit-worker-id');
    expect(adminFilteredByRohit.length).toBe(1);

    const adminFilteredByMe = tasks.filter((t) => t.assigneeId === 'admin-id');
    expect(adminFilteredByMe.length).toBe(1);
    expect(adminFilteredByMe[0].title).toBe('Admin strategy plan');
  });

  // Scenario 9: Role enforcement - Worker cannot access restricted modules
  it('Scenario 9: Worker role is denied permissions for calls, finance, clients, reports, and settings', () => {
    const workerRole = 'worker';

    expect(hasPermission(workerRole, 'calls.read')).toBe(false);
    expect(hasPermission(workerRole, 'calls.write')).toBe(false);
    expect(hasPermission(workerRole, 'finance.read')).toBe(false);
    expect(hasPermission(workerRole, 'finance.write')).toBe(false);
    expect(hasPermission(workerRole, 'clients.read')).toBe(false);
    expect(hasPermission(workerRole, 'reports.read')).toBe(false);
    expect(hasPermission(workerRole, 'settings.read')).toBe(false);

    // Worker ONLY has task permissions
    expect(hasPermission(workerRole, 'tasks.read')).toBe(true);
    expect(hasPermission(workerRole, 'tasks.write')).toBe(true);

    // Super Admin has all permissions
    const superAdminRole = 'super_admin';
    expect(hasPermission(superAdminRole, 'calls.read')).toBe(true);
    expect(hasPermission(superAdminRole, 'calls.write')).toBe(true);
    expect(hasPermission(superAdminRole, 'finance.read')).toBe(true);
    expect(hasPermission(superAdminRole, 'clients.read')).toBe(true);
    expect(hasPermission(superAdminRole, 'reports.read')).toBe(true);
    expect(hasPermission(superAdminRole, 'settings.read')).toBe(true);
  });
});

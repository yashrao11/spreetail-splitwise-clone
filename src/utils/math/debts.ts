export interface MemberInfo {
  id: number;
  displayName: string | null;
  email: string;
}

export interface SplitInfo {
  userId: number;
  amount: string | null;
}

export interface PaymentInfo {
  userId: number;
  amount: string;
}

export interface ExpenseInfo {
  id: number;
  amount: string;
  paidById: number | null;
  splits: SplitInfo[];
  payments: PaymentInfo[];
}

export interface SettlementInfo {
  payerId: number;
  payeeId: number;
  amount: string;
}

export function calculateGroupDebts(
  members: MemberInfo[],
  expensesList: ExpenseInfo[],
  settlementsList: SettlementInfo[]
) {
  const memberIds = members.map((m) => m.id);
  const netBalances: Record<number, number> = {};
  
  // Initialize balances
  memberIds.forEach((id) => {
    netBalances[id] = 0;
  });

  // 1. Process expenses
  expensesList.forEach((expense) => {
    const totalAmount = parseFloat(expense.amount);
    if (totalAmount <= 0) return;

    // Check payments list (multi-payer)
    let payments = expense.payments;
    
    // Fallback if payments array is empty (pre-migration or single-payer legacy logic)
    if (!payments || payments.length === 0) {
      if (expense.paidById) {
        payments = [{ userId: expense.paidById, amount: expense.amount }];
      } else {
        payments = [];
      }
    }

    // Add paid amounts to net balance
    payments.forEach((p) => {
      const uid = p.userId;
      if (netBalances[uid] !== undefined) {
        netBalances[uid] += parseFloat(p.amount);
      }
    });

    // Subtract split shares from net balance
    expense.splits.forEach((s) => {
      const uid = s.userId;
      if (netBalances[uid] !== undefined) {
        netBalances[uid] -= parseFloat(s.amount || '0');
      }
    });
  });

  // 2. Process settlements (cash transactions)
  settlementsList.forEach((s) => {
    const payer = s.payerId;
    const payee = s.payeeId;
    const amt = parseFloat(s.amount);

    if (netBalances[payer] !== undefined) {
      netBalances[payer] += amt; // Reduces their debt (adds to what they paid)
    }
    if (netBalances[payee] !== undefined) {
      netBalances[payee] -= amt; // Reduces what is owed to them (subtracts from what they paid)
    }
  });

  // 3. Separate into Debtors and Creditors
  const debtors: { id: number; amount: number }[] = [];
  const creditors: { id: number; amount: number }[] = [];

  Object.entries(netBalances).forEach(([idStr, bal]) => {
    const id = parseInt(idStr, 10);
    // Disregard tiny float precision noise
    if (bal < -0.005) {
      debtors.push({ id, amount: -bal });
    } else if (bal > 0.005) {
      creditors.push({ id, amount: bal });
    }
  });

  // Sort descending to match largest balances first
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const resolvedDebts: { debtorId: number; creditorId: number; amount: number }[] = [];

  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const amountToSettle = Math.min(debtor.amount, creditor.amount);
    if (amountToSettle > 0.005) {
      resolvedDebts.push({
        debtorId: debtor.id,
        creditorId: creditor.id,
        amount: parseFloat(amountToSettle.toFixed(2)),
      });
    }

    debtor.amount -= amountToSettle;
    creditor.amount -= amountToSettle;

    if (debtor.amount < 0.005) dIdx++;
    if (creditor.amount < 0.005) cIdx++;
  }

  return resolvedDebts;
}

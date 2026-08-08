// Greedy largest-creditor-vs-largest-debtor matching.
// Note: this is a well-known heuristic, not a proven-optimal solution — the true
// "minimum number of transactions" problem is NP-hard in general (it's a variant
// of subset-sum/partition). Greedy largest-first is what most real apps
// (Splitwise included) use in practice, because it's fast and produces very
// few transactions, even if not always the mathematical minimum.
export function computeSettlements(balances) {
  const creditors = balances
    .filter((b) => b.balance > 0.01)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.balance - a.balance);

  const debtors = balances
    .filter((b) => b.balance < -0.01)
    .map((b) => ({ ...b, balance: -b.balance }))
    .sort((a, b) => b.balance - a.balance);

  const settlements = [];
  let i = 0;
  let j = 0;

  while (i < creditors.length && j < debtors.length) {
    const amount = Math.min(creditors[i].balance, debtors[j].balance);
    settlements.push({
      from: debtors[j].userId,
      fromName: debtors[j].name,
      to: creditors[i].userId,
      toName: creditors[i].name,
      amount: Math.round(amount * 100) / 100,
    });

    creditors[i].balance -= amount;
    debtors[j].balance -= amount;

    if (creditors[i].balance < 0.01) i++;
    if (debtors[j].balance < 0.01) j++;
  }

  return settlements;
}
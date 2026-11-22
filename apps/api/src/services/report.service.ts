import { TransactionRepository } from '../repositories/transaction.repository.js';
import { getDb } from '../database/db.js';

export class ReportService {
  static getCashFlowHistory(userId: string, months = 6) {
    const db = getDb();
    const results = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const monthYear = `${year}-${month}`;
      const monthLabel = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });

      const totals = TransactionRepository.getMonthTotals(userId, monthYear);
      const netSavingsPaise = totals.incomePaise - totals.expensePaise;

      results.push({
        monthYear,
        monthLabel,
        incomePaise: totals.incomePaise,
        expensePaise: totals.expensePaise,
        netSavingsPaise,
      });
    }

    return results;
  }

  static getCategoryBreakdown(userId: string, monthYear: string) {
    const categories = TransactionRepository.getCategorySpending(userId, monthYear);
    const totalSpent = categories.reduce((sum, c) => sum + c.totalPaise, 0);

    return categories.map((cat) => ({
      ...cat,
      percentage: totalSpent > 0 ? Math.round((cat.totalPaise / totalSpent) * 1000) / 10 : 0,
    }));
  }
}

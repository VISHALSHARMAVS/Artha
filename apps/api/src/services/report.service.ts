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

  /**
   * Generates a CSV string of the complete transaction audit ledger for the user.
   */
  static exportTransactionsCsv(userId: string): string {
    const db = getDb();
    const rows = db.prepare(`
      SELECT 
        t.transaction_date,
        t.type,
        (t.amount_paise / 100.0) as amount_inr,
        t.description,
        c.name as category,
        a.name as account,
        da.name as destination_account,
        CASE WHEN t.is_split = 1 THEN 'YES' ELSE 'NO' END as is_split,
        (t.personal_share_paise / 100.0) as personal_share_inr,
        COALESCE(t.notes, '') as notes,
        t.id as transaction_id
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      LEFT JOIN accounts a ON a.id = t.account_id
      LEFT JOIN accounts da ON da.id = t.destination_account_id
      WHERE t.user_id = ?
      ORDER BY t.transaction_date DESC, t.created_at DESC
    `).all(userId) as any[];

    const headers = ['Date', 'Type', 'Amount (INR)', 'Description', 'Category', 'Account', 'Destination Account', 'Is Split', 'Personal Share (INR)', 'Notes', 'Transaction ID'];
    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const s = String(val).replace(/"/g, '""');
      return `"${s}"`;
    };

    const csvLines = [headers.join(',')];
    for (const r of rows) {
      csvLines.push([
        escapeCsv(r.transaction_date),
        escapeCsv(r.type),
        r.amount_inr !== null ? Number(r.amount_inr).toFixed(2) : '0.00',
        escapeCsv(r.description),
        escapeCsv(r.category || 'Uncategorized'),
        escapeCsv(r.account || ''),
        escapeCsv(r.destination_account || ''),
        escapeCsv(r.is_split),
        r.personal_share_inr !== null ? Number(r.personal_share_inr).toFixed(2) : '',
        escapeCsv(r.notes),
        escapeCsv(r.transaction_id),
      ].join(','));
    }
    return csvLines.join('\n');
  }

  /**
   * Generates a JSON array of the complete transaction audit ledger for the user.
   */
  static exportTransactionsJson(userId: string): any[] {
    const db = getDb();
    return db.prepare(`
      SELECT 
        t.id,
        t.transaction_date,
        t.type,
        t.amount_paise,
        (t.amount_paise / 100.0) as amount_rupees,
        t.description,
        c.name as category_name,
        a.name as account_name,
        da.name as destination_account_name,
        t.is_split,
        t.personal_share_paise,
        t.notes,
        t.created_at
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      LEFT JOIN accounts a ON a.id = t.account_id
      LEFT JOIN accounts da ON da.id = t.destination_account_id
      WHERE t.user_id = ?
      ORDER BY t.transaction_date DESC, t.created_at DESC
    `).all(userId) as any[];
  }
}

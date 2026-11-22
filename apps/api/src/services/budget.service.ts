import crypto from 'node:crypto';
import { BudgetRepository, BudgetRecord } from '../repositories/budget.repository.js';
import { BudgetEngine } from '@finora/domain';
import type { CreateBudgetDTO } from '@finora/domain';

export class BudgetService {
  static getBudgetsForMonth(userId: string, monthYear: string) {
    const records = BudgetRepository.listForMonth(userId, monthYear);
    const now = new Date();
    const dayOfMonth = now.getDate();
    // Get total days in month
    const [year, month] = monthYear.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    return records.map((record) => {
      const evaluation = BudgetEngine.evaluate({
        limitPaise: record.limit_paise,
        spentPaise: record.spent_paise || 0,
        dayOfMonth,
        daysInMonth,
      });

      return {
        ...record,
        evaluation,
      };
    });
  }

  static setBudget(dto: CreateBudgetDTO, userId: string): BudgetRecord {
    const id = `bgt_${crypto.randomUUID().slice(0, 8)}`;
    return BudgetRepository.upsert({
      id,
      user_id: userId,
      category_id: dto.category_id,
      limit_paise: dto.limit_paise,
      month_year: dto.month_year,
    });
  }
}

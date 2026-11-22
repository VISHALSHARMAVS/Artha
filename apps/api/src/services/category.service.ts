import crypto from 'node:crypto';
import { CategoryRepository, CategoryRecord } from '../repositories/category.repository.js';

export class CategoryService {
  static getCategoriesForUser(userId: string): CategoryRecord[] {
    return CategoryRepository.listForUser(userId);
  }

  /**
   * Smart Category Suggestion Engine (Journey B).
   * Analyzes merchant name or description using deterministic keyword and phonetic maps.
   */
  static suggestCategory(description: string, userId: string): CategoryRecord | null {
    const text = description.toLowerCase().trim();
    const categories = CategoryRepository.listForUser(userId);

    const rules: Array<{ keywords: string[]; categoryMatch: string }> = [
      {
        keywords: ['swiggy', 'zomato', 'starbucks', 'cafe', 'restaurant', 'coffee', 'food', 'mcdonald', 'burger', 'pizza', 'dine', 'bar', 'lunch', 'dinner'],
        categoryMatch: 'Food & Dining',
      },
      {
        keywords: ['uber', 'ola', 'rapido', 'petrol', 'fuel', 'metro', 'auto', 'diesel', 'parking', 'toll', 'fastag', 'flight', 'indigo'],
        categoryMatch: 'Transportation',
      },
      {
        keywords: ['blinkit', 'zepto', 'instamart', 'supermarket', 'groceries', 'dmart', 'bigbasket', 'nature basket', 'vegetables', 'milk', 'bread'],
        categoryMatch: 'Groceries',
      },
      {
        keywords: ['netflix', 'spotify', 'prime', 'hotstar', 'youtube', 'cinema', 'bookmyshow', 'movie', 'game', 'playstation'],
        categoryMatch: 'Entertainment',
      },
      {
        keywords: ['bescom', 'electricity', 'wifi', 'broadband', 'airtel', 'jio', 'water bill', 'gas', 'cylinder', 'maintenance'],
        categoryMatch: 'Bills & Utilities',
      },
      {
        keywords: ['rent', 'maintenance', 'landlord', 'society', 'apartment'],
        categoryMatch: 'Housing',
      },
      {
        keywords: ['apollo', 'pharmacy', 'medicine', 'hospital', 'doctor', 'clinic', 'dentist', '1mg', 'practo', 'gym', 'cult'],
        categoryMatch: 'Health & Wellness',
      },
      {
        keywords: ['amazon', 'flipkart', 'myntra', 'zara', 'h&m', 'shopping', 'clothes', 'electronics'],
        categoryMatch: 'Shopping',
      },
      {
        keywords: ['salary', 'payroll', 'stipend', 'bonus', 'dividend', 'interest credited', 'freelance'],
        categoryMatch: 'Salary & Income',
      },
      {
        keywords: ['emi', 'loan', 'mortgage', 'hdfc emi', 'sbi emi'],
        categoryMatch: 'Debt & EMI',
      },
    ];

    for (const rule of rules) {
      if (rule.keywords.some((kw) => text.includes(kw))) {
        const found = categories.find((c) => c.name.toLowerCase() === rule.categoryMatch.toLowerCase());
        if (found) return found;
      }
    }

    // Fallback: look for general 'Other Expense' or first expense category
    const defaultExpense = categories.find((c) => c.type === 'EXPENSE' && c.name.includes('Other')) 
      || categories.find((c) => c.type === 'EXPENSE');

    return defaultExpense || null;
  }
}

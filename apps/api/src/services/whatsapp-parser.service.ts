import { Money } from '@artha/domain';
import { UserRepository, UserRecord } from '../repositories/user.repository.js';
import { AccountRepository } from '../repositories/account.repository.js';
import { TransactionService } from './transaction.service.js';
import { CategoryService } from './category.service.js';
import { DashboardService } from './dashboard.service.js';

export interface WhatsAppParsedResult {
  success: boolean;
  action: 'TRANSACTION_RECORDED' | 'BALANCE_CHECK' | 'HELP' | 'UNLINKED_USER' | 'PARSE_ERROR';
  replyMessage: string;
  transaction?: {
    id: string;
    type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
    amountPaise: number;
    description: string;
    categoryName?: string;
    accountName: string;
  };
}

export class WhatsAppParserService {
  /**
   * Process an incoming text message from a WhatsApp phone number.
   */
  static processIncomingMessage(rawSenderPhone: string, messageText: string): WhatsAppParsedResult {
    const trimmed = (messageText || '').trim();
    if (!trimmed) {
      return {
        success: false,
        action: 'PARSE_ERROR',
        replyMessage: '⚠️ Empty message received. You can send e.g. *"Spent 450 at Starbucks"* or *"Balance"*.',
      };
    }

    // 1. Identify User by Phone Number
    const user = UserRepository.findByPhoneNumber(rawSenderPhone);
    if (!user) {
      return {
        success: false,
        action: 'UNLINKED_USER',
        replyMessage: 
`👋 *Welcome to Artha!*

Your WhatsApp number (*+${rawSenderPhone}*) is not yet linked to an Artha account.

To activate 1-second expense tracking:
1️⃣ Log in to your Artha Web Dashboard
2️⃣ Open the *WhatsApp* tab
3️⃣ Enter your phone number and click *Link WhatsApp*

_Once linked, any message like "Spent 450 at Starbucks" will instantly log into your private ledger._`,
      };
    }

    // 2. Check for Informational Commands (Balance, Safe-to-Spend, Help)
    const lower = trimmed.toLowerCase();
    if (this.isBalanceQuery(lower)) {
      return this.handleBalanceQuery(user);
    }

    if (this.isHelpQuery(lower)) {
      return {
        success: true,
        action: 'HELP',
        replyMessage:
`🤖 *Artha WhatsApp Assistant Commands*

Simply message how you spend naturally:
• *"Spent 450 at Starbucks"*
• *"Petrol 2000"*
• *"Swiggy dinner 520"*
• *"Received 75000 salary"*
• *"Transferred 5000 to ICICI"*
• *"Balance"* — Check safe-to-spend & liquid funds
• Paste any bank/UPI debit SMS!

_Zero manual forms. Categorized automatically._`,
      };
    }

    // 3. Parse Financial Transaction
    return this.parseAndRecordTransaction(user, trimmed);
  }

  private static isBalanceQuery(text: string): boolean {
    const patterns = [
      'balance',
      'bal',
      'safe to spend',
      'safe spend',
      'safetospend',
      'how much',
      'status',
      'summary',
      'overview',
      'kitna bacha',
      'paisa',
    ];
    return patterns.some(p => text === p || text.startsWith(p));
  }

  private static isHelpQuery(text: string): boolean {
    return text === 'help' || text === 'hi' || text === 'hello' || text === 'start' || text === '?';
  }

  private static handleBalanceQuery(user: UserRecord): WhatsAppParsedResult {
    const overview = DashboardService.getOverview(user.id);
    const liquid = Money.fromPaise(overview.answers.total_liquid_paise).format();
    const income = Money.fromPaise(overview.answers.income_mtd_paise).format();
    const expense = Money.fromPaise(overview.answers.expense_mtd_paise).format();
    const safeDaily = Money.fromPaise(overview.answers.safe_to_spend.dailySafePaise).format();
    const safeTotal = Money.fromPaise(overview.answers.safe_to_spend.safeAmountPaise).format();
    const daysLeft = overview.answers.safe_to_spend.daysUntilSalary;

    const reply = 
`📊 *Artha Financial Health Snapshot*
_For ${user.full_name}_

💰 *Current Liquid Funds:* ${liquid}
📈 *Earned This Month:* ${income}
📉 *Spent This Month:* ${expense}

🛡️ *Safe to Spend:* ${safeDaily} / day
_(Total ${safeTotal} available for next ${daysLeft} days)_`;

    return {
      success: true,
      action: 'BALANCE_CHECK',
      replyMessage: reply,
    };
  }

  /**
   * Natural Language Parsing Engine for Indian English & Hinglish expense notes.
   */
  static parseAndRecordTransaction(user: UserRecord, text: string): WhatsAppParsedResult {
    // 1. Extract Amount
    const extractedAmount = this.extractAmount(text);
    if (!extractedAmount) {
      return {
        success: false,
        action: 'PARSE_ERROR',
        replyMessage: `❓ Could not detect an amount in: "${text}".\n\nTry e.g.: *"Spent 450 at Starbucks"* or *"Petrol 2000"*.`,
      };
    }

    // 2. Detect Transaction Type (EXPENSE, INCOME, TRANSFER)
    const txType = this.detectTransactionType(text);

    // 3. Extract Clean Description / Merchant
    const description = this.extractDescription(text, extractedAmount.rawMatch, txType);

    // 4. Suggest Category
    const categorySuggestion = CategoryService.suggestCategory(description, user.id);

    // 5. Select Default Account for User
    const accounts = AccountRepository.findByUserId(user.id);
    if (!accounts || accounts.length === 0) {
      return {
        success: false,
        action: 'PARSE_ERROR',
        replyMessage: `⚠️ You do not have any active accounts configured in Artha yet. Please log into the web dashboard and add your first bank account.`,
      };
    }

    // Prefer savings/checking or credit card if card mentioned
    const lowerText = text.toLowerCase();
    let selectedAccount = accounts.find(a => a.account_type === 'SAVINGS') || accounts[0];
    if (lowerText.includes('card') || lowerText.includes('credit')) {
      const cardAcc = accounts.find(a => a.account_type === 'CREDIT_CARD');
      if (cardAcc) selectedAccount = cardAcc;
    }

    // 6. Record Transaction Atomically
    const today = new Date().toISOString().slice(0, 10);
    const recorded = TransactionService.recordTransaction({
      account_id: selectedAccount.id,
      category_id: categorySuggestion?.id,
      type: txType,
      amount_paise: extractedAmount.amountPaise,
      description,
      transaction_date: today,
    }, user.id);

    // 7. Fetch updated financial overview for high-value immediate feedback
    const overview = DashboardService.getOverview(user.id);
    const formattedAmount = Money.fromPaise(extractedAmount.amountPaise).format();
    const safeDaily = Money.fromPaise(overview.answers.safe_to_spend.dailySafePaise).format();
    const updatedLiquid = Money.fromPaise(overview.answers.total_liquid_paise).format();

    let emoji = '💳';
    let label = 'Expense Logged';
    if (txType === 'INCOME') {
      emoji = '💵';
      label = 'Income Credited';
    } else if (txType === 'TRANSFER') {
      emoji = '🔄';
      label = 'Transfer Logged';
    }

    const categoryText = categorySuggestion ? `${categorySuggestion.name}` : 'Uncategorized';

    const replyMessage =
`✅ *${emoji} ${label}: ${formattedAmount}*
📝 *Note:* ${description}
🏷️ *Category:* ${categoryText}
🏦 *Account:* ${selectedAccount.name}

💰 *Liquid Balance:* ${updatedLiquid}
🛡️ *Safe to Spend:* ${safeDaily} / day`;

    return {
      success: true,
      action: 'TRANSACTION_RECORDED',
      replyMessage,
      transaction: {
        id: recorded.id,
        type: txType,
        amountPaise: extractedAmount.amountPaise,
        description,
        categoryName: categorySuggestion?.name,
        accountName: selectedAccount.name,
      },
    };
  }

  /**
   * Extracts amount from varied input formats:
   * "450", "₹450", "Rs 450", "Rs. 1,500.50", "1.5k", "20k", "INR 700"
   */
  static extractAmount(text: string): { amountPaise: number; rawMatch: string } | null {
    // 1. Check for multiplier shorthand like 1.5k or 25k
    const kRegex = /(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(?:k|thousand)\b/i;
    const kMatch = text.match(kRegex);
    if (kMatch) {
      const val = parseFloat(kMatch[1]) * 1000;
      return {
        amountPaise: Math.round(val * 100),
        rawMatch: kMatch[0],
      };
    }

    // 2. Check for currency prefixed or standard numbers
    // e.g. "Rs. 450", "₹ 1,200.50", "INR 500", "450.00", "spent 450"
    const currencyRegex = /(?:(?:rs\.?|inr|₹)\s*)?\b([0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?)\b/gi;
    
    // Find all potential numeric tokens and pick the most likely amount
    let match: RegExpExecArray | null;
    const candidates: { amountPaise: number; rawMatch: string; priority: number }[] = [];

    while ((match = currencyRegex.exec(text)) !== null) {
      const rawText = match[0];
      const numStr = match[1].replace(/,/g, '');
      const num = parseFloat(numStr);

      if (isNaN(num) || num <= 0) continue;

      // Filter out likely dates (like 2026), phone digits, card numbers
      if (num >= 2020 && num <= 2030 && !rawText.match(/rs|inr|₹/i) && text.match(/\b(?:year|in|on)\s+\d{4}\b/i)) {
        continue;
      }
      if (numStr.length >= 10 && !rawText.match(/rs|inr|₹/i)) {
        continue; // Phone number or account number
      }

      let priority = 1;
      if (rawText.match(/rs|inr|₹/i)) priority += 5;
      if (rawText.includes('.')) priority += 1;

      try {
        const money = Money.fromRupees(num);
        candidates.push({
          amountPaise: money.paise,
          rawMatch: rawText,
          priority,
        });
      } catch {
        // Skip invalid
      }
    }

    if (candidates.length === 0) return null;

    // Pick candidate with highest priority, then highest value
    candidates.sort((a, b) => b.priority - a.priority || b.amountPaise - a.amountPaise);
    return candidates[0];
  }

  static detectTransactionType(text: string): 'EXPENSE' | 'INCOME' | 'TRANSFER' {
    const lower = text.toLowerCase();

    // Income triggers
    if (
      lower.includes('salary') ||
      lower.includes('credited') ||
      lower.includes('received') ||
      lower.includes('dividend') ||
      lower.includes('cashback') ||
      lower.includes('bonus') ||
      lower.includes('freelance') ||
      lower.includes('interest credited')
    ) {
      return 'INCOME';
    }

    // Transfer triggers
    if (
      lower.includes('transfer') ||
      lower.includes('transferred') ||
      lower.includes('sent to account') ||
      lower.includes('self transfer') ||
      lower.includes('to bank')
    ) {
      return 'TRANSFER';
    }

    // Default is Expense
    return 'EXPENSE';
  }

  static extractDescription(text: string, rawAmountMatch: string, type: 'EXPENSE' | 'INCOME' | 'TRANSFER'): string {
    // 1. Remove the amount string
    let cleaned = text.replace(rawAmountMatch, ' ');

    // 2. If it's a Bank SMS like "Dear Customer, INR 450 debited at STARBUCKS..."
    const atMatch = cleaned.match(/\bat\s+([A-Za-z0-9\s&'-]+?)(?:\s+(?:on|via|ref|upi|card|avail)|\.|$)/i);
    if (atMatch && atMatch[1].trim().length >= 2) {
      return this.cleanText(atMatch[1]);
    }

    const toMatch = cleaned.match(/\bto\s+([A-Za-z0-9\s&'-]+?)(?:\s+(?:on|via|ref|upi|card|for)|\.|$)/i);
    if (toMatch && toMatch[1].trim().length >= 2) {
      return this.cleanText(toMatch[1]);
    }

    const forMatch = cleaned.match(/\bfor\s+([A-Za-z0-9\s&'-]+?)(?:\s+(?:on|via|at)|\.|$)/i);
    if (forMatch && forMatch[1].trim().length >= 2) {
      return this.cleanText(forMatch[1]);
    }

    // 3. Strip common noise keywords
    const noise = [
      /\bspent\b/gi,
      /\bpaid\b/gi,
      /\bdebited\b/gi,
      /\bcredited\b/gi,
      /\breceived\b/gi,
      /\btransferred\b/gi,
      /\btransfer\b/gi,
      /\bvia upi\b/gi,
      /\bupi\b/gi,
      /\bfrom a\/c\b/gi,
      /\bcard xx\d+\b/gi,
      /\ba\/c xx\d+\b/gi,
      /\bdear customer\b/gi,
      /\bavl bal\b/gi,
      /\binr\b/gi,
      /\brs\.?\b/gi,
      /\bfor\b/gi,
      /\bat\b/gi,
      /\bon\b/gi,
    ];

    for (const pattern of noise) {
      cleaned = cleaned.replace(pattern, ' ');
    }

    cleaned = this.cleanText(cleaned);

    if (cleaned.length >= 2) {
      return cleaned;
    }

    // Fallback default descriptions
    if (type === 'INCOME') return 'Income';
    if (type === 'TRANSFER') return 'Account Transfer';
    return 'Expense';
  }

  private static cleanText(str: string): string {
    return str
      .replace(/[^\w\s&'-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

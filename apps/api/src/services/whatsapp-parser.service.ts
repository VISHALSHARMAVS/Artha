import { Money, SafeToSpendCalculator } from '@artha/domain';
import { UserRepository, UserRecord } from '../repositories/user.repository.js';
import { AccountRepository } from '../repositories/account.repository.js';
import { TransactionService } from './transaction.service.js';
import { CategoryService } from './category.service.js';
import { DashboardService } from './dashboard.service.js';
import { LoanService } from './loan.service.js';

export interface WhatsAppParsedResult {
  success: boolean;
  action: 'TRANSACTION_RECORDED' | 'BATCH_TRANSACTIONS_RECORDED' | 'BALANCE_CHECK' | 'FREEDOM_RUNWAY' | 'GUILT_FREE' | 'DEBT_FREEDOM' | 'HELP' | 'UNLINKED_USER' | 'PARSE_ERROR';
  replyMessage: string;
  transaction?: {
    id: string;
    type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
    amountPaise: number;
    description: string;
    categoryName?: string;
    accountName: string;
  };
  transactions?: Array<{
    id: string;
    type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
    amountPaise: number;
    description: string;
    categoryName?: string;
    accountName: string;
  }>;
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
    let user = UserRepository.findByPhoneNumber(rawSenderPhone);
    if (!user) {
      // Check if user sent an explicit link command: "LINK <email>" or "CONNECT <email>"
      const linkMatch = trimmed.match(/^(?:link|connect|login)\s+([^\s]+)/i);
      if (linkMatch) {
        const targetEmail = linkMatch[1].trim();
        const foundByEmail = UserRepository.findByEmail(targetEmail);
        if (foundByEmail) {
          UserRepository.linkPhoneNumber(foundByEmail.id, rawSenderPhone);
          return {
            success: true,
            action: 'HELP',
            replyMessage: 
`🎉 *WhatsApp Successfully Linked!*

Your WhatsApp number (*+${rawSenderPhone}*) is now connected to *${foundByEmail.full_name}* (${foundByEmail.email}).

Try sending your first expense now:
• *"Spent 450 at Starbucks"*
• *"Petrol 2000"*
• *"Balance"*`,
          };
        } else {
          return {
            success: false,
            action: 'UNLINKED_USER',
            replyMessage: `⚠️ Could not find an Artha account for *${targetEmail}*.\n\nMake sure your email matches your registered Artha account, or link via the web dashboard at the WhatsApp tab.`,
          };
        }
      }

      // Check if auto-linking is enabled via env var or if there is a default demo user
      const allUsers = UserRepository.findAll();
      const autoLinkEnabled = process.env.WHATSAPP_AUTO_LINK === 'true';
      if (autoLinkEnabled && allUsers.length > 0) {
        const primaryUser = allUsers.find(u => u.id === 'usr_artha_demo') || allUsers[0];
        UserRepository.linkPhoneNumber(primaryUser.id, rawSenderPhone);
        user = UserRepository.findById(primaryUser.id)!;
        console.log(`🔗 Auto-linked incoming WhatsApp +${rawSenderPhone} to user ${user.full_name} (${user.id})`);
      } else {
        return {
          success: false,
          action: 'UNLINKED_USER',
          replyMessage: 
`👋 *Welcome to Artha!*

Your WhatsApp number (*+${rawSenderPhone}*) is not yet linked to an Artha account.

*To link in 1 second, reply with:*
*LINK <your-email>*
_(e.g. *LINK ${allUsers[0]?.email || 'aditya@artha.internal'}*)_

Or log into the web dashboard, open the *WhatsApp* tab, and click *Link WhatsApp*.`,
        };
      }
    }

    // 2. Check for Informational & Financial Freedom Commands
    const lower = trimmed.toLowerCase();
    if (this.isRunwayQuery(lower)) {
      return this.handleRunwayQuery(user);
    }

    if (this.isGuiltFreeQuery(lower)) {
      return this.handleGuiltFreeQuery(user);
    }

    if (this.isDebtQuery(lower)) {
      return this.handleDebtQuery(user);
    }

    if (this.isBalanceQuery(lower)) {
      return this.handleBalanceQuery(user);
    }

    if (this.isHelpQuery(lower)) {
      return {
        success: true,
        action: 'HELP',
        replyMessage:
`🤖 *Artha Financial Freedom WhatsApp Commands*

Simply message how you spend naturally:
• *"Spent 450 at Starbucks"*
• *"Petrol 2000"*
• *"Swiggy dinner 520"*
• *"Received 75000 salary"*
• *"Transferred 5000 to ICICI"*
• *"Balance"* — Check safe-to-spend & liquid funds
• *"Runway"* — Check months of living freedom (Morgan Housel)
• *"Guilt Free"* — Check 100% guilt-free spending pool (Ramit Sethi)
• *"Debt Free"* — Check Dave Ramsey loan countdown date
• Paste any bank/UPI debit SMS!

_Zero manual forms. Categorized automatically._`,
      };
    }

    // 3. Check for Multi-line Batch Transactions (e.g. user sends several expenses at once)
    const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length > 1) {
      const linesWithAmounts = lines.filter(l => this.extractAmount(l) !== null);
      if (linesWithAmounts.length >= 2) {
        return this.parseAndRecordBatchTransactions(user, linesWithAmounts);
      }
    }

    // 4. Parse Single Financial Transaction
    return this.parseAndRecordTransaction(user, trimmed);
  }

  private static isRunwayQuery(text: string): boolean {
    const patterns = ['runway', 'freedom', 'freedom runway', 'months', 'kab tak', 'kitne din'];
    return patterns.some(p => text === p || text.startsWith(p));
  }

  private static isGuiltFreeQuery(text: string): boolean {
    const patterns = ['guilt free', 'guilt-free', 'guilt', 'free money', 'spending money'];
    return patterns.some(p => text === p || text.startsWith(p));
  }

  private static isDebtQuery(text: string): boolean {
    const patterns = ['debt free', 'debt-free', 'debt', 'loans', 'loan', 'karz', 'emi'];
    return patterns.some(p => text === p || text.startsWith(p));
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

  private static handleRunwayQuery(user: UserRecord): WhatsAppParsedResult {
    const overview = DashboardService.getOverview(user.id);
    const safe = overview.answers.safe_to_spend;
    const liquid = Money.fromPaise(overview.answers.total_liquid_paise).format();
    const months = safe.freedomRunwayMonths || 0;
    const days = safe.freedomRunwayDays || 0;

    const reply =
`🏖️ *Artha Freedom Runway (Morgan Housel)*
_For ${user.full_name}_

💰 *Liquid Reserves:* ${liquid}
⏳ *Survival Runway:* *${months} Months* (≈ ${days} days)

_If you stop working today, your liquid reserves will support your lifestyle for over ${months} months without earning a single rupee._`;

    return {
      success: true,
      action: 'FREEDOM_RUNWAY',
      replyMessage: reply,
    };
  }

  private static handleGuiltFreeQuery(user: UserRecord): WhatsAppParsedResult {
    const overview = DashboardService.getOverview(user.id);
    const safe = overview.answers.safe_to_spend;
    const guiltFree = Money.fromPaise(safe.guiltFreePaise ?? safe.safeAmountPaise).format();
    const safeDaily = Money.fromPaise(safe.dailySafePaise).format();

    const reply =
`🎁 *100% Guilt-Free Capital (Ramit Sethi)*
_For ${user.full_name}_

🎉 *Guilt-Free Pool:* *${guiltFree}*
⚡ *Safe Daily Pace:* ${safeDaily} / day

_Your rent, EMIs, and monthly savings allocation are already 100% locked and safe. You have permission to spend this on anything that brings you joy—zero guilt!_`;

    return {
      success: true,
      action: 'GUILT_FREE',
      replyMessage: reply,
    };
  }

  private static handleDebtQuery(user: UserRecord): WhatsAppParsedResult {
    const summary = LoanService.getDebtFreedomSummary(user.id);

    let reply = '';
    if (summary.isDebtFree) {
      reply =
`🎯 *Debt Freedom Status (Dave Ramsey)*
_For ${user.full_name}_

🎉 *You are 100% DEBT FREE!*
Zero active loan facilities or revolving liabilities. Every rupee you earn stays in your wealth vault!`;
    } else {
      reply =
`🎯 *Debt Freedom Countdown (Dave Ramsey)*
_For ${user.full_name}_

💳 *Active Facilities:* ${summary.activeLoansCount}
📉 *Total Debt Outstanding:* ${Money.fromPaise(summary.totalOutstandingPaise).format()}
💸 *Total Monthly EMI:* ${Money.fromPaise(summary.totalMonthlyEmiPaise).format()} / month

🏁 *Official Debt-Free Day:* *${summary.formattedFreedomDate}*
⏳ *Time Remaining:* ${summary.longestRemainingMonths} months (${summary.yearsRemaining || 0} years)

_Tip: Prepaying just ₹2,500 extra toward your principal each month can shave months off this finish line!_`;
    }

    return {
      success: true,
      action: 'DEBT_FREEDOM',
      replyMessage: reply,
    };
  }

  private static handleBalanceQuery(user: UserRecord): WhatsAppParsedResult {
    const overview = DashboardService.getOverview(user.id);
    const liquid = Money.fromPaise(overview.answers.total_liquid_paise).format();
    const income = Money.fromPaise(overview.answers.income_mtd_paise).format();
    const expense = Money.fromPaise(overview.answers.expense_mtd_paise).format();
    const safeDaily = Money.fromPaise(overview.answers.safe_to_spend.dailySafePaise).format();
    const safeTotal = Money.fromPaise(overview.answers.safe_to_spend.safeAmountPaise).format();
    const daysLeft = overview.answers.safe_to_spend.daysUntilSalary;
    const runway = overview.answers.safe_to_spend.freedomRunwayMonths || 0;

    const reply = 
`📊 *Artha Financial Health Snapshot*
_For ${user.full_name}_

💰 *Current Liquid Funds:* ${liquid}
📈 *Earned This Month:* ${income}
📉 *Spent This Month:* ${expense}

🛡️ *Safe to Spend:* ${safeDaily} / day
🏖️ *Freedom Runway:* ${runway} Months
🎁 *Guilt-Free Money:* ${safeTotal} (for next ${daysLeft} days)`;

    return {
      success: true,
      action: 'BALANCE_CHECK',
      replyMessage: reply,
    };
  }

  /**
   * Batch Processing for multi-line messages where each line is an expense or income entry.
   * e.g.:
   * Spent 450 at Starbucks
   * Petrol 2000
   * Paid 1.5 k for groceries
   */
  static parseAndRecordBatchTransactions(user: UserRecord, lines: string[]): WhatsAppParsedResult {
    const accounts = AccountRepository.findByUserId(user.id);
    if (!accounts || accounts.length === 0) {
      return {
        success: false,
        action: 'PARSE_ERROR',
        replyMessage: `⚠️ You do not have any active accounts configured in Artha yet. Please log into the web dashboard and add your first bank account.`,
      };
    }

    const defaultAccount = accounts.find(a => a.account_type === 'SAVINGS') || accounts[0];
    const today = new Date().toISOString().slice(0, 10);
    const recordedList: Array<{
      id: string;
      type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
      amountPaise: number;
      description: string;
      categoryName?: string;
      accountName: string;
    }> = [];

    let totalExpensePaise = 0;
    let totalIncomePaise = 0;

    for (const line of lines) {
      const extractedAmount = this.extractAmount(line);
      if (!extractedAmount) continue;

      const txType = this.detectTransactionType(line);
      const description = this.extractDescription(line, extractedAmount.rawMatch, txType);
      const categorySuggestion = CategoryService.suggestCategory(description, user.id);

      // Account selection for this line
      const lowerLine = line.toLowerCase();
      let accountForLine = defaultAccount;
      if (lowerLine.includes('card') || lowerLine.includes('credit')) {
        const cardAcc = accounts.find(a => a.account_type === 'CREDIT_CARD');
        if (cardAcc) accountForLine = cardAcc;
      }

      const recorded = TransactionService.recordTransaction({
        account_id: accountForLine.id,
        category_id: categorySuggestion?.id,
        type: txType,
        amount_paise: extractedAmount.amountPaise,
        description,
        transaction_date: today,
      }, user.id);

      if (txType === 'EXPENSE') {
        totalExpensePaise += extractedAmount.amountPaise;
      } else if (txType === 'INCOME') {
        totalIncomePaise += extractedAmount.amountPaise;
      }

      recordedList.push({
        id: recorded.id,
        type: txType,
        amountPaise: extractedAmount.amountPaise,
        description,
        categoryName: categorySuggestion?.name,
        accountName: accountForLine.name,
      });
    }

    if (recordedList.length === 0) {
      return {
        success: false,
        action: 'PARSE_ERROR',
        replyMessage: `❓ Could not parse valid amounts from your multi-line message. Try sending one expense per line, e.g.:\nSpent 450 at Starbucks\nPetrol 2000`,
      };
    }

    // Immediate financial health velocity feedback
    const overview = DashboardService.getOverview(user.id);
    const safeDaily = Money.fromPaise(overview.answers.safe_to_spend.dailySafePaise).format();
    const updatedLiquid = Money.fromPaise(overview.answers.total_liquid_paise).format();

    const lineItems = recordedList.map((item, idx) => {
      const formatted = Money.fromPaise(item.amountPaise).format();
      const cat = item.categoryName ? ` (${item.categoryName})` : '';
      const prefix = item.type === 'INCOME' ? '➕ ' : '• ';
      return `${prefix}*${formatted}* — ${item.description}${cat}`;
    }).join('\n');

    let totalSummary = '';
    if (totalExpensePaise > 0 && totalIncomePaise > 0) {
      totalSummary = `💳 *Spent:* ${Money.fromPaise(totalExpensePaise).format()} | 💵 *Income:* ${Money.fromPaise(totalIncomePaise).format()}`;
    } else if (totalExpensePaise > 0) {
      totalSummary = `💳 *Total Logged:* ${Money.fromPaise(totalExpensePaise).format()}`;
    } else if (totalIncomePaise > 0) {
      totalSummary = `💵 *Total Received:* ${Money.fromPaise(totalIncomePaise).format()}`;
    }

    const replyMessage =
`✅ *${recordedList.length} Transactions Logged:*

${lineItems}

${totalSummary}
💰 *Liquid Balance:* ${updatedLiquid}
🛡️ *Safe to Spend:* ${safeDaily} / day`;

    return {
      success: true,
      action: 'BATCH_TRANSACTIONS_RECORDED',
      replyMessage,
      transactions: recordedList,
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

    const hourlyWage = overview.answers.safe_to_spend.hourlyWagePaise || 0;
    let lifeEnergyLine = '';
    if (hourlyWage > 0 && txType === 'EXPENSE') {
      const energy = SafeToSpendCalculator.calculateLifeEnergy(extractedAmount.amountPaise, hourlyWage);
      if (energy.formatted && energy.formatted !== '0m') {
        lifeEnergyLine = `\n⚡ *Life Energy:* ≈ ${energy.formatted} of work`;
      }
    }

    const replyMessage =
`✅ *${emoji} ${label}: ${formattedAmount}*
📝 *Note:* ${description}
🏷️ *Category:* ${categoryText}
🏦 *Account:* ${selectedAccount.name}${lifeEnergyLine}

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
    const s = str
      .replace(/[^\w\s&'-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}

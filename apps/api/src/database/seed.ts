import { getDb, transaction } from './db.js';
import { DEFAULT_USER_ID } from '../middleware/auth.js';
import { Security } from '../lib/security.js';

export function runSeed(): void {
  console.log('🌱 Starting Artha Institutional Data Seed...');
  const db = getDb();

  transaction(() => {
    // 1. Seed System Categories
    const categories = [
      // Income Categories
      { id: 'cat_inc_salary', name: 'Salary & Income', type: 'INCOME', icon_name: 'Briefcase', color_hex: '#059669', is_system: 1 },
      { id: 'cat_inc_invest', name: 'Investment Returns', type: 'INCOME', icon_name: 'TrendingUp', color_hex: '#0284C7', is_system: 1 },
      { id: 'cat_inc_freelance', name: 'Consulting & Freelance', type: 'INCOME', icon_name: 'Laptop', color_hex: '#6366F1', is_system: 1 },
      
      // Expense Categories
      { id: 'cat_exp_housing', name: 'Housing', type: 'EXPENSE', icon_name: 'Home', color_hex: '#475569', is_system: 1 },
      { id: 'cat_exp_groceries', name: 'Groceries', type: 'EXPENSE', icon_name: 'ShoppingBag', color_hex: '#16A34A', is_system: 1 },
      { id: 'cat_exp_dining', name: 'Food & Dining', type: 'EXPENSE', icon_name: 'Utensils', color_hex: '#EA580C', is_system: 1 },
      { id: 'cat_exp_transport', name: 'Transportation', type: 'EXPENSE', icon_name: 'Car', color_hex: '#2563EB', is_system: 1 },
      { id: 'cat_exp_utilities', name: 'Bills & Utilities', type: 'EXPENSE', icon_name: 'Zap', color_hex: '#D97706', is_system: 1 },
      { id: 'cat_exp_health', name: 'Health & Wellness', type: 'EXPENSE', icon_name: 'HeartPulse', color_hex: '#E11D48', is_system: 1 },
      { id: 'cat_exp_entertainment', name: 'Entertainment', type: 'EXPENSE', icon_name: 'Film', color_hex: '#9333EA', is_system: 1 },
      { id: 'cat_exp_shopping', name: 'Shopping', type: 'EXPENSE', icon_name: 'Package', color_hex: '#0D9488', is_system: 1 },
      { id: 'cat_exp_emi', name: 'Debt & EMI', type: 'EXPENSE', icon_name: 'Landmark', color_hex: '#DC2626', is_system: 1 },
      { id: 'cat_exp_misc', name: 'Other Expenses', type: 'EXPENSE', icon_name: 'MoreHorizontal', color_hex: '#64748B', is_system: 1 },
    ];

    const insertCat = db.prepare(`
      INSERT OR REPLACE INTO categories (id, user_id, name, type, icon_name, color_hex, is_system)
      VALUES (?, NULL, ?, ?, ?, ?, ?)
    `);
    for (const c of categories) {
      insertCat.run(c.id, c.name, c.type, c.icon_name, c.color_hex, c.is_system);
    }

    // 2. Seed Default Demo User with Secure Password
    const { hash, salt } = Security.hashPassword('Demo@1234');
    const defaultPhone = process.env.WHATSAPP_DEFAULT_PHONE || process.env.DEFAULT_PHONE_NUMBER || null;
    db.prepare(`
      INSERT OR REPLACE INTO users (id, email, full_name, password_hash, password_salt, currency_code, phone_number, whatsapp_linked)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(DEFAULT_USER_ID, 'aditya@artha.internal', 'Aditya Sharma', hash, salt, 'INR', defaultPhone, defaultPhone ? 1 : 0);

    // 3. Seed Salary Profile
    db.prepare(`
      INSERT OR REPLACE INTO salary_profiles (
        id, user_id, employer_name, net_monthly_salary_paise,
        pay_day_of_month, emergency_fund_target_paise, monthly_savings_target_paise
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'sal_demo',
      DEFAULT_USER_ID,
      'Razorpay Technologies',
      24500000, // ₹2,45,000 / month
      1,        // 1st of every month
      15000000, // ₹1,50,000 emergency buffer
      5000000   // ₹50,000 monthly investment target
    );

    // 4. Seed Accounts
    const accounts = [
      { id: 'acc_hdfc_sal', name: 'HDFC Corporate Salary', type: 'SAVINGS', inst: 'HDFC Bank', mask: '•••• 4921', balance: 34850000 }, // ₹3,48,500
      { id: 'acc_icici_emg', name: 'ICICI Emergency Reserve', type: 'SAVINGS', inst: 'ICICI Bank', mask: '•••• 1083', balance: 25000000 }, // ₹2,50,000
      { id: 'acc_axis_cc', name: 'Axis Olympus Credit Card', type: 'CREDIT_CARD', inst: 'Axis Bank', mask: '•••• 8820', balance: -4250000, limit: 50000000 }, // -₹42,500 debt
      { id: 'acc_cash', name: 'Physical Cash Wallet', type: 'CASH', inst: 'Cash Reserve', mask: 'CASH', balance: 1450000 }, // ₹14,500
    ];

    const insertAcc = db.prepare(`
      INSERT OR REPLACE INTO accounts (id, user_id, name, account_type, institution_name, account_number_mask, balance_paise, credit_limit_paise)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const a of accounts) {
      insertAcc.run(a.id, DEFAULT_USER_ID, a.name, a.type, a.inst, a.mask, a.balance, a.limit || 0);
    }

    // 5. Seed Recurring Obligations
    const obligations = [
      { id: 'obl_rent', title: 'Apartment Rent (Indiranagar)', amount: 4800000, day: 5, date: '2026-12-05', cat: 'cat_exp_housing', acc: 'acc_hdfc_sal' },
      { id: 'obl_home_loan', title: 'SBI Home Loan EMI', amount: 4250000, day: 7, date: '2026-12-07', cat: 'cat_exp_emi', acc: 'acc_hdfc_sal' },
      { id: 'obl_bescom', title: 'Bescom Electricity Bill', amount: 380000, day: 14, date: '2026-12-14', cat: 'cat_exp_utilities', acc: 'acc_hdfc_sal' },
      { id: 'obl_jio', title: 'JioFiber 1Gbps Broadband', amount: 149900, day: 18, date: '2026-12-18', cat: 'cat_exp_utilities', acc: 'acc_hdfc_sal' },
      { id: 'obl_gym', title: 'Cult.fit Fitness Membership', amount: 175000, day: 22, date: '2026-11-25', cat: 'cat_exp_health', acc: 'acc_hdfc_sal' },
      { id: 'obl_netflix', title: 'Netflix 4K Family Plan', amount: 64900, day: 28, date: '2026-11-28', cat: 'cat_exp_entertainment', acc: 'acc_axis_cc' },
    ];

    const insertObl = db.prepare(`
      INSERT OR REPLACE INTO recurring_obligations (
        id, user_id, account_id, category_id, title, amount_paise, frequency, due_day_of_month, next_due_date, auto_deduct
      )
      VALUES (?, ?, ?, ?, ?, ?, 'MONTHLY', ?, ?, 1)
    `);
    for (const o of obligations) {
      insertObl.run(o.id, DEFAULT_USER_ID, o.acc, o.cat, o.title, o.amount, o.day, o.date);
    }

    // 6. Seed Current Month Transactions
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = String(now.getMonth() + 1).padStart(2, '0');
    const mPrefix = `${curYear}-${curMonth}`;

    const transactions = [
      // Salary Inflow
      { id: 'tx_demo_sal', acc: 'acc_hdfc_sal', dest: null, cat: 'cat_inc_salary', type: 'INCOME', amount: 24500000, desc: 'Razorpay Monthly Salary', date: `${mPrefix}-01` },
      // Consulting Inflow
      { id: 'tx_demo_con', acc: 'acc_hdfc_sal', dest: null, cat: 'cat_inc_freelance', type: 'INCOME', amount: 4500000, desc: 'Fintech Architecture Advisory', date: `${mPrefix}-10` },
      // Neutral Transfer to Emergency Reserve
      { id: 'tx_demo_trf', acc: 'acc_hdfc_sal', dest: 'acc_icici_emg', cat: null, type: 'TRANSFER', amount: 5000000, desc: 'Monthly Reserve Allocation', date: `${mPrefix}-02` },
      // Realized Expenses
      { id: 'tx_demo_rent', acc: 'acc_hdfc_sal', dest: null, cat: 'cat_exp_housing', type: 'EXPENSE', amount: 4800000, desc: 'Apartment Rent November', date: `${mPrefix}-05` },
      { id: 'tx_demo_emi', acc: 'acc_hdfc_sal', dest: null, cat: 'cat_exp_emi', type: 'EXPENSE', amount: 4250000, desc: 'SBI Home Loan EMI', date: `${mPrefix}-07` },
      { id: 'tx_demo_groc1', acc: 'acc_axis_cc', dest: null, cat: 'cat_exp_groceries', type: 'EXPENSE', amount: 482000, desc: 'Nature Basket Organic Store', date: `${mPrefix}-08` },
      { id: 'tx_demo_dine1', acc: 'acc_axis_cc', dest: null, cat: 'cat_exp_dining', type: 'EXPENSE', amount: 320000, desc: 'Toit Brewpub Dinner', date: `${mPrefix}-12` },
      { id: 'tx_demo_util1', acc: 'acc_hdfc_sal', dest: null, cat: 'cat_exp_utilities', type: 'EXPENSE', amount: 380000, desc: 'Bescom Power Utility', date: `${mPrefix}-14` },
      { id: 'tx_demo_uber1', acc: 'acc_axis_cc', dest: null, cat: 'cat_exp_transport', type: 'EXPENSE', amount: 94000, desc: 'Uber Airport Premier', date: `${mPrefix}-16` },
      { id: 'tx_demo_groc2', acc: 'acc_axis_cc', dest: null, cat: 'cat_exp_groceries', type: 'EXPENSE', amount: 215000, desc: 'Blinkit Instant Groceries', date: `${mPrefix}-19` },
      { id: 'tx_demo_dine2', acc: 'acc_axis_cc', dest: null, cat: 'cat_exp_dining', type: 'EXPENSE', amount: 56000, desc: 'Third Wave Coffee Roasters', date: `${mPrefix}-21` },
    ];

    const insertTx = db.prepare(`
      INSERT OR REPLACE INTO transactions (
        id, user_id, account_id, destination_account_id, category_id,
        type, amount_paise, description, notes, transaction_date
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', ?)
    `);
    for (const t of transactions) {
      insertTx.run(t.id, DEFAULT_USER_ID, t.acc, t.dest, t.cat, t.type, t.amount, t.desc, t.date);
    }

    // 7. Seed Budgets for current month
    const budgets = [
      { id: 'bgt_dining', cat: 'cat_exp_dining', limit: 2000000 },       // ₹20,000
      { id: 'bgt_groceries', cat: 'cat_exp_groceries', limit: 2500000 }, // ₹25,000
      { id: 'bgt_transport', cat: 'cat_exp_transport', limit: 1200000 }, // ₹12,000
      { id: 'bgt_shopping', cat: 'cat_exp_shopping', limit: 1500000 },   // ₹15,000
      { id: 'bgt_entertainment', cat: 'cat_exp_entertainment', limit: 800000 }, // ₹8,000
    ];

    const insertBgt = db.prepare(`
      INSERT OR REPLACE INTO budgets (id, user_id, category_id, limit_paise, month_year)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const b of budgets) {
      insertBgt.run(b.id, DEFAULT_USER_ID, b.cat, b.limit, mPrefix);
    }

    // 8. Seed Loans
    db.prepare(`
      INSERT OR REPLACE INTO loans (
        id, user_id, account_id, loan_name, lender_name,
        original_principal_paise, current_outstanding_paise,
        annual_interest_rate, tenure_months, remaining_months,
        emi_amount_paise, start_date
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'loan_sbi_home',
      DEFAULT_USER_ID,
      'acc_hdfc_sal',
      'SBI Privilege Home Loan',
      'State Bank of India',
      450000000, // ₹45,00,000 original
      385000000, // ₹38,50,000 outstanding
      8.4,       // 8.4% interest
      240,       // 20 years
      178,       // 178 months left
      4250000,   // ₹42,500 EMI
      '2021-08-01'
    );

    // 9. Seed Investments
    const investments = [
      { id: 'inv_ppfc', name: 'Parag Parikh Flexi Cap Fund', class: 'MUTUAL_FUND', inv: 18000000, cur: 26500000 }, // ₹1.8L -> ₹2.65L
      { id: 'inv_nifty', name: 'UTI Nifty 50 Index Fund', class: 'MUTUAL_FUND', inv: 24000000, cur: 31200000 },   // ₹2.4L -> ₹3.12L
      { id: 'inv_sgb', name: 'RBI Sovereign Gold Bond 2028', class: 'GOLD', inv: 5000000, cur: 8400000 },          // ₹50k -> ₹84k
      { id: 'inv_epf', name: 'Employees Provident Fund (EPF)', class: 'EPF', inv: 42000000, cur: 48500000 },       // ₹4.2L -> ₹4.85L
    ];

    const insertInv = db.prepare(`
      INSERT OR REPLACE INTO investments (id, user_id, name, asset_class, invested_amount_paise, current_value_paise, last_updated_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const inv of investments) {
      insertInv.run(inv.id, DEFAULT_USER_ID, inv.name, inv.class, inv.inv, inv.cur, `${mPrefix}-15`);
    }

    console.log('✅ Institutional seed completed successfully.');
  });
}

// Auto-run if executed directly via CLI
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  runSeed();
}

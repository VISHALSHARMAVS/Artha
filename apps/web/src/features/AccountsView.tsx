import React, { useState } from 'react';
import { Account, formatPaise, api } from '../lib/api.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Modal } from '../components/ui/Modal.js';
import { AmountInput } from '../components/ui/AmountInput.js';
import { Landmark, CreditCard, Wallet, Plus, ShieldCheck, Trash2 } from 'lucide-react';

interface AccountsViewProps {
  accounts: Account[];
  onRefresh: () => void;
}

export const AccountsView: React.FC<AccountsViewProps> = ({ accounts, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [accountType, setAccountType] = useState<string>('SAVINGS');
  const [institutionName, setInstitutionName] = useState<string>('');
  const [mask, setMask] = useState<string>('');
  const [initialBalancePaise, setInitialBalancePaise] = useState<number>(0);
  const [creditLimitPaise, setCreditLimitPaise] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const handleDelete = async (account: Account) => {
    if (!window.confirm(`Are you sure you want to remove "${account.name}"?`)) {
      return;
    }
    setDeletingId(account.id);
    setViewError(null);
    try {
      await api.deleteAccount(account.id);
      onRefresh();
    } catch (err: any) {
      setViewError(err.message || 'Failed to remove account. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'CREDIT_CARD': return <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case 'CASH': return <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      default: return <Landmark className="w-5 h-5 text-slate-700 dark:text-slate-300" />;
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setModalError(null);
    try {
      await api.createAccount({
        name: name.trim(),
        account_type: accountType,
        institution_name: institutionName.trim() || undefined,
        account_number_mask: mask.trim() || undefined,
        initial_balance_paise: initialBalancePaise,
        credit_limit_paise: accountType === 'CREDIT_CARD' ? creditLimitPaise : undefined,
      });

      setName('');
      setInstitutionName('');
      setMask('');
      setInitialBalancePaise(0);
      setCreditLimitPaise(0);
      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setModalError(err.message || 'Failed to create account. Please check details.');
    } finally {
      setLoading(false);
    }
  };

  const liquidTotal = accounts
    .filter((a) => a.account_type === 'SAVINGS' || a.account_type === 'CHECKING' || a.account_type === 'CASH')
    .reduce((sum, a) => sum + a.balance_paise, 0);

  const creditCardDebt = accounts
    .filter((a) => a.account_type === 'CREDIT_CARD' && a.balance_paise < 0)
    .reduce((sum, a) => sum + Math.abs(a.balance_paise), 0);

  // Monika Halan 3-Bucket System allocations
  const getAccountBucket = (acc: Account): { id: 'INFLOW_BILLS' | 'DAILY_SPEND' | 'PEACE_OF_MIND'; label: string; color: string } => {
    const nameLower = acc.name.toLowerCase();
    if (acc.account_type === 'CREDIT_CARD' || acc.account_type === 'CASH' || nameLower.includes('upi') || nameLower.includes('spend')) {
      return { id: 'DAILY_SPEND', label: 'Bucket 2: Daily Living', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' };
    }
    if (nameLower.includes('emergency') || nameLower.includes('fd') || nameLower.includes('peace') || acc.account_type === 'INVESTMENT') {
      return { id: 'PEACE_OF_MIND', label: 'Bucket 3: Peace of Mind', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300' };
    }
    return { id: 'INFLOW_BILLS', label: 'Bucket 1: Inflow & Bills', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' };
  };

  const inflowBillsTotal = accounts
    .filter((a) => getAccountBucket(a).id === 'INFLOW_BILLS')
    .reduce((sum, a) => sum + Math.max(0, a.balance_paise), 0);

  const dailySpendTotal = accounts
    .filter((a) => getAccountBucket(a).id === 'DAILY_SPEND')
    .reduce((sum, a) => sum + Math.max(0, a.balance_paise), 0);

  const peaceOfMindTotal = accounts
    .filter((a) => getAccountBucket(a).id === 'PEACE_OF_MIND')
    .reduce((sum, a) => sum + Math.max(0, a.balance_paise), 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="heading-4 sm:heading-3 tracking-tight hero-heading-light dark:hero-heading-dark">
            Financial accounts
          </h1>
          <p className="caption-1 text-slate-500 dark:text-slate-400 mt-0.5">
            Aggregated banking, credit lines, and liquid cash vaults.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => {
            setModalError(null);
            setIsModalOpen(true);
          }}
        >
          Add financial account
        </Button>
      </div>

      {viewError && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl flex items-center justify-between gap-2 caption-2 text-red-700 dark:text-red-300">
          <span>{viewError}</span>
          <button onClick={() => setViewError(null)} className="caption-3 font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="p-8 sm:p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-[#313131] bg-white dark:bg-[#1F1F1F] shadow-sm space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Landmark className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Connect Your First Financial Account
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Artha organizes your accounts across Monika Halan's 3-bucket wealth architecture (Inflow & Bills, Daily Living, and Peace of Mind). Connect your savings bank account, credit card, or cash wallet to begin tracking liquid capital and safe-to-spend reserves.
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="primary"
              size="md"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsModalOpen(true)}
            >
              Add Financial Account
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-white dark:bg-[#1F1F1F] border border-slate-200 dark:border-[#313131] rounded-lg shadow-card">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Total Liquid Capital in Banks
              </span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white tnum mt-1">
                {formatPaise(liquidTotal, { includeDecimals: false })}
              </div>
              <span className="text-xs text-slate-400">Excludes uncleared credit card dues</span>
            </div>

            <div className="p-4 bg-white dark:bg-[#1F1F1F] border border-slate-200 dark:border-[#313131] rounded-lg shadow-card">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Uncleared Credit Card Liability
              </span>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400 tnum mt-1">
                {formatPaise(creditCardDebt, { includeDecimals: false })}
              </div>
              <span className="text-xs text-slate-400">Total revolving balance to be cleared</span>
            </div>
          </div>

          {/* MONIKA HALAN 3-BUCKET WEALTH ARCHITECTURE */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-[#313131] bg-white dark:bg-[#1F1F1F] shadow-subtle space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-[#313131]">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Monika Halan 3-Bucket Wealth Architecture</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Compartmentalizes your banking so daily discretionary spending never compromises your rent, EMIs, or safety fund.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Bucket 1 */}
              <div className="p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60">
                <div className="text-[10px] uppercase font-bold text-blue-800 dark:text-blue-300 tracking-wider">
                  Bucket 1: Inflow & Bills
                </div>
                <div className="text-lg font-bold text-slate-900 dark:text-white tnum mt-0.5">
                  {formatPaise(inflowBillsTotal, { includeDecimals: false })}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Salary account & auto-debits for rent & EMIs
                </p>
              </div>

              {/* Bucket 2 */}
              <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60">
                <div className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300 tracking-wider">
                  Bucket 2: Daily Living
                </div>
                <div className="text-lg font-bold text-slate-900 dark:text-white tnum mt-0.5">
                  {formatPaise(dailySpendTotal, { includeDecimals: false })}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  UPI, debit card & credit lines for food & cabs
                </p>
              </div>

              {/* Bucket 3 */}
              <div className="p-3 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60">
                <div className="text-[10px] uppercase font-bold text-indigo-800 dark:text-indigo-300 tracking-wider">
                  Bucket 3: Peace of Mind
                </div>
                <div className="text-lg font-bold text-slate-900 dark:text-white tnum mt-0.5">
                  {formatPaise(peaceOfMindTotal, { includeDecimals: false })}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Untouchable emergency buffer & savings vault
                </p>
              </div>
            </div>
          </div>

          {/* Accounts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((acc) => {
              const bucket = getAccountBucket(acc);
              return (
                <Card key={acc.id} padding="md" className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        {getAccountIcon(acc.account_type)}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                          {acc.name}
                        </h3>
                        <div className="text-xs text-slate-500">
                          {acc.institution_name || acc.account_type} {acc.account_number_mask && `• ${acc.account_number_mask}`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${bucket.color}`}>
                        {bucket.label.split(':')[0]}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDelete(acc)}
                        disabled={deletingId === acc.id}
                        className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-40"
                        title={`Remove ${acc.name}`}
                        aria-label={`Remove ${acc.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-[#313131]">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                      {acc.account_type === 'CREDIT_CARD' ? 'Current Balance / Due' : 'Available Balance'}
                    </span>
                    <div
                      className={`text-xl font-bold tnum mt-0.5 ${
                        acc.balance_paise < 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {formatPaise(acc.balance_paise)}
                    </div>

                    {acc.account_type === 'CREDIT_CARD' && acc.credit_limit_paise > 0 && (
                      <div className="mt-2 text-[11px] text-slate-500">
                        Credit Limit: <strong className="tnum">{formatPaise(acc.credit_limit_paise, { includeDecimals: false })}</strong>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Add Account Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Connect new financial account"
        description="Add a savings account, credit line, or cash reserve to Artha."
        maxWidth="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {modalError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-lg caption-4 text-red-700 dark:text-red-300">
              {modalError}
            </div>
          )}
          <div>
            <label className="block caption-4 text-slate-700 dark:text-slate-300 mb-1">
              Account label / name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. HDFC Salary, ICICI Savings, Axis CC"
              className="w-full h-10 px-3 bg-white dark:bg-[#1F1F1F] border border-slate-300 dark:border-[#313131] rounded-md text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block caption-4 text-slate-700 dark:text-slate-300 mb-1">
                Account type
              </label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                className="w-full h-10 px-2.5 bg-white dark:bg-[#1F1F1F] border border-slate-300 dark:border-[#313131] rounded-md text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="SAVINGS">Savings bank</option>
                <option value="CHECKING">Checking account</option>
                <option value="CREDIT_CARD">Credit card</option>
                <option value="CASH">Cash wallet</option>
              </select>
            </div>

            <div>
              <label className="block caption-4 text-slate-700 dark:text-slate-300 mb-1">
                Institution
              </label>
              <input
                type="text"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                placeholder="e.g. HDFC Bank, SBI"
                className="w-full h-10 px-3 bg-white dark:bg-[#1F1F1F] border border-slate-300 dark:border-[#313131] rounded-md text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <AmountInput
              label={accountType === 'CREDIT_CARD' ? 'Current outstanding balance (Paise)' : 'Initial balance'}
              valuePaise={initialBalancePaise}
              onChangePaise={setInitialBalancePaise}
            />
          </div>

          {accountType === 'CREDIT_CARD' && (
            <div>
              <AmountInput
                label="Total credit limit"
                valuePaise={creditLimitPaise}
                onChangePaise={setCreditLimitPaise}
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-[#313131]">
            <Button variant="outline" size="md" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" loading={loading}>
              Create account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

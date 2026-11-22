import React, { useState } from 'react';
import { Account, formatPaise, api } from '../lib/api.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Modal } from '../components/ui/Modal.js';
import { AmountInput } from '../components/ui/AmountInput.js';
import { Landmark, CreditCard, Wallet, Plus, ShieldCheck } from 'lucide-react';

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
      alert(err.message || 'Failed to create account');
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Financial Accounts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Aggregated banking, credit lines, and liquid cash vaults.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => setIsModalOpen(true)}
        >
          Add Financial Account
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-card">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Total Liquid Capital in Banks
          </span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white tnum mt-1">
            {formatPaise(liquidTotal, { includeDecimals: false })}
          </div>
          <span className="text-xs text-slate-400">Excludes uncleared credit card dues</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-card">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Uncleared Credit Card Liability
          </span>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400 tnum mt-1">
            {formatPaise(creditCardDebt, { includeDecimals: false })}
          </div>
          <span className="text-xs text-slate-400">Total revolving balance to be cleared</span>
        </div>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((acc) => (
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
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
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
        ))}
      </div>

      {/* Add Account Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Connect New Financial Account"
        description="Add a savings account, credit line, or cash reserve to Finora."
        maxWidth="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Account Label / Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. HDFC Salary, ICICI Savings, Axis CC"
              className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Account Type
              </label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                className="w-full h-10 px-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-white"
              >
                <option value="SAVINGS">Savings Bank</option>
                <option value="CHECKING">Checking Account</option>
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="CASH">Cash Wallet</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Institution
              </label>
              <input
                type="text"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                placeholder="e.g. HDFC Bank, SBI"
                className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <AmountInput
              label={accountType === 'CREDIT_CARD' ? 'Current Outstanding Balance (Paise)' : 'Initial Balance'}
              valuePaise={initialBalancePaise}
              onChangePaise={setInitialBalancePaise}
            />
          </div>

          {accountType === 'CREDIT_CARD' && (
            <div>
              <AmountInput
                label="Total Credit Limit"
                valuePaise={creditLimitPaise}
                onChangePaise={setCreditLimitPaise}
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="outline" size="md" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" loading={loading}>
              Create Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

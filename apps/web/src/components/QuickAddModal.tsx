import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal.js';
import { Button } from './ui/Button.js';
import { AmountInput } from './ui/AmountInput.js';
import { api, Account, Category } from '../lib/api.js';
import { Sparkles, Calendar, Wallet } from 'lucide-react';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: Account[];
  onCreateAccount?: () => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  accounts,
  onCreateAccount,
}) => {
  const [amountPaise, setAmountPaise] = useState<number>(0);
  const [description, setDescription] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [suggestedCategory, setSuggestedCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      const defaultAcc = accounts.find((a) => a.account_type === 'SAVINGS' || a.account_type === 'CHECKING') || accounts[0];
      setAccountId(defaultAcc.id);
    }
  }, [accounts, accountId]);

  // Debounced real-time category detection heuristic as user types
  useEffect(() => {
    if (!description || description.trim().length < 3) {
      setSuggestedCategory(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const cat = await api.suggestCategory(description);
        setSuggestedCategory(cat);
      } catch {
        // Non-blocking
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [description]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (accounts.length === 0 || !accountId) {
      setError('A payment account is required. Please create or connect an account first.');
      return;
    }
    if (amountPaise <= 0) {
      setError('Please enter a valid expense amount');
      return;
    }
    if (!description.trim()) {
      setError('Please enter a description');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.quickAddExpense({
        amount_paise: amountPaise,
        description: description.trim(),
        account_id: accountId,
        category_id: suggestedCategory?.id || undefined,
      });

      // Reset form
      setAmountPaise(0);
      setDescription('');
      setSuggestedCategory(null);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Record Expense"
      description="Journey B — Fast expense recording with automated category detection."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-md border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        <div>
          <AmountInput
            label="Amount Spent"
            size="lg"
            valuePaise={amountPaise}
            onChangePaise={setAmountPaise}
            autoFocus
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            What was this for? <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Starbucks Pike Place, Uber ride, Blinkit..."
            className="w-full h-10 px-3 bg-white dark:bg-[#1F1F1F] border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors"
            required
          />
        </div>

        {/* Real-time category suggestion pill */}
        {suggestedCategory && (
          <div className="flex items-center gap-2 p-2.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-md border border-blue-100 dark:border-blue-900/50 text-xs text-blue-900 dark:text-blue-300">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Auto-detected category:{' '}
              <strong className="font-semibold">{suggestedCategory.name}</strong>
            </span>
          </div>
        )}

        {accounts.length === 0 ? (
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 space-y-2">
            <div className="font-semibold flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-amber-600 shrink-0" />
              <span>No Financial Accounts Connected</span>
            </div>
            <p className="leading-relaxed">
              An active bank account, cash wallet, or credit card is required to record expenses and maintain double-entry financial telemetry.
            </p>
            {onCreateAccount && (
              <Button
                variant="primary"
                size="sm"
                type="button"
                onClick={onCreateAccount}
                className="w-full mt-1"
              >
                Create Financial Account
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-slate-400" /> Payment Account
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full h-10 px-2.5 bg-white dark:bg-[#1F1F1F] border border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.account_type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date
              </label>
              <input
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="w-full h-10 px-2.5 bg-white dark:bg-[#1F1F1F] border border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 tnum"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-[#313131]">
          <Button variant="outline" size="md" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            size="md"
            type="submit"
            loading={loading}
            disabled={accounts.length === 0}
            title={accounts.length === 0 ? 'Create a financial account before saving expenses' : undefined}
          >
            Save Expense
          </Button>
        </div>
      </form>
    </Modal>
  );
};

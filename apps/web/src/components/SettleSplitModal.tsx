import React, { useState } from 'react';
import { Modal } from './ui/Modal.js';
import { Button } from './ui/Button.js';
import { AmountInput } from './ui/AmountInput.js';
import { api, Account, SplitReceivable, formatPaise } from '../lib/api.js';
import { Check, Landmark, UserCheck } from 'lucide-react';

interface SettleSplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  receivable: SplitReceivable | null;
  accounts: Account[];
}

export const SettleSplitModal: React.FC<SettleSplitModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  receivable,
  accounts,
}) => {
  if (!receivable) return null;

  const outstandingPaise = receivable.amount_paise - receivable.settled_amount_paise;
  const [amountPaise, setAmountPaise] = useState<number>(outstandingPaise);
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || '');
  const [settledDate, setSettledDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) {
      setError('Please select an account where you received the funds.');
      return;
    }
    if (amountPaise <= 0) {
      setError('Settlement amount must be positive.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.settleSplit(receivable.id, {
        account_id: accountId,
        settled_amount_paise: amountPaise,
        settled_at: settledDate,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to settle split');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Settle Friend Payment"
      description={`Record payback from ${receivable.friend_name} for "${receivable.transaction_description || 'Split Expense'}".`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs rounded-md border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-300 space-y-1">
          <div className="flex justify-between items-center font-medium">
            <span>Total Owed by {receivable.friend_name}:</span>
            <span className="font-semibold text-sm tnum">{formatPaise(outstandingPaise)}</span>
          </div>
          <p className="text-[11px] text-blue-700 dark:text-blue-400">
            Recovered funds are credited to your chosen bank account and will not be counted as taxable income.
          </p>
        </div>

        <div>
          <AmountInput
            label="Amount Received (₹)"
            size="lg"
            valuePaise={amountPaise}
            onChangePaise={setAmountPaise}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Deposit Into Account <span className="text-red-500">*</span>
          </label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full h-10 px-3 bg-white dark:bg-[#1F1F1F] border border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.account_type})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Date Received
          </label>
          <input
            type="date"
            value={settledDate}
            onChange={(e) => setSettledDate(e.target.value)}
            className="w-full h-10 px-3 bg-white dark:bg-[#1F1F1F] border border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            required
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-[#313131]">
          <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            loading={loading}
            icon={<Check className="w-3.5 h-3.5" />}
          >
            Confirm Settlement
          </Button>
        </div>
      </form>
    </Modal>
  );
};

import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal.js';
import { Button } from './ui/Button.js';
import { AmountInput } from './ui/AmountInput.js';
import { api, Account, Category, Transaction, formatPaise } from '../lib/api.js';
import { ArrowLeftRight, ArrowDownLeft, ArrowUpRight, Info, Trash2, Check, Users } from 'lucide-react';

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transaction: Transaction | null;
  accounts: Account[];
  categories: Category[];
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  transaction,
  accounts,
  categories,
}) => {
  const [type, setType] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER'>('EXPENSE');
  const [amountPaise, setAmountPaise] = useState<number>(0);
  const [description, setDescription] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [destAccountId, setDestAccountId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [transactionDate, setTransactionDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Split state
  const [isSplit, setIsSplit] = useState<boolean>(false);
  const [peopleCount, setPeopleCount] = useState<number>(3);
  const [friends, setFriends] = useState<Array<{ id?: string; friend_name: string; amount_paise: number }>>([
    { friend_name: 'Rahul', amount_paise: 0 },
    { friend_name: 'Aman', amount_paise: 0 },
  ]);

  useEffect(() => {
    if (transaction && isOpen) {
      setType(transaction.type);
      setAmountPaise(transaction.amount_paise || 0);
      setDescription(transaction.description || '');
      setNotes(transaction.notes || '');
      setAccountId(transaction.account_id || (accounts[0]?.id || ''));
      setDestAccountId(transaction.destination_account_id || (accounts[1]?.id || ''));
      setCategoryId(transaction.category_id || '');
      setTransactionDate(transaction.transaction_date || new Date().toISOString().slice(0, 10));

      const hasSplit = Boolean(transaction.is_split);
      setIsSplit(hasSplit);
      if (hasSplit && transaction.splits && transaction.splits.length > 0) {
        setPeopleCount(transaction.splits.length + 1);
        setFriends(
          transaction.splits.map((s) => ({
            id: s.id,
            friend_name: s.friend_name,
            amount_paise: s.amount_paise,
          }))
        );
      } else {
        setPeopleCount(3);
        setFriends([
          { friend_name: 'Rahul', amount_paise: 0 },
          { friend_name: 'Aman', amount_paise: 0 },
        ]);
      }
      setError(null);
    }
  }, [transaction, isOpen, accounts]);

  const handlePeopleCountChange = (count: number) => {
    setPeopleCount(count);
    if (amountPaise > 0) {
      const totalPeople = Math.max(2, count);
      const perPerson = Math.floor(amountPaise / totalPeople);
      const friendsCount = totalPeople - 1;

      setFriends((prev) => {
        const next: Array<{ id?: string; friend_name: string; amount_paise: number }> = [];
        for (let i = 0; i < friendsCount; i++) {
          const existing = prev[i];
          next.push({
            id: existing?.id,
            friend_name: existing?.friend_name || `Friend ${i + 1}`,
            amount_paise: perPerson,
          });
        }
        return next;
      });
    }
  };

  const handleSplitToggle = (checked: boolean) => {
    setIsSplit(checked);
    if (checked && (!friends || friends.length === 0 || friends.every(f => f.amount_paise === 0)) && amountPaise > 0) {
      handlePeopleCountChange(peopleCount);
    }
  };

  const friendsTotalPaise = isSplit ? friends.reduce((sum, f) => sum + f.amount_paise, 0) : 0;
  const personalSharePaise = isSplit ? Math.max(0, amountPaise - friendsTotalPaise) : amountPaise;

  const filteredCategories = categories.filter((c) =>
    type === 'TRANSFER' ? false : c.type === type
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction) return;

    if (!accountId) {
      setError('A valid financial account is required.');
      return;
    }
    if (amountPaise <= 0) {
      setError('Please enter a positive amount');
      return;
    }
    if (!description.trim()) {
      setError('Description is required');
      return;
    }
    if (type === 'TRANSFER' && accountId === destAccountId) {
      setError('Source and Destination accounts must be different');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.updateTransaction(transaction.id, {
        account_id: accountId,
        destination_account_id: type === 'TRANSFER' ? destAccountId : undefined,
        category_id: type !== 'TRANSFER' ? (categoryId || undefined) : undefined,
        type,
        amount_paise: amountPaise,
        description: description.trim(),
        notes: notes.trim() || undefined,
        transaction_date: transactionDate,
        is_split: type === 'EXPENSE' ? isSplit : false,
        personal_share_paise: type === 'EXPENSE' && isSplit ? personalSharePaise : undefined,
        splits: type === 'EXPENSE' && isSplit ? friends : undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!transaction) return;
    if (!confirm('Are you sure you want to delete this transaction? Account balance will be reversed.')) {
      return;
    }

    setDeleting(true);
    try {
      await api.deleteTransaction(transaction.id);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete transaction');
    } finally {
      setDeleting(false);
    }
  };

  if (!transaction) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Transaction"
      description="Update details, category, or account. Ledger balances will rebalance automatically."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs rounded-md border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        {/* Transaction Movement Type Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-md text-xs font-medium">
          <button
            type="button"
            onClick={() => setType('EXPENSE')}
            className={`flex-1 py-1.5 flex items-center justify-center gap-1.5 rounded transition-all ${
              type === 'EXPENSE'
                ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" /> Expense
          </button>
          <button
            type="button"
            onClick={() => setType('INCOME')}
            className={`flex-1 py-1.5 flex items-center justify-center gap-1.5 rounded transition-all ${
              type === 'INCOME'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" /> Income
          </button>
          <button
            type="button"
            onClick={() => setType('TRANSFER')}
            className={`flex-1 py-1.5 flex items-center justify-center gap-1.5 rounded transition-all ${
              type === 'TRANSFER'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" /> Transfer
          </button>
        </div>

        {type === 'TRANSFER' && (
          <div className="flex items-start gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-md border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              <strong>Transfer Neutrality</strong>: Transfers move money between accounts with zero impact on monthly income or expense totals.
            </span>
          </div>
        )}

        {/* Amount Input */}
        <div>
          <AmountInput
            label="Amount (₹)"
            size="lg"
            valuePaise={amountPaise}
            onChangePaise={setAmountPaise}
            required
          />
        </div>

        {/* Description Input */}
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Description <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Chai, Grocery, Shopping, Shirt..."
            className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            required
          />
        </div>

        {/* Category & Account Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              {type === 'TRANSFER' ? 'From Account' : 'Account'} <span className="text-red-500">*</span>
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full h-10 px-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>

          {type === 'TRANSFER' ? (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                To Account <span className="text-red-500">*</span>
              </label>
              <select
                value={destAccountId}
                onChange={(e) => setDestAccountId(e.target.value)}
                className="w-full h-10 px-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-10 px-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">Uncategorized</option>
                {filteredCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Split with Friends Section */}
        {type === 'EXPENSE' && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Split with Friends (Shared Bill)</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSplit}
                  onChange={(e) => handleSplitToggle(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {isSplit && (
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    Total People Sharing Bill (Including You)
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[2, 3, 4, 5].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => handlePeopleCountChange(count)}
                        className={`flex-1 py-1 rounded text-xs font-medium border transition-colors ${
                          peopleCount === count
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm font-semibold'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {count} People
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-medium text-slate-500">
                    Friends Breakdown (Who owes you what)
                  </label>
                  {friends.map((f, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={f.friend_name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFriends((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, friend_name: val } : item))
                          );
                        }}
                        placeholder="Friend Name"
                        className="flex-1 h-8 px-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white"
                        required
                      />
                      <div className="w-28 flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 h-8">
                        <span className="text-slate-400 text-xs mr-1">₹</span>
                        <input
                          type="number"
                          value={f.amount_paise > 0 ? (f.amount_paise / 100).toFixed(0) : ''}
                          onChange={(e) => {
                            const val = Math.max(0, parseFloat(e.target.value) || 0);
                            setFriends((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, amount_paise: Math.round(val * 100) } : item
                              )
                            );
                          }}
                          className="w-full text-xs font-semibold tnum focus:outline-none bg-transparent text-slate-900 dark:text-white"
                          required
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Real-time Financial Impact Breakdown */}
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 text-[11px] space-y-1">
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Total Paid from Bank:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 tnum">{formatPaise(amountPaise)}</span>
                  </div>
                  <div className="flex justify-between items-center text-blue-600 dark:text-blue-400 font-medium">
                    <span>Your Real Share (Monthly Expense):</span>
                    <span className="font-bold tnum">{formatPaise(personalSharePaise)}</span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-medium">
                    <span>Friends Owe You (Receivable):</span>
                    <span className="font-bold tnum">{formatPaise(friendsTotalPaise)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Date & Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Transaction Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Notes / Tags
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional reference notes"
              className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{deleting ? 'Deleting...' : 'Delete Entry'}</span>
          </button>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={loading || deleting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              loading={loading}
              icon={<Check className="w-3.5 h-3.5" />}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

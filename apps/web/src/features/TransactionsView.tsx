import React, { useState, useEffect } from 'react';
import { api, Transaction, Account, Category, formatPaise } from '../lib/api.js';
import { CategoryIcon } from '../components/CategoryIcon.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import {
  Search,
  Plus,
  Trash2,
  Filter,
  AlertCircle,
  RefreshCw,
  Receipt,
  Pencil,
  Upload,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { EditTransactionModal } from '../components/EditTransactionModal.js';
import { ImportStatementModal } from '../components/ImportStatementModal.js';

interface TransactionsViewProps {
  onAddTransaction: () => void;
  accounts: Account[];
  categories: Category[];
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  onAddTransaction,
  accounts,
  categories,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [accountFilter, setAccountFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const limit = 15;

  const hasActiveFilters = Boolean(typeFilter || accountFilter || categoryFilter || searchTerm);

  const handleClearFilters = () => {
    setTypeFilter('');
    setAccountFilter('');
    setCategoryFilter('');
    setSearchTerm('');
    setPage(1);
  };

  const loadTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTransactions({
        page,
        limit,
        type: typeFilter || undefined,
        account_id: accountFilter || undefined,
        category_id: categoryFilter || undefined,
        search: searchTerm || undefined,
      });
      setTransactions(data);
    } catch (err: any) {
      console.error('Failed to load transactions:', err);
      setError(err?.message || 'Unable to retrieve transactions ledger.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [page, typeFilter, accountFilter, categoryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadTransactions();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction? Account balances will update automatically.')) {
      return;
    }
    setError(null);
    try {
      await api.deleteTransaction(id);
      loadTransactions();
    } catch (err: any) {
      setError(err.message || 'Failed to delete transaction. Please try again.');
    }
  };

  // Metrics for quick overview
  const totalExpensePaise = transactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((acc, t) => acc + (t.personal_share_paise ?? t.amount_paise), 0);

  const totalIncomePaise = transactions
    .filter((t) => t.type === 'INCOME')
    .reduce((acc, t) => acc + t.amount_paise, 0);

  const totalSplitsCount = transactions.filter((t) => Boolean(t.is_split)).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="heading-4 sm:heading-3 tracking-tight font-bold text-slate-900 dark:text-white">
              Transactions Ledger
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Ledger
            </span>
          </div>
          <p className="caption-1 text-slate-500 dark:text-slate-400 mt-1">
            Audit-safe record of all inflows, personal share outflows, and inter-account transfers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            icon={<Upload className="w-3.5 h-3.5 text-blue-500" />}
            onClick={() => setIsImportModalOpen(true)}
          >
            Import PDF statement
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={onAddTransaction}
          >
            Record transaction
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-between gap-2 caption-2 text-rose-400 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="caption-3 font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Quick Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white dark:bg-[#131722] p-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Outflow (Personal)
            </span>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-rose-400 mt-1">
              -{formatPaise(totalExpensePaise)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
            <ArrowDownRight className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#131722] p-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Inflow Recorded
            </span>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-emerald-400 mt-1">
              +{formatPaise(totalIncomePaise)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#131722] p-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Shared Splits Active
            </span>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-indigo-400 mt-1">
              {totalSplitsCount} {totalSplitsCount === 1 ? 'Expense' : 'Expenses'}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-[#131722] p-3 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-sm flex flex-wrap items-center gap-2.5">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search merchant, friend, or note..."
            className="w-full h-10 pl-10 pr-3 text-xs bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/20 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </form>

        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 px-3.5 text-xs bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/20 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
        >
          <option value="">All Movement Types</option>
          <option value="EXPENSE">Expenses Only</option>
          <option value="INCOME">Income Only</option>
          <option value="TRANSFER">Transfers Only</option>
        </select>

        {/* Account Filter */}
        <select
          value={accountFilter}
          onChange={(e) => {
            setAccountFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 px-3.5 text-xs bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/20 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
        >
          <option value="">All Accounts</option>
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.name}
            </option>
          ))}
        </select>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 px-3.5 text-xs bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/20 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="h-10 px-3 text-xs text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all font-medium"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Ledger Table Container */}
      <div className="bg-white dark:bg-[#131722] border border-slate-200/80 dark:border-white/[0.08] rounded-2xl shadow-xl shadow-black/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-[#181D2A]/80 border-b border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-5">Date</th>
                <th className="py-3.5 px-5">Description</th>
                <th className="py-3.5 px-5">Category</th>
                <th className="py-3.5 px-5">Account Movement</th>
                <th className="py-3.5 px-5 text-right">Amount</th>
                <th className="py-3.5 px-5 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2.5">
                      <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                      <span className="text-xs">Loading ledger records...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2 max-w-sm mx-auto">
                      <AlertCircle className="w-6 h-6 text-rose-500" />
                      <span className="text-xs text-rose-400">{error}</span>
                      <Button variant="outline" size="sm" onClick={loadTransactions} className="mt-2">
                        Retry Loading
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    {hasActiveFilters ? (
                      <div className="flex flex-col items-center gap-2.5 max-w-sm mx-auto">
                        <Filter className="w-6 h-6 text-slate-400" />
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                          No Matching Transactions
                        </span>
                        <p className="text-xs text-slate-500">
                          No records match your active filters. Try clearing them to see all entries.
                        </p>
                        <Button variant="outline" size="sm" onClick={handleClearFilters} className="mt-2">
                          Clear Filters
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2.5 max-w-sm mx-auto">
                        <Receipt className="w-6 h-6 text-slate-400" />
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                          No Transactions Recorded Yet
                        </span>
                        <p className="text-xs text-slate-500">
                          Log an expense from WhatsApp or click below to record your first transaction.
                        </p>
                        <Button variant="primary" size="sm" onClick={onAddTransaction} icon={<Plus className="w-3.5 h-3.5" />} className="mt-2">
                          Record First Transaction
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-white/[0.03] transition-colors group"
                  >
                    <td className="py-4 px-5 text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
                      {tx.transaction_date}
                    </td>

                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <CategoryIcon
                          iconName={tx.category_icon}
                          type={tx.type}
                          colorHex={tx.category_color}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-white text-sm tracking-tight truncate">
                            {tx.description}
                          </div>
                          {tx.notes && (
                            <div className="text-xs text-slate-400 font-normal truncate mt-0.5">
                              {tx.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-5 whitespace-nowrap">
                      {tx.type === 'TRANSFER' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          Inter-Account Transfer
                        </span>
                      ) : tx.category_name ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: tx.category_color || '#3B82F6' }}
                          />
                          {tx.category_name}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Uncategorized</span>
                      )}
                    </td>

                    <td className="py-4 px-5 text-slate-600 dark:text-slate-400 text-xs font-mono whitespace-nowrap">
                      {tx.type === 'TRANSFER' ? (
                        <span>
                          {tx.account_name} <span className="text-blue-500">→</span> <strong className="text-slate-800 dark:text-slate-200">{tx.destination_account_name}</strong>
                        </span>
                      ) : (
                        <span>{tx.account_name}</span>
                      )}
                    </td>

                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <div>
                        <span
                          className={`font-semibold font-mono text-sm sm:text-base ${
                            tx.type === 'INCOME'
                              ? 'text-emerald-500 dark:text-emerald-400'
                              : tx.type === 'EXPENSE'
                              ? 'text-rose-500 dark:text-rose-400'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : ''}
                          {formatPaise(tx.amount_paise)}
                        </span>
                        {Boolean(tx.is_split) && (
                          <div className="flex items-center justify-end gap-1.5 mt-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/15 text-indigo-400 dark:text-indigo-300 border border-indigo-500/30">
                              <Users className="w-2.5 h-2.5" />
                              Split
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              Your share: {formatPaise(tx.personal_share_paise ?? tx.amount_paise)}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-5 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditingTransaction(tx)}
                          className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="Edit transaction details"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Delete transaction and reverse balance impact"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-200 dark:border-white/[0.08] bg-slate-50/60 dark:bg-[#181D2A]/60 text-xs text-slate-500 dark:text-slate-400">
          <span>Showing page {page}</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/20 rounded-xl text-slate-700 dark:text-slate-300 disabled:opacity-40 transition-all font-medium"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <button
              disabled={transactions.length < limit}
              onClick={() => setPage(page + 1)}
              className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/20 rounded-xl text-slate-700 dark:text-slate-300 disabled:opacity-40 transition-all font-medium"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <EditTransactionModal
        isOpen={!!editingTransaction}
        onClose={() => setEditingTransaction(null)}
        onSuccess={loadTransactions}
        transaction={editingTransaction}
        accounts={accounts}
        categories={categories}
      />

      <ImportStatementModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={loadTransactions}
        accounts={accounts}
        categories={categories}
      />
    </div>
  );
};

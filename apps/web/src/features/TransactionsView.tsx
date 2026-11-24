import React, { useState, useEffect } from 'react';
import { api, Transaction, Account, Category, formatPaise } from '../lib/api.js';
import { CategoryIcon } from '../components/CategoryIcon.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { Search, Plus, Trash2, Filter, AlertCircle, RefreshCw, Receipt, Pencil, Upload, Download } from 'lucide-react';
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
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await api.downloadTransactionsExport('csv');
    } catch (err: any) {
      setError(err.message || 'Failed to export transaction ledger');
    } finally {
      setIsExporting(false);
    }
  };

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

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="heading-4 sm:heading-3 tracking-tight text-slate-900 dark:text-white text-balance">
            Transactions ledger
          </h1>
          <p className="caption-1 text-slate-500 dark:text-[#9B9B9B] mt-0.5 text-pretty">
            Audit safe record of all inflows, outflows, and transfers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={<Upload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
            onClick={() => setIsImportModalOpen(true)}
          >
            Import statement
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
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-md flex items-center justify-between gap-2 caption-2 text-red-700 dark:text-red-300">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="caption-3 font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-[#1F1F1F] p-3 rounded-lg border border-slate-200 dark:border-[#313131] shadow-card flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by merchant, description..."
            className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 dark:bg-[#272727] border border-slate-200 dark:border-[#313131] rounded-md text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#9B9B9B] focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors duration-300"
          />
        </form>

        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          className="h-9 px-3 text-xs bg-slate-50 dark:bg-[#272727] border border-slate-200 dark:border-[#313131] rounded-md text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors duration-300 cursor-pointer"
        >
          <option value="">All movement types</option>
          <option value="EXPENSE">Expenses only</option>
          <option value="INCOME">Income only</option>
          <option value="TRANSFER">Transfers only</option>
        </select>

        {/* Account Filter */}
        <select
          value={accountFilter}
          onChange={(e) => {
            setAccountFilter(e.target.value);
            setPage(1);
          }}
          className="h-9 px-3 text-xs bg-slate-50 dark:bg-[#272727] border border-slate-200 dark:border-[#313131] rounded-md text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors duration-300 cursor-pointer"
        >
          <option value="">All accounts</option>
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
          className="h-9 px-3 text-xs bg-slate-50 dark:bg-[#272727] border border-slate-200 dark:border-[#313131] rounded-md text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors duration-300 cursor-pointer"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Ledger Table */}
      <div className="bg-white dark:bg-[#1F1F1F] border border-slate-200 dark:border-[#313131] rounded-lg shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#272727] border-b border-slate-200 dark:border-[#313131] text-slate-500 dark:text-[#9B9B9B] font-medium caption-1">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Account movement</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#313131]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                      <span>Loading ledger records...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center">
                    <div className="flex flex-col items-center gap-2 max-w-sm mx-auto">
                      <AlertCircle className="w-6 h-6 text-red-500" />
                      <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
                      <Button variant="outline" size="sm" onClick={loadTransactions} className="mt-1">
                        Retry Loading
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    {hasActiveFilters ? (
                      <div className="flex flex-col items-center gap-2 max-w-sm mx-auto">
                        <Filter className="w-6 h-6 text-slate-400" />
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          No Matching Transactions
                        </span>
                        <p className="text-xs text-slate-500">
                          No transactions found for the applied search or filter criteria.
                        </p>
                        <Button variant="outline" size="sm" onClick={handleClearFilters} className="mt-1">
                          Clear All Filters
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 max-w-sm mx-auto">
                        <Receipt className="w-6 h-6 text-slate-400" />
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          No Transactions Recorded Yet
                        </span>
                        <p className="text-xs text-slate-500">
                          Begin recording your income, expenses, or transfers to populate your ledger.
                        </p>
                        <Button variant="primary" size="sm" onClick={onAddTransaction} icon={<Plus className="w-3.5 h-3.5" />} className="mt-1">
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
                    className="hover:bg-slate-50/70 dark:hover:bg-[#272727]/60 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  >
                    <td className="py-3 px-4 text-slate-500 dark:text-[#9B9B9B] tnum whitespace-nowrap">
                      {tx.transaction_date}
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2.5">
                        <CategoryIcon
                          iconName={tx.category_icon}
                          type={tx.type}
                          colorHex={tx.category_color}
                          size="sm"
                        />
                        <div>
                          <div>{tx.description}</div>
                          {tx.notes && (
                            <div className="caption-5 text-slate-400 dark:text-[#9B9B9B] font-normal">
                              {tx.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {tx.type === 'TRANSFER' ? (
                        <Badge variant="transfer" icon>Inter-Account Transfer</Badge>
                      ) : tx.category_name ? (
                        <span className="text-slate-600 dark:text-slate-300 font-medium">
                          {tx.category_name}
                        </span>
                      ) : (
                        <span className="caption-4 text-slate-400 dark:text-[#9B9B9B]">Uncategorized</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-600 dark:text-[#9B9B9B] whitespace-nowrap">
                      {tx.type === 'TRANSFER' ? (
                        <span>
                          {tx.account_name} → <strong className="text-slate-800 dark:text-slate-200">{tx.destination_account_name}</strong>
                        </span>
                      ) : (
                        <span>{tx.account_name}</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div>
                        <span
                          className={`font-semibold tnum ${
                            tx.type === 'INCOME'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : tx.type === 'EXPENSE'
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : ''}
                          {formatPaise(tx.amount_paise)}
                        </span>
                        {Boolean(tx.is_split) && (
                          <div className="flex items-center justify-end gap-1 mt-0.5">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-[#272727] dark:text-indigo-400 border border-indigo-200/50 dark:border-[#313131]">
                              Split
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-[#9B9B9B] font-medium font-mono">
                              Your share: {formatPaise(tx.personal_share_paise ?? tx.amount_paise)}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditingTransaction(tx)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-[#272727] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                          title="Edit transaction details"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-slate-100 dark:hover:bg-[#272727] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
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
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-[#313131] bg-slate-50/50 dark:bg-[#272727]/40 text-xs text-slate-500 dark:text-[#9B9B9B]">
          <span>Showing page {page}</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-2.5 py-1 bg-white dark:bg-[#1F1F1F] border border-slate-200 dark:border-[#313131] rounded disabled:opacity-40 active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            >
              Previous
            </button>
            <button
              disabled={transactions.length < limit}
              onClick={() => setPage(page + 1)}
              className="px-2.5 py-1 bg-white dark:bg-[#1F1F1F] border border-slate-200 dark:border-[#313131] rounded disabled:opacity-40 active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            >
              Next
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

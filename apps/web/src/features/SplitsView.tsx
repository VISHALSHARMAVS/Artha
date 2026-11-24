import React, { useState, useEffect } from 'react';
import { api, Account, SplitReceivable, SplitSummary, formatPaise } from '../lib/api.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { SettleSplitModal } from '../components/SettleSplitModal.js';
import { Users, CheckCircle, Clock, Check, Trash2, ArrowUpRight, MessageSquare, Plus, RefreshCw, AlertCircle } from 'lucide-react';

interface SplitsViewProps {
  accounts: Account[];
  onRefresh?: () => void;
  onRecordSplit?: () => void;
}

export const SplitsView: React.FC<SplitsViewProps> = ({
  accounts,
  onRefresh,
  onRecordSplit,
}) => {
  const [splits, setSplits] = useState<SplitReceivable[]>([]);
  const [summary, setSummary] = useState<SplitSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'settled' | 'all'>('pending');
  const [settlingSplit, setSettlingSplit] = useState<SplitReceivable | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const isSettledParam = filter === 'pending' ? false : filter === 'settled' ? true : undefined;
      const [list, sum] = await Promise.all([
        api.getSplits(isSettledParam),
        api.getSplitSummary(),
      ]);
      setSplits(list);
      setSummary(sum);
    } catch (err: any) {
      console.error('Failed to load splits:', err);
      setError(err?.message || 'Unable to load split receivables.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filter]);

  const handleDelete = async (id: string, friendName: string) => {
    if (!confirm(`Are you sure you want to remove the receivable from ${friendName}?`)) {
      return;
    }
    try {
      await api.deleteSplit(id);
      loadData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete split receivable');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Split Payments & Receivables</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Track money friends owe you. Recoveries credit your bank without inflating your taxable income.
          </p>
        </div>

        {onRecordSplit && (
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={onRecordSplit}
          >
            Record Split Expense
          </Button>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200/60 dark:border-indigo-800/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-800 dark:text-indigo-300">
              Money Owed To You
            </span>
            <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-indigo-900 dark:text-indigo-100 mt-2 tnum">
            {formatPaise(summary?.totalReceivablePaise || 0)}
          </div>
          <span className="text-[11px] text-indigo-700 dark:text-indigo-400 mt-1 block">
            {summary?.pendingCount || 0} active friend dues
          </span>
        </Card>

        <Card className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Total Recovered
            </span>
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-900 dark:text-emerald-100 mt-2 tnum">
            {formatPaise(summary?.totalSettledPaise || 0)}
          </div>
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 block">
            Settled neutral recoveries
          </span>
        </Card>

        <Card className="p-4 bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              WhatsApp Integration
            </span>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Message your WhatsApp bot anytime:
              <br />
              <code className="text-blue-600 dark:text-blue-400 font-mono">"Rahul paid back 1000"</code>
            </p>
          </div>
          <span className="text-[10px] text-slate-400 mt-2">Zero-touch auto-settlement enabled</span>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setFilter('pending')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            filter === 'pending'
              ? 'bg-indigo-600 text-white font-semibold shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Active Receivables ({summary?.pendingCount || 0})
        </button>
        <button
          onClick={() => setFilter('settled')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            filter === 'settled'
              ? 'bg-indigo-600 text-white font-semibold shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Settled History
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            filter === 'all'
              ? 'bg-indigo-600 text-white font-semibold shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          All
        </button>
      </div>

      {/* Receivables Ledger Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
              <tr>
                <th className="py-3 px-4">Friend / Debtor</th>
                <th className="py-3 px-4">Related Expense</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Amount Owed</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center w-28">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
                      <span>Loading friend receivables...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center">
                    <div className="flex flex-col items-center gap-2 max-w-sm mx-auto">
                      <AlertCircle className="w-6 h-6 text-red-500" />
                      <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
                      <Button variant="outline" size="sm" onClick={loadData} className="mt-1">
                        Retry Loading
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : splits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2 max-w-sm mx-auto">
                      <Users className="w-8 h-8 text-slate-400" />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {filter === 'pending'
                          ? 'All Clear! No Pending Friend Dues'
                          : 'No Split Records Found'}
                      </span>
                      <p className="text-xs text-slate-500">
                        {filter === 'pending'
                          ? 'When you pay a bill for a group, toggle "Split with Friends" to track their shares automatically.'
                          : 'Split expenses recorded from the web app or WhatsApp will appear here.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                splits.map((s) => {
                  const outstanding = s.amount_paise - s.settled_amount_paise;
                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[11px] font-bold">
                            {s.friend_name.charAt(0).toUpperCase()}
                          </div>
                          <span>{s.friend_name}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                        <div>
                          <span className="font-medium">{s.transaction_description || 'Group Expense'}</span>
                          {s.notes && (
                            <div className="text-[10px] text-slate-400">{s.notes}</div>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-500 tnum whitespace-nowrap">
                        {s.transaction_date || s.created_at.slice(0, 10)}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className="font-semibold text-slate-900 dark:text-white tnum">
                          {formatPaise(s.amount_paise)}
                        </span>
                        {s.settled_amount_paise > 0 && s.settled_amount_paise < s.amount_paise && (
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                            {formatPaise(s.settled_amount_paise)} paid
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {s.is_settled ? (
                          <Badge variant="success" icon>
                            Settled
                          </Badge>
                        ) : (
                          <Badge variant="warning" icon>
                            Pending
                          </Badge>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {!s.is_settled ? (
                            <Button
                              variant="primary"
                              size="sm"
                              icon={<Check className="w-3 h-3" />}
                              onClick={() => setSettlingSplit(s)}
                              className="text-[11px] py-1 px-2.5 h-7"
                            >
                              Settle
                            </Button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              {s.settled_account_name ? `→ ${s.settled_account_name}` : 'Paid'}
                            </span>
                          )}
                          <button
                            onClick={() => handleDelete(s.id, s.friend_name)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Delete split receivable"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Settle Modal */}
      <SettleSplitModal
        isOpen={!!settlingSplit}
        onClose={() => setSettlingSplit(null)}
        onSuccess={() => {
          loadData();
          if (onRefresh) onRefresh();
        }}
        receivable={settlingSplit}
        accounts={accounts}
      />
    </div>
  );
};

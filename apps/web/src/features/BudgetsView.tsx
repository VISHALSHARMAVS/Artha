import React, { useState, useEffect } from 'react';
import { api, Budget, Category, formatPaise } from '../lib/api.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Modal } from '../components/ui/Modal.js';
import { AmountInput } from '../components/ui/AmountInput.js';
import { CategoryIcon } from '../components/CategoryIcon.js';
import { Plus, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';

interface BudgetsViewProps {
  categories: Category[];
}

export const BudgetsView: React.FC<BudgetsViewProps> = ({ categories }) => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const now = new Date();
  const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthYear);

  // Modal fields
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [limitPaise, setLimitPaise] = useState<number>(1000000);
  const [saving, setSaving] = useState<boolean>(false);

  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE');

  const loadBudgets = async () => {
    setLoading(true);
    try {
      const data = await api.getBudgets(selectedMonth);
      setBudgets(data);
    } catch (err) {
      console.error('Failed to load budgets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBudgets();
  }, [selectedMonth]);

  const handleSetBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || limitPaise <= 0) return;

    setSaving(true);
    try {
      await api.setBudget({
        category_id: selectedCategory,
        month_year: selectedMonth,
        limit_paise: limitPaise,
      });

      setIsModalOpen(false);
      loadBudgets();
    } catch (err: any) {
      alert(err.message || 'Failed to save budget');
    } finally {
      setSaving(false);
    }
  };

  const totalBudgetPaise = budgets.reduce((sum, b) => sum + b.limit_paise, 0);
  const totalSpentPaise = budgets.reduce((sum, b) => sum + (b.spent_paise || 0), 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Category Budgets
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Spending ceilings, real-time burn velocity, and threshold alerts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-9 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 tnum"
          />
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => {
              if (expenseCategories.length > 0) setSelectedCategory(expenseCategories[0].id);
              setIsModalOpen(true);
            }}
          >
            Set Category Cap
          </Button>
        </div>
      </div>

      {/* Aggregate Budget Bar */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
              Monthly Budgeted Expenditure
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-slate-900 dark:text-white tnum">
                {formatPaise(totalSpentPaise, { includeDecimals: false })}
              </span>
              <span className="text-xs text-slate-500">
                of {formatPaise(totalBudgetPaise, { includeDecimals: false })} cap
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-500">Overall Utilization:</span>{' '}
            <strong className="text-sm text-slate-900 dark:text-white tnum ml-1">
              {totalBudgetPaise > 0 ? Math.round((totalSpentPaise / totalBudgetPaise) * 100) : 0}%
            </strong>
          </div>
        </div>

        {/* Global Progress Track */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden mt-3">
          <div
            className={`h-full transition-all duration-300 ${
              totalSpentPaise > totalBudgetPaise
                ? 'bg-red-500'
                : totalSpentPaise >= totalBudgetPaise * 0.85
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{
              width: `${Math.min(100, totalBudgetPaise > 0 ? (totalSpentPaise / totalBudgetPaise) * 100 : 0)}%`,
            }}
          />
        </div>
      </div>

      {/* Categories Budget Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 py-12 text-center text-xs text-slate-400">
            Evaluating category budget performance...
          </div>
        ) : budgets.length === 0 ? (
          <div className="col-span-2 py-12 text-center text-xs text-slate-400">
            No budgets configured for this month. Click "Set Category Cap" to begin.
          </div>
        ) : (
          budgets.map((b) => {
            const ev = b.evaluation;
            const isExceeded = ev.status === 'EXCEEDED';
            const isWarning = ev.status === 'WARNING';

            return (
              <Card key={b.id} padding="md" className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CategoryIcon
                      iconName={b.category_icon}
                      colorHex={b.category_color}
                      size="sm"
                    />
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {b.category_name}
                      </h3>
                      <div className="text-xs text-slate-500">
                        Cap: <strong className="tnum font-medium text-slate-700 dark:text-slate-300">{formatPaise(b.limit_paise, { includeDecimals: false })}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-xs font-bold tnum ${
                        isExceeded
                          ? 'text-red-600 dark:text-red-400'
                          : isWarning
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {ev.utilizationPercent}%
                    </span>
                  </div>
                </div>

                {/* Bar */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isExceeded
                        ? 'bg-red-500'
                        : isWarning
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, ev.utilizationPercent)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500">
                  <span className="tnum">
                    Spent: <strong>{formatPaise(b.spent_paise || 0, { includeDecimals: false })}</strong>
                  </span>
                  <span>{ev.statusMessage}</span>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Set Budget Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Set Category Monthly Cap"
        description="Define a spending threshold for the selected category."
        maxWidth="md"
      >
        <form onSubmit={handleSetBudget} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Select Expense Category <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <AmountInput
              label="Monthly Ceiling Limit"
              valuePaise={limitPaise}
              onChangePaise={setLimitPaise}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="outline" size="md" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" loading={saving}>
              Save Budget Cap
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

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
  const [formError, setFormError] = useState<string | null>(null);

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
    setFormError(null);
    try {
      await api.setBudget({
        category_id: selectedCategory,
        month_year: selectedMonth,
        limit_paise: limitPaise,
      });

      setIsModalOpen(false);
      loadBudgets();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save budget cap. Please try again.');
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
          <h1 className="heading-4 sm:heading-3 tracking-tight hero-heading-light dark:hero-heading-dark">
            Category budgets
          </h1>
          <p className="caption-1 text-slate-500 dark:text-slate-400 mt-0.5">
            Spending ceilings, real-time burn velocity, and threshold alerts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-9 px-3 bg-white dark:bg-[#1F1F1F] border border-slate-300 dark:border-[#313131] rounded-md caption-4 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 tnum"
          />
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => {
              if (expenseCategories.length > 0) setSelectedCategory(expenseCategories[0].id);
              setFormError(null);
              setIsModalOpen(true);
            }}
          >
            Set category cap
          </Button>
        </div>
      </div>

      {/* Aggregate Budget Bar */}
      <div className="p-5 bg-white dark:bg-[#1F1F1F] border border-slate-200 dark:border-[#313131] rounded-lg shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-[#313131]">
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
          <div className="col-span-2 p-8 sm:p-10 text-center rounded-xl border border-dashed border-slate-200 dark:border-[#313131] bg-white dark:bg-[#1F1F1F] shadow-sm space-y-4">
            <div className="w-12 h-12 mx-auto rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Zero-Based Envelope Budgeting
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Give every rupee a job before the month starts. Establish discretionary caps for Groceries, Dining, Shopping, and Entertainment to control burn velocity and prevent month-end cash flow deficits.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => {
                if (expenseCategories.length > 0) setSelectedCategory(expenseCategories[0].id);
                setIsModalOpen(true);
              }}
            >
              Set First Category Cap
            </Button>
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
        title="Set category monthly cap"
        description="Define a spending threshold for the selected category."
        maxWidth="md"
      >
        <form onSubmit={handleSetBudget} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-lg caption-4 text-red-700 dark:text-red-300">
              {formError}
            </div>
          )}
          <div>
            <label className="block caption-4 text-slate-700 dark:text-slate-300 mb-1">
              Select expense category <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-10 px-3 bg-white dark:bg-[#1F1F1F] border border-slate-300 dark:border-[#313131] rounded-md text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
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
              label="Monthly ceiling limit"
              valuePaise={limitPaise}
              onChangePaise={setLimitPaise}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-[#313131]">
            <Button variant="outline" size="md" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" loading={saving}>
              Save budget cap
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { api, formatPaise, DashboardOverview } from '../lib/api.js';
import { Card } from '../components/ui/Card.js';
import { CategoryIcon } from '../components/CategoryIcon.js';
import { LineChart, ArrowUpRight, ArrowDownLeft, ShieldCheck, PieChart, Layers } from 'lucide-react';

interface ReportsViewProps {
  overview: DashboardOverview | null;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ overview }) => {
  const [cashFlow, setCashFlow] = useState<Array<{
    monthYear: string;
    monthLabel: string;
    incomePaise: number;
    expensePaise: number;
    netSavingsPaise: number;
  }>>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<Array<{
    categoryId: string;
    categoryName: string;
    iconName: string;
    colorHex: string;
    totalPaise: number;
    percentage: number;
    transactionCount?: number;
  }>>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadReports = async () => {
      setLoading(true);
      try {
        const [cfData, catData] = await Promise.all([
          api.getCashFlowHistory(6),
          api.getCategoryBreakdown(),
        ]);
        setCashFlow(cfData);
        setCategoryBreakdown(catData);
      } catch (err) {
        console.error('Failed to load reports:', err);
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, []);

  const netWorth = overview?.net_worth;
  const hasNetWorth = netWorth && (netWorth.total_assets_paise > 0 || netWorth.total_liabilities_paise > 0 || netWorth.net_worth_paise !== 0);
  const hasAnyCashFlow = cashFlow.some((cf) => cf.incomePaise > 0 || cf.expensePaise > 0);
  const maxFlow = Math.max(
    ...cashFlow.map((cf) => Math.max(cf.incomePaise, cf.expensePaise)),
    10000000
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div>
        <h1 className="heading-4 sm:heading-3 tracking-tight text-slate-900 dark:text-white">
          Net worth and financial analytics
        </h1>
        <p className="caption-1 text-slate-500 dark:text-slate-400 mt-0.5">
          Deterministic cash flow telemetry, asset distribution, and historical balance sheets.
        </p>
      </div>

      {/* Net Worth Hero Strip */}
      {hasNetWorth ? (
        <div className="p-6 bg-slate-900 dark:bg-[#1F1F1F] text-white border border-slate-800 dark:border-[#313131] rounded-xl shadow-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="caption-5 uppercase font-semibold text-slate-400 tracking-wider">
                Consolidated institutional net worth
              </span>
              <div className="heading-3 tnum tracking-tight mt-1">
                {formatPaise(netWorth.net_worth_paise, { includeDecimals: false })}
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <span className="caption-5 text-slate-400 uppercase">Total assets</span>
                <div className="title-3 text-emerald-400 tnum">
                  +{formatPaise(netWorth.total_assets_paise, { includeDecimals: false })}
                </div>
              </div>
              <div className="text-right">
                <span className="caption-5 text-slate-400 uppercase">Total liabilities</span>
                <div className="title-3 text-red-400 tnum">
                  -{formatPaise(netWorth.total_liabilities_paise, { includeDecimals: false })}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 bg-white dark:bg-[#1F1F1F] border border-slate-200 dark:border-[#313131] rounded-xl shadow-card text-center space-y-2">
          <Layers className="w-8 h-8 mx-auto text-blue-500" />
          <h3 className="title-4 text-slate-900 dark:text-white">
            Consolidated balance sheet
          </h3>
          <p className="caption-2 text-slate-500 max-w-md mx-auto">
            Connect bank accounts, credit cards, or register investments to calculate your consolidated assets, liabilities, and true institutional net worth.
          </p>
        </div>
      )}

      {/* Real Cash Flow Inflow vs Outflow Histogram */}
      <div className="p-6 bg-white dark:bg-[#1F1F1F] border border-slate-200 dark:border-[#313131] rounded-xl shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="title-4 text-slate-900 dark:text-white flex items-center gap-2">
              <LineChart className="w-4 h-4 text-blue-600" />
              Cash flow telemetry (last 6 months)
            </h2>
            <p className="caption-2 text-slate-500">Realized monthly inflow vs outflow</p>
          </div>
          <div className="flex items-center gap-4 caption-4">
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" /> Inflow
            </span>
            <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
              <span className="w-2.5 h-2.5 bg-red-500 rounded-sm" /> Outflow
            </span>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center caption-2 text-slate-400">
            Calculating historical cash flow telemetry...
          </div>
        ) : !hasAnyCashFlow ? (
          <div className="py-12 text-center space-y-2">
            <LineChart className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
            <div className="title-5 text-slate-700 dark:text-slate-300">
              No cash flow telemetry yet
            </div>
            <p className="caption-5 text-slate-500 max-w-sm mx-auto">
              Record salary credits, recurring bills, or daily living expenses to plot monthly inflow vs outflow trends and net savings velocity across trailing months.
            </p>
          </div>
        ) : (
          <div className="pt-4 grid grid-cols-6 gap-2 sm:gap-4 items-end h-48 border-b border-slate-200 dark:border-[#313131] pb-2">
            {cashFlow.map((cf) => {
              const incomeHeight = cf.incomePaise > 0 ? Math.max(4, (cf.incomePaise / maxFlow) * 100) : 0;
              const expenseHeight = cf.expensePaise > 0 ? Math.max(4, (cf.expensePaise / maxFlow) * 100) : 0;

              return (
                <div key={cf.monthYear} className="flex flex-col items-center h-full justify-end group">
                  <div className="flex items-end gap-1 sm:gap-2 w-full justify-center h-36">
                    {/* Inflow bar */}
                    <div
                      className="w-1/2 max-w-[20px] bg-emerald-500/90 hover:bg-emerald-600 rounded-t transition-all relative group-hover:opacity-100"
                      style={{ height: `${incomeHeight}%` }}
                      title={`Inflow: ${formatPaise(cf.incomePaise)}`}
                    />
                    {/* Outflow bar */}
                    <div
                      className="w-1/2 max-w-[20px] bg-red-500/90 hover:bg-red-600 rounded-t transition-all relative group-hover:opacity-100"
                      style={{ height: `${expenseHeight}%` }}
                      title={`Outflow: ${formatPaise(cf.expensePaise)}`}
                    />
                  </div>
                  <span className="caption-5 text-slate-500 mt-2 truncate">
                    {cf.monthLabel}
                  </span>
                  <span className="caption-5 text-slate-400 tnum hidden sm:block">
                    {formatPaise(cf.netSavingsPaise, { includeDecimals: false, compact: true })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Category Spending Breakdown */}
      <div className="p-6 bg-white dark:bg-[#1F1F1F] border border-slate-200 dark:border-[#313131] rounded-xl shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="title-4 text-slate-900 dark:text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-blue-600" />
              Category expenditure distribution
            </h2>
            <p className="caption-2 text-slate-500">Realized monthly spending classified by sector.</p>
          </div>
        </div>

        <div className="space-y-3">
          {categoryBreakdown.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <PieChart className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-700" />
              <div className="title-5 text-slate-700 dark:text-slate-300">
                No category expenses this month
              </div>
              <p className="caption-5 text-slate-500 max-w-xs mx-auto">
                Categorized expenses (food, transit, utilities, etc.) will automatically generate your sector distribution profile here.
              </p>
            </div>
          ) : (
            categoryBreakdown.map((cat) => (
              <div key={cat.categoryId} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CategoryIcon
                      iconName={cat.iconName}
                      colorHex={cat.colorHex}
                      size="sm"
                    />
                    <span className="title-5 text-slate-900 dark:text-white">
                      {cat.categoryName}
                    </span>
                    <span className="text-slate-400 caption-5">
                      ({cat.transactionCount} transactions)
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="title-5 text-slate-900 dark:text-white tnum mr-2">
                      {formatPaise(cat.totalPaise, { includeDecimals: false })}
                    </span>
                    <span className="text-slate-500 caption-4 tnum">
                      {cat.percentage}%
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-100 dark:bg-[#272727] h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${cat.percentage}%`,
                      backgroundColor: cat.colorHex || '#2563EB',
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

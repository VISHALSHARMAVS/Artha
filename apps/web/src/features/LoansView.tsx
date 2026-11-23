import React, { useState, useEffect, useMemo } from 'react';
import { api, Loan, Account, formatPaise, AmortizationRow } from '../lib/api.js';
import { LoanCalculator } from '@artha/domain';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Modal } from '../components/ui/Modal.js';
import { AmountInput } from '../components/ui/AmountInput.js';
import {
  Landmark,
  Calendar,
  Percent,
  Plus,
  Table as TableIcon,
  PartyPopper,
  Sparkles,
  Zap,
  TrendingDown,
  Clock,
  ShieldCheck,
} from 'lucide-react';

interface LoansViewProps {
  accounts: Account[];
}

export const LoansView: React.FC<LoansViewProps> = ({ accounts }) => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Dave Ramsey Debt Freedom State
  const [freedomSummary, setFreedomSummary] = useState<{
    isDebtFree: boolean;
    totalOutstandingPaise: number;
    totalMonthlyEmiPaise: number;
    longestRemainingMonths: number;
    freedomDate: string;
    formattedFreedomDate: string;
    yearsRemaining?: number;
    activeLoansCount: number;
  } | null>(null);

  // Prepayment Accelerator state
  const [extraPrepaymentPaise, setExtraPrepaymentPaise] = useState<number>(250000); // ₹2,500/mo extra
  const [acceleratorResult, setAcceleratorResult] = useState<{
    monthsSaved: number;
    interestSavedPaise: number;
    acceleratedTenureMonths: number;
  } | null>(null);

  // Selected schedule view modal
  const [selectedSchedule, setSelectedSchedule] = useState<{
    loanName: string;
    rows: AmortizationRow[];
  } | null>(null);

  // Interactive Live Calculator state
  const [calcPrincipalPaise, setCalcPrincipalPaise] = useState<number>(300000000); // ₹30,00,000
  const [calcRate, setCalcRate] = useState<number>(8.5);
  const [calcTenureMonths, setCalcTenureMonths] = useState<number>(180); // 15 years

  // Synchronous client-side calculation using LoanCalculator (pure reducing-balance algorithm)
  const calcResult = useMemo(() => {
    const P = Math.max(0, calcPrincipalPaise || 0);
    const r = Math.max(0, calcRate || 0);
    const n = Math.max(1, calcTenureMonths || 1);
    return LoanCalculator.generateSchedule({
      principalPaise: P,
      annualInterestRatePercent: r,
      tenureMonths: n,
    });
  }, [calcPrincipalPaise, calcRate, calcTenureMonths]);

  // Create Loan Modal fields
  const [loanName, setLoanName] = useState<string>('');
  const [lenderName, setLenderName] = useState<string>('');
  const [principalPaise, setPrincipalPaise] = useState<number>(250000000);
  const [rate, setRate] = useState<number>(8.4);
  const [tenureMonths, setTenureMonths] = useState<number>(120);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [accountId, setAccountId] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const loadLoans = async () => {
    setLoading(true);
    try {
      const [data, summary] = await Promise.all([
        api.getLoans(),
        api.getDebtFreedomSummary().catch(() => null),
      ]);
      setLoans(data);
      if (summary) setFreedomSummary(summary);
    } catch (err) {
      console.error('Failed to load loans:', err);
    } finally {
      setLoading(false);
    }
  };

  // Run prepayment accelerator simulation on active loans
  useEffect(() => {
    if (loans.length > 0 && extraPrepaymentPaise > 0) {
      const largestLoan = [...loans].sort(
        (a, b) => b.current_outstanding_paise - a.current_outstanding_paise
      )[0];
      if (largestLoan) {
        api.simulatePrepayment({
          loan_id: largestLoan.id,
          extra_monthly_paise: extraPrepaymentPaise,
        })
          .then((res) => {
            setAcceleratorResult(res);
          })
          .catch(() => {});
      }
    }
  }, [loans, extraPrepaymentPaise]);

  useEffect(() => {
    loadLoans();
    if (accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
  }, [accounts]);

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanName.trim() || !lenderName.trim()) return;

    setSaving(true);
    try {
      await api.createLoan({
        loan_name: loanName.trim(),
        lender_name: lenderName.trim(),
        original_principal_paise: principalPaise,
        annual_interest_rate: rate,
        tenure_months: tenureMonths,
        start_date: startDate,
        account_id: accountId || undefined,
      });

      setIsModalOpen(false);
      loadLoans();
    } catch (err: any) {
      alert(err.message || 'Failed to register loan');
    } finally {
      setSaving(false);
    }
  };

  const openScheduleForLoan = async (loan: Loan) => {
    try {
      const schedule = await api.getLoanSchedule(loan.id);
      setSelectedSchedule({
        loanName: `${loan.lender_name} — ${loan.loan_name}`,
        rows: schedule.amortizationSchedule,
      });
    } catch (err: any) {
      alert(err.message || 'Failed to fetch schedule');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Loans & Debt Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Reducing-balance amortizations, EMI schedules, and debt obligations.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => setIsModalOpen(true)}
        >
          Register Active Loan
        </Button>
      </div>

      {/* DAVE RAMSEY DEBT FREEDOM COUNTDOWN & ACCELERATOR */}
      {freedomSummary && (
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-card space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-bold tracking-wider uppercase text-emerald-400">
                  Dave Ramsey Debt-Freedom Engine
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                {freedomSummary.isDebtFree
                  ? '🎉 You Are 100% Debt Free!'
                  : `Projected Debt Freedom: ${freedomSummary.formattedFreedomDate}`}
              </h2>
              <p className="text-xs text-slate-300 max-w-xl">
                {freedomSummary.isDebtFree
                  ? 'Zero active loan liabilities. Every rupee you earn stays in your pocket to build multi-generational wealth.'
                  : `At your current EMI pace, all ${freedomSummary.activeLoansCount} loan facilities will be fully extinguished in ${freedomSummary.longestRemainingMonths} months.`}
              </p>
            </div>

            {!freedomSummary.isDebtFree && (
              <div className="flex items-baseline gap-6 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-700">
                <div>
                  <div className="text-[10px] uppercase font-medium text-slate-400 tracking-wider">
                    Total Outstanding Debt
                  </div>
                  <div className="text-xl font-bold tnum text-white">
                    {formatPaise(freedomSummary.totalOutstandingPaise, { includeDecimals: false })}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-medium text-slate-400 tracking-wider">
                    Total Monthly EMI
                  </div>
                  <div className="text-xl font-bold tnum text-red-400">
                    {formatPaise(freedomSummary.totalMonthlyEmiPaise, { includeDecimals: false })}
                    <span className="text-xs font-normal text-slate-400">/mo</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Prepayment Accelerator Simulator */}
          {!freedomSummary.isDebtFree && loans.length > 0 && (
            <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-800/40 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="font-semibold text-white">Prepayment Accelerator: </span>
                  <span className="text-slate-300">
                    Pay an extra{' '}
                    <strong className="text-amber-300">
                      {formatPaise(extraPrepaymentPaise, { includeDecimals: false })}/mo
                    </strong>{' '}
                    towards principal.
                  </span>
                </div>
              </div>

              {acceleratorResult && acceleratorResult.monthsSaved > 0 && (
                <div className="flex items-center gap-2 text-emerald-300 font-medium">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    Frees you <strong>{acceleratorResult.monthsSaved} months sooner</strong> & saves{' '}
                    <strong>{formatPaise(acceleratorResult.interestSavedPaise, { includeDecimals: false })}</strong> in interest!
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Active Loans Section */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
          Active Loan Facilities
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            <div className="col-span-2 py-8 text-center text-xs text-slate-400">
              Loading loan profiles...
            </div>
          ) : loans.length === 0 ? (
            <div className="col-span-2 p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 space-y-3">
              <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center">
                <Landmark className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  No Active Loans Registered
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Register your existing home loans, vehicle loans, or EMIs to track debt-free dates, amortization, and interest-saving prepayment options. You can still test any scenario in the simulator below.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => setIsModalOpen(true)}
              >
                Register Existing Loan
              </Button>
            </div>
          ) : (
            loans.map((loan) => (
              <Card key={loan.id} padding="md" className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-md bg-red-50 dark:bg-red-950/40 text-red-600 border border-red-200 dark:border-red-900/50 flex items-center justify-center shrink-0">
                      <Landmark className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {loan.loan_name}
                      </h3>
                      <div className="text-xs text-slate-500">
                        {loan.lender_name} • {loan.annual_interest_rate}% p.a.
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => openScheduleForLoan(loan)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    <span>Amortization</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                      Outstanding Balance
                    </span>
                    <div className="text-lg font-bold text-red-600 dark:text-red-400 tnum">
                      {formatPaise(loan.current_outstanding_paise, { includeDecimals: false })}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                      Monthly EMI
                    </span>
                    <div className="text-lg font-bold text-slate-900 dark:text-white tnum">
                      {formatPaise(loan.emi_amount_paise)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>Tenure Remaining: <strong>{loan.remaining_months} of {loan.tenure_months} months</strong></span>
                  <span>Start: {loan.start_date}</span>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Interactive Reducing-Balance EMI Simulator */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-card space-y-5">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Precision EMI & Amortization Simulator
          </h2>
          <p className="text-xs text-slate-500">
            Real-time reducing balance financial engine with deterministic integer paise amortization.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <AmountInput
              label="Principal Loan Amount"
              valuePaise={calcPrincipalPaise}
              onChangePaise={setCalcPrincipalPaise}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
              <Percent className="w-3.5 h-3.5 text-slate-400" /> Annual Interest Rate (%)
            </label>
            <input
              type="number"
              step="0.05"
              min="1"
              max="30"
              value={calcRate}
              onChange={(e) => setCalcRate(parseFloat(e.target.value) || 0)}
              className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 tnum"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Tenure in Months
            </label>
            <input
              type="number"
              step="12"
              min="6"
              max="360"
              value={calcTenureMonths}
              onChange={(e) => setCalcTenureMonths(parseInt(e.target.value, 10) || 12)}
              className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 tnum"
            />
            <span className="text-[10px] text-slate-400">
              ({(calcTenureMonths / 12).toFixed(1)} years)
            </span>
          </div>
        </div>

        {/* Calculated Simulation Telemetry */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700/60 pb-3">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Amortization Telemetry (Reducing-Balance)
            </span>
            <Button
              variant="outline"
              size="sm"
              icon={<TableIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
              onClick={() => {
                setSelectedSchedule({
                  loanName: `Simulated ₹${(calcPrincipalPaise / 10000000).toFixed(2)}L @ ${calcRate}% (${calcTenureMonths}m)`,
                  rows: calcResult.amortizationSchedule,
                });
              }}
            >
              View Full Amortization Table
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Calculated Monthly EMI</span>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 tnum mt-0.5">
                {formatPaise(calcResult.monthlyEmiPaise)}
              </div>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Interest Payable</span>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 tnum mt-0.5">
                {formatPaise(calcResult.totalInterestPaise, { includeDecimals: false })}
              </div>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Repayment (Principal + Interest)</span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white tnum mt-0.5">
                {formatPaise(calcResult.totalAmountPayablePaise, { includeDecimals: false })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-200/60 dark:border-slate-700/60">
            <div>
              <span className="text-slate-400 text-[11px] block">Principal Amount</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 tnum">
                {formatPaise(calcPrincipalPaise, { includeDecimals: false })}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Annual Interest Rate</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 tnum">
                {calcRate}% p.a. ({((calcRate / 12)).toFixed(3)}% monthly)
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Loan Tenure</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 tnum">
                {calcTenureMonths} instalments ({(calcTenureMonths / 12).toFixed(1)} years)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Amortization Schedule Modal */}
      {selectedSchedule && (
        <Modal
          isOpen={!!selectedSchedule}
          onClose={() => setSelectedSchedule(null)}
          title={`Amortization Schedule: ${selectedSchedule.loanName}`}
          description="Month-by-month principal and interest breakdown."
          maxWidth="xl"
        >
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 font-medium text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="py-2.5 px-3">Month</th>
                  <th className="py-2.5 px-3 text-right">Payment</th>
                  <th className="py-2.5 px-3 text-right">Principal</th>
                  <th className="py-2.5 px-3 text-right">Interest</th>
                  <th className="py-2.5 px-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {selectedSchedule.rows.slice(0, 48).map((row) => (
                  <tr key={row.month} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2 px-3 font-medium text-slate-500 tnum">#{row.month}</td>
                    <td className="py-2 px-3 text-right tnum">{formatPaise(row.paymentPaise)}</td>
                    <td className="py-2 px-3 text-right tnum text-emerald-600 dark:text-emerald-400">
                      {formatPaise(row.principalPaise)}
                    </td>
                    <td className="py-2 px-3 text-right tnum text-red-500 dark:text-red-400">
                      {formatPaise(row.interestPaise)}
                    </td>
                    <td className="py-2 px-3 text-right font-medium tnum">
                      {formatPaise(row.remainingPrincipalPaise, { includeDecimals: false })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pt-3 text-[11px] text-slate-400 text-right">
            Displaying first 48 months of tenure schedule.
          </div>
        </Modal>
      )}

      {/* Register Loan Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register Active Loan Facility"
        description="Adding a loan automatically configures a recurring EMI obligation in Safe-to-Spend."
        maxWidth="md"
      >
        <form onSubmit={handleCreateLoan} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Loan Facility Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={loanName}
                onChange={(e) => setLoanName(e.target.value)}
                placeholder="e.g. Home Loan, Car Loan"
                className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Lending Institution <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={lenderName}
                onChange={(e) => setLenderName(e.target.value)}
                placeholder="e.g. HDFC Ltd, SBI, ICICI"
                className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>
          </div>

          <div>
            <AmountInput
              label="Original Principal Borrowed"
              valuePaise={principalPaise}
              onChangePaise={setPrincipalPaise}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Annual Interest Rate (%)
              </label>
              <input
                type="number"
                step="0.05"
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white tnum"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tenure (Months)
              </label>
              <input
                type="number"
                value={tenureMonths}
                onChange={(e) => setTenureMonths(parseInt(e.target.value, 10) || 12)}
                className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white tnum"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Account Linked for Auto-EMI Deduction
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-white"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.institution_name})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="outline" size="md" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" loading={saving}>
              Register Loan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

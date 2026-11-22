import React, { useState } from 'react';
import { Modal } from './ui/Modal.js';
import { Button } from './ui/Button.js';
import { AmountInput } from './ui/AmountInput.js';
import { api } from '../lib/api.js';
import { ShieldCheck, ArrowRight, ArrowLeft, CheckCircle2, Plus, Trash2 } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Profile & Primary Account
  const [fullName, setFullName] = useState<string>('Priya Nair');
  const [email, setEmail] = useState<string>('priya@finora.internal');
  const [accountName, setAccountName] = useState<string>('HDFC Salary Account');
  const [accountType, setAccountType] = useState<string>('SAVINGS');
  const [initialBalancePaise, setInitialBalancePaise] = useState<number>(12000000); // ₹1,20,000

  // Step 2: Salary Profile
  const [employerName, setEmployerName] = useState<string>('Freshworks Inc');
  const [salaryPaise, setSalaryPaise] = useState<number>(17500000); // ₹1,75,000
  const [payDay, setPayDay] = useState<number>(1);
  const [emergencyBufferPaise, setEmergencyBufferPaise] = useState<number>(10000000); // ₹1,00,000

  // Step 3: Monthly Obligations
  const [obligations, setObligations] = useState<Array<{ title: string; amountPaise: number; dueDay: number }>>([
    { title: 'Apartment Rent', amountPaise: 3500000, dueDay: 5 },
    { title: 'Bescom Electricity', amountPaise: 250000, dueDay: 15 },
  ]);

  const addObligation = () => {
    setObligations([...obligations, { title: 'New Obligation', amountPaise: 100000, dueDay: 10 }]);
  };

  const removeObligation = (index: number) => {
    setObligations(obligations.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.submitOnboarding({
        full_name: fullName,
        email,
        account: {
          name: accountName,
          account_type: accountType,
          initial_balance_paise: initialBalancePaise,
        },
        salary_profile: {
          employer_name: employerName,
          net_monthly_salary_paise: salaryPaise,
          pay_day_of_month: payDay,
          emergency_fund_target_paise: emergencyBufferPaise,
        },
        obligations: obligations.map((o) => ({
          title: o.title,
          amount_paise: o.amountPaise,
          due_day_of_month: o.dueDay,
        })),
      });

      onComplete();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to complete onboarding');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Welcome to Finora"
      description="Journey A — High-precision financial onboarding in 3 simple steps."
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Step Indicator */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center font-medium ${
                step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
              }`}
            >
              1
            </span>
            <span className={step === 1 ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-500'}>
              Account Setup
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center font-medium ${
                step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
              }`}
            >
              2
            </span>
            <span className={step === 2 ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-500'}>
              Salary & Inflow
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center font-medium ${
                step >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
              }`}
            >
              3
            </span>
            <span className={step === 3 ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-500'}>
              Obligations
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-md border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-semibold uppercase text-slate-500 mb-2">Primary Bank Account</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Account Name
                  </label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Account Type
                  </label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value)}
                    className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white"
                  >
                    <option value="SAVINGS">Savings Account</option>
                    <option value="CHECKING">Checking Account</option>
                    <option value="CASH">Cash Reserve</option>
                  </select>
                </div>
              </div>
              <div className="mt-3">
                <AmountInput
                  label="Current Liquid Balance"
                  valuePaise={initialBalancePaise}
                  onChangePaise={setInitialBalancePaise}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Employer / Organization
              </label>
              <input
                type="text"
                value={employerName}
                onChange={(e) => setEmployerName(e.target.value)}
                className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <AmountInput
                  label="Monthly Net Take-Home Salary"
                  valuePaise={salaryPaise}
                  onChangePaise={setSalaryPaise}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Salary Pay Day
                </label>
                <select
                  value={payDay}
                  onChange={(e) => setPayDay(Number(e.target.value))}
                  className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {d}th of the month
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <AmountInput
                label="Emergency Reserve Buffer (Untouchable Target)"
                valuePaise={emergencyBufferPaise}
                onChangePaise={setEmergencyBufferPaise}
              />
              <p className="text-xs text-slate-500 mt-1">
                Finora protects this buffer from being spent when calculating your daily Safe-to-Spend velocity.
              </p>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Monthly bills, EMIs, or commitments to deduct from liquid cash.
              </span>
              <Button variant="outline" size="sm" type="button" icon={<Plus className="w-3.5 h-3.5" />} onClick={addObligation}>
                Add Item
              </Button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {obligations.map((obl, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-md border border-slate-200 dark:border-slate-700">
                  <input
                    type="text"
                    value={obl.title}
                    onChange={(e) => {
                      const updated = [...obligations];
                      updated[idx].title = e.target.value;
                      setObligations(updated);
                    }}
                    className="flex-1 h-8 px-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
                    placeholder="Title"
                  />
                  <div className="w-32">
                    <AmountInput
                      size="sm"
                      valuePaise={obl.amountPaise}
                      onChangePaise={(val) => {
                        const updated = [...obligations];
                        updated[idx].amountPaise = val;
                        setObligations(updated);
                      }}
                    />
                  </div>
                  <select
                    value={obl.dueDay}
                    onChange={(e) => {
                      const updated = [...obligations];
                      updated[idx].dueDay = Number(e.target.value);
                      setObligations(updated);
                    }}
                    className="h-8 px-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>Day {d}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeObligation(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
          {step > 1 ? (
            <Button
              variant="outline"
              size="md"
              type="button"
              icon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => setStep(step - 1)}
            >
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <Button
              variant="primary"
              size="md"
              type="button"
              icon={<ArrowRight className="w-4 h-4" />}
              onClick={() => setStep(step + 1)}
            >
              Next Step
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="md"
              type="button"
              loading={loading}
              icon={<CheckCircle2 className="w-4 h-4" />}
              onClick={handleSubmit}
            >
              Complete Setup & Open Finora
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal.js';
import { Button } from './ui/Button.js';
import { AmountInput } from './ui/AmountInput.js';
import { api, AuthUser } from '../lib/api.js';
import { ShieldCheck, ArrowRight, ArrowLeft, CheckCircle2, Plus, Trash2 } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  currentUser?: AuthUser | null;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  currentUser,
}) => {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Profile & Primary Account
  const [fullName, setFullName] = useState<string>(currentUser?.full_name || '');
  const [email, setEmail] = useState<string>(currentUser?.email || '');
  const [accountName, setAccountName] = useState<string>('');
  const [accountType, setAccountType] = useState<string>('SAVINGS');
  const [initialBalancePaise, setInitialBalancePaise] = useState<number>(0);

  // Keep synced with currently logged in user
  useEffect(() => {
    if (currentUser) {
      if (currentUser.full_name) setFullName(currentUser.full_name);
      if (currentUser.email) setEmail(currentUser.email);
    }
  }, [currentUser, isOpen]);

  // Step 2: Salary Profile
  const [employerName, setEmployerName] = useState<string>('');
  const [salaryPaise, setSalaryPaise] = useState<number>(0);
  const [payDay, setPayDay] = useState<number>(1);
  const [emergencyBufferPaise, setEmergencyBufferPaise] = useState<number>(0);

  // Step 3: Monthly Obligations
  const [obligations, setObligations] = useState<Array<{ title: string; amountPaise: number; dueDay: number }>>([]);

  const addObligation = () => {
    setObligations([...obligations, { title: '', amountPaise: 0, dueDay: 1 }]);
  };

  const removeObligation = (index: number) => {
    setObligations(obligations.filter((_, i) => i !== index));
  };

  const handleNextStep = () => {
    setError(null);
    if (step === 1) {
      if (!accountName.trim()) {
        setError('Please enter your primary account name (e.g. Salary Account, SBI Savings).');
        return;
      }
      if (initialBalancePaise < 0) {
        setError('Initial balance cannot be negative.');
        return;
      }
    } else if (step === 2) {
      if (salaryPaise < 0) {
        setError('Salary amount cannot be negative.');
        return;
      }
      if (emergencyBufferPaise < 0) {
        setError('Emergency reserve target cannot be negative.');
        return;
      }
    }
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    setError(null);
    if (!accountName.trim()) {
      setStep(1);
      setError('Primary account name is required.');
      return;
    }

    const validObligations = obligations.filter(
      (o) => o.title.trim().length > 0 && o.amountPaise > 0
    );

    setLoading(true);
    try {
      await api.submitOnboarding({
        full_name: fullName.trim() || undefined,
        email: email.trim() || undefined,
        account: {
          name: accountName.trim(),
          account_type: accountType,
          initial_balance_paise: initialBalancePaise,
        },
        salary_profile: {
          employer_name: employerName.trim() || 'Primary Source',
          net_monthly_salary_paise: salaryPaise,
          pay_day_of_month: payDay,
          emergency_fund_target_paise: emergencyBufferPaise,
        },
        obligations: validObligations.map((o) => ({
          title: o.title.trim(),
          amount_paise: o.amountPaise,
          due_day_of_month: o.dueDay,
        })),
      });

      if (currentUser?.id) {
        localStorage.setItem(`artha_onboarded_${currentUser.id}`, 'true');
      } else {
        localStorage.setItem('artha_onboarded_guest', 'true');
      }

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
      title="Welcome to Artha"
      description="Journey A — High-precision financial onboarding in 3 simple steps."
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Step Indicator */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#313131] text-xs">
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
                  placeholder="e.g. Aryan Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-10 px-3 bg-white dark:bg-[#1F1F1F] border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="aryan@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 px-3 bg-white dark:bg-[#1F1F1F] border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-[#313131]">
              <h4 className="text-xs font-semibold uppercase text-slate-500 mb-2">Primary Bank Account</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Account Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC Salary Account"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="w-full h-10 px-3 bg-white dark:bg-[#1F1F1F] border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Account Type
                  </label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value)}
                    className="w-full h-10 px-3 bg-white dark:bg-[#1F1F1F] border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
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
                placeholder="e.g. Google India Pvt Ltd"
                value={employerName}
                onChange={(e) => setEmployerName(e.target.value)}
                className="w-full h-10 px-3 bg-white dark:bg-[#1F1F1F] border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
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
                  className="w-full h-10 px-3 bg-white dark:bg-[#1F1F1F] border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white"
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
                Artha protects this buffer from being spent when calculating your daily Safe-to-Spend velocity.
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

            {obligations.length === 0 ? (
              <div className="py-6 px-4 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-500 space-y-1">
                <p className="font-medium text-slate-700 dark:text-slate-300">No recurring monthly commitments added</p>
                <p className="text-[11px] text-slate-400">Click "+ Add Item" above to add fixed monthly rent, EMIs, or utility commitments to protect them from daily spending.</p>
              </div>
            ) : (
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
                      className="flex-1 h-8 px-2.5 text-xs bg-white dark:bg-[#1F1F1F] border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-600"
                      placeholder="e.g. Rent, Electricity, SIP"
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
                      className="h-8 px-2 text-xs bg-white dark:bg-[#1F1F1F] border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-600"
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
            )}
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-[#313131]">
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
              onClick={handleNextStep}
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
              Complete Setup & Open Artha
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

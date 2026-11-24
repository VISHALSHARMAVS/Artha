import React, { useState } from 'react';
import { Modal } from './ui/Modal.js';
import { Button } from './ui/Button.js';
import { api, Account, Category, CandidateStatementTransaction, formatPaise } from '../lib/api.js';
import {
  Upload,
  FileText,
  Lock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Landmark,
  CheckSquare,
  Square,
  Filter,
} from 'lucide-react';

interface ImportStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: Account[];
  categories: Category[];
}

export const ImportStatementModal: React.FC<ImportStatementModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  accounts,
  categories,
}) => {
  const [step, setStep] = useState<'UPLOAD' | 'REVIEW'>('UPLOAD');
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState<string>('');
  const [parsing, setParsing] = useState<boolean>(false);
  const [importing, setImporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Parsed candidates
  const [candidates, setCandidates] = useState<CandidateStatementTransaction[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      if (!f.name.toLowerCase().endsWith('.pdf')) {
        setError('Please select a valid PDF bank statement file.');
        return;
      }
      setFile(f);
      setError(null);
    }
  };

  const handleParse = async () => {
    if (!file) {
      setError('Please select a PDF file first.');
      return;
    }
    if (!selectedAccountId) {
      setError('Please select the bank account to import into.');
      return;
    }

    setParsing(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const res = await api.parseStatementPdf({
            file_base64: base64Data,
            file_name: file.name,
            password: password.trim() || undefined,
            account_id: selectedAccountId,
          });

          if (!res.candidates || res.candidates.length === 0) {
            setError(
              'No tabular transactions could be extracted from this PDF. Please verify this is a valid bank statement with date and amount columns.'
            );
            return;
          }

          setCandidates(res.candidates);
          setStep('REVIEW');
        } catch (err: any) {
          setError(err.message || 'Failed to parse PDF statement.');
        } finally {
          setParsing(false);
        }
      };

      reader.onerror = () => {
        setError('Failed to read file from disk.');
        setParsing(false);
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err.message || 'Failed to start parsing.');
      setParsing(false);
    }
  };

  const handleToggleSelect = (tempId: string) => {
    setCandidates((prev) =>
      prev.map((c) => (c.temp_id === tempId ? { ...c, selected: !c.selected } : c))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setCandidates((prev) => prev.map((c) => ({ ...c, selected: select })));
  };

  const handleCategoryChange = (tempId: string, categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    setCandidates((prev) =>
      prev.map((c) =>
        c.temp_id === tempId
          ? { ...c, category_id: categoryId || undefined, category_name: cat?.name }
          : c
      )
    );
  };

  const handleDescriptionChange = (tempId: string, newDesc: string) => {
    setCandidates((prev) =>
      prev.map((c) => (c.temp_id === tempId ? { ...c, clean_description: newDesc } : c))
    );
  };

  const selectedCandidates = candidates.filter((c) => c.selected);
  const totalSelectedPaise = selectedCandidates.reduce((sum, c) => sum + c.amount_paise, 0);
  const duplicateCount = candidates.filter((c) => c.is_potential_duplicate).length;

  const handleCommitImport = async () => {
    if (selectedCandidates.length === 0) {
      setError('Please select at least one transaction to import.');
      return;
    }

    setImporting(true);
    setError(null);

    try {
      await api.batchImportStatement({
        account_id: selectedAccountId,
        transactions: selectedCandidates.map((c) => ({
          date: c.date,
          description: c.clean_description || c.raw_description,
          type: c.type,
          amount_paise: c.amount_paise,
          category_id: c.category_id,
        })),
      });

      onSuccess();
      onClose();
      // Reset state
      setStep('UPLOAD');
      setFile(null);
      setPassword('');
      setCandidates([]);
    } catch (err: any) {
      setError(err.message || 'Failed to import transactions into ledger.');
    } finally {
      setImporting(false);
    }
  };

  const handleResetModal = () => {
    setStep('UPLOAD');
    setFile(null);
    setPassword('');
    setError(null);
    setCandidates([]);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleResetModal}
      title={step === 'UPLOAD' ? 'Import Bank Statement (PDF)' : 'Review Extracted Transactions'}
      description={
        step === 'UPLOAD'
          ? 'Upload an HDFC, SBI, ICICI, Axis, or generic bank statement PDF to bulk-ingest transactions into your ledger.'
          : `Review detected transactions, adjust categories, and exclude potential duplicates before committing.`
      }
      maxWidth={step === 'REVIEW' ? 'xl' : 'lg'}
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <div className="leading-relaxed">{error}</div>
          </div>
        )}

        {step === 'UPLOAD' ? (
          <div className="space-y-4">
            {/* Account Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Target Bank Account <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full h-10 px-3 bg-white dark:bg-[#1F1F1F] border border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.account_type}) - Balance: {formatPaise(acc.balance_paise)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Drop Zone */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Bank Statement PDF <span className="text-red-500">*</span>
              </label>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl p-6 cursor-pointer bg-slate-50 dark:bg-slate-800/30 transition-colors">
                <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2">
                  <FileText className="w-6 h-6" />
                </div>
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  {file ? file.name : 'Click to select or drag and drop statement PDF'}
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  Supports e-statements from HDFC, SBI, ICICI, Axis, Kotak, etc.
                </span>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </label>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                PDF Password (Optional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="e.g. PAN card in uppercase, DOB DDMMYYYY"
                  className="w-full h-10 pl-9 pr-3 bg-white dark:bg-[#1F1F1F] border border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Encrypted statements need a password to unlock. Your password is processed strictly in-memory and never stored.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#313131]">
              <Button variant="outline" size="sm" onClick={handleResetModal}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleParse}
                disabled={!file || parsing}
                icon={parsing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
              >
                {parsing ? 'Parsing PDF Telemetry...' : 'Parse Statement'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Review Summary Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 gap-2 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Selected: <strong className="text-blue-600 dark:text-blue-400">{selectedCandidates.length}</strong> of {candidates.length}
                </span>
                <span className="text-slate-400">|</span>
                <span className="text-slate-600 dark:text-slate-400 font-medium">
                  Total Volume: <strong className="text-slate-900 dark:text-white tnum">{formatPaise(totalSelectedPaise)}</strong>
                </span>
              </div>

              {duplicateCount > 0 && (
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{duplicateCount} duplicate(s) auto-unselected</span>
                </div>
              )}
            </div>

            {/* Candidate Table */}
            <div className="border border-slate-200 dark:border-[#313131] rounded-lg overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 border-b border-slate-200 dark:border-[#313131] z-10">
                  <tr>
                    <th className="py-2 px-3 w-8 text-center">
                      <button
                        type="button"
                        onClick={() => handleSelectAll(selectedCandidates.length !== candidates.length)}
                        className="text-slate-500 hover:text-blue-600"
                        title={selectedCandidates.length === candidates.length ? 'Deselect all' : 'Select all'}
                      >
                        {selectedCandidates.length === candidates.length ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="py-2 px-3 font-semibold text-slate-500">Date</th>
                    <th className="py-2 px-3 font-semibold text-slate-500">Description</th>
                    <th className="py-2 px-3 font-semibold text-slate-500">Category</th>
                    <th className="py-2 px-3 font-semibold text-slate-500 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {candidates.map((c) => (
                    <tr
                      key={c.temp_id}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors ${
                        c.is_potential_duplicate ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={c.selected}
                          onChange={() => handleToggleSelect(c.temp_id)}
                          className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                        />
                      </td>

                      <td className="py-2.5 px-3 text-slate-500 tnum whitespace-nowrap">
                        {c.date}
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="space-y-0.5">
                          <input
                            type="text"
                            value={c.clean_description}
                            onChange={(e) => handleDescriptionChange(c.temp_id, e.target.value)}
                            className="w-full text-xs font-medium text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-600 focus:outline-none px-1"
                          />
                          {c.is_potential_duplicate && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-normal px-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>{c.duplicate_reason || 'Likely duplicate'}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <select
                          value={c.category_id || ''}
                          onChange={(e) => handleCategoryChange(c.temp_id, e.target.value)}
                          className="h-7 px-2 bg-white dark:bg-[#1F1F1F] border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        >
                          <option value="">Uncategorized</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <span
                          className={`font-semibold tnum ${
                            c.type === 'INCOME'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {c.type === 'INCOME' ? '+' : '-'}
                          {formatPaise(c.amount_paise)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#313131]">
              <Button variant="outline" size="sm" onClick={() => setStep('UPLOAD')}>
                Back to Upload
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleResetModal}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCommitImport}
                  disabled={selectedCandidates.length === 0 || importing}
                  icon={importing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                >
                  {importing
                    ? 'Importing into Ledger...'
                    : `Import ${selectedCandidates.length} Selected`}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

import React from 'react';
import { X, Shield, Lock, FileText, CheckCircle2 } from 'lucide-react';
import { ArthaGlyph } from '../brand/ArthaLogo.js';

export type LegalDocType = 'privacy' | 'terms' | 'dpdp';

interface LegalModalProps {
  isOpen: boolean;
  docType: LegalDocType;
  onClose: () => void;
  onSelectDocType: (type: LegalDocType) => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  docType,
  onClose,
  onSelectDocType,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#1F1F1F] border border-slate-200 dark:border-[#313131] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-[#272727] flex items-center justify-between bg-slate-50/50 dark:bg-[#181818]">
          <div className="flex items-center gap-3">
            <ArthaGlyph size={26} />
            <div>
              <h2 className="title-3 font-semibold text-slate-900 dark:text-white">
                Legal & Governance
              </h2>
              <p className="caption-3 text-slate-500 dark:text-[#9B9B9B]">
                Artha Financial Telemetry • Compliance with DPDP Act 2023
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#272727] transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-slate-100 dark:border-[#272727] bg-white dark:bg-[#1F1F1F]">
          <button
            onClick={() => onSelectDocType('privacy')}
            className={`pb-2.5 px-3 caption-2 font-medium border-b-2 transition-all duration-300 flex items-center gap-1.5 ${
              docType === 'privacy'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                : 'border-transparent text-slate-500 dark:text-[#9B9B9B] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Privacy Policy</span>
          </button>

          <button
            onClick={() => onSelectDocType('terms')}
            className={`pb-2.5 px-3 caption-2 font-medium border-b-2 transition-all duration-300 flex items-center gap-1.5 ${
              docType === 'terms'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                : 'border-transparent text-slate-500 dark:text-[#9B9B9B] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Terms of Service</span>
          </button>

          <button
            onClick={() => onSelectDocType('dpdp')}
            className={`pb-2.5 px-3 caption-2 font-medium border-b-2 transition-all duration-300 flex items-center gap-1.5 ${
              docType === 'dpdp'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                : 'border-transparent text-slate-500 dark:text-[#9B9B9B] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>DPDP Security Disclosure</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 body-5 text-slate-700 dark:text-[#D1D5DB] leading-relaxed text-pretty">
          {docType === 'privacy' && (
            <div className="space-y-4">
              <h3 className="title-2 font-semibold text-slate-900 dark:text-white">
                Privacy Policy
              </h3>
              <p className="caption-2 text-slate-500 dark:text-[#9B9B9B]">
                Last updated: November 2026 • Effective immediately across all Artha services.
              </p>

              <h4 className="title-4 font-semibold text-slate-900 dark:text-white mt-4">
                1. Principle of Data Minimization
              </h4>
              <p>
                Artha operates as an autonomous financial telemetry system. We collect only what is strictly necessary to compute your double entry ledger, Safe to Spend limit, and debt amortization schedules.
              </p>

              <h4 className="title-4 font-semibold text-slate-900 dark:text-white mt-4">
                2. Zero Data Brokering
              </h4>
              <p>
                We do not sell, rent, monetize, or share your financial transactions with credit bureaus, advertising exchanges, or third party lenders. Your ledger is private and isolated to your account.
              </p>

              <h4 className="title-4 font-semibold text-slate-900 dark:text-white mt-4">
                3. WhatsApp Cloud Integration
              </h4>
              <p>
                Inbound text messages dispatched to your verified Artha bot number are parsed via Meta WhatsApp Cloud API v21.0 over encrypted TLS 1.3 tunnels. Only the financial entity (amount, category, description) is committed to your ledger.
              </p>

              <h4 className="title-4 font-semibold text-slate-900 dark:text-white mt-4">
                4. Right to Data Portability & Erasure
              </h4>
              <p>
                You may export your full transaction ledger in CSV or JSON format at any time. Upon account deletion, all personal records, vault balances, and receivables are permanently purged from our databases.
              </p>
            </div>
          )}

          {docType === 'terms' && (
            <div className="space-y-4">
              <h3 className="title-2 font-semibold text-slate-900 dark:text-white">
                Terms of Service
              </h3>
              <p className="caption-2 text-slate-500 dark:text-[#9B9B9B]">
                Standard Operating Agreement for Artha Financial Telemetry.
              </p>

              <h4 className="title-4 font-semibold text-slate-900 dark:text-white mt-4">
                1. Informational & Telemetry Purpose
              </h4>
              <p>
                Artha provides double entry bookkeeping tools, Safe to Spend calculations, and debt payoff simulations. Artha is not a registered SEBI investment advisor, chartered accountant, or bank. All metrics reflect user provided records.
              </p>

              <h4 className="title-4 font-semibold text-slate-900 dark:text-white mt-4">
                2. Subscription & The Unconditional 3x ROI Guarantee
              </h4>
              <p>
                Artha PRO subscriptions are billed at ₹149 monthly or ₹1,299 annually. All annual plans are backed by our 30-day 3x value money back guarantee. If Artha does not save you at least 3x its subscription cost in recovered split debts or avoided waste, message support for an immediate 100% refund.
              </p>

              <h4 className="title-4 font-semibold text-slate-900 dark:text-white mt-4">
                3. Fair Use & WhatsApp Rate Limits
              </h4>
              <p>
                Users agree not to submit fraudulent, malicious, or scripted messages to the WhatsApp parser. Standard fair use limits apply to voice notes and bank PDF parsing.
              </p>
            </div>
          )}

          {docType === 'dpdp' && (
            <div className="space-y-4">
              <h3 className="title-2 font-semibold text-slate-900 dark:text-white">
                Digital Personal Data Protection (DPDP) Act 2023 Disclosure
              </h3>
              <p className="caption-2 text-slate-500 dark:text-[#9B9B9B]">
                Architectural compliance overview under Indian data privacy regulations.
              </p>

              <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <div className="caption-2 text-blue-950 dark:text-blue-100">
                  <span className="font-semibold block mb-0.5">Strict Zero Storage Bank PDF Decryption</span>
                  Bank statement passwords are held strictly in transient RAM during PDF regex extraction and are immediately erased. Raw PDF binaries are never persisted to disk or cloud object storage.
                </div>
              </div>

              <h4 className="title-4 font-semibold text-slate-900 dark:text-white mt-4">
                1. Encryption Architecture
              </h4>
              <p>
                All database records are protected with AES 256 encryption at rest. All client-to-server and webhook transmissions require TLS 1.3 transport security.
              </p>

              <h4 className="title-4 font-semibold text-slate-900 dark:text-white mt-4">
                2. Indian Resident Data Sovereignty
              </h4>
              <p>
                All user ledgers and financial transactions are maintained within compliant regional data centers, adhering strictly to Indian Ministry of Electronics and Information Technology (MeitY) standards.
              </p>

              <h4 className="title-4 font-semibold text-slate-900 dark:text-white mt-4">
                3. Purpose Limitation & Consent
              </h4>
              <p>
                Your explicit consent authorizes Artha solely to calculate your financial health telemetry. We maintain zero affiliate links, zero loan cross selling, and zero advertising pixels.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-[#272727] bg-slate-50 dark:bg-[#181818] flex items-center justify-between">
          <span className="caption-3 text-slate-500 dark:text-[#9B9B9B]">
            Artha Data Protection Officer: compliance@artha.internal
          </span>
          <button
            onClick={onClose}
            className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-[#181818] rounded-md caption-2 font-semibold transition-colors"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};

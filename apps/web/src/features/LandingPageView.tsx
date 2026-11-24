import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Receipt,
  Users,
  FileText,
  TrendingUp,
  Sparkles,
  ChevronDown,
  Lock,
  Zap,
  Smartphone,
  ExternalLink,
  ChevronRight,
  Send,
} from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { ArthaBrandLockup, ArthaGlyph } from '../components/brand/ArthaLogo.js';

interface LandingPageViewProps {
  onOpenApp: () => void;
  onOpenWhatsApp: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

// B11: Tagline Reveal Component with word-by-word IntersectionObserver activation
const TaglineRevealSection: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeWordIndex, setActiveWordIndex] = useState<number>(-1);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const text =
    'Every single rupee accounted for in three seconds without opening a single spreadsheet or touching manual formulas.';
  const words = text.split(' ');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleMediaChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleMediaChange);
    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      setActiveWordIndex(words.length);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Animate words one by one
            let currentIndex = 0;
            const interval = setInterval(() => {
              if (currentIndex <= words.length) {
                setActiveWordIndex(currentIndex);
                currentIndex++;
              } else {
                clearInterval(interval);
              }
            }, 65);
          }
        });
      },
      { threshold: 0.35 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [prefersReducedMotion, words.length]);

  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 border-y border-slate-200 dark:border-[#313131] bg-slate-100/50 dark:bg-[#131209]/40">
      <div ref={containerRef} className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200/80 dark:bg-[#272727] border border-slate-300 dark:border-[#313131] caption-3 text-slate-700 dark:text-[#9B9B9B] mb-6">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Core operating philosophy</span>
        </div>

        <h2 className="heading-3 sm:heading-2 tracking-tight text-balance leading-tight max-w-[680px] mx-auto">
          {words.map((word, idx) => {
            const isRevealed = prefersReducedMotion || idx < activeWordIndex;
            return (
              <span
                key={idx}
                className={`inline-block mr-2.5 transition-all duration-500 ease-out-expo ${
                  isRevealed
                    ? 'text-slate-900 dark:text-white opacity-100'
                    : 'text-slate-400 dark:text-[#9B9B9B] opacity-30'
                }`}
              >
                {word}
              </span>
            );
          })}
        </h2>

        <p className="caption-1 text-slate-500 dark:text-[#9B9B9B] mt-6 max-w-[680px] mx-auto text-pretty">
          Built for Indian founders, freelancers, and professionals who demand instant financial truth without the overhead of enterprise accounting software.
        </p>
      </div>
    </section>
  );
};

// FAQ Accordion Item
interface FaqItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}

const FaqItem: React.FC<FaqItemProps> = ({ question, answer, isOpen, onToggle }) => {
  return (
    <div className="border border-slate-200 dark:border-[#313131] rounded-xl bg-white dark:bg-[#1F1F1F] overflow-hidden transition-colors duration-300">
      <button
        onClick={onToggle}
        className="w-full text-left py-4 px-5 flex items-center justify-between gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        aria-expanded={isOpen}
      >
        <span className="title-3 text-slate-900 dark:text-white font-medium">
          {question}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-500 dark:text-[#9B9B9B] shrink-0 transition-transform duration-300 ease-out-expo ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="px-5 pb-5 pt-1 text-slate-600 dark:text-[#9B9B9B] body-6 border-t border-slate-100 dark:border-[#272727] text-pretty">
          {answer}
        </div>
      )}
    </div>
  );
};

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  onOpenApp,
  onOpenWhatsApp,
  theme,
  onToggleTheme,
}) => {
  // Interactive Hero Demo State
  const [selectedDemo, setSelectedDemo] = useState<'taxi' | 'dinner' | 'salary'>('taxi');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const demoScenarios = {
    taxi: {
      message: '1200 taxi with Nitin and Vishal split',
      reply: 'Logged ₹1,200 for Transportation. Your share is ₹400. Created receivables of ₹400 each for Nitin and Vishal. Runway updated to 8.4 months.',
      movement: '-₹400.00',
      receivable: '+₹800.00 owed to you',
      category: 'Transportation',
    },
    dinner: {
      message: '3600 team dinner with Rahul Aryan and Vikram split',
      reply: 'Logged ₹3,600 for Food & Dining. Your share is ₹900. Created receivables of ₹900 each for 3 people. Reconciled against Primary Account.',
      movement: '-₹900.00',
      receivable: '+₹2,700.00 owed to you',
      category: 'Food & Dining',
    },
    salary: {
      message: 'Salary 150000 credited in HDFC',
      reply: 'Recorded ₹1,50,000 income to HDFC Bank. Peace of Mind emergency vault funded. Cash runway extended to 11.2 months.',
      movement: '+₹1,50,000.00',
      receivable: 'Vaults allocated',
      category: 'Salary & Income',
    },
  };

  const activeDemo = demoScenarios[selectedDemo];

  const benefits = [
    {
      icon: <Zap className="w-5 h-5 text-amber-500" />,
      title: 'Zero manual data entry',
      description:
        'Message "1200 taxi with Nitin" on WhatsApp to categorize, split, and log in under 3 seconds.',
    },
    {
      icon: <Users className="w-5 h-5 text-indigo-500" />,
      title: 'Automated split calculations',
      description:
        'Settle roommate expenses and team dinners without spreadsheet formulas or awkward reminder texts.',
    },
    {
      icon: <FileText className="w-5 h-5 text-blue-500" />,
      title: 'Instant bank statement reconciliation',
      description:
        'Upload password protected bank PDFs to reconcile 100+ transactions with zero discrepancies.',
    },
    {
      icon: <TrendingUp className="w-5 h-5 text-emerald-500" />,
      title: 'Clear financial runway',
      description:
        'Know your exact cash runway in months and burn rate updated automatically after every single payment.',
    },
  ];

  const steps = [
    {
      step: '01',
      title: 'Text your expense naturally',
      description:
        'Send a short WhatsApp message such as "450 lunch with Rahul" or "3000 taxi split with Nitin and Aryan".',
    },
    {
      step: '02',
      title: 'Intelligent parsing and split tracking',
      description:
        'Artha extracts the amount, assigns the category, records your share, and creates receivables for your friends.',
    },
    {
      step: '03',
      title: 'Instant financial clarity',
      description:
        'Your web ledger updates in real time, recalculating your net worth, category budgets, and runway automatically.',
    },
  ];

  const testimonials = [
    {
      quote:
        'Artha replaced three separate spreadsheets for my apartment and startup expenses. I just drop WhatsApp voice or text notes while paying UPI, and everything is neatly reconciled.',
      name: 'Rahul Sharma',
      role: 'Co-founder at BuildFast, Bengaluru',
      metric: '₹2.4L tracked monthly',
    },
    {
      quote:
        'Splitting dinners and rent used to take 20 minutes of Excel math every Sunday. With Artha, split payments create instant receivables that credit my bank without inflating taxable income.',
      name: 'Priya Nair',
      role: 'Product Designer, Mumbai',
      metric: 'Zero forgotten dues',
    },
    {
      quote:
        'Uploading my password protected HDFC bank statement parsed 240 transactions cleanly. The runway intelligence gives me complete peace of mind on my savings.',
      name: 'Amit Patel',
      role: 'Engineering Lead, Gurugram',
      metric: '8.4 months runway visible',
    },
  ];

  const faqs = [
    {
      question: 'Do I need to install a mobile app on my phone?',
      answer:
        'No. Artha works directly inside WhatsApp. You chat with your verified bot number just like messaging a friend, and access your full financial dashboard and double-entry ledger on any web browser.',
    },
    {
      question: 'Is my financial data secure and private?',
      answer:
        'Yes. All data is encrypted with AES-256 at rest and TLS 1.3 in transit. We never sell your data or share your financial records with third parties.',
    },
    {
      question: 'How do split payments work with friends?',
      answer:
        'When you write "split" or "divide" with names in your WhatsApp message, Artha calculates your personal share and records the rest as receivables from your friends. When they pay you back, it credits your bank without inflating your taxable income.',
    },
    {
      question: 'Can I import historical bank statements?',
      answer:
        'Yes. Artha supports password protected PDF statements from all major Indian banks including HDFC, ICICI, SBI, Axis, and Kotak with automated duplicate detection.',
    },
    {
      question: 'Can I track multiple bank accounts and credit cards?',
      answer:
        'Yes. You can link your primary savings account, UPI wallets, credit cards, and cash vaults to see your consolidated net worth in one unified ledger.',
    },
    {
      question: 'What happens if I make a mistake in a message?',
      answer:
        'You can delete or edit any transaction in one click from the web ledger, or reply "cancel last" directly on WhatsApp.',
    },
    {
      question: 'Is Artha free to use?',
      answer:
        'Yes. Personal expense logging, WhatsApp bot integration, and web ledger access are completely free forever. Optional premium plans are available for multi-user organization features.',
    },
    {
      question: 'Can I export my data if I want to leave?',
      answer:
        'Yes. You can export your entire transaction history and double-entry ledger to CSV or JSON format at any time with a single click.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#181818] text-slate-900 dark:text-[#F9FAFB] transition-colors duration-300 font-sans selection:bg-blue-500/20">
      {/* Skip to Content Link (Rule B10) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-50 bg-blue-600 text-white px-4 py-2 rounded-md shadow-modal"
      >
        Skip to main content
      </a>

      {/* Floating Navigation Bar (Rule B7) */}
      <header className="sticky top-4 z-40 max-w-5xl mx-auto px-4">
        <nav
          aria-label="Primary navigation"
          className="flex items-center justify-between px-4 sm:px-6 py-2.5 rounded-2xl bg-white/85 dark:bg-[#1F1F1F]/85 backdrop-blur-md border border-slate-200/80 dark:border-[#313131] shadow-card transition-all duration-300"
        >
          {/* Logo & Brand */}
          <ArthaBrandLockup size="md" />

          {/* Quick Nav Links */}
          <div className="hidden md:flex items-center gap-6 caption-1 text-slate-600 dark:text-[#9B9B9B]">
            <a href="#benefits" className="hover:text-slate-900 dark:hover:text-white transition-colors duration-300">
              Benefits
            </a>
            <a href="#how-it-works" className="hover:text-slate-900 dark:hover:text-white transition-colors duration-300">
              How it works
            </a>
            <a href="#faq" className="hover:text-slate-900 dark:hover:text-white transition-colors duration-300">
              FAQ
            </a>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onToggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-[#9B9B9B] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#272727] transition-colors duration-300"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            <Button
              variant="outline"
              size="sm"
              onClick={onOpenApp}
            >
              Open web ledger
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={onOpenWhatsApp}
              icon={<MessageSquare className="w-3.5 h-3.5" />}
            >
              Try on WhatsApp
            </Button>
          </div>
        </nav>
      </header>

      {/* Main Content Container */}
      <main id="main-content">
        {/* Hero Section (Rule B5: Text gradient #FFFFFF → #9B9B9B in dark, #000000 → #666666 in light, max width 680px) */}
        <section className="pt-16 pb-16 sm:pt-24 sm:pb-24 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 caption-3 text-blue-700 dark:text-blue-300 mb-6 shadow-subtle">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              <span>Artha (अर्थ) • Official WhatsApp bot live</span>
            </div>

            {/* Main Headline (Rule B5) */}
            <h1 className="heading-2 sm:heading-1 tracking-tight hero-heading text-balance max-w-[680px] mx-auto leading-tight">
              Track every rupee from WhatsApp without opening a spreadsheet
            </h1>

            {/* Subheadline (Max width 680px) */}
            <p className="body-2 sm:body-1 text-slate-600 dark:text-[#9B9B9B] mt-5 max-w-[680px] mx-auto text-pretty">
              Log daily expenses in three seconds, split group bills with roommates, and project your Safe to Spend cash runway automatically. Send a message to your bot just like texting a friend.
            </p>

            {/* Primary Action Group */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
              <Button
                variant="primary"
                size="md"
                onClick={onOpenWhatsApp}
                icon={<MessageSquare className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                Start tracking free
              </Button>

              <Button
                variant="outline"
                size="md"
                onClick={onOpenApp}
                icon={<ArrowRight className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                Explore web ledger
              </Button>
            </div>

            {/* Proof Signal (Rule A2 Above the fold) */}
            <div className="mt-6 flex items-center justify-center gap-2 caption-2 text-slate-500 dark:text-[#9B9B9B]">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Trusted by 1,200+ Indian founders and professionals tracking over ₹4.2 Cr</span>
            </div>

            {/* Interactive Hero Visual: Live WhatsApp Simulation + Ledger Card */}
            <div className="mt-12 max-w-3xl mx-auto text-left">
              {/* Nested Radius Container (B3): outer rounded-2xl (16px), gap 8px gives inner rounded-lg (8px) */}
              <div className="rounded-2xl p-2 bg-slate-200 dark:bg-[#1F1F1F] border border-slate-300 dark:border-[#313131] shadow-card">
                {/* Scenario Selector Pills */}
                <div className="flex items-center gap-1.5 p-1.5 bg-white dark:bg-[#181818] rounded-xl border border-slate-200/80 dark:border-[#272727] mb-2">
                  <span className="caption-3 px-2 text-slate-400 dark:text-[#9B9B9B]">
                    Try live scenario:
                  </span>
                  <button
                    onClick={() => setSelectedDemo('taxi')}
                    className={`px-3 py-1 rounded-lg caption-3 transition-colors duration-300 ${
                      selectedDemo === 'taxi'
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'text-slate-600 dark:text-[#9B9B9B] hover:bg-slate-100 dark:hover:bg-[#272727]'
                    }`}
                  >
                    Taxi split
                  </button>
                  <button
                    onClick={() => setSelectedDemo('dinner')}
                    className={`px-3 py-1 rounded-lg caption-3 transition-colors duration-300 ${
                      selectedDemo === 'dinner'
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'text-slate-600 dark:text-[#9B9B9B] hover:bg-slate-100 dark:hover:bg-[#272727]'
                    }`}
                  >
                    Group dinner
                  </button>
                  <button
                    onClick={() => setSelectedDemo('salary')}
                    className={`px-3 py-1 rounded-lg caption-3 transition-colors duration-300 ${
                      selectedDemo === 'salary'
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'text-slate-600 dark:text-[#9B9B9B] hover:bg-slate-100 dark:hover:bg-[#272727]'
                    }`}
                  >
                    Salary credit
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {/* WhatsApp Simulation Box */}
                  <div className="rounded-lg p-4 bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#272727] flex flex-col justify-between h-72">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#272727]">
                      <div className="flex items-center gap-2">
                        <ArthaGlyph size={22} variant="mono-green" withPulse={false} />
                        <span className="caption-1 font-semibold text-slate-900 dark:text-white">
                          Artha bot
                        </span>
                      </div>
                      <span className="caption-4 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Online
                      </span>
                    </div>

                    {/* Chat Bubble Area */}
                    <div className="space-y-3 py-2 flex-1 flex flex-col justify-end">
                      {/* User outgoing bubble */}
                      <div className="self-end max-w-[85%] bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/60 rounded-xl rounded-tr-xs p-2.5 caption-2 text-emerald-950 dark:text-emerald-100 shadow-subtle">
                        <p>{activeDemo.message}</p>
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block text-right mt-1">
                          Just now
                        </span>
                      </div>

                      {/* Bot reply bubble */}
                      <div className="self-start max-w-[90%] bg-slate-100 dark:bg-[#272727] border border-slate-200 dark:border-[#313131] rounded-xl rounded-tl-xs p-2.5 caption-2 text-slate-900 dark:text-white shadow-subtle">
                        <p>{activeDemo.reply}</p>
                        <span className="text-[10px] text-slate-400 block text-left mt-1">
                          Parsed in 120ms
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-[#272727] flex items-center justify-between text-slate-400 caption-4">
                      <span>WhatsApp Cloud API v21.0</span>
                      <Send className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                  </div>

                  {/* Synchronized Web Ledger Telemetry Preview */}
                  <div className="rounded-lg p-4 bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#272727] flex flex-col justify-between h-72">
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#272727]">
                        <span className="caption-1 font-semibold text-slate-900 dark:text-white">
                          Live web ledger sync
                        </span>
                        <span className="caption-4 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900/60">
                          Reconciled
                        </span>
                      </div>

                      <div className="mt-4 space-y-3">
                        <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#272727] border border-slate-200 dark:border-[#313131]">
                          <div className="flex items-center justify-between caption-3 text-slate-500 dark:text-[#9B9B9B]">
                            <span>Category</span>
                            <span>Recorded amount</span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="body-4 text-slate-900 dark:text-white">
                              {activeDemo.category}
                            </span>
                            <span className="title-2 font-mono text-rose-600 dark:text-rose-400">
                              {activeDemo.movement}
                            </span>
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#272727] border border-slate-200 dark:border-[#313131]">
                          <div className="flex items-center justify-between caption-3 text-slate-500 dark:text-[#9B9B9B]">
                            <span>Receivables status</span>
                            <span>Runway impact</span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="body-5 text-indigo-600 dark:text-indigo-400 font-medium">
                              {activeDemo.receivable}
                            </span>
                            <span className="caption-3 text-emerald-600 dark:text-emerald-400 font-semibold">
                              Protected
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-[#272727] flex items-center justify-between caption-4 text-slate-500 dark:text-[#9B9B9B]">
                      <span>Double entry ledger verified</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mandatory Tagline Reveal Section (Rule B11) */}
        <TaglineRevealSection />

        {/* Problem to Solution Comparison Section */}
        <section className="py-20 px-4 sm:px-6 max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="heading-3 tracking-tight text-slate-900 dark:text-white text-balance">
              Stop losing money to forgotten expenses and chaotic group chats
            </h2>
            <p className="caption-1 text-slate-500 dark:text-[#9B9B9B] mt-2 text-pretty">
              Traditional finance apps expect you to open complex menus every time you buy coffee. Artha meets you where you already spend your day.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* The Old Way */}
            <div className="rounded-2xl p-6 bg-white dark:bg-[#1F1F1F] border border-slate-200 dark:border-[#313131] shadow-card">
              <span className="caption-3 uppercase font-semibold tracking-wider text-rose-600 dark:text-rose-400">
                The traditional way
              </span>
              <ul className="mt-5 space-y-4 body-5 text-slate-600 dark:text-[#9B9B9B]">
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0" />
                  <span>Manually opening slow spreadsheets or complex accounting mobile apps after every UPI payment.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0" />
                  <span>Awkward WhatsApp reminder messages to friends for split cab rides and shared groceries.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0" />
                  <span>Friend repayments getting mistakenly recorded as taxable personal income in banking apps.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0" />
                  <span>Zero clarity on real savings runway until your bank account drops to critical lows.</span>
                </li>
              </ul>
            </div>

            {/* The Artha Way */}
            <div className="rounded-2xl p-6 bg-white dark:bg-[#1F1F1F] border border-blue-200 dark:border-blue-900/60 shadow-card">
              <span className="caption-3 uppercase font-semibold tracking-wider text-blue-600 dark:text-blue-400">
                The Artha way
              </span>
              <ul className="mt-5 space-y-4 body-5 text-slate-900 dark:text-[#F9FAFB]">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-1 shrink-0" />
                  <span>Type a quick five word text message on WhatsApp while walking away from the cashier.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-1 shrink-0" />
                  <span>Automated split tracking calculates each person's exact share and keeps an audit safe tally.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-1 shrink-0" />
                  <span>Friend recoveries cleanly credit your cash reserves without inflating income or tax brackets.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-1 shrink-0" />
                  <span>Live runway telemetry shows your exact runway in months updated with every single transaction.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Benefits Section (Rule A5: Bold benefit, then the proof or detail) */}
        <section id="benefits" className="py-20 px-4 sm:px-6 bg-slate-100/40 dark:bg-[#181818] border-t border-slate-200 dark:border-[#313131]">
          <div className="max-w-5xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <h2 className="heading-3 tracking-tight text-slate-900 dark:text-white text-balance">
                Engineered for speed, accuracy, and peace of mind
              </h2>
              <p className="caption-1 text-slate-500 dark:text-[#9B9B9B] mt-2 text-pretty">
                Four outcome driven capabilities that replace messy notebooks and spreadsheet formulas.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {benefits.map((b, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl p-6 bg-white dark:bg-[#1F1F1F] border border-slate-200 dark:border-[#313131] shadow-card transition-all duration-300 hover:border-slate-300 dark:hover:border-[#444]"
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-[#272727] border border-slate-200 dark:border-[#313131] flex items-center justify-center mb-4">
                    {b.icon}
                  </div>
                  <h3 className="title-2 text-slate-900 dark:text-white font-semibold">
                    {b.title}
                  </h3>
                  <p className="body-5 text-slate-600 dark:text-[#9B9B9B] mt-2 text-pretty">
                    {b.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section (Rule A2 & A5: 3 Steps) */}
        <section id="how-it-works" className="py-20 px-4 sm:px-6 max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="heading-3 tracking-tight text-slate-900 dark:text-white text-balance">
              How Artha works in three simple steps
            </h2>
            <p className="caption-1 text-slate-500 dark:text-[#9B9B9B] mt-2 text-pretty">
              Get started in under two minutes without downloading an application or entering credit card details.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {steps.map((s, idx) => (
              <div
                key={idx}
                className="rounded-2xl p-6 bg-white dark:bg-[#1F1F1F] border border-slate-200 dark:border-[#313131] shadow-card flex flex-col justify-between"
              >
                <div>
                  <span className="heading-3 font-mono text-blue-600 dark:text-blue-400 font-bold block mb-4">
                    {s.step}
                  </span>
                  <h3 className="title-2 text-slate-900 dark:text-white font-semibold">
                    {s.title}
                  </h3>
                  <p className="body-5 text-slate-600 dark:text-[#9B9B9B] mt-2 text-pretty">
                    {s.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Social Proof & Testimonials Section */}
        <section className="py-20 px-4 sm:px-6 bg-slate-100/40 dark:bg-[#181818] border-t border-slate-200 dark:border-[#313131]">
          <div className="max-w-5xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <h2 className="heading-3 tracking-tight text-slate-900 dark:text-white text-balance">
                Trusted by builders across India
              </h2>
              <p className="caption-1 text-slate-500 dark:text-[#9B9B9B] mt-2 text-pretty">
                See how Indian founders and professionals use Artha to regain complete clarity over their personal finances.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {testimonials.map((t, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl p-6 bg-white dark:bg-[#1F1F1F] border border-slate-200 dark:border-[#313131] shadow-card flex flex-col justify-between"
                >
                  <p className="body-5 text-slate-700 dark:text-[#D1D5DB] text-pretty">
                    "{t.quote}"
                  </p>
                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-[#272727]">
                    <div className="title-4 font-semibold text-slate-900 dark:text-white">
                      {t.name}
                    </div>
                    <div className="caption-2 text-slate-500 dark:text-[#9B9B9B]">
                      {t.role}
                    </div>
                    <div className="caption-3 font-semibold text-emerald-600 dark:text-emerald-400 mt-2">
                      {t.metric}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section (Rule A2 & A5: 8 Questions handling objections) */}
        <section id="faq" className="py-20 px-4 sm:px-6 max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="heading-3 tracking-tight text-slate-900 dark:text-white text-balance">
              Frequently asked questions
            </h2>
            <p className="caption-1 text-slate-500 dark:text-[#9B9B9B] mt-2 text-pretty">
              Everything you need to know about privacy, WhatsApp integration, and data security.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <FaqItem
                key={idx}
                question={faq.question}
                answer={faq.answer}
                isOpen={openFaqIndex === idx}
                onToggle={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
              />
            ))}
          </div>
        </section>

        {/* Risk Reversal & Final CTA Section (Rule A2: Identical to top CTA) */}
        <section className="py-20 px-4 sm:px-6 border-t border-slate-200 dark:border-[#313131] bg-slate-100/50 dark:bg-[#1F1F1F]">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="heading-2 tracking-tight text-slate-900 dark:text-white text-balance max-w-[680px] mx-auto">
              Ready to take control of your daily financial runway?
            </h2>
            <p className="body-2 text-slate-600 dark:text-[#9B9B9B] mt-4 max-w-[680px] mx-auto text-pretty">
              Free forever for individual users. No credit card required. Send your first WhatsApp expense in under two minutes.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
              <Button
                variant="primary"
                size="md"
                onClick={onOpenWhatsApp}
                icon={<MessageSquare className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                Start tracking free
              </Button>

              <Button
                variant="outline"
                size="md"
                onClick={onOpenApp}
                icon={<ArrowRight className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                Open web ledger
              </Button>
            </div>

            <div className="mt-5 flex items-center justify-center gap-2 caption-3 text-slate-500 dark:text-[#9B9B9B]">
              <Lock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>AES 256 bank grade encryption. Export your data to CSV anytime.</span>
            </div>
          </div>
        </section>
      </main>

      {/* Semantic Footer (Rule B10: Privacy, Terms, Legal) */}
      <footer className="py-12 px-4 sm:px-6 border-t border-slate-200 dark:border-[#313131] bg-white dark:bg-[#181818]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <ArthaBrandLockup size="sm" showDescriptor={false} />
            <span className="caption-3 text-slate-400 dark:text-[#9B9B9B] hidden sm:inline">
              Sanskrit: अर्थ — Institutional financial telemetry & runway intelligence
            </span>
          </div>

          <div className="flex items-center gap-6 caption-2 text-slate-500 dark:text-[#9B9B9B]">
            <a href="#benefits" className="hover:text-slate-900 dark:hover:text-white transition-colors duration-300">
              Benefits
            </a>
            <a href="#how-it-works" className="hover:text-slate-900 dark:hover:text-white transition-colors duration-300">
              How it works
            </a>
            <a href="#faq" className="hover:text-slate-900 dark:hover:text-white transition-colors duration-300">
              FAQ
            </a>
            <button
              onClick={onOpenApp}
              className="hover:text-slate-900 dark:hover:text-white transition-colors duration-300 font-medium"
            >
              Web ledger
            </button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto mt-8 pt-6 border-t border-slate-100 dark:border-[#272727] flex flex-col sm:flex-row items-center justify-between gap-4 caption-3 text-slate-400 dark:text-[#9B9B9B]">
          <div>
            © {new Date().getFullYear()} Artha Financial Telemetry. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <span className="hover:underline cursor-pointer">Privacy policy</span>
            <span className="hover:underline cursor-pointer">Terms of service</span>
            <span className="hover:underline cursor-pointer">Security disclosure</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

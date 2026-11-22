import React, { useState, useEffect, useRef } from 'react';
import { api, WhatsAppStatus, WhatsAppSimulateResponse, formatPaise } from '../lib/api';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  transaction?: WhatsAppSimulateResponse['result']['transaction'];
}

interface WhatsAppViewProps {
  onTransactionLogged?: () => void;
}

export const WhatsAppView: React.FC<WhatsAppViewProps> = ({ onTransactionLogged }) => {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [phoneNumberInput, setPhoneNumberInput] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState<string | null>(null);

  // Simulator State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: `👋 *Welcome to Artha WhatsApp Assistant!*\n\nSimply text how you spend in natural Indian English or Hinglish:\n• *"Spent 450 at Starbucks"*\n• *"Petrol 2000"*\n• *"Swiggy 540"*\n• *"Balance"* to check safe-to-spend\n\nTry sending a message below!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchStatus = async () => {
    try {
      const data = await api.getWhatsAppStatus();
      setStatus(data);
      if (data.phone_number) {
        setPhoneNumberInput(data.phone_number);
      }
    } catch (err: any) {
      console.warn('Could not fetch WhatsApp status:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleLinkPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumberInput.trim()) return;

    setIsLinking(true);
    setLinkError(null);
    setLinkSuccess(null);

    try {
      const res = await api.linkWhatsAppPhone(phoneNumberInput.trim());
      setLinkSuccess(res.message);
      await fetchStatus();
    } catch (err: any) {
      setLinkError(err.message || 'Failed to link phone number');
    } finally {
      setIsLinking(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isSimulating) return;

    const userMsgId = 'usr_' + Date.now();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Append User Message
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: text.trim(),
      timestamp: nowTime,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setIsSimulating(true);

    try {
      const res = await api.simulateWhatsAppMessage(text.trim(), status?.phone_number || undefined);
      
      const botMsg: ChatMessage = {
        id: 'bot_' + Date.now(),
        sender: 'bot',
        text: res.result.replyMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        transaction: res.result.transaction,
      };

      setMessages((prev) => [...prev, botMsg]);

      // If transaction was recorded, notify parent to refresh balances & transactions
      if (res.result.action === 'TRANSACTION_RECORDED' && onTransactionLogged) {
        onTransactionLogged();
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: 'bot_err_' + Date.now(),
        sender: 'bot',
        text: `⚠️ System error processing message: ${err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSimulating(false);
    }
  };

  const quickPrompts = [
    'Spent 450 at Starbucks',
    'Petrol 2000',
    'Paid 1.5k for groceries',
    'Swiggy dinner 620',
    'Balance',
    'Received 75000 salary',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border-default pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold text-lg">
              💬
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              WhatsApp Conversational Ledger
            </h1>
          </div>
          <p className="text-text-secondary text-sm mt-1">
            Log expenses in 1 second via natural WhatsApp messages. No app opening required.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {status?.whatsapp_linked ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              WhatsApp Active (+{status.phone_number})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              WhatsApp Not Linked
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Link Phone Number & Setup Guidance */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 1: Link Phone */}
          <div className="bg-surface-primary border border-border-default rounded-xl p-5 shadow-sm">
            <h2 className="text-base font-semibold text-text-primary mb-1">
              Link Your WhatsApp Number
            </h2>
            <p className="text-xs text-text-muted mb-4">
              Enter your Indian mobile number (+91). Messages from this number will automatically log to your private ledger.
            </p>

            <form onSubmit={handleLinkPhone} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Mobile Number
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-text-muted text-sm font-medium">
                    +91
                  </span>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={phoneNumberInput.replace(/^91/, '')}
                    onChange={(e) => setPhoneNumberInput(e.target.value)}
                    className="w-full pl-12 pr-4 py-2 bg-surface-secondary border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                    maxLength={10}
                  />
                </div>
              </div>

              {linkError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                  {linkError}
                </div>
              )}

              {linkSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                  {linkSuccess}
                </div>
              )}

              <button
                type="submit"
                disabled={isLinking}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold tracking-wide transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLinking ? 'Verifying & Linking...' : status?.whatsapp_linked ? 'Update WhatsApp Number' : 'Link WhatsApp Number'}
              </button>
            </form>
          </div>

          {/* Card 2: Meta Developer Sandbox Guide (Zero SIM Cost) */}
          <div className="bg-surface-primary border border-border-default rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 text-base">🛡️</span>
              <h2 className="text-sm font-semibold text-text-primary">
                Meta Cloud API Sandbox (No SIM Needed)
              </h2>
            </div>
            
            <p className="text-xs text-text-secondary leading-relaxed">
              Meta gives every developer a <strong>free test number</strong> with 1,000 free conversations per month. You do NOT need to buy a SIM card to run or test Artha.
            </p>

            <div className="bg-surface-secondary/70 border border-border-subtle rounded-lg p-3 text-xs space-y-2">
              <div className="flex justify-between items-center text-text-muted">
                <span>Webhook URL:</span>
                <span className="font-mono text-text-primary select-all">
                  {status?.webhook_url || '/api/v1/webhooks/whatsapp'}
                </span>
              </div>
              <div className="flex justify-between items-center text-text-muted">
                <span>Verify Token:</span>
                <span className="font-mono text-emerald-400 select-all font-semibold">
                  {status?.verify_token || 'artha_webhook_token'}
                </span>
              </div>
            </div>

            <div className="text-xs text-text-muted space-y-1.5 pt-1">
              <p className="font-medium text-text-secondary">Quick Setup in 3 Minutes:</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Create free Meta for Developers account at <code className="text-text-primary">developers.facebook.com</code></li>
                <li>Add WhatsApp product and copy the free Meta Sandbox test number</li>
                <li>Paste the Webhook URL & Verify Token above into Configuration</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive WhatsApp Chat Simulator */}
        <div className="lg:col-span-7">
          <div className="bg-[#0b141a] border border-border-default rounded-2xl overflow-hidden shadow-xl flex flex-col h-[640px]">
            {/* WhatsApp Header Mockup */}
            <div className="bg-[#202c33] px-4 py-3 flex items-center justify-between border-b border-[#2a3942]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                  अ
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#e9edef] flex items-center gap-1.5">
                    Artha Finance Bot
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-normal">
                      Verified
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#8696a0]">
                    Online • Institutional Expense Engine
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-[#8696a0]">
                <span className="hidden sm:inline">In-App Live Sandbox</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              </div>
            </div>

            {/* Quick Sample Prompts Bar */}
            <div className="bg-[#111b21] px-3 py-2 border-b border-[#222d34] flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-[11px] text-[#8696a0] font-medium whitespace-nowrap pl-1">
                Quick test:
              </span>
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSendMessage(prompt)}
                  disabled={isSimulating}
                  className="text-[11px] bg-[#202c33] hover:bg-[#2a3942] text-[#d1d7db] px-2.5 py-1 rounded-full whitespace-nowrap transition-colors border border-[#2a3942]/60"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0b141a] bg-opacity-95">
              {messages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] rounded-lg px-3.5 py-2.5 text-xs shadow-sm ${
                        isUser
                          ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none'
                          : 'bg-[#202c33] text-[#d1d7db] rounded-tl-none border border-[#2a3942]/40'
                      }`}
                    >
                      {/* Message Content */}
                      <div className="whitespace-pre-line leading-relaxed font-sans">
                        {msg.text.split('\n').map((line, idx) => {
                          // Handle bold formatting (*text*)
                          const parts = line.split(/(\*[^*]+\*)/g);
                          return (
                            <div key={idx} className={idx > 0 ? 'mt-1' : ''}>
                              {parts.map((p, pIdx) => {
                                if (p.startsWith('*') && p.endsWith('*')) {
                                  return (
                                    <strong key={pIdx} className="font-semibold text-white">
                                      {p.slice(1, -1)}
                                    </strong>
                                  );
                                }
                                if (p.startsWith('_') && p.endsWith('_')) {
                                  return (
                                    <span key={pIdx} className="italic text-[#8696a0]">
                                      {p.slice(1, -1)}
                                    </span>
                                  );
                                }
                                return p;
                              })}
                            </div>
                          );
                        })}
                      </div>

                      {/* Transaction Meta Card if logged */}
                      {msg.transaction && (
                        <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-emerald-300">
                          <span>Auto-Categorized: {msg.transaction.categoryName || 'General'}</span>
                          <span className="font-mono font-medium">
                            {formatPaise(msg.transaction.amountPaise)}
                          </span>
                        </div>
                      )}

                      {/* Timestamp & Read Receipt */}
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-[#8696a0]">
                        <span>{msg.timestamp}</span>
                        {isUser && (
                          <span className="text-[#53bdeb] font-bold">✓✓</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {isSimulating && (
                <div className="flex items-center gap-2 text-xs text-[#8696a0] italic px-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8696a0] animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8696a0] animate-bounce delay-100"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8696a0] animate-bounce delay-200"></span>
                  Artha bot is thinking & categorizing...
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Chat Input Bar */}
            <div className="bg-[#202c33] p-3 border-t border-[#2a3942]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Type an expense e.g. 'Coffee 220' or 'Uber 350 to airport'..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  disabled={isSimulating}
                  className="flex-1 bg-[#2a3942] border-0 rounded-lg px-4 py-2.5 text-xs text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                />

                <button
                  type="submit"
                  disabled={isSimulating || !inputMessage.trim()}
                  className="w-10 h-10 rounded-full bg-[#00a884] hover:bg-[#008f6f] text-white flex items-center justify-center transition-colors disabled:opacity-40 disabled:hover:bg-[#00a884]"
                  title="Send to WhatsApp Bot"
                >
                  <svg className="w-5 h-5 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

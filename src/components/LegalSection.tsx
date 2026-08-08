import React, { useState } from 'react';
import { 
  ShieldCheck, 
  FileText, 
  Lock, 
  Scale, 
  AlertTriangle, 
  CheckCircle, 
  Search, 
  Printer, 
  ExternalLink,
  ChevronRight,
  Globe,
  CreditCard,
  Database,
  Building
} from 'lucide-react';

interface LegalSectionProps {
  initialTab?: 'terms' | 'privacy';
  onClose?: () => void;
}

export const LegalSection: React.FC<LegalSectionProps> = ({ initialTab = 'terms', onClose }) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasAgreed, setHasAgreed] = useState(() => {
    return localStorage.getItem('chainpay_legal_agreed') === 'true';
  });

  const handleAgree = () => {
    localStorage.setItem('chainpay_legal_agreed', 'true');
    setHasAgreed(true);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-2xl space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5" />
              Legal & Compliance Center
            </span>
            <span className="text-xs text-slate-400 font-mono">Effective Date: August 8, 2026</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Terms of Service & Privacy Policy
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-2xl">
            Please read these terms carefully before using ChainPay protocol services, Stripe payment integrations, Dollar Cost Averaging (DCA) schedules, or Google Workspace cloud exports.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-3.5 py-2 rounded-xl border border-slate-700 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save PDF</span>
          </button>
          
          {hasAgreed ? (
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3.5 py-2 rounded-xl text-xs font-semibold">
              <CheckCircle className="w-4 h-4" />
              <span>Terms Accepted</span>
            </div>
          ) : (
            <button
              onClick={handleAgree}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Acknowledge & Agree</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('terms')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'terms'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 border border-indigo-400/30'
                : 'bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Terms of Service</span>
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'privacy'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 border border-emerald-400/30'
                : 'bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Privacy Policy</span>
          </button>
        </div>

        {/* Filter Input */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search legal clauses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Content Container */}
      {activeTab === 'terms' ? (
        <div className="space-y-8 text-slate-300 text-xs md:text-sm leading-relaxed">
          {/* Section 1 */}
          <section className="bg-slate-950/50 border border-slate-800 p-6 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-base">
              <span className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-xs">1</span>
              <h2>Acceptance of Protocol Terms</h2>
            </div>
            <p>
              By creating an account, connecting a Web3 wallet, configuring Dollar Cost Averaging (DCA) schedules, or processing payments through ChainPay ("the Platform"), operated by Oldtimevibescomllc and ChainPay Technologies Inc., you agree to be bound by these Terms of Service. If you do not agree to all terms, you must immediately cease accessing the platform.
            </p>
          </section>

          {/* Section 2 */}
          <section className="bg-slate-950/50 border border-slate-800 p-6 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-base">
              <span className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-xs">2</span>
              <h2>Services Provided & Wallet Responsibility</h2>
            </div>
            <p>
              ChainPay provides decentralized ledger infrastructure, EVM smart contract deployment engines, automated token rewards, and payment processing tools. Users maintain full non-custodial custody over their cryptographic keys. You acknowledge that loss of private keys or seed phrases results in irreversible loss of digital assets. ChainPay cannot recover lost private keys.
            </p>
          </section>

          {/* Section 3 */}
          <section className="bg-slate-950/50 border border-slate-800 p-6 rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-indigo-400 font-bold text-base">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-xs">3</span>
                <h2>Stripe Payment Gateway & Automated DCA Schedules</h2>
              </div>
              <CreditCard className="w-5 h-5 text-indigo-400" />
            </div>
            <p>
              When setting up Dollar Cost Averaging (DCA) recurring deposits, payment processing is executed securely via Stripe PCI-DSS Level 1 payment gateway infrastructure.
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
              <li>You authorize ChainPay to process recurring charges according to your configured frequency (Daily, Weekly, Bi-Weekly, Monthly).</li>
              <li>Schedules can be paused or cancelled at any time prior to execution without cancellation penalty fees.</li>
              <li>Purchased crypto assets are settled directly to your connected non-custodial wallet upon successful payment clearance.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="bg-slate-950/50 border border-slate-800 p-6 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-base">
              <span className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-xs">4</span>
              <h2>Cryptocurrency Volatility & Financial Risk Disclosure</h2>
            </div>
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-200 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-1">High Risk Investment Warning</span>
                Cryptocurrency assets, tokens (including VIBE, ETH, BTC, SOL), and smart contract protocols are subject to high market volatility. Past performance is no guarantee of future returns. ChainPay does not provide investment, financial, tax, or legal advice.
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section className="bg-slate-950/50 border border-slate-800 p-6 rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-indigo-400 font-bold text-base">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-xs">5</span>
                <h2>Intellectual Property & Patent Disclosure</h2>
              </div>
              <Building className="w-5 h-5 text-indigo-400" />
            </div>
            <p>
              All proprietary algorithms, smart contract architectures, brand marks, and visual components are protected intellectual property of Oldtimevibescomllc and ChainPay Technologies Inc., with patent pending status. Unauthorized reproduction or reverse-engineering is strictly prohibited.
            </p>
          </section>

          {/* Section 6 */}
          <section className="bg-slate-950/50 border border-slate-800 p-6 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-base">
              <span className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-xs">6</span>
              <h2>Governing Law & Dispute Resolution</h2>
            </div>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to conflict of law principles. Mandatory binding individual arbitration shall resolve any claims arising under these terms.
            </p>
          </section>
        </div>
      ) : (
        <div className="space-y-8 text-slate-300 text-xs md:text-sm leading-relaxed">
          {/* Section 1 */}
          <section className="bg-slate-950/50 border border-slate-800 p-6 rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-emerald-400 font-bold text-base">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xs">1</span>
                <h2>Data Collection & Information We Process</h2>
              </div>
              <Database className="w-5 h-5 text-emerald-400" />
            </div>
            <p>
              ChainPay is designed with privacy-first principles. We collect minimal personal information necessary to deliver non-custodial blockchain, payment, and cloud services:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
              <li><strong className="text-slate-200">Account Credentials:</strong> Email address and profile display name provided during Google Auth or Firebase authentication.</li>
              <li><strong className="text-slate-200">Blockchain Data:</strong> Public Web3 wallet addresses and on-chain transaction hashes. Public ledger data is immutable by design.</li>
              <li><strong className="text-slate-200">Payment Metadata:</strong> Transaction totals, card brand, and masked last-4 digits processed securely via Stripe. We never store full credit card numbers.</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="bg-slate-950/50 border border-slate-800 p-6 rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-emerald-400 font-bold text-base">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xs">2</span>
                <h2>Google Workspace & OAuth Scopes Permissions</h2>
              </div>
              <Globe className="w-5 h-5 text-emerald-400" />
            </div>
            <p>
              When you enable the Google Workspace Cloud Hub integration, ChainPay requests explicit permission for Google Drive and Google Sheets APIs (<code className="text-emerald-300 font-mono">drive.file</code>, <code className="text-emerald-300 font-mono">spreadsheets</code>):
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
              <li>OAuth tokens are used exclusively to create and update requested accounting spreadsheets and JSON backup files in your personal Google Drive.</li>
              <li>ChainPay never reads, sells, or accesses un-related files stored in your personal Google Drive.</li>
              <li>Tokens are cached in client memory during your session and can be revoked at any time via your Google Account settings.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="bg-slate-950/50 border border-slate-800 p-6 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xs">3</span>
              <h2>How We Use Your Information</h2>
            </div>
            <p>
              Your data is strictly utilized to execute requested protocol operations:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-white font-bold block mb-0.5">DCA Automation</span>
                <span className="text-slate-400 text-xs">Triggering recurring Stripe card charges and transferring acquired tokens.</span>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-white font-bold block mb-0.5">Accounting Reports</span>
                <span className="text-slate-400 text-xs">Exporting transaction history reports to Google Sheets upon user click.</span>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="bg-slate-950/50 border border-slate-800 p-6 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xs">4</span>
              <h2>Data Retention & Deletion Rights (GDPR & CCPA)</h2>
            </div>
            <p>
              Under applicable data privacy regulations including GDPR and CCPA, you have the right to request deletion of your account data. You may delete your DCA schedules or submit a data erasure request by contacting our compliance team at <span className="text-emerald-400 font-semibold underline">privacy@chainpay.io</span>.
            </p>
          </section>

          {/* Section 5 */}
          <section className="bg-slate-950/50 border border-slate-800 p-6 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xs">5</span>
              <h2>Cookies & Local Client Storage</h2>
            </div>
            <p>
              ChainPay utilizes local client storage (<code className="text-slate-200 font-mono">localStorage</code>) to maintain user UI preferences, active view states, and legal acknowledgment tokens. No invasive cross-site tracking cookies are deployed.
            </p>
          </section>
        </div>
      )}

      {/* Footer Banner */}
      <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <div>
          <span>Need legal inquiries or compliance clarification?</span>
          <a href="mailto:legal@chainpay.io" className="text-indigo-400 font-semibold hover:underline ml-1">
            legal@chainpay.io
          </a>
        </div>
        <div className="flex items-center gap-2">
          <span>Version 2.4.0</span>
          <span className="text-slate-600">•</span>
          <span>Oldtimevibescomllc</span>
        </div>
      </div>
    </div>
  );
};

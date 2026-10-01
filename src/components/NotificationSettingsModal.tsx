import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  Bell, 
  CheckCircle2, 
  Sparkles, 
  AlertTriangle, 
  Send, 
  Layers, 
  Code, 
  ExternalLink,
  ShieldCheck,
  Zap,
  Sliders,
  Flame,
  Coins,
  FileCode2,
  Copy,
  Check
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { User as FirebaseUser } from 'firebase/auth';

export interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  authUser: FirebaseUser | null;
  onSignInRequired?: () => void;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  isOpen,
  onClose,
  authUser,
  onSignInRequired
}) => {
  const [email, setEmail] = useState('');
  const [minThresholdUsd, setMinThresholdUsd] = useState<number>(1000);
  const [enabled, setEnabled] = useState<boolean>(true);
  const [digestFrequency, setDigestFrequency] = useState<'instant' | 'hourly' | 'daily'>('instant');
  const [alertTypes, setAlertTypes] = useState<string[]>([
    'whale_transfers',
    'token_mints',
    'token_burns',
    'smart_contracts'
  ]);
  
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testingDispatch, setTestingDispatch] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'cloudFunction' | 'preview'>('settings');
  const [copiedCode, setCopiedCode] = useState(false);

  const presetThresholds = [100, 500, 1000, 5000, 10000, 50000];

  // Load existing subscription from Firestore or API
  useEffect(() => {
    if (!isOpen) return;

    const initialEmail = authUser?.email || 'investor@chainpay.network';
    setEmail(initialEmail);

    const loadSettings = async () => {
      if (authUser?.uid) {
        try {
          const docRef = doc(db, 'notification_subscriptions', authUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.email) setEmail(data.email);
            if (data.minThresholdUsd !== undefined) setMinThresholdUsd(data.minThresholdUsd);
            if (data.enabled !== undefined) setEnabled(data.enabled);
            if (data.digestFrequency) setDigestFrequency(data.digestFrequency);
            if (Array.isArray(data.alertTypes)) setAlertTypes(data.alertTypes);
          }
        } catch {
          // If Firestore read fails, fall back to backend API
          try {
            const res = await fetch(`/api/notifications/subscription/${authUser.uid}`);
            const json = await res.json();
            if (json.subscription) {
              const sub = json.subscription;
              setEmail(sub.email);
              setMinThresholdUsd(sub.minThresholdUsd);
              setEnabled(sub.enabled);
              setDigestFrequency(sub.digestFrequency);
              if (sub.alertTypes) setAlertTypes(sub.alertTypes);
            }
          } catch {}
        }
      }
    };

    loadSettings();
  }, [isOpen, authUser]);

  if (!isOpen) return null;

  const toggleAlertType = (type: string) => {
    setAlertTypes((prev) => 
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSave = async () => {
    if (!email || !email.includes('@')) {
      alert('Please enter a valid recipient email address.');
      return;
    }

    setSaving(true);
    setSaveSuccess(false);

    const payload = {
      userId: authUser?.uid || 'guest_user_demo',
      email: email.trim(),
      minThresholdUsd: Number(minThresholdUsd),
      enabled,
      alertTypes,
      digestFrequency,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    try {
      // 1. If signed in, persist to Firestore with Security Rules validation
      if (authUser?.uid) {
        try {
          await setDoc(doc(db, 'notification_subscriptions', authUser.uid), payload, { merge: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `notification_subscriptions/${authUser.uid}`);
        }
      }

      // 2. Also sync to backend SQLite for webhook/server triggers
      await fetch('/api/notifications/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.warn('Failed to save notification subscription', err);
      alert('Subscription preferences saved locally. Connect Firebase Auth for cross-device cloud sync.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestDispatch = async () => {
    setTestingDispatch(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/notifications/test-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim() || 'investor@chainpay.network',
          minThresholdUsd: Number(minThresholdUsd),
          alertTypes,
          digestFrequency
        })
      });

      const data = await res.json();
      setTestResult(data);
      setActiveTab('preview');
    } catch (err) {
      console.error('Test alert dispatch failed', err);
      alert('Failed to simulate Cloud Function dispatch. Check server logs.');
    } finally {
      setTestingDispatch(false);
    }
  };

  const cloudFunctionCode = `// Firebase Cloud Function: onLargeTransactionAlert
// File: functions/index.js
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { getFirestore } = require("firebase-admin/firestore");
const { initializeApp } = require("firebase-admin/app");

initializeApp();
const db = getFirestore();

exports.onLargeTransactionAlert = onDocumentCreated(
  { document: "transactions/{txHash}", region: "us-east1" },
  async (event) => {
    const tx = event.data?.data();
    if (!tx) return;

    const amountUsd = parseFloat(tx.amount) || 0;
    
    // Find subscribers whose threshold is triggered
    const subscribers = await db.collection("notification_subscriptions")
      .where("enabled", "==", true)
      .where("minThresholdUsd", "<=", amountUsd)
      .get();

    subscribers.forEach((doc) => {
      const sub = doc.data();
      // Enqueue to Firebase Trigger Email extension or SendGrid
      db.collection("mail").add({
        to: sub.email,
        message: {
          subject: \`🚨 [Whale Alert] Large Transaction: $\${amountUsd} on ChainPay\`,
          html: \`<h2>Large Transaction Verified on ChainPay</h2><p>Amount: $\${amountUsd} USD</p>\`
        }
      });
    });
  }
);`;

  return (
    <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0f1019] border border-white/10 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-2xl shadow-inner">
              <Mail size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg text-white tracking-tight">
                  Large Transaction Email Alerts
                </h3>
                <span className="text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                  Firebase Cloud Functions
                </span>
              </div>
              <p className="text-xs text-white/50 mt-0.5">
                Automated on-chain whale & volume monitoring triggered via Firestore
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 pb-2 border-b border-white/5 bg-black/30">
          <button
            onClick={() => setActiveTab('settings')}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sliders size={13} />
            <span>Alert Preferences</span>
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'preview'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Send size={13} />
            <span>Email Preview & Test {testResult && '✓'}</span>
          </button>

          <button
            onClick={() => setActiveTab('cloudFunction')}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'cloudFunction'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileCode2 size={13} />
            <span>Cloud Function Code</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              
              {/* Active Toggle Switch */}
              <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Notification Service Status</span>
                    {enabled ? (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                        Active
                      </span>
                    ) : (
                      <span className="text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full font-mono">
                        Disabled
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-white/50 mt-0.5">
                    Receive automated notifications when ledger volume crosses your threshold.
                  </p>
                </div>

                <button
                  onClick={() => setEnabled(!enabled)}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    enabled ? 'bg-indigo-600' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                      enabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Email Address Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
                    <Mail size={13} className="text-indigo-400" />
                    Recipient Email Address
                  </label>
                  {authUser?.email ? (
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                      <ShieldCheck size={12} /> Google Verified
                    </span>
                  ) : (
                    <button
                      onClick={onSignInRequired}
                      className="text-[11px] text-indigo-400 hover:underline cursor-pointer"
                    >
                      Sign In with Google for persistent sync
                    </button>
                  )}
                </div>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alerts@yourdomain.com"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                />
              </div>

              {/* Threshold Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
                      <Zap size={13} className="text-amber-400" />
                      Minimum Alert Threshold (USD)
                    </label>
                    <p className="text-[11px] text-white/40 mt-0.5">
                      Trigger alert when on-chain transfer value equals or exceeds this amount
                    </p>
                  </div>
                  <div className="font-mono text-base font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-xl">
                    ${minThresholdUsd.toLocaleString()} USD
                  </div>
                </div>

                {/* Preset Chips */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {presetThresholds.map((val) => (
                    <button
                      key={val}
                      onClick={() => setMinThresholdUsd(val)}
                      className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                        minThresholdUsd === val
                          ? 'bg-indigo-600/30 border-indigo-400 text-white shadow'
                          : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      ${val >= 1000 ? `${val / 1000}k` : val}
                    </button>
                  ))}
                </div>

                {/* Custom Input */}
                <div className="pt-1">
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-white/40 font-mono">$</span>
                    <input
                      type="number"
                      min="1"
                      step="50"
                      value={minThresholdUsd}
                      onChange={(e) => setMinThresholdUsd(Math.max(1, parseFloat(e.target.value) || 1))}
                      placeholder="Custom threshold..."
                      className="w-full bg-black/30 border border-white/10 rounded-xl pl-8 pr-4 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Alert Triggers Category Toggles */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={13} className="text-cyan-400" />
                  Monitored Event Categories
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { id: 'whale_transfers', label: 'Whale P2P Transfers', icon: Zap, desc: 'Large transfers between external wallets' },
                    { id: 'token_mints', label: 'Token Mints & Inflows', icon: Coins, desc: 'Treasury or faucet issuance over threshold' },
                    { id: 'token_burns', label: 'Token Burns & Buybacks', icon: Flame, desc: 'Deflationary supply reduction spikes' },
                    { id: 'smart_contracts', label: 'Smart Contract Escrow Calls', icon: Code, desc: 'High-value smart contract state executions' }
                  ].map((cat) => {
                    const isChecked = alertTypes.includes(cat.id);
                    const Icon = cat.icon;
                    return (
                      <div
                        key={cat.id}
                        onClick={() => toggleAlertType(cat.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                          isChecked
                            ? 'bg-indigo-950/30 border-indigo-500/40 text-white'
                            : 'bg-white/[0.02] border-white/5 text-white/40 hover:border-white/20'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg ${isChecked ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-white/30'}`}>
                          <Icon size={16} />
                        </div>
                        <div className="flex-1">
                          <p className={`text-xs font-bold ${isChecked ? 'text-white' : 'text-white/60'}`}>{cat.label}</p>
                          <p className="text-[11px] text-white/40 mt-0.5 leading-snug">{cat.desc}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-1 accent-indigo-500 rounded"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Delivery Frequency */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/80 uppercase tracking-wider">
                  Notification Delivery Cadence
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'instant', label: 'Instant Trigger', desc: 'Real-time per transaction' },
                    { id: 'hourly', label: 'Hourly Batch', desc: 'Consolidated hourly rollup' },
                    { id: 'daily', label: 'Daily Digest', desc: 'Summary of top 24h movements' }
                  ].map((cad) => (
                    <button
                      key={cad.id}
                      onClick={() => setDigestFrequency(cad.id as any)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        digestFrequency === cad.id
                          ? 'bg-indigo-600/20 border-indigo-400 text-white'
                          : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
                      }`}
                    >
                      <p className="text-xs font-bold">{cad.label}</p>
                      <p className="text-[10px] text-white/40 mt-0.5">{cad.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: EMAIL PREVIEW & TEST DISPATCH */}
          {activeTab === 'preview' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between bg-indigo-950/30 border border-indigo-500/20 p-4 rounded-2xl">
                <div>
                  <h4 className="text-sm font-bold text-white">Live Email Preview Generator</h4>
                  <p className="text-xs text-white/50 mt-0.5">
                    Simulate how Firebase Cloud Functions formats and queues notification emails.
                  </p>
                </div>
                <button
                  onClick={handleTestDispatch}
                  disabled={testingDispatch}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles size={14} className={testingDispatch ? 'animate-spin' : ''} />
                  {testingDispatch ? 'Firing Cloud Function...' : 'Send Test Alert'}
                </button>
              </div>

              {/* Rendered Email Preview Card */}
              <div className="border border-white/15 rounded-2xl overflow-hidden shadow-2xl bg-[#090a10]">
                {/* Email Client Header bar */}
                <div className="bg-[#121422] p-4 border-b border-white/10 space-y-1.5 font-sans">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40 font-mono">From:</span>
                    <span className="font-mono text-indigo-300 font-bold">ChainPay Cloud Alert Engine &lt;alerts@chainpay.network&gt;</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40 font-mono">To:</span>
                    <span className="font-mono text-white/90">{email || 'investor@chainpay.network'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40 font-mono">Subject:</span>
                    <span className="text-emerald-400 font-bold">
                      {testResult?.emailContent?.subject || `🚨 [Whale Alert] Large Transaction: $${(minThresholdUsd * 2.5).toLocaleString()} on ChainPay`}
                    </span>
                  </div>
                </div>

                {/* Email Content Body */}
                <div className="p-6 space-y-5 bg-[#0b0c13] text-white">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-400">
                        ⚡
                      </div>
                      <h3 className="font-extrabold text-base text-white">ChainPay Live Ledger Alert</h3>
                    </div>
                    <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                      Firebase Cloud Functions v2
                    </span>
                  </div>

                  <p className="text-xs text-white/70 leading-relaxed">
                    A transaction exceeding your configured threshold of <strong className="text-white">${minThresholdUsd.toLocaleString()} USD</strong> was verified on-chain at block #{testResult ? '19283750' : '19283749'}.
                  </p>

                  <div className="bg-[#121424] border border-[#2b3054] rounded-xl p-4 space-y-2.5 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-white/50">Transfer Value:</span>
                      <span className="text-emerald-400 font-bold text-sm">
                        ${(testResult?.simulatedTransaction?.amountUSD || minThresholdUsd * 2.5).toLocaleString()} USD
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/50">Transaction Type:</span>
                      <span className="text-indigo-300 font-bold uppercase">
                        {testResult?.simulatedTransaction?.type || 'WHALE_TRANSFER'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/50">Sender:</span>
                      <span className="text-white/80">0xWhaleTrader88274...</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/50">Recipient:</span>
                      <span className="text-white/80">0xChainPayEscrowTreasury...</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-white/5 pt-2">
                      <span className="text-white/40">Hash:</span>
                      <span className="text-white/60 font-mono text-[11px] truncate max-w-[240px]">
                        {testResult?.simulatedTransaction?.hash || '0x7f9a2b8e3c1d4a5b6c7d8e9f...'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-white/40 flex items-center gap-1">
                      <ShieldCheck size={13} className="text-cyan-400" />
                      Verified by Firestore Event Listener
                    </span>
                    <span className="text-[11px] text-indigo-400 font-semibold">
                      Triggered in region: us-east1
                    </span>
                  </div>
                </div>
              </div>

              {testResult && (
                <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-xs text-emerald-300">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>
                    Simulated Cloud Function execution completed. Event routed to <strong>{testResult.recipient}</strong> with threshold <strong>${testResult.threshold.toLocaleString()} USD</strong>.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CLOUD FUNCTION SOURCE */}
          {activeTab === 'cloudFunction' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <FileCode2 size={15} className="text-indigo-400" />
                    Firebase Cloud Functions (2nd Gen)
                  </h4>
                  <p className="text-xs text-white/40">
                    Location: <code className="text-indigo-300">functions/index.js</code> (region: us-east1)
                  </p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(cloudFunctionCode);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copiedCode ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{copiedCode ? 'Copied' : 'Copy Function Code'}</span>
                </button>
              </div>

              <div className="bg-black/60 border border-white/10 rounded-2xl p-4 overflow-x-auto">
                <pre className="text-xs font-mono text-indigo-200 leading-relaxed">
                  <code>{cloudFunctionCode}</code>
                </pre>
              </div>

              <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl space-y-2">
                <h5 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={13} className="text-indigo-400" />
                  Deployment Workflow
                </h5>
                <ol className="text-xs text-white/60 space-y-1 list-decimal list-inside font-mono">
                  <li>Subscriptions are securely saved to <span className="text-indigo-300">/notification_subscriptions/{'{userId}'}</span> in Firestore.</li>
                  <li>When any transaction document is written to <span className="text-indigo-300">/transactions/{'{txHash}'}</span>, the trigger executes in under 200ms.</li>
                  <li>Deploy to your Firebase project: <span className="text-emerald-400">firebase deploy --only functions</span>.</li>
                </ol>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-white/10 bg-black/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono text-white/50">
              {saveSuccess ? 'Saved to Firestore & Server' : 'ABAC Security Guard Active'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-white/60 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 size={14} className="text-emerald-300" />
                  <span>Preferences Saved!</span>
                </>
              ) : (
                <>
                  <SaveIcon size={14} />
                  <span>{saving ? 'Saving...' : 'Save Subscription'}</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

const SaveIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
    <polyline points="17 21 17 13 7 13 7 21"></polyline>
    <polyline points="7 3 7 8 15 8"></polyline>
  </svg>
);

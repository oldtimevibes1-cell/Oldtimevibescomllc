/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCcw, 
  CreditCard, 
  TrendingUp, 
  ShieldCheck, 
  Activity, 
  ChevronRight, 
  ExternalLink, 
  Coins, 
  Search, 
  Box, 
  Hash, 
  Clock, 
  User, 
  ArrowRight, 
  X, 
  MessageSquare, 
  Sparkles, 
  Bot, 
  Send, 
  Vote, 
  Ticket, 
  Flame, 
  Key, 
  Award, 
  Download, 
  CheckCircle2, 
  Calendar, 
  BadgeCheck, 
  AlertTriangle, 
  Zap, 
  Check, 
  FileCode, 
  Layers, 
  Cpu,
  Bell,
  Volume2,
  VolumeX,
  Mail,
  QrCode,
  Smartphone,
  Copy
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getMarketInsight, explainTransaction } from './services/geminiService';
import { SmartContractsSection } from './components/SmartContractsSection';
import { WorkspaceSection } from './components/WorkspaceSection';
import { DcaSchedulerSection } from './components/DcaSchedulerSection';
import { LegalSection } from './components/LegalSection';
import { ToastNotificationSystem, type ToastItem, playToastChime } from './components/ToastNotificationSystem';
import { NotificationSettingsModal } from './components/NotificationSettingsModal';
import { auth, googleProvider, db, handleFirestoreError, OperationType, setCachedAccessToken } from './firebase';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface Transaction {
  id: string;
  type: 'buy' | 'send' | 'receive' | 'mint' | 'burn' | 'transfer';
  amount: string;
  asset: string;
  status: 'completed' | 'pending' | 'failed';
  date: string;
  hash: string;
}

interface MarketData {
  symbol: string;
  name: string;
  price: string;
  change: string;
  isUp: boolean;
}

interface LedgerEntry {
  id: string;
  from: string;
  to: string;
  amount: string;
  type: string;
  hash: string;
  status: string;
}

interface Proposal {
  id: number;
  title: string;
  description: string;
  cost: number;
  votes: number;
  category: string;
}

interface TokenWallet {
  address: string;
  balance: number;
  label: string;
  private_key: string;
  county_treasury: number;
}

// --- Components ---

const StatCard = ({ title, value, icon: Icon, trend, colorClass = "text-indigo-400" }: { title: string, value: string, icon: any, trend?: string, colorClass?: string }) => (
  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 bg-indigo-500/20 rounded-lg">
        <Icon className={cn("w-5 h-5", colorClass)} />
      </div>
      {trend && (
        <span className={cn(
          "text-xs font-medium px-2 py-1 rounded-full",
          trend.startsWith('+') ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
        )}>
          {trend}
        </span>
      )}
    </div>
    <p className="text-white/50 text-sm font-medium mb-1">{title}</p>
    <h3 className="text-2xl font-bold text-white">{value}</h3>
  </div>
);

const LedgerRow = ({ entry }: { entry: LedgerEntry }) => (
  <div className="flex items-center justify-between p-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
    <div className="flex flex-col">
      <div className="flex items-center gap-2">
        <span className={cn(
          "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter",
          entry.type.includes('Mint') ? "bg-emerald-500/10 text-emerald-400" :
          entry.type.includes('Burn') ? "bg-amber-500/10 text-amber-500" : "bg-indigo-500/10 text-indigo-400"
        )}>
          {entry.type}
        </span>
        <span className="text-[10px] text-white/30 font-mono hidden md:inline">{entry.hash}</span>
      </div>
      <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 mt-1">
        <span className="text-xs text-white/70 font-mono truncate max-w-[120px] md:max-w-[200px]" title={entry.from}>{entry.from}</span>
        <ChevronRight size={10} className="text-white/20 rotate-90 md:rotate-0" />
        <span className="text-xs text-white/70 font-mono truncate max-w-[120px] md:max-w-[200px]" title={entry.to}>{entry.to}</span>
      </div>
    </div>
    <div className="text-right">
      <p className={cn(
        "text-sm font-bold",
        entry.type.includes('Mint') ? "text-emerald-400" :
        entry.type.includes('Burn') ? "text-amber-500" : "text-indigo-400"
      )}>{entry.amount}</p>
      <div className="flex items-center gap-1 justify-end">
        <ShieldCheck size={10} className="text-emerald-500" />
        <span className="text-[10px] text-emerald-500/70 uppercase font-bold">Verified</span>
      </div>
    </div>
  </div>
);

const ExplorerDetail = ({ data, onClose }: { data: any, onClose: () => void }) => {
  if (!data) return null;

  const isBlock = data.type === 'block';

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-[#121214] border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              {isBlock ? <Box className="text-indigo-400" size={20} /> : <Hash className="text-indigo-400" size={20} />}
            </div>
            <div>
              <h2 className="text-xl font-bold">{isBlock ? 'Block Details' : 'Transaction Details'}</h2>
              <p className="text-xs text-white/40 font-mono break-all">{data.hash}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X size={20} className="text-white/40" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-8">
            {isBlock ? (
              <>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Block Height</p>
                  <p className="text-lg font-bold text-indigo-400"># {data.height}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Timestamp</p>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-white/40" />
                    <p className="text-sm">{new Date(data.timestamp).toLocaleString()}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Transaction Count</p>
                  <p className="text-lg font-bold">{data.transactions}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Size</p>
                  <p className="text-lg font-bold">{data.size}</p>
                </div>
                <div className="col-span-2 space-y-1">
                  <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Miner Address</p>
                  <p className="text-xs font-mono text-indigo-400 break-all bg-white/5 p-2 rounded-xl">{data.miner}</p>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Value Transferred</p>
                  <p className="text-2xl font-bold text-emerald-400">{data.amount}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Receipt Status</p>
                  <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-full">
                    {data.status || "Success"}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Block Confirmation</p>
                  <p className="text-sm font-bold text-indigo-400"># {data.blockHeight}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Timestamp</p>
                  <p className="text-sm">{new Date(data.timestamp).toLocaleString()}</p>
                </div>
                <div className="col-span-2 p-4 bg-white/5 rounded-2xl space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="space-y-1 flex-1">
                      <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Sender Address</p>
                      <p className="text-xs font-mono text-indigo-300 break-all bg-black/40 p-1.5 rounded">{data.sender}</p>
                    </div>
                    <ArrowRight size={16} className="text-white/20 self-center hidden md:block" />
                    <div className="space-y-1 flex-1 md:text-right">
                      <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Receiver Address</p>
                      <p className="text-xs font-mono text-purple-300 break-all bg-black/40 p-1.5 rounded">{data.receiver}</p>
                    </div>
                  </div>
                </div>
                <div className="col-span-2 space-y-1">
                  <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Network Gas Fee</p>
                  <p className="text-sm font-bold text-white/60">{data.fee || "0.0 VIBE"}</p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="p-6 bg-white/5 border-t border-white/10 flex justify-end">
          <button 
            onClick={onClose}
            className="bg-white text-black px-6 py-2 rounded-xl text-sm font-bold hover:bg-white/90 transition-all"
          >
            Close Explorer
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// LocalStorage Preference Keys
const STORAGE_KEY_SOUND_ENABLED = 'chainpay_pref_sound_enabled';
const STORAGE_KEY_POLLING_INTERVAL = 'chainpay_pref_polling_interval_ms';
const STORAGE_KEY_POLLING_ACTIVE = 'chainpay_pref_polling_active';

export default function App() {
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'coinbase'>('stripe');
  const [buyAmount, setBuyAmount] = useState('100');
  const [selectedAsset, setSelectedAsset] = useState('ETH');

  // QR Code Generator State for Stripe Checkout
  const [showQrCode, setShowQrCode] = useState(false);
  const [qrType, setQrType] = useState<'banking' | 'crypto'>('banking');
  const [qrCopied, setQrCopied] = useState(false);
  const [qrScanSuccess, setQrScanSuccess] = useState(false);

  const assetRates: Record<string, number> = {
    ETH: 2850,
    BTC: 65000,
    USDC: 1,
    SOL: 150,
    VIBE: 0.1
  };

  const getCryptoAmount = () => {
    const rate = assetRates[selectedAsset] || 1;
    const usd = parseFloat(buyAmount) || 0;
    const cryptoAmt = usd / rate;
    return selectedAsset === 'USDC' ? cryptoAmt.toFixed(2) : cryptoAmt.toFixed(6);
  };

  const treasuryAddresses: Record<string, string> = {
    ETH: '0x71C8364f3B8022dF436db0688023c28079C41b82',
    BTC: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
    USDC: '0x71C8364f3B8022dF436db0688023c28079C41b82',
    SOL: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    VIBE: '0x71C8364f3B8022dF436db0688023c28079C41b82'
  };

  const getQrValue = () => {
    const usd = parseFloat(buyAmount) || 10;
    const cryptoAmt = getCryptoAmount();
    const address = treasuryAddresses[selectedAsset] || treasuryAddresses.ETH;

    if (qrType === 'crypto') {
      if (selectedAsset === 'BTC') {
        return `bitcoin:${address}?amount=${cryptoAmt}&label=ChainPay%20Deposit`;
      } else if (selectedAsset === 'SOL') {
        return `solana:${address}?amount=${cryptoAmt}&label=ChainPay%20Deposit`;
      } else if (selectedAsset === 'USDC') {
        const units = Math.floor(usd * 1e6);
        return `ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48/transfer?address=${address}&uint256=${units}`;
      } else {
        return `ethereum:${address}?value=${cryptoAmt}&gas=21000`;
      }
    } else {
      const currentHost = typeof window !== 'undefined' ? window.location.origin : 'https://chainpay.network';
      return `${currentHost}/?checkout=stripe&amount=${usd}&asset=${selectedAsset}&gateway=stripe&ref=CP-${Date.now().toString(36).toUpperCase()}`;
    }
  };

  const handleCopyQr = () => {
    const val = getQrValue();
    navigator.clipboard.writeText(val);
    setQrCopied(true);
    setTimeout(() => setQrCopied(false), 2000);
  };

  const handleSimulateMobileScan = async () => {
    setQrScanSuccess(true);
    playToastChime(true);
    try {
      await fetch('/api/blockchain/transact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: treasuryAddresses[selectedAsset] || treasuryAddresses.ETH,
          amount: parseFloat(buyAmount) || 10,
          asset: selectedAsset,
          memo: `QR Instant Scan (${qrType === 'banking' ? 'Mobile Banking / Stripe Express' : 'Crypto Wallet Direct'})`
        })
      });
      fetchStats();
      fetchLedger();
    } catch {
      // ignore
    }
    setTimeout(() => setQrScanSuccess(false), 3500);
  };
  
  // Firebase Auth State
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      setAuthLoading(false);
      if (user) {
        try {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || 'ChainPay User',
            createdAt: new Date().toISOString()
          }, { merge: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setCachedAccessToken(credential.accessToken);
      }
    } catch (err) {
      console.error("Firebase Auth Error:", err);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setCachedAccessToken(null);
    } catch (err) {
      console.error("Firebase SignOut Error:", err);
    }
  };

  // Dynamic metrics from server
  const [stats, setStats] = useState<any>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  // VIBE Token Economy States
  const [activeMainView, setActiveMainView] = useState<'dashboard' | 'contracts' | 'workspace' | 'dca' | 'legal'>('dashboard');
  const [legalInitialTab, setLegalInitialTab] = useState<'terms' | 'privacy'>('terms');
  const [wallet, setWallet] = useState<TokenWallet | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [faucetAmount, setFaucetAmount] = useState('50');
  const [transferTarget, setTransferTarget] = useState('');
  const [transferAmount, setTransferAmount] = useState('20');
  const [walletLoading, setWalletLoading] = useState(false);
  const [governanceLoading, setGovernanceLoading] = useState(false);
  const [ticketActive, setTicketActive] = useState(false);
  const [rebateActive, setRebateActive] = useState(false);
  const [customKeyVisible, setCustomKeyVisible] = useState(false);
  
  // Stripe & Subscriptions State
  const [stripeConfig, setStripeConfig] = useState<{ configured: boolean; webhookConfigured: boolean; publishableKey: string } | null>(null);
  const [activeSubscriptions, setActiveSubscriptions] = useState<any[]>([]);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const [stripeTab, setStripeTab] = useState<'subscription' | 'one_time'>('subscription');
  const [selectedSubPlan, setSelectedSubPlan] = useState<{ id: string; name: string; amount: number; interval: 'month' | 'week'; desc: string }>({
    id: 'pass_monthly',
    name: 'Monthly Commuter Transit Pass',
    amount: 29.99,
    interval: 'month',
    desc: 'Unlimited rides on all county bus routes + 300 VIBE monthly bonus'
  });

  // AI State
  const [aiInsight, setAiInsight] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiChat, setShowAiChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);

  // Real-Time Toast Notifications State with localStorage persistence
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [toastHistory, setToastHistory] = useState<ToastItem[]>([]);
  const [showEmailNotificationModal, setShowEmailNotificationModal] = useState<boolean>(false);

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SOUND_ENABLED);
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const [pollingIntervalMs, setPollingIntervalMs] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_POLLING_INTERVAL);
      if (saved !== null) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 1000 && val <= 60000) return val;
      }
      return 3500;
    } catch {
      return 3500;
    }
  });

  const [isPollingActive, setIsPollingActive] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_POLLING_ACTIVE);
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const [isSimulating, setIsSimulating] = useState(false);

  // Sync preferences to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SOUND_ENABLED, JSON.stringify(soundEnabled));
    } catch (e) {
      console.warn('Failed to save sound preference to localStorage:', e);
    }
  }, [soundEnabled]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_POLLING_INTERVAL, pollingIntervalMs.toString());
    } catch (e) {
      console.warn('Failed to save polling interval preference to localStorage:', e);
    }
  }, [pollingIntervalMs]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_POLLING_ACTIVE, JSON.stringify(isPollingActive));
    } catch (e) {
      console.warn('Failed to save polling active preference to localStorage:', e);
    }
  }, [isPollingActive]);

  // Synchronize preferences across browser tabs in real-time
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_SOUND_ENABLED && e.newValue !== null) {
        try { setSoundEnabled(JSON.parse(e.newValue)); } catch {}
      } else if (e.key === STORAGE_KEY_POLLING_INTERVAL && e.newValue !== null) {
        try {
          const val = parseInt(e.newValue, 10);
          if (!isNaN(val)) setPollingIntervalMs(val);
        } catch {}
      } else if (e.key === STORAGE_KEY_POLLING_ACTIVE && e.newValue !== null) {
        try { setIsPollingActive(JSON.parse(e.newValue)); } catch {}
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const seenTxHashesRef = useRef<Set<string>>(new Set());
  const lastSeenBlockHeightRef = useRef<number | null>(null);
  const isInitialLedgerLoadRef = useRef<boolean>(true);

  const addToast = (toastItem: ToastItem) => {
    if (soundEnabled) {
      playToastChime(toastItem.type === 'block');
    }
    // Limit to max 4 visible toasts on screen simultaneously
    setToasts((prev) => [toastItem, ...prev.slice(0, 3)]);
    setToastHistory((prev) => [toastItem, ...prev.slice(0, 99)]);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch functions with real-time diff detection
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/blockchain/stats');
      if (!res.ok) return;
      const data = await res.json();
      setStats(data);
      generateMarketInsight(data);
    } catch {
      // Gracefully ignore transient poll errors
    }
  };

  const fetchLedger = async () => {
    try {
      const res = await fetch('/api/blockchain/ledger');
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data)) return;
      setLedger(data);

      if (isInitialLedgerLoadRef.current) {
        // Record all existing items initially without firing alerts
        data.forEach((tx: any) => {
          const key = tx.rawHash || tx.id;
          if (key) seenTxHashesRef.current.add(key);
        });
      } else {
        // Find new transactions that were not in the seen set
        const newTxs: any[] = [];
        data.forEach((tx: any) => {
          const key = tx.rawHash || tx.id;
          if (key && !seenTxHashesRef.current.has(key)) {
            seenTxHashesRef.current.add(key);
            newTxs.push(tx);
          }
        });

        // Trigger real-time toast alert for each newly added transaction
        newTxs.forEach((tx: any) => {
          const isMint = tx.type?.includes('Mint');
          const isBurn = tx.type?.includes('Burn');
          const isDeploy = tx.type?.includes('Deploy');
          const isCall = tx.type?.includes('Call');

          const title = isMint 
            ? `🪙 VIBE Minted: ${tx.amount}`
            : isBurn 
            ? `🔥 VIBE Burned: ${tx.amount}`
            : isDeploy
            ? `📜 Smart Contract Deployed`
            : isCall
            ? `⚙️ Smart Contract Execution`
            : `⚡ New Ledger Tx: ${tx.amount}`;

          const message = tx.additionalInfo 
            ? `${tx.additionalInfo} (from ${tx.from} to ${tx.to})`
            : `Verified ${tx.type || 'Transaction'} on-chain at block #${tx.blockHeight || 'Pending'}.`;

          addToast({
            id: `tx_${tx.rawHash || tx.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            type: 'transaction',
            title,
            message,
            timestamp: Date.now(),
            details: {
              hash: tx.hash,
              rawHash: tx.rawHash || tx.id,
              blockHeight: tx.blockHeight,
              amount: tx.amount,
              from: tx.from,
              to: tx.to,
              txType: tx.type,
              fee: tx.fee,
              info: tx.additionalInfo
            },
            data: {
              type: 'transaction',
              id: (tx.rawHash || tx.id).substring(0, 12),
              hash: tx.rawHash || tx.id,
              blockHeight: tx.blockHeight || 19283746,
              timestamp: tx.timestamp || new Date().toISOString(),
              sender: tx.from,
              receiver: tx.to,
              amount: tx.amount,
              fee: tx.fee || '0.0001 ETH',
              status: tx.status === 'verified' ? 'Success' : tx.status
            }
          });
        });
      }
    } catch {
      // Gracefully ignore transient poll errors
    }
  };

  const fetchBlocks = async () => {
    try {
      const res = await fetch('/api/blockchain/blocks');
      if (!res.ok) return;
      const blocksData = await res.json();
      if (!Array.isArray(blocksData) || blocksData.length === 0) return;

      const latest = blocksData[0];
      if (lastSeenBlockHeightRef.current === null) {
        lastSeenBlockHeightRef.current = latest.height;
      } else if (latest.height > lastSeenBlockHeightRef.current) {
        const newHeight = latest.height;
        lastSeenBlockHeightRef.current = newHeight;

        // Trigger real-time toast alert for newly added/mined block!
        addToast({
          id: `block_${newHeight}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          type: 'block',
          title: `Block #${newHeight} Appended to Ledger`,
          message: `New block sealed with ${latest.transactions_count} transaction(s). Miner: ${latest.miner.substring(0, 14)}... Gas: ${latest.gas_used}`,
          timestamp: Date.now(),
          details: {
            blockHeight: newHeight,
            hash: latest.hash.substring(0, 18) + '...',
            rawHash: latest.hash,
            miner: latest.miner,
            size: latest.size,
            info: `${latest.transactions_count} transactions`
          },
          data: {
            type: 'block',
            id: newHeight.toString(),
            height: newHeight,
            hash: latest.hash,
            timestamp: latest.timestamp,
            transactions: latest.transactions_count,
            miner: latest.miner,
            size: latest.size,
            gasUsed: latest.gas_used
          }
        });
      }
    } catch {
      // Gracefully ignore transient poll errors
    }
  };

  const fetchWallet = async () => {
    try {
      const res = await fetch('/api/token/wallet');
      if (!res.ok) return;
      const data = await res.json();
      setWallet(data);
    } catch {
      // Gracefully ignore transient poll errors
    }
  };

  const fetchProposals = async () => {
    try {
      const res = await fetch('/api/token/proposals');
      if (!res.ok) return;
      const data = await res.json();
      setProposals(data);
    } catch {
      // Gracefully ignore transient poll errors
    }
  };

  const fetchStripeConfig = async () => {
    try {
      const res = await fetch('/api/stripe/config');
      if (!res.ok) return;
      const data = await res.json();
      setStripeConfig(data);
    } catch {
      // Gracefully ignore transient poll errors
    }
  };

  const fetchActiveSubscriptions = async () => {
    try {
      const res = await fetch('/api/subscriptions/active');
      if (!res.ok) return;
      const data = await res.json();
      setActiveSubscriptions(data);
    } catch {
      // Gracefully ignore transient poll errors
    }
  };

  // Simulate a live transit transaction and mine a new block
  const handleSimulateEvent = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/blockchain/simulate', { method: 'POST' });
      const data = await res.json();
      if (data.status === 'success') {
        // Immediately run fetches to update state and trigger real-time toasts
        await Promise.all([fetchLedger(), fetchBlocks(), fetchStats(), fetchWallet()]);
      }
    } catch (err) {
      console.error('Failed to simulate network event:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Initial load and URL query param check
  useEffect(() => {
    const initData = async () => {
      await Promise.all([
        fetchStats(),
        fetchLedger(),
        fetchBlocks(),
        fetchWallet(),
        fetchProposals(),
        fetchStripeConfig(),
        fetchActiveSubscriptions()
      ]);
      // End initial load after first data population
      setTimeout(() => {
        isInitialLedgerLoadRef.current = false;
      }, 500);
    };

    initData();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      const plan = urlParams.get('plan') || 'Pass/Subscription';
      setCheckoutNotice(`🎉 Payment Successful! ${plan} activated & VIBE tokens rewarded.`);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('canceled') === 'true') {
      setCheckoutNotice(`ℹ️ Stripe checkout session was canceled.`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Real-time polling interval
  useEffect(() => {
    if (!isPollingActive) return;

    const intervalId = setInterval(() => {
      fetchLedger();
      fetchBlocks();
      fetchStats();
      fetchWallet();
    }, pollingIntervalMs);

    return () => clearInterval(intervalId);
  }, [isPollingActive, pollingIntervalMs]);

  const handleStripeCheckout = async (
    mode: 'payment' | 'subscription',
    planName?: string,
    amountVal?: number,
    intervalVal: 'month' | 'week' = 'month'
  ) => {
    setLoading(true);
    const amt = amountVal || parseFloat(buyAmount) || 29.99;
    const name = planName || (mode === 'subscription' ? 'Monthly Commuter Transit Pass' : `Purchase ${selectedAsset}`);

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amt,
          mode: mode,
          planName: name,
          interval: intervalVal,
          cryptoType: selectedAsset,
          currency: 'usd'
        })
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.requiresConfig) {
        alert("STRIPE_SECRET_KEY is not configured in environment variables.\n\nPlease add STRIPE_SECRET_KEY in AI Studio secrets or environment setup to execute live Stripe payments.");
      } else {
        alert(data.error || "Failed to initiate Stripe Checkout session.");
      }
    } catch (err: any) {
      alert("Error contacting Stripe API server: " + err.message);
    } finally {
      setLoading(false);
      setTimeout(() => {
        fetchWallet();
        fetchActiveSubscriptions();
      }, 1500);
    }
  };

  const handleOpenPortal = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "No active Stripe customer or subscription found.");
      }
    } catch (err: any) {
      alert("Error opening Stripe Customer Portal: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const lastInsightTimeRef = useRef<number>(0);
  const generateMarketInsight = async (data: any, force = false) => {
    const now = Date.now();
    if (!force && now - lastInsightTimeRef.current < 180000) return; // limit to once every 3 minutes unless forced
    lastInsightTimeRef.current = now;
    setIsAiLoading(true);
    const insight = await getMarketInsight(data);
    setAiInsight(insight || '');
    setIsAiLoading(false);
  };

  const handleAiChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setIsAiLoading(true);

    try {
      const response = await explainTransaction({ query: userMsg, context: 'User General Help Chat' });
      setChatMessages(prev => [...prev, { role: 'ai', text: response || 'I parsed your query and generated insights.' }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I encountered an error and could not complete that query.' }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleBuy = async () => {
    setLoading(true);
    const endpoint = paymentMethod === 'stripe' ? '/api/create-checkout-session' : '/api/create-coinbase-charge';
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(buyAmount),
          cryptoType: selectedAsset
        })
      });
      const data = await response.json();
      if (data.url) {
        // Since we are also auto-minting 10x loyalty VIBE tokens on purchase creation, tell user
        alert(`Redirecting to payment port. We have provisioned [${Math.floor(parseFloat(buyAmount) * 10)} VIBE] Loyalty Tokens directly to your Default Wallet for initiating this deposit!`);
        window.location.href = data.url;
      } else {
        alert(data.error || `Failed to initiate ${paymentMethod} checkout. Make sure API keys are set.`);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('An error occurred during payment setup. Please verify environment properties.');
    } finally {
      setLoading(false);
      // Wait a moment and refresh stats/wallet
      setTimeout(() => {
        fetchWallet();
        fetchLedger();
        fetchBlocks();
        fetchStats();
      }, 1500);
    }
  };

  // Interactive Faucet Minting
  const handleFaucetMint = async () => {
    setWalletLoading(true);
    try {
      const res = await fetch('/api/token/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(faucetAmount), reason: 'Faucet Playground Claim' })
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchWallet();
        fetchLedger();
        fetchBlocks();
        fetchStats();
        alert(`MINED & MINTED: Successfully claimed ${faucetAmount} VIBE from Developer Faucet! \nNew Block Height: #${data.block_height}\nTx Hash: ${data.tx_hash}`);
      } else {
        alert(data.error || "Faucet claim failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Error invoking token mint faucet.");
    } finally {
      setWalletLoading(false);
    }
  };

  // P2P Token Transfers
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferTarget.trim() || !transferAmount) {
      alert("Please fill in recipient address and a valid transfer quantity.");
      return;
    }
    setWalletLoading(true);
    try {
      const res = await fetch('/api/token/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: transferTarget.trim(), amount: parseFloat(transferAmount) })
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchWallet();
        fetchLedger();
        fetchBlocks();
        fetchStats();
        setTransferTarget('');
        alert(`SECURE P2P TRANSFER COMPLETED: Sent ${transferAmount} VIBE to ${transferTarget}!\nRecorded on Block: #${data.block_height}`);
      } else {
        alert(data.error || "P2P Transfer failed. Ensure balance exists.");
      }
    } catch (err) {
      console.error(err);
      alert("Error submitting P2P transfer.");
    } finally {
      setWalletLoading(false);
    }
  };

  // Utility Token Burning
  const handleBurnRedeem = async (amount: number, utility: 'ticket' | 'rebate' | 'feedback', description: string) => {
    if (!wallet || wallet.balance < amount) {
      alert("Insufficient VIBE balance. Claim tokens from faucet or buy crypto with Stripe/Coinbase first to earn VIBE loyalty tokens!");
      return;
    }
    setWalletLoading(true);
    try {
      const res = await fetch('/api/token/burn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, utility: description })
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchWallet();
        fetchLedger();
        fetchBlocks();
        fetchStats();
        if (utility === 'ticket') setTicketActive(true);
        if (utility === 'rebate') setRebateActive(true);
        alert(`IMMUTABLE BURN PROCESSED: Successfully burned ${amount} VIBE for [${description}]!\nOn-chain event registered: ${data.tx_hash.substring(0,24)}...`);
      } else {
        alert(data.error || "Burn execution failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Error calling burn executor.");
    } finally {
      setWalletLoading(false);
    }
  };

  // Voting by burning VIBE Governance shares (1 Token per cast vote)
  const handleCastVote = async (proposalId: number, cost: number) => {
    if (!wallet || wallet.balance < cost) {
      alert(`Insufficient VIBE to submit vote. Voting in municipal transit upgrades costs exactly ${cost} VIBE tokens.`);
      return;
    }
    setGovernanceLoading(true);
    try {
      const res = await fetch('/api/token/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId, cost })
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchWallet();
        fetchLedger();
        fetchBlocks();
        fetchStats();
        fetchProposals();
        alert(`GOVERNANCE VOTE CONFIRMED: Destroyed ${cost} VIBE to sign ballot for: "${data.proposal_title}"!\nNew live tally: ${data.votes} votes`);
      } else {
        alert(data.error || "Ballot submission failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to deliver digital ballot.");
    } finally {
      setGovernanceLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(`/api/blockchain/search/${searchQuery.trim()}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResult(data);
      } else {
        alert('No blocks or transactions found matching that hash, height, or address.');
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('An error occurred during blockchain search query.');
    } finally {
      setIsSearching(false);
    }
  };

  // Standard recent user-facing txs (static demo transactions combined with dynamic actions)
  const baseTxs: Transaction[] = [
    { id: 'tx-2', type: 'send', amount: '120.00', asset: 'USDC', status: 'completed', date: 'Yesterday', hash: '0x12a34be97782ea7c3465b82e2abf1539' },
    { id: 'tx-3', type: 'receive', amount: '0.002', asset: 'BTC', status: 'completed', date: '2 days ago', hash: '0x98f76da11facdae2abf1539bf71de1b7' },
  ];

  const markets: MarketData[] = [
    { symbol: 'BTC', name: 'Bitcoin', price: '$52,431.20', change: '+2.4%', isUp: true },
    { symbol: 'ETH', name: 'Ethereum', price: '$2,850.42', change: '+1.8%', isUp: true },
    { symbol: 'SOL', name: 'Solana', price: '$112.15', change: '-0.5%', isUp: false },
    { symbol: 'VIBE', name: 'Vibe Utility Coin', price: '$0.10', change: '+99.2%', isUp: true }
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white font-sans selection:bg-indigo-500/30">
      {/* Navigation */}
      <nav className="border-b border-white/5 bg-black/20 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Activity className="text-white w-5 h-5 animate-pulse" />
            </div>
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">ChainPay <span className="text-xs bg-indigo-500 text-white px-1.5 py-0.5 rounded font-mono ml-1.5 uppercase font-bold tracking-widest">v2.0</span></span>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-3 text-sm font-medium">
              <button
                onClick={() => setActiveMainView('dashboard')}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer font-semibold flex items-center gap-1.5 ${
                  activeMainView === 'dashboard'
                    ? 'text-white bg-white/10 border border-white/15'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Activity size={14} />
                Dashboard
              </button>
              <button
                onClick={() => setActiveMainView('contracts')}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer font-semibold flex items-center gap-1.5 ${
                  activeMainView === 'contracts'
                    ? 'text-cyan-300 bg-cyan-500/20 border border-cyan-500/30 shadow-sm shadow-cyan-500/20'
                    : 'text-white/60 hover:text-cyan-300 hover:bg-white/5'
                }`}
              >
                <FileCode size={14} className="text-cyan-400" />
                Smart Contracts
                <span className="bg-cyan-500/20 text-cyan-300 text-[10px] px-1.5 py-0.2 rounded font-mono font-bold border border-cyan-500/30">
                  EVM
                </span>
              </button>
              <button
                onClick={() => setActiveMainView('dca')}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer font-semibold flex items-center gap-1.5 ${
                  activeMainView === 'dca'
                    ? 'text-violet-300 bg-violet-500/20 border border-violet-500/30 shadow-sm shadow-violet-500/20'
                    : 'text-white/60 hover:text-violet-300 hover:bg-white/5'
                }`}
              >
                <Zap size={14} className="text-violet-400" />
                DCA Scheduler
                <span className="bg-violet-500/20 text-violet-300 text-[10px] px-1.5 py-0.2 rounded font-mono font-bold border border-violet-500/30">
                  Stripe Auto
                </span>
              </button>
              <button
                onClick={() => setActiveMainView('workspace')}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer font-semibold flex items-center gap-1.5 ${
                  activeMainView === 'workspace'
                    ? 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 shadow-sm shadow-emerald-500/20'
                    : 'text-white/60 hover:text-emerald-300 hover:bg-white/5'
                }`}
              >
                <Layers size={14} className="text-emerald-400" />
                Google Workspace
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0.2 rounded font-mono font-bold border border-emerald-500/30">
                  Drive/Sheets
                </span>
              </button>
              <button
                onClick={() => {
                  setLegalInitialTab('terms');
                  setActiveMainView('legal');
                }}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer font-semibold flex items-center gap-1.5 ${
                  activeMainView === 'legal'
                    ? 'text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 shadow-sm shadow-indigo-500/20'
                    : 'text-white/60 hover:text-indigo-300 hover:bg-white/5'
                }`}
              >
                <ShieldCheck size={14} className="text-indigo-400" />
                Legal & Compliance
                <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-1.5 py-0.2 rounded font-mono font-bold border border-indigo-500/30">
                  Terms/Privacy
                </span>
              </button>
              <button
                onClick={() => setShowEmailNotificationModal(true)}
                className="px-3.5 py-1.5 rounded-xl transition-all cursor-pointer font-semibold flex items-center gap-1.5 text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 shadow-sm"
                title="Configure email alert notifications for large transactions using Firebase Cloud Functions"
              >
                <Mail size={14} className="text-cyan-400" />
                <span className="hidden lg:inline">Whale Alerts</span>
                <span className="lg:hidden">Alerts</span>
                <span className="bg-cyan-500/20 text-cyan-300 text-[10px] px-1.5 py-0.2 rounded font-mono font-bold border border-cyan-500/30">
                  Cloud Fn
                </span>
              </button>
            </div>
            <div className="flex items-center gap-2 bg-indigo-950/45 border border-indigo-500/30 px-3.5 py-1.5 rounded-full text-xs font-bold text-indigo-300">
              <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
              <span className="hidden sm:inline">Live Ledger Feed</span>
              {toastHistory.length > 0 && (
                <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                  {toastHistory.length}
                </span>
              )}
            </div>

            {/* Firebase Auth Header Status */}
            {authUser ? (
              <div className="flex items-center gap-2 bg-indigo-900/40 border border-indigo-500/30 pl-2 pr-3 py-1 rounded-full text-xs font-semibold text-white">
                {authUser.photoURL ? (
                  <img src={authUser.photoURL} alt="Avatar" className="w-5 h-5 rounded-full" />
                ) : (
                  <User size={14} className="text-indigo-400" />
                )}
                <span className="truncate max-w-[120px]">{authUser.displayName || authUser.email}</span>
                <button
                  onClick={handleSignOut}
                  className="ml-1 text-[10px] text-indigo-300 hover:text-white bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-full cursor-pointer transition-all"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-full border border-indigo-400/30 shadow-sm shadow-indigo-500/20 cursor-pointer transition-all"
              >
                <User size={14} />
                <span>Google Sign In</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <AnimatePresence>
          {searchResult && (
            <ExplorerDetail data={searchResult} onClose={() => setSearchResult(null)} />
          )}
        </AnimatePresence>

        {activeMainView === 'contracts' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setActiveMainView('dashboard')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 cursor-pointer"
              >
                &larr; Back to Main Dashboard
              </button>
            </div>
            <SmartContractsSection 
              onRefreshLedger={() => {
                fetchLedger();
                fetchBlocks();
                fetchStats();
              }}
              onRefreshWallet={fetchWallet}
            />
          </div>
        )}

        {activeMainView === 'dca' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setActiveMainView('dashboard')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 cursor-pointer"
              >
                &larr; Back to Main Dashboard
              </button>
            </div>
            <DcaSchedulerSection 
              onTransactionSuccess={() => {
                fetchLedger();
                fetchBlocks();
                fetchStats();
                fetchWallet();
              }}
            />
          </div>
        )}

        {activeMainView === 'workspace' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setActiveMainView('dashboard')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 cursor-pointer"
              >
                &larr; Back to Main Dashboard
              </button>
            </div>
            <WorkspaceSection 
              ledger={ledger}
              stats={stats}
              authUser={authUser}
            />
          </div>
        )}

        {activeMainView === 'legal' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setActiveMainView('dashboard')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 cursor-pointer"
              >
                &larr; Back to Main Dashboard
              </button>
            </div>
            <LegalSection 
              initialTab={legalInitialTab}
              onClose={() => setActiveMainView('dashboard')}
            />
          </div>
        )}

        {activeMainView === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Stats, Banners, Ledgers, Governance */}
          <div className="lg:col-span-8 space-y-8">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h1 className="text-4xl font-bold tracking-tight mb-2">Welcome back, Transit Auditor</h1>
                <p className="text-white/50">Municipal Token Economy & Ledger auditing portal is active.</p>
              </div>
              
              {/* Explorer Search Bar */}
              <form onSubmit={handleSearch} className="relative w-full md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                <input 
                  type="text" 
                  placeholder="Height eg. 19283746, hash, or address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-white placeholder-white/30"
                />
                {isSearching && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <RefreshCcw className="animate-spin text-indigo-400" size={16} />
                  </div>
                )}
              </form>
            </header>

            {/* AI Market Insight Banner */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-3xl p-6 relative overflow-hidden"
            >
              <div className="flex items-start gap-4 relative z-10">
                <div className="p-3 bg-indigo-500 rounded-2xl shadow-lg shadow-indigo-500/20">
                  <Sparkles className="text-white w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-indigo-300 text-xs uppercase tracking-wider">AI Financial Insight</h3>
                    {isAiLoading && <RefreshCcw size={10} className="animate-spin text-indigo-400" />}
                  </div>
                  <p className="text-white/80 leading-relaxed italic text-xs">
                    {aiInsight || "Analyzing the municipal utility ledger logs and circulation indices..."}
                  </p>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full -mr-16 -mt-16" />
            </motion.section>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard 
                title="VIBE Balance" 
                value={wallet ? `${wallet.balance.toFixed(1)} VIBE` : "250.0 VIBE"} 
                icon={Wallet} 
                colorClass="text-emerald-400"
                trend="FAUCET READY" 
              />
              <StatCard 
                title="Total Coins Minted" 
                value={stats ? `${parseFloat(stats.total_vibe_minted || 0).toLocaleString()} VIBE` : "Load VIBE..."} 
                icon={Award} 
                colorClass="text-indigo-400"
              />
              <StatCard 
                title="Total Burned and Retired" 
                value={stats ? `${parseFloat(stats.total_vibe_burned || 0).toLocaleString()} VIBE` : "Load VIBE..."} 
                icon={Flame} 
                colorClass="text-amber-500"
              />
            </div>

            {/* Interactive Municipal Governance Board */}
            <section className="bg-white/5 border border-white/10 rounded-3xl p-6 relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Vote className="text-indigo-400" size={22} />
                  <h2 className="text-xl font-bold">VIBE Governance & Proposals</h2>
                </div>
                <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-full font-bold">
                  Cost: 5 VIBE / Ballot
                </span>
              </div>
              <p className="text-xs text-white/50 mb-6 leading-relaxed">
                Democratize county infrastructure directly. Burn VIBE tokens to cast permanent, cryptographically-audited votes. 
                Higher vote tallies trigger real-world policy assessments and on-chain ledger actions.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {proposals.map((proposal) => (
                  <div key={proposal.id} className="bg-black/35 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:border-indigo-500/20 transition-all">
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="text-[9px] font-bold text-indigo-400 uppercase bg-indigo-950/60 px-2 py-0.5 rounded-full">
                          {proposal.category}
                        </span>
                        <span className="text-xs font-mono text-white/40">ID: #{proposal.id}</span>
                      </div>
                      <h4 className="font-bold text-xs line-clamp-2 text-white/95 mb-2 h-8">{proposal.title}</h4>
                      <p className="text-[11px] text-white/50 line-clamp-3 mb-4 leading-relaxed">{proposal.description}</p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs text-white/40 mb-3 border-t border-white/5 pt-3">
                        <span>Ballot Tally:</span>
                        <span className="font-bold text-white font-mono">{proposal.votes} votes</span>
                      </div>
                      <button 
                        onClick={() => handleCastVote(proposal.id, proposal.cost || 5)}
                        disabled={governanceLoading}
                        className="w-full bg-indigo-600/15 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 text-indigo-300 font-bold text-xs py-2 rounded-xl transition-all flex items-center justify-center gap-1.5"
                      >
                        <Vote size={12} />
                        Vote (Burn 5 VIBE)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Transparency Ledger */}
            <section className="bg-white/5 border border-white/10 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="text-emerald-400" size={20} />
                  <h2 className="text-xl font-bold">Dynamic Transparency Ledger</h2>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right hidden sm:block mr-2">
                    <p className="text-[10px] text-white/40 uppercase font-bold">Auditable Ecosystem Volume</p>
                    <p className="text-sm font-bold text-emerald-400">{stats?.total_verified_volume || "$0"}</p>
                  </div>
                  <button 
                    onClick={() => { fetchLedger(); fetchBlocks(); fetchStats(); }} 
                    className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-full text-[10px] font-bold border border-emerald-500/20 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                  >
                    <RefreshCcw size={10} />
                    LEDGER REFRESH
                  </button>
                  <a 
                    href="/api/blockchain/ledger/csv" 
                    download="transparency_ledger.csv"
                    className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 px-3 py-1.5 rounded-full text-[10px] font-bold border border-indigo-500/20 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                    title="Export all database transactions as CSV"
                  >
                    <Download size={10} />
                    EXPORT CSV
                  </a>
                </div>
              </div>
              <div className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
                <div className="max-h-[320px] overflow-y-auto divide-y divide-white/5">
                  {ledger.map(entry => (
                    <div key={entry.id}>
                      <LedgerRow entry={entry} />
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-white/30 mt-4 italic leading-relaxed">
                * ChainPay anchors all transit, fiat, deposit, mint, and burn actions to the virtual municipal database ledger. 
                Search hashes and heights using the exploration bar to inspect the structural blockchain objects in full debug status.
              </p>
            </section>

            {/* Smart Contracts Studio Section */}
            <SmartContractsSection 
              onRefreshLedger={() => {
                fetchLedger();
                fetchBlocks();
                fetchStats();
              }}
              onRefreshWallet={fetchWallet}
            />

          </div>

          {/* Right Column: Checkout & Token Economy Wallets */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* Interactive VIBE Wallet Manager Card */}
            <section className="bg-[#121214] border border-white/10 rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Coins className="text-emerald-400" size={20} />
                    <h3 className="font-bold text-sm uppercase tracking-wider">VIBE Account Wallet</h3>
                  </div>
                  <button 
                    onClick={() => setCustomKeyVisible(!customKeyVisible)}
                    className="p-1 px-2 border border-white/10 rounded text-[9px] text-white/40 font-mono flex items-center gap-1 hover:bg-white/5"
                  >
                    <Key size={10} />
                    {customKeyVisible ? 'Mute Key' : 'Reveal Key'}
                  </button>
                </div>

                <div className="bg-black/35 rounded-2xl p-4 border border-white/5 mb-4">
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mb-1">Your Token Address</p>
                  <p className="text-xs font-mono text-emerald-400 truncate break-all mb-4" title={wallet?.address}>
                    {wallet?.address || "Loding wallet address..."}
                  </p>
                  
                  {customKeyVisible && (
                    <div className="mb-4 p-2 bg-rose-950/25 border border-rose-900/30 rounded-xl">
                      <p className="text-[9px] text-rose-400 font-bold uppercase tracking-wide">Developer Private Key (Sandbox ONLY)</p>
                      <p className="text-[10px] font-mono text-rose-300 break-all select-all font-semibold mt-1">
                        {wallet?.private_key}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-white/5 pt-3">
                    <div>
                      <p className="text-[10px] text-white/40 font-semibold uppercase">Wallet Ledger Status</p>
                      <p className="text-white text-xs font-bold font-mono">Synchronized</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-white/40 font-semibold uppercase">My Wallet Balance</p>
                      <p className="text-emerald-400 text-lg font-black font-mono">
                        {wallet ? wallet.balance.toFixed(2) : "0"} VIBE
                      </p>
                    </div>
                  </div>
                </div>

                {/* Developer Token Faucet (Free Minting) */}
                <div className="space-y-3 mb-6 bg-white/5 p-4 rounded-2xl border border-white/5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white/60">Faucet Playroom:</span>
                    <span className="font-bold text-indigo-400">+ {faucetAmount} VIBE</span>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="100" 
                    step="5"
                    value={faucetAmount}
                    onChange={(e) => setFaucetAmount(e.target.value)}
                    className="w-full accent-indigo-500 h-1 bg-white/10 rounded-lg cursor-pointer"
                  />
                  <button 
                    onClick={handleFaucetMint}
                    disabled={walletLoading}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 rounded-xl transition-all flex items-center justify-center gap-1.5"
                  >
                    <RefreshCcw className={cn("w-3.5 h-3.5", walletLoading && "animate-spin")} />
                    Free Sandbox Mint (Claim Faucet)
                  </button>
                  <p className="text-[9px] text-center text-white/40">Claims execute immediate mint blocks to chain.</p>
                </div>

                {/* Peer-To-Peer Transit Transfer Form */}
                <form onSubmit={handleTransfer} className="space-y-3 mb-6 bg-white/5 p-4 rounded-2xl border border-white/5">
                  <p className="text-xs font-bold text-white/60 flex items-center gap-1">
                    <ArrowUpRight size={14} className="text-indigo-400" />
                    P2P Transfer Balance
                  </p>
                  <input 
                    type="text" 
                    placeholder="Recipient Wallet Address (0x...)"
                    value={transferTarget}
                    onChange={(e) => setTransferTarget(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      placeholder="Amount"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      className="w-32 bg-black/40 border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button 
                      type="submit"
                      disabled={walletLoading}
                      className="flex-1 bg-white hover:bg-white/90 text-black font-bold text-xs py-2 rounded-xl transition-all"
                    >
                      Instant Pay Transfer
                    </button>
                  </div>
                </form>

                {/* Burn For Utilities (Core utility mechanism) */}
                <div className="space-y-2.5">
                  <p className="text-xs font-bold text-white/60 flex items-center gap-1 mb-1">
                    <Flame size={14} className="text-amber-500" />
                    Interactive Utility Burning Portal
                  </p>

                  {/* Utility 1 */}
                  <div className="bg-black/35 border border-white/5 rounded-2xl p-3 flex justify-between items-center hover:border-amber-500/20 transition-all">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-amber-500/10 rounded-xl">
                        <Ticket className="text-amber-500" size={16} />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs">County Bus Pass</h4>
                        <p className="text-[10px] text-white/50">Redeem route ticket</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleBurnRedeem(15, 'ticket', 'Transit Ticket')}
                      disabled={walletLoading}
                      className="bg-amber-500/15 hover:bg-amber-500 border border-amber-500/30 hover:border-amber-500 text-amber-500 hover:text-black font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg transition-all"
                    >
                      Burn 15 VIBE
                    </button>
                  </div>

                  {ticketActive && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-2.5 bg-emerald-950/20 border border-emerald-950 rounded-xl text-center text-xs text-emerald-400 font-bold"
                    >
                      🚌 Active Transit Ticket provisioned to secure blockchain log!
                    </motion.div>
                  )}

                  {/* Utility 2 */}
                  <div className="bg-black/35 border border-white/5 rounded-2xl p-3 flex justify-between items-center hover:border-amber-500/20 transition-all">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-amber-500/10 rounded-xl">
                        <CreditCard className="text-amber-500" size={16} />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs">10% Fiat Fee Rebate</h4>
                        <p className="text-[10px] text-white/50">Save on next Stripe run</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleBurnRedeem(100, 'rebate', 'Fee Discount Pass')}
                      disabled={walletLoading}
                      className="bg-amber-500/15 hover:bg-amber-500 border border-amber-500/30 hover:border-amber-500 text-amber-500 hover:text-black font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg transition-all"
                    >
                      Burn 100 VIBE
                    </button>
                  </div>

                  {rebateActive && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-2.5 bg-emerald-950/20 border border-emerald-950 rounded-xl text-center text-xs text-emerald-400 font-bold"
                    >
                      💳 Fee rebate active on next credit transaction checkout!
                    </motion.div>
                  )}

                </div>

              </div>
            </section>

            {/* Stripe Payments & Subscriptions Gateway Card */}
            <section className="bg-gradient-to-br from-indigo-900/90 via-[#13131a] to-[#0d0d12] border border-indigo-500/30 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-500/20 border border-indigo-500/30 rounded-2xl text-indigo-400">
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold tracking-tight text-white">Stripe Payment Gateway</h2>
                      <p className="text-[10px] text-white/50 uppercase font-bold tracking-widest">
                        One-Time & Recurring Subscriptions
                      </p>
                    </div>
                  </div>

                  {/* Config Badges */}
                  <div className="flex flex-col items-end gap-1">
                    {stripeConfig?.configured ? (
                      <span className="px-2.5 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold rounded-full flex items-center gap-1">
                        <CheckCircle2 size={11} /> Stripe Active
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold rounded-full flex items-center gap-1" title="Set STRIPE_SECRET_KEY in environment">
                        <AlertTriangle size={11} /> API Key Needed
                      </span>
                    )}

                    <span className="text-[9px] font-mono text-white/40 flex items-center gap-1">
                      <Zap size={9} className="text-indigo-400" /> Webhook: <span className="text-indigo-300">/api/stripe/webhook</span>
                    </span>
                  </div>
                </div>

                {/* Checkout Notice Banner */}
                {checkoutNotice && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-indigo-500/20 border border-indigo-400/40 rounded-2xl flex items-center justify-between text-xs text-indigo-200 font-semibold"
                  >
                    <span>{checkoutNotice}</span>
                    <button 
                      onClick={() => setCheckoutNotice(null)}
                      className="p-1 hover:bg-white/10 rounded-lg transition-all text-white/60 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  </motion.div>
                )}

                {/* Mode Selector Tabs */}
                <div className="grid grid-cols-2 p-1 bg-black/40 border border-white/10 rounded-2xl">
                  <button
                    onClick={() => setStripeTab('subscription')}
                    className={cn(
                      "py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer",
                      stripeTab === 'subscription'
                        ? "bg-indigo-600 text-white shadow-md"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <Calendar size={14} />
                    Recurring Pass
                  </button>
                  <button
                    onClick={() => setStripeTab('one_time')}
                    className={cn(
                      "py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer",
                      stripeTab === 'one_time'
                        ? "bg-indigo-600 text-white shadow-md"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <CreditCard size={14} />
                    One-Time Purchase
                  </button>
                </div>

                {/* TAB 1: RECURRING SUBSCRIPTION PLANS */}
                {stripeTab === 'subscription' && (
                  <div className="space-y-4">
                    <p className="text-xs text-white/70 leading-relaxed">
                      Select a recurring subscription plan. Payments are billed automatically via Stripe and grant ongoing access + recurring <span className="text-emerald-400 font-bold">VIBE token bonuses</span>!
                    </p>

                    {/* Subscription Tier Selection Cards */}
                    <div className="space-y-2.5">
                      {[
                        {
                          id: 'pass_monthly',
                          name: 'Monthly Commuter Transit Pass',
                          amount: 29.99,
                          interval: 'month' as const,
                          desc: 'Unlimited rides on all county bus routes + 300 VIBE monthly bonus',
                          badge: 'POPULAR'
                        },
                        {
                          id: 'pass_vip',
                          name: 'VIP Executive Transit Unlimited',
                          amount: 49.99,
                          interval: 'month' as const,
                          desc: 'Bus + Express Shuttles + Smart Shelter access + 500 VIBE bonus',
                          badge: 'VIP ACCESS'
                        },
                        {
                          id: 'shuttle_weekly',
                          name: 'Weekly Shuttle Commuter Pass',
                          amount: 9.99,
                          interval: 'week' as const,
                          desc: '7-day unlimited shuttle pass + 100 VIBE weekly bonus',
                          badge: 'FLEXIBLE'
                        }
                      ].map((plan) => (
                        <div
                          key={plan.id}
                          onClick={() => setSelectedSubPlan(plan)}
                          className={cn(
                            "p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between",
                            selectedSubPlan.id === plan.id
                              ? "bg-indigo-600/30 border-indigo-400 shadow-lg shadow-indigo-900/30"
                              : "bg-black/30 border-white/5 hover:border-white/20 hover:bg-white/5"
                          )}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{plan.name}</span>
                              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                {plan.badge}
                              </span>
                            </div>
                            <p className="text-[10px] text-white/50">{plan.desc}</p>
                          </div>
                          <div className="text-right pl-3">
                            <p className="text-sm font-black text-emerald-400 font-mono">
                              ${plan.amount.toFixed(2)}
                            </p>
                            <p className="text-[9px] text-white/40 uppercase font-bold">
                              / {plan.interval}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Subscribe Action Button */}
                    <button
                      onClick={() => handleStripeCheckout('subscription', selectedSubPlan.name, selectedSubPlan.amount, selectedSubPlan.interval)}
                      disabled={loading}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm py-3.5 rounded-2xl transition-all shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {loading ? (
                        <RefreshCcw className="animate-spin" size={18} />
                      ) : (
                        <>
                          <Calendar size={18} />
                          Subscribe to {selectedSubPlan.name} (${selectedSubPlan.amount}/{selectedSubPlan.interval})
                        </>
                      )}
                    </button>

                    {/* Active Subscriptions Display */}
                    {activeSubscriptions.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-white/10 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-white/80 flex items-center gap-1.5">
                            <BadgeCheck size={14} className="text-emerald-400" />
                            Your Active Subscriptions ({activeSubscriptions.length})
                          </p>
                          <button
                            onClick={handleOpenPortal}
                            disabled={loading}
                            className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                          >
                            Stripe Portal <ExternalLink size={10} />
                          </button>
                        </div>

                        {activeSubscriptions.map((sub) => (
                          <div key={sub.id} className="bg-black/40 border border-emerald-500/20 rounded-2xl p-3 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-white">{sub.plan_name}</p>
                              <p className="text-[10px] font-mono text-white/40">
                                Status: <span className="text-emerald-400 font-bold uppercase">{sub.status}</span> • Id: {sub.id.substring(0, 14)}...
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                Active
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: ONE-TIME PAYMENTS & CRYPTO PURCHASE */}
                {stripeTab === 'one_time' && (
                  <div className="space-y-4">
                    <p className="text-xs text-white/70 leading-relaxed">
                      Make a secure one-time payment with credit card via Stripe or crypto via Coinbase. Earn <span className="text-emerald-400 font-bold">10 VIBE tokens for every $1</span> spent automatically!
                    </p>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-white/60 mb-1.5 block">Payment Amount (USD)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 font-bold text-lg">$</span>
                        <input 
                          type="number" 
                          value={buyAmount}
                          onChange={(e) => setBuyAmount(e.target.value)}
                          className="w-full bg-black/40 border border-white/20 rounded-2xl py-3 pl-8 pr-4 text-xl font-bold font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                      </div>
                    </div>

                    {/* Quick Amount Buttons */}
                    <div className="grid grid-cols-4 gap-2">
                      {['10', '25', '50', '100'].map((val) => (
                        <button
                          key={val}
                          onClick={() => setBuyAmount(val)}
                          className={cn(
                            "py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer",
                            buyAmount === val
                              ? "bg-indigo-600 text-white border-indigo-400"
                              : "bg-black/30 text-white/70 border-white/10 hover:bg-white/10"
                          )}
                        >
                          ${val}
                        </button>
                      ))}
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-white/60 mb-1.5 block">Select Target Asset / Ticket</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['ETH', 'BTC', 'USDC'].map((asset) => (
                          <button 
                            key={asset}
                            onClick={() => setSelectedAsset(asset)}
                            className={cn(
                              "py-2 rounded-xl font-bold text-xs transition-all border cursor-pointer",
                              selectedAsset === asset 
                                ? "bg-white text-indigo-900 border-white font-extrabold" 
                                : "bg-black/30 text-white/80 border-white/10 hover:bg-white/10"
                            )}
                          >
                            {asset}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-white/60 mb-1.5 block">Processor Gateway</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => setPaymentMethod('stripe')}
                          className={cn(
                            "py-2.5 rounded-xl font-bold text-xs transition-all border flex items-center justify-center gap-1.5 cursor-pointer",
                            paymentMethod === 'stripe' 
                              ? "bg-white text-indigo-900 border-white font-extrabold" 
                              : "bg-black/30 text-white/80 border-white/10 hover:bg-white/10"
                          )}
                        >
                          <CreditCard size={14} />
                          Stripe (Fiat Card)
                        </button>
                        <button 
                          onClick={() => setPaymentMethod('coinbase')}
                          className={cn(
                            "py-2.5 rounded-xl font-bold text-xs transition-all border flex items-center justify-center gap-1.5 cursor-pointer",
                            paymentMethod === 'coinbase' 
                              ? "bg-white text-indigo-900 border-white font-extrabold" 
                              : "bg-black/30 text-white/80 border-white/10 hover:bg-white/10"
                          )}
                        >
                          <Coins size={14} />
                          Coinbase (Crypto)
                        </button>
                      </div>
                    </div>

                    {/* QR Code Quick Scan for Mobile Banking & Crypto Wallets */}
                    <div className="pt-0.5">
                      <button 
                        type="button"
                        onClick={() => setShowQrCode(!showQrCode)}
                        className={cn(
                          "w-full py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer",
                          showQrCode 
                            ? "bg-indigo-950/80 border-indigo-400/50 text-indigo-200 shadow-inner" 
                            : "bg-black/40 border-white/10 text-white/80 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <QrCode size={15} className={showQrCode ? "text-indigo-400" : "text-white/60"} />
                          <span>QR Code Generator (Mobile Banking & Wallets)</span>
                        </div>
                        <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono">
                          {showQrCode ? 'Hide QR' : 'Show QR'}
                        </span>
                      </button>

                      <AnimatePresence>
                        {showQrCode && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-2.5 p-3.5 rounded-2xl bg-black/70 border border-indigo-500/30 backdrop-blur-md space-y-3 shadow-2xl">
                              {/* QR Mode Selector */}
                              <div className="flex rounded-xl bg-black/60 p-1 border border-white/10">
                                <button
                                  type="button"
                                  onClick={() => setQrType('banking')}
                                  className={cn(
                                    "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                                    qrType === 'banking' 
                                      ? "bg-indigo-600 text-white shadow-sm" 
                                      : "text-white/60 hover:text-white"
                                  )}
                                >
                                  <Smartphone size={13} />
                                  Mobile Banking / Card
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setQrType('crypto')}
                                  className={cn(
                                    "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                                    qrType === 'crypto' 
                                      ? "bg-indigo-600 text-white shadow-sm" 
                                      : "text-white/60 hover:text-white"
                                  )}
                                >
                                  <Wallet size={13} />
                                  Crypto Wallet
                                </button>
                              </div>

                              {/* QR Code Graphic & Details */}
                              <div className="flex flex-col sm:flex-row items-center gap-3.5 bg-white/5 p-3 rounded-xl border border-white/10">
                                <div className="p-2.5 bg-white rounded-xl shadow-lg shrink-0 flex items-center justify-center">
                                  <QRCodeSVG 
                                    value={getQrValue()}
                                    size={130}
                                    level="M"
                                    includeMargin={false}
                                  />
                                </div>
                                <div className="flex-1 text-left space-y-1.5 w-full">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                      {qrType === 'banking' ? 'Stripe Express Scan' : `${selectedAsset} EIP-681`}
                                    </span>
                                    <span className="text-xs font-mono font-bold text-white">
                                      ${buyAmount} USD
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-white/70 leading-relaxed">
                                    {qrType === 'banking'
                                      ? "Scan with your phone camera or mobile banking app (Apple Pay / Google Pay / Instant Bank) to initiate Stripe Checkout."
                                      : `Scan with MetaMask, Rainbow, or Trust Wallet to transfer ${getCryptoAmount()} ${selectedAsset} directly.`}
                                  </p>
                                  <div className="pt-1 flex gap-2">
                                    <button
                                      type="button"
                                      onClick={handleCopyQr}
                                      className="flex-1 py-1.5 px-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-[11px] font-bold text-white/90 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                    >
                                      {qrCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                      <span>{qrCopied ? 'URI Copied!' : 'Copy Pay Link'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleSimulateMobileScan}
                                      disabled={qrScanSuccess}
                                      className="py-1.5 px-2.5 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/30 rounded-lg text-[11px] font-bold text-emerald-300 flex items-center gap-1 transition-all cursor-pointer disabled:opacity-60"
                                      title="Simulate scanning this QR code from a mobile device"
                                    >
                                      {qrScanSuccess ? <CheckCircle2 size={12} className="text-emerald-400" /> : <Zap size={12} />}
                                      <span>{qrScanSuccess ? 'Scanned!' : 'Simulate Scan'}</span>
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {qrScanSuccess && (
                                <div className="p-2 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-center text-xs font-bold text-emerald-300 animate-pulse">
                                  ✓ Mobile scan detected! Transaction committed to transparency ledger.
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <button 
                      onClick={() => {
                        if (paymentMethod === 'stripe') {
                          handleStripeCheckout('payment', `One-Time ${selectedAsset} Deposit`, parseFloat(buyAmount));
                        } else {
                          handleBuy();
                        }
                      }}
                      disabled={loading}
                      className="w-full bg-white text-indigo-950 hover:bg-white/90 py-3.5 rounded-2xl font-black text-base shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {loading ? (
                        <RefreshCcw className="animate-spin" size={18} />
                      ) : (
                        <>
                          <CreditCard size={18} />
                          Pay ${buyAmount} via {paymentMethod === 'stripe' ? 'Stripe' : 'Coinbase'}
                        </>
                      )}
                    </button>

                    <p className="text-center text-white/50 text-[10px]">
                      Earns <span className="text-emerald-400 font-bold">{Math.floor(parseFloat(buyAmount || "10") * 10)} VIBE</span> loyalty tokens on initiation.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Market Overview */}
            <section className="bg-white/5 border border-white/10 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Market Overview</h2>
                <RefreshCcw onClick={() => { fetchStats(); }} size={16} className="text-white/40 cursor-pointer hover:text-white transition-colors animate-spin" />
              </div>
              <div className="space-y-4">
                {markets.map(market => (
                  <div key={market.symbol} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-xl transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center font-bold text-xs font-mono text-indigo-300">
                        {market.symbol}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-white/90">{market.name}</p>
                        <p className="text-white/40 text-xs font-mono">{market.symbol}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm text-white/95">{market.price}</p>
                      <p className={cn(
                        "text-xs font-medium",
                        market.isUp ? "text-emerald-400" : "text-rose-400"
                      )}>
                        {market.change}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </div>
        </div>
        )}
      </main>

      {/* AI Floating Assistant */}
      <div className="fixed bottom-8 right-8 z-[100]">
        <AnimatePresence>
          {showAiChat && (
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="absolute bottom-20 right-0 w-80 md:w-96 bg-[#121214] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-4 bg-indigo-600 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot size={20} />
                  <span className="font-bold text-sm">ChainPay AI Assistant</span>
                </div>
                <button onClick={() => setShowAiChat(false)} className="hover:bg-white/10 p-1 rounded-full transition-colors">
                  <X size={18} />
                </button>
              </div>
              
              <div className="h-80 overflow-y-auto p-4 space-y-4 bg-black/40">
                {chatMessages.length === 0 && (
                  <div className="text-center py-8 space-y-2">
                    <Sparkles className="mx-auto text-indigo-400 opacity-50" size={32} />
                    <p className="text-white/40 text-xs">Ask me about market trends or specific transactions.</p>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={cn(
                    "max-w-[80%] p-3 rounded-2xl text-sm",
                    msg.role === 'user' ? "bg-indigo-600 ml-auto rounded-tr-none" : "bg-white/10 mr-auto rounded-tl-none"
                  )}>
                    {msg.text}
                  </div>
                ))}
                {isAiLoading && (
                  <div className="bg-white/10 mr-auto rounded-2xl rounded-tl-none p-3 max-w-[80%]">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleAiChat} className="p-4 border-t border-white/10 bg-black/20">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Type your message..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-4 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-400 hover:text-indigo-300">
                    <Send size={18} />
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={() => setShowAiChat(!showAiChat)}
          className="w-14 h-14 bg-indigo-600 rounded-full shadow-lg shadow-indigo-600/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
        >
          <MessageSquare className="group-hover:scale-110 transition-transform" />
        </button>
      </div>

      {/* Real-Time Toast Notification System */}
      <ToastNotificationSystem
        toasts={toasts}
        history={toastHistory}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(prev => !prev)}
        onDismissToast={handleDismissToast}
        onClearHistory={() => setToastHistory([])}
        onInspectItem={(data) => setSearchResult(data)}
        onSimulateEvent={handleSimulateEvent}
        isSimulating={isSimulating}
        pollingIntervalMs={pollingIntervalMs}
        onSetPollingInterval={setPollingIntervalMs}
        isPollingActive={isPollingActive}
        onTogglePolling={() => setIsPollingActive(prev => !prev)}
        onOpenEmailNotificationSettings={() => setShowEmailNotificationModal(true)}
      />

      {/* Large Transaction Email Notification Settings Modal (Firebase Cloud Functions) */}
      <NotificationSettingsModal 
        isOpen={showEmailNotificationModal}
        onClose={() => setShowEmailNotificationModal(false)}
        authUser={authUser}
        onSignInRequired={handleGoogleSignIn}
      />

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 mt-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2 opacity-50">
            <Activity size={20} />
            <span className="font-bold">ChainPay</span>
          </div>
          <div className="flex gap-8 text-sm text-white/40">
            <button
              onClick={() => {
                setLegalInitialTab('privacy');
                setActiveMainView('legal');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-white cursor-pointer transition-colors"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => {
                setLegalInitialTab('terms');
                setActiveMainView('legal');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-white cursor-pointer transition-colors"
            >
              Terms of Service
            </button>
            <button
              onClick={() => {
                setActiveMainView('contracts');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-white cursor-pointer transition-colors"
            >
              EVM Smart Contracts
            </button>
            <button
              onClick={() => {
                setActiveMainView('dca');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-white cursor-pointer transition-colors"
            >
              Stripe DCA
            </button>
          </div>
          <div className="text-white/20 text-xs">
            © 2026 ChainPay Technologies Inc. All app components are patient pending IP of Oldtimevibescomllc.
          </div>
        </div>
      </footer>
    </div>
  );
}

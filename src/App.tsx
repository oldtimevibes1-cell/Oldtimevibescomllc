/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getMarketInsight, explainTransaction } from './services/geminiService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface Transaction {
  id: string;
  type: 'buy' | 'send' | 'receive';
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

// --- Components ---

const StatCard = ({ title, value, icon: Icon, trend }: { title: string, value: string, icon: any, trend?: string }) => (
  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 bg-indigo-500/20 rounded-lg">
        <Icon className="w-5 h-5 text-indigo-400" />
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

const TransactionRow = ({ tx }: { tx: Transaction }) => (
  <div className="flex items-center justify-between p-4 hover:bg-white/5 rounded-xl transition-colors group">
    <div className="flex items-center gap-4">
      <div className={cn(
        "p-2 rounded-full",
        tx.type === 'buy' ? "bg-emerald-500/20 text-emerald-400" : 
        tx.type === 'send' ? "bg-rose-500/20 text-rose-400" : "bg-indigo-500/20 text-indigo-400"
      )}>
        {tx.type === 'buy' ? <CreditCard size={18} /> : 
         tx.type === 'send' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
      </div>
      <div>
        <p className="text-white font-medium capitalize">{tx.type} {tx.asset}</p>
        <p className="text-white/40 text-xs font-mono">{tx.hash.slice(0, 12)}...</p>
      </div>
    </div>
    <div className="text-right">
      <p className={cn(
        "font-bold",
        tx.type === 'receive' || tx.type === 'buy' ? "text-emerald-400" : "text-white"
      )}>
        {tx.type === 'send' ? '-' : '+'}{tx.amount} {tx.asset}
      </p>
      <p className="text-white/40 text-xs">{tx.date}</p>
    </div>
  </div>
);

interface LedgerEntry {
  id: string;
  from: string;
  to: string;
  amount: string;
  type: string;
  hash: string;
  status: string;
}

const LedgerRow = ({ entry }: { entry: LedgerEntry }) => (
  <div className="flex items-center justify-between p-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
    <div className="flex flex-col">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-indigo-400 uppercase tracking-tighter">{entry.type}</span>
        <span className="text-[10px] text-white/30 font-mono">{entry.hash}</span>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-sm text-white/70">{entry.from}</span>
        <ChevronRight size={12} className="text-white/20" />
        <span className="text-sm text-white/70">{entry.to}</span>
      </div>
    </div>
    <div className="text-right">
      <p className="text-sm font-bold text-emerald-400">{entry.amount}</p>
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
              <p className="text-xs text-white/40 font-mono">{data.hash}</p>
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
                  <p className="text-lg font-bold">{data.height}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Timestamp</p>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-white/40" />
                    <p className="text-sm">{new Date(data.timestamp).toLocaleString()}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Transactions</p>
                  <p className="text-lg font-bold">{data.transactions}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Size</p>
                  <p className="text-lg font-bold">{data.size}</p>
                </div>
                <div className="col-span-2 space-y-1">
                  <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Miner</p>
                  <p className="text-sm font-mono text-indigo-400">{data.miner}</p>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Amount</p>
                  <p className="text-2xl font-bold text-emerald-400">{data.amount}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Status</p>
                  <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-1 rounded-full">
                    {data.status}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Block Height</p>
                  <p className="text-sm font-bold">{data.blockHeight}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Timestamp</p>
                  <p className="text-sm">{new Date(data.timestamp).toLocaleString()}</p>
                </div>
                <div className="col-span-2 p-4 bg-white/5 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">From</p>
                      <p className="text-xs font-mono text-white/70">{data.sender}</p>
                    </div>
                    <ArrowRight size={16} className="text-white/20" />
                    <div className="space-y-1 text-right">
                      <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">To</p>
                      <p className="text-xs font-mono text-white/70">{data.receiver}</p>
                    </div>
                  </div>
                </div>
                <div className="col-span-2 space-y-1">
                  <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Transaction Fee</p>
                  <p className="text-sm font-bold text-white/60">{data.fee}</p>
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
            Close
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default function App() {
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'coinbase'>('stripe');
  const [buyAmount, setBuyAmount] = useState('100');
  const [selectedAsset, setSelectedAsset] = useState('ETH');
  const [stats, setStats] = useState<any>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  // AI State
  const [aiInsight, setAiInsight] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiChat, setShowAiChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);

  useEffect(() => {
    fetch('/api/blockchain/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        // Generate initial AI insight
        generateMarketInsight(data);
      })
      .catch(err => console.error('Failed to fetch stats', err));

    fetch('/api/blockchain/ledger')
      .then(res => res.json())
      .then(data => setLedger(data))
      .catch(err => console.error('Failed to fetch ledger', err));
  }, []);

  const generateMarketInsight = async (data: any) => {
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
      const response = await explainTransaction({ query: userMsg, context: 'User general query' });
      setChatMessages(prev => [...prev, { role: 'ai', text: response || 'I am processing your request.' }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I encountered an error.' }]);
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
        window.location.href = data.url;
      } else {
        alert(data.error || `Failed to initiate ${paymentMethod} checkout. Make sure API keys are set.`);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('An error occurred. Check console for details.');
    } finally {
      setLoading(false);
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
        alert('No results found for this hash or ID.');
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('An error occurred during search.');
    } finally {
      setIsSearching(false);
    }
  };

  const transactions: Transaction[] = [
    { id: '1', type: 'buy', amount: '0.05', asset: 'ETH', status: 'completed', date: '2 mins ago', hash: '0x71c765...d897' },
    { id: '2', type: 'send', amount: '120.00', asset: 'USDC', status: 'completed', date: '1 hour ago', hash: '0x12a34b...e56f' },
    { id: '3', type: 'receive', amount: '0.002', asset: 'BTC', status: 'completed', date: '5 hours ago', hash: '0x98f76d...a123' },
  ];

  const markets: MarketData[] = [
    { symbol: 'BTC', name: 'Bitcoin', price: '$52,431.20', change: '+2.4%', isUp: true },
    { symbol: 'ETH', name: 'Ethereum', price: '$2,850.42', change: '+1.8%', isUp: true },
    { symbol: 'SOL', name: 'Solana', price: '$112.15', change: '-0.5%', isUp: false },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white font-sans selection:bg-indigo-500/30">
      {/* Navigation */}
      <nav className="border-bottom border-white/5 bg-black/20 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Activity className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight">ChainPay</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-white/60">
              <a href="#" className="hover:text-white transition-colors">Dashboard</a>
              <a href="#" className="hover:text-white transition-colors">Exchange</a>
              <a href="#" className="hover:text-white transition-colors">Wallet</a>
            </div>
            <button className="bg-white text-black px-4 py-2 rounded-full text-sm font-bold hover:bg-white/90 transition-all flex items-center gap-2">
              <Wallet size={16} />
              Connect Wallet
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <AnimatePresence>
          {searchResult && (
            <ExplorerDetail data={searchResult} onClose={() => setSearchResult(null)} />
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Stats & Markets */}
          <div className="lg:col-span-8 space-y-8">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h1 className="text-4xl font-bold tracking-tight mb-2">Welcome back, Explorer</h1>
                <p className="text-white/50">Your blockchain gateway is active and synced.</p>
              </div>
              
              {/* Explorer Search Bar */}
              <form onSubmit={handleSearch} className="relative w-full md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                <input 
                  type="text" 
                  placeholder="Search Hash, Block, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
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
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-indigo-300 text-sm uppercase tracking-wider">AI Market Insight</h3>
                    {isAiLoading && <RefreshCcw size={12} className="animate-spin text-indigo-400" />}
                  </div>
                  <p className="text-white/80 leading-relaxed italic">
                    {aiInsight || "Analyzing market trends and blockchain activity..."}
                  </p>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full -mr-16 -mt-16" />
            </motion.section>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard 
                title="Total Balance" 
                value="$12,450.00" 
                icon={Wallet} 
                trend="+12.5%" 
              />
              <StatCard 
                title="Ethereum Price" 
                value={stats ? `$${stats.eth_price}` : "$2,850.42"} 
                icon={TrendingUp} 
                trend="+1.8%" 
              />
              <StatCard 
                title="Network Status" 
                value={stats ? stats.network_status : "Healthy"} 
                icon={ShieldCheck} 
              />
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Transparency Ledger */}
              <section className="bg-white/5 border border-white/10 rounded-3xl p-6 md:col-span-2">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="text-emerald-400" size={20} />
                    <h2 className="text-xl font-bold">Transparency Ledger</h2>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-[10px] text-white/40 uppercase font-bold">Verified Volume</p>
                      <p className="text-sm font-bold text-white">{stats?.total_verified_volume || "$0"}</p>
                    </div>
                    <button className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-bold border border-emerald-500/20">
                      LIVE SYNC ACTIVE
                    </button>
                  </div>
                </div>
                <div className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
                  <div className="max-h-[300px] overflow-y-auto">
                    {ledger.map(entry => (
                      <div key={entry.id}>
                        <LedgerRow entry={entry} />
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-white/30 mt-4 italic">
                  * All Stripe transactions are hashed and anchored to the blockchain for public auditability. 
                  Personal data is masked to maintain privacy while ensuring financial transparency.
                </p>
              </section>

              {/* Recent Transactions */}
              <section className="bg-white/5 border border-white/10 rounded-3xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">Recent Activity</h2>
                  <button className="text-indigo-400 text-sm font-medium hover:underline flex items-center gap-1">
                    View All <ChevronRight size={14} />
                  </button>
                </div>
                <div className="space-y-2">
                  {transactions.map(tx => (
                    <div key={tx.id}>
                      <TransactionRow tx={tx} />
                    </div>
                  ))}
                </div>
              </section>

              {/* Market Overview */}
              <section className="bg-white/5 border border-white/10 rounded-3xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">Market Overview</h2>
                  <RefreshCcw size={16} className="text-white/40 cursor-pointer hover:text-white transition-colors" />
                </div>
                <div className="space-y-4">
                  {markets.map(market => (
                    <div key={market.symbol} className="flex items-center justify-between p-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center font-bold text-xs">
                          {market.symbol}
                        </div>
                        <div>
                          <p className="font-bold">{market.name}</p>
                          <p className="text-white/40 text-xs">{market.symbol}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{market.price}</p>
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

          {/* Right Column: Checkout & Actions */}
          <div className="lg:col-span-4 space-y-8">
            {/* Buy Crypto Card */}
            <section className="bg-indigo-600 rounded-3xl p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6">
                  <Coins className="w-6 h-6" />
                  <h2 className="text-2xl font-bold">Buy Crypto</h2>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-white/70 mb-2 block">Amount (USD)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 font-bold">$</span>
                      <input 
                        type="number" 
                        value={buyAmount}
                        onChange={(e) => setBuyAmount(e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 pl-8 pr-4 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-white/70 mb-2 block">Select Asset</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['ETH', 'BTC', 'USDC'].map(asset => (
                        <button 
                          key={asset}
                          onClick={() => setSelectedAsset(asset)}
                          className={cn(
                            "py-3 rounded-xl font-bold text-sm transition-all border",
                            selectedAsset === asset 
                              ? "bg-white text-indigo-600 border-white" 
                              : "bg-white/10 text-white border-white/10 hover:bg-white/20"
                          )}
                        >
                          {asset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-white/70 mb-2 block">Payment Method</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => setPaymentMethod('stripe')}
                        className={cn(
                          "py-3 rounded-xl font-bold text-xs transition-all border flex items-center justify-center gap-2",
                          paymentMethod === 'stripe' 
                            ? "bg-white text-indigo-600 border-white" 
                            : "bg-white/10 text-white border-white/10 hover:bg-white/20"
                        )}
                      >
                        <CreditCard size={14} />
                        Stripe (Fiat)
                      </button>
                      <button 
                        onClick={() => setPaymentMethod('coinbase')}
                        className={cn(
                          "py-3 rounded-xl font-bold text-xs transition-all border flex items-center justify-center gap-2",
                          paymentMethod === 'coinbase' 
                            ? "bg-white text-indigo-600 border-white" 
                            : "bg-white/10 text-white border-white/10 hover:bg-white/20"
                        )}
                      >
                        <Coins size={14} />
                        Coinbase (Crypto)
                      </button>
                    </div>
                  </div>

                  <button 
                    onClick={handleBuy}
                    disabled={loading}
                    className="w-full bg-white text-indigo-600 py-4 rounded-2xl font-bold text-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <RefreshCcw className="animate-spin" />
                    ) : (
                      <>
                        {paymentMethod === 'stripe' ? <CreditCard size={20} /> : <Coins size={20} />}
                        Pay with {paymentMethod === 'stripe' ? 'Stripe' : 'Coinbase'}
                      </>
                    )}
                  </button>
                  
                  <p className="text-center text-white/60 text-xs mt-4">
                    Secure checkout powered by Stripe. <br />
                    Instant delivery to your connected wallet.
                  </p>
                </div>
              </div>
            </section>

            {/* Quick Actions */}
            <section className="bg-white/5 border border-white/10 rounded-3xl p-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <button className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors border border-white/5">
                  <ArrowUpRight className="text-indigo-400" />
                  <span className="text-xs font-bold">Send</span>
                </button>
                <button className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors border border-white/5">
                  <ArrowDownLeft className="text-emerald-400" />
                  <span className="text-xs font-bold">Receive</span>
                </button>
                <button className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors border border-white/5">
                  <RefreshCcw className="text-amber-400" />
                  <span className="text-xs font-bold">Swap</span>
                </button>
                <button className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors border border-white/5">
                  <ExternalLink className="text-blue-400" />
                  <span className="text-xs font-bold">Bridge</span>
                </button>
              </div>
            </section>
          </div>
        </div>
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

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 mt-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2 opacity-50">
            <Activity size={20} />
            <span className="font-bold">ChainPay</span>
          </div>
          <div className="flex gap-8 text-sm text-white/40">
            <a href="#" className="hover:text-white">Privacy Policy</a>
            <a href="#" className="hover:text-white">Terms of Service</a>
            <a href="#" className="hover:text-white">API Documentation</a>
            <a href="#" className="hover:text-white">Support</a>
          </div>
          <div className="text-white/20 text-xs">
            © 2026 ChainPay Technologies Inc.
          </div>
        </div>
      </footer>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  CreditCard, 
  Play, 
  Pause, 
  Trash2, 
  Plus, 
  Zap, 
  Clock, 
  DollarSign, 
  CheckCircle, 
  AlertCircle, 
  Layers, 
  ArrowRight,
  ShieldCheck,
  Calculator,
  RefreshCw
} from 'lucide-react';

export interface DcaSchedule {
  id: string;
  asset: string;
  amount: number;
  frequency: string;
  payment_method: string;
  status: 'active' | 'paused';
  next_execution: string;
  total_invested: number;
  total_crypto_bought: number;
  created_at: string;
}

interface DcaSchedulerSectionProps {
  onTransactionSuccess?: () => void;
}

const ASSET_PRICES: Record<string, { name: string; price: number; symbol: string; iconBg: string }> = {
  VIBE: { name: 'VIBE Transit Token', price: 0.10, symbol: 'VIBE', iconBg: 'from-amber-500 to-orange-600' },
  ETH: { name: 'Ethereum', price: 2850.42, symbol: 'ETH', iconBg: 'from-indigo-500 to-blue-600' },
  BTC: { name: 'Bitcoin', price: 65000.00, symbol: 'BTC', iconBg: 'from-amber-600 to-yellow-500' },
  SOL: { name: 'Solana', price: 145.00, symbol: 'SOL', iconBg: 'from-purple-500 to-pink-600' },
};

export const DcaSchedulerSection: React.FC<DcaSchedulerSectionProps> = ({ onTransactionSuccess }) => {
  const [schedules, setSchedules] = useState<DcaSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<string>('ETH');
  const [amount, setAmount] = useState<string>('50');
  const [frequency, setFrequency] = useState<string>('Weekly');
  const [paymentMethod, setPaymentMethod] = useState<string>('Stripe Card (•••• 4242)');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Action Pending State
  const [executingId, setExecutingId] = useState<string | null>(null);

  // Calculator State
  const [calcMonthly, setCalcMonthly] = useState<number>(100);
  const [calcYears, setCalcYears] = useState<number>(3);
  const [calcGrowth, setCalcGrowth] = useState<number>(20);

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dca/schedules');
      if (!res.ok) throw new Error('Failed to load DCA schedules');
      const data = await res.json();
      setSchedules(data);
    } catch (err: any) {
      setError(err.message || 'Error fetching schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const parsedAmt = parseFloat(amount);
    if (isNaN(parsedAmt) || parsedAmt <= 0) {
      setError('Please enter a valid deposit amount.');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/dca/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset: selectedAsset,
          amount: parsedAmt,
          frequency,
          payment_method: paymentMethod,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create DCA schedule');
      }

      setSuccessMsg(`Successfully created ${frequency} DCA schedule for $${parsedAmt.toFixed(2)} of ${selectedAsset}!`);
      setShowForm(false);
      fetchSchedules();
      if (onTransactionSuccess) onTransactionSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to create DCA schedule.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleSchedule = async (id: string) => {
    try {
      setError(null);
      const res = await fetch(`/api/dca/schedules/${id}/toggle`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error('Failed to toggle schedule status');
      fetchSchedules();
    } catch (err: any) {
      setError(err.message || 'Error updating schedule');
    }
  };

  const handleExecuteNow = async (id: string) => {
    setExecutingId(id);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/dca/schedules/${id}/execute`, {
        method: 'POST',
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to execute DCA purchase');
      }
      const data = await res.json();
      setSuccessMsg(`Executed DCA purchase! Bought ${parseFloat(data.crypto_acquired).toFixed(4)} ${data.schedule.asset} via ${data.schedule.payment_method}.`);
      fetchSchedules();
      if (onTransactionSuccess) onTransactionSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to execute instant DCA purchase.');
    } finally {
      setExecutingId(null);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel and remove this DCA schedule?')) return;
    try {
      setError(null);
      const res = await fetch(`/api/dca/schedules/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete schedule');
      setSuccessMsg('DCA Schedule cancelled successfully.');
      fetchSchedules();
    } catch (err: any) {
      setError(err.message || 'Error deleting schedule');
    }
  };

  // Aggregated Stats
  const activeSchedules = schedules.filter((s) => s.status === 'active');
  const totalMonthlyVolume = schedules.reduce((acc, s) => {
    if (s.status !== 'active') return acc;
    let multiplier = 1;
    if (s.frequency === 'Daily') multiplier = 30;
    else if (s.frequency === 'Weekly') multiplier = 4.3;
    else if (s.frequency === 'Bi-Weekly') multiplier = 2.15;
    else if (s.frequency === 'Monthly') multiplier = 1;
    return acc + s.amount * multiplier;
  }, 0);

  const totalInvestedAll = schedules.reduce((acc, s) => acc + (s.total_invested || 0), 0);

  // Calculator computations
  const totalMonths = calcYears * 12;
  const monthlyRate = calcGrowth / 100 / 12;
  const totalContributions = calcMonthly * totalMonths;
  let futureValue = 0;
  for (let m = 0; m < totalMonths; m++) {
    futureValue = (futureValue + calcMonthly) * (1 + monthlyRate);
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-indigo-400" />
                Automated Wealth Building
              </span>
              <span className="text-xs text-slate-400 font-medium">Stripe Recurring Gateway</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Dollar Cost Averaging (DCA)
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl mt-1 leading-relaxed">
              Schedule recurring, hands-free crypto purchases using your linked Stripe payment methods. Build long-term crypto positions stress-free.
            </p>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold px-5 py-3 rounded-xl text-xs sm:text-sm shadow-lg shadow-indigo-600/25 transition-all cursor-pointer border border-indigo-400/30 shrink-0"
          >
            {showForm ? <Pause className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{showForm ? 'Close Creation Form' : 'New DCA Schedule'}</span>
          </button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/50 border border-slate-800/80 p-3.5 rounded-xl">
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Active DCA Plans</span>
            <span className="text-lg font-bold text-white mt-0.5 block">{activeSchedules.length} Active</span>
          </div>
          <div className="bg-slate-950/50 border border-slate-800/80 p-3.5 rounded-xl">
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Est. Monthly Volume</span>
            <span className="text-lg font-bold text-emerald-400 mt-0.5 block">${totalMonthlyVolume.toFixed(2)}/mo</span>
          </div>
          <div className="bg-slate-950/50 border border-slate-800/80 p-3.5 rounded-xl">
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Total Cumulative Deposited</span>
            <span className="text-lg font-bold text-indigo-300 mt-0.5 block">${totalInvestedAll.toFixed(2)}</span>
          </div>
          <div className="bg-slate-950/50 border border-slate-800/80 p-3.5 rounded-xl">
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Stripe Security</span>
            <span className="text-xs font-semibold text-slate-300 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>PCI-DSS Level 1</span>
            </span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white font-bold text-xs">Dismiss</button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white font-bold text-xs">Dismiss</button>
        </div>
      )}

      {/* Create DCA Form */}
      {showForm && (
        <form onSubmit={handleCreateSchedule} className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                Configure New DCA Recurring Purchase
              </h2>
              <p className="text-xs text-slate-400">Select crypto asset, recurring amount, and frequency linked to Stripe.</p>
            </div>
            <span className="text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full font-semibold">
              Automatic Stripe Billing
            </span>
          </div>

          {/* Asset Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">1. Select Crypto Asset</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(ASSET_PRICES).map(([symbol, info]) => {
                const isSelected = selectedAsset === symbol;
                return (
                  <button
                    type="button"
                    key={symbol}
                    onClick={() => setSelectedAsset(symbol)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 shadow-md shadow-indigo-500/10'
                        : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`w-8 h-8 rounded-lg bg-gradient-to-br ${info.iconBg} text-white font-bold text-xs flex items-center justify-center shadow-sm`}>
                        {symbol.substring(0, 3)}
                      </span>
                      {isSelected && <CheckCircle className="w-4 h-4 text-indigo-400" />}
                    </div>
                    <div className="mt-3">
                      <span className="text-xs font-bold text-white block">{symbol}</span>
                      <span className="text-[10px] text-slate-400 font-mono">${info.price.toLocaleString()}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount and Frequency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">2. Recurring Deposit Amount ($ USD)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="50"
                  min="5"
                  step="5"
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2 mt-2">
                {['10', '25', '50', '100', '250'].map((preset) => (
                  <button
                    type="button"
                    key={preset}
                    onClick={() => setAmount(preset)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                      amount === preset ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    ${preset}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">3. Deposit Frequency</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['Daily', 'Weekly', 'Bi-Weekly', 'Monthly'].map((freq) => (
                  <button
                    type="button"
                    key={freq}
                    onClick={() => setFrequency(freq)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${
                      frequency === freq
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {freq}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">4. Stripe Payment Method</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: 'Stripe Card (•••• 4242)', label: 'Visa ending in •••• 4242', desc: 'Default Saved Stripe Card' },
                { id: 'Stripe Direct Debit (US ACH)', label: 'US Bank ACH Direct Debit', desc: 'Lower fees for $100+ deposits' },
              ].map((pm) => (
                <button
                  type="button"
                  key={pm.id}
                  onClick={() => setPaymentMethod(pm.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    paymentMethod === pm.id
                      ? 'bg-indigo-600/20 border-indigo-500'
                      : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800'
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold text-white block">{pm.label}</span>
                    <span className="text-[10px] text-slate-400">{pm.desc}</span>
                  </div>
                  <CreditCard className={`w-4 h-4 ${paymentMethod === pm.id ? 'text-indigo-400' : 'text-slate-500'}`} />
                </button>
              ))}
            </div>
          </div>

          {/* DCA Live Summary Box */}
          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">Estimated Acquisition / Purchase</span>
              <span className="text-white font-bold text-sm">
                ~{(parseFloat(amount || '0') / (ASSET_PRICES[selectedAsset]?.price || 1)).toFixed(4)} {selectedAsset} per {frequency} deposit
              </span>
              <span className="text-emerald-400 block text-[10px] mt-0.5">
                + Earn {Math.floor(parseFloat(amount || '0') * 10)} Bonus VIBE Loyalty Points on each execution!
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-lg shadow-emerald-600/20 cursor-pointer transition-all shrink-0 disabled:opacity-50"
            >
              {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              <span>Confirm & Start DCA</span>
            </button>
          </div>
        </form>
      )}

      {/* Active DCA Schedules */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-400" />
              Your Automated DCA Schedules
            </h2>
            <p className="text-xs text-slate-400">Manage, trigger instant buys, or adjust frequency for active schedules.</p>
          </div>
          <button
            onClick={fetchSchedules}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Schedules</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Loading active DCA schedules...</span>
          </div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-12 bg-slate-950/40 border border-slate-800/80 rounded-xl space-y-3">
            <TrendingUp className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">No active DCA schedules yet. Click "New DCA Schedule" to automate your purchases.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schedules.map((schedule) => {
              const assetInfo = ASSET_PRICES[schedule.asset] || { price: 1, iconBg: 'from-slate-600 to-slate-800' };
              const isExecuting = executingId === schedule.id;

              return (
                <div
                  key={schedule.id}
                  className={`bg-slate-950/60 border rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all ${
                    schedule.status === 'active' ? 'border-slate-800/90 hover:border-indigo-500/50' : 'border-amber-500/20 opacity-75'
                  }`}
                >
                  <div>
                    {/* Top Status Row */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-8 h-8 rounded-lg bg-gradient-to-br ${assetInfo.iconBg} text-white font-bold text-xs flex items-center justify-center shadow-sm`}>
                          {schedule.asset.substring(0, 3)}
                        </span>
                        <div>
                          <span className="text-sm font-bold text-white block">{schedule.asset}</span>
                          <span className="text-[10px] text-slate-400">${assetInfo.price.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {schedule.status === 'active' ? (
                          <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                            Paused
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Amount & Frequency */}
                    <div className="bg-slate-900/80 border border-slate-800/80 p-3 rounded-xl space-y-1 mb-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Deposit Amount</span>
                        <span className="text-white font-bold">${schedule.amount.toFixed(2)} USD</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Frequency</span>
                        <span className="text-indigo-300 font-semibold">{schedule.frequency}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-800 text-slate-400">
                        <span>Payment</span>
                        <span className="truncate max-w-[140px] text-slate-300">{schedule.payment_method}</span>
                      </div>
                    </div>

                    {/* Accumulated Info */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] mb-4">
                      <div className="bg-slate-900/40 p-2 rounded-lg border border-slate-800/60">
                        <span className="text-slate-400 block">Total Invested</span>
                        <span className="text-white font-bold text-xs">${(schedule.total_invested || 0).toFixed(2)}</span>
                      </div>
                      <div className="bg-slate-900/40 p-2 rounded-lg border border-slate-800/60">
                        <span className="text-slate-400 block">Total Acquired</span>
                        <span className="text-emerald-400 font-bold text-xs">
                          {(schedule.total_crypto_bought || 0).toFixed(4)} {schedule.asset}
                        </span>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 mb-4 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-indigo-400 shrink-0" />
                      <span>Next Run: {new Date(schedule.next_execution).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-800/80">
                    <button
                      onClick={() => handleExecuteNow(schedule.id)}
                      disabled={isExecuting}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[11px] font-bold py-2 rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer shadow-md shadow-indigo-600/20"
                      title="Trigger Instant DCA Purchase"
                    >
                      {isExecuting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                      <span>Run Now</span>
                    </button>

                    <button
                      onClick={() => handleToggleSchedule(schedule.id)}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer"
                      title={schedule.status === 'active' ? 'Pause Schedule' : 'Resume Schedule'}
                    >
                      {schedule.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={() => handleDeleteSchedule(schedule.id)}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all cursor-pointer border border-red-500/20"
                      title="Delete Schedule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Interactive DCA Return Calculator */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
          <Calculator className="w-5 h-5 text-emerald-400" />
          <div>
            <h2 className="text-lg font-bold text-white">DCA Compound Return Simulator</h2>
            <p className="text-xs text-slate-400">See how regular, disciplined deposits compound over time vs lump sum purchases.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="space-y-4 md:col-span-1">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-300 font-semibold">Monthly Deposit</span>
                <span className="text-indigo-400 font-bold font-mono">${calcMonthly}/mo</span>
              </div>
              <input
                type="range"
                min="10"
                max="1000"
                step="10"
                value={calcMonthly}
                onChange={(e) => setCalcMonthly(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-300 font-semibold">Time Horizon</span>
                <span className="text-indigo-400 font-bold font-mono">{calcYears} Years</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 3, 5].map((yr) => (
                  <button
                    key={yr}
                    onClick={() => setCalcYears(yr)}
                    className={`py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                      calcYears === yr ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    {yr} Yr{yr > 1 ? 's' : ''}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-300 font-semibold">Est. Annual Growth</span>
                <span className="text-emerald-400 font-bold font-mono">+{calcGrowth}% APY</span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={calcGrowth}
                onChange={(e) => setCalcGrowth(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Simulation Output */}
          <div className="md:col-span-2 bg-slate-950/80 border border-slate-800 p-5 rounded-xl flex flex-col justify-between">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Cash Out of Pocket</span>
                <span className="text-xl font-bold text-slate-200 mt-1 block">${totalContributions.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">{calcYears * 12} monthly payments of ${calcMonthly}</span>
              </div>

              <div className="bg-emerald-950/20 border border-emerald-500/30 p-4 rounded-xl">
                <span className="text-[10px] text-emerald-400 uppercase font-semibold block">Projected Portfolio Value</span>
                <span className="text-2xl font-black text-emerald-400 mt-1 block">${Math.round(futureValue).toLocaleString()}</span>
                <span className="text-[10px] text-emerald-300 mt-0.5 block">
                  +${Math.round(futureValue - totalContributions).toLocaleString()} ({Math.round(((futureValue - totalContributions) / totalContributions) * 100)}% return)
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                DCA mitigates volatility by averaging your entry price across market highs and lows automatically.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

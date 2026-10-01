import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Hash, 
  ExternalLink, 
  X, 
  Bell, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  Flame, 
  Coins, 
  ArrowUpRight, 
  Zap, 
  Play, 
  RefreshCcw,
  Clock,
  Layers,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Settings2,
  Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface ToastItem {
  id: string;
  type: 'block' | 'transaction' | 'system';
  title: string;
  message: string;
  timestamp: number;
  data?: any;
  details?: {
    hash?: string;
    rawHash?: string;
    blockHeight?: number;
    amount?: string;
    from?: string;
    to?: string;
    txType?: string;
    fee?: string;
    info?: string;
    miner?: string;
    size?: string;
  };
}

export function playToastChime(isBlock = false) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';

    const now = ctx.currentTime;
    if (isBlock) {
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15); // D6
    } else {
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.12); // A5
    }

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  } catch {
    // Audio playback may be blocked prior to first interaction, suppress silently
  }
}

interface ToastCardProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
  onInspect?: (data: any) => void;
}

const ToastCard: React.FC<ToastCardProps> = ({ toast, onDismiss, onInspect }) => {
  const [isPaused, setIsPaused] = useState(false);
  const duration = 6000; // 6 seconds auto-dismiss
  const isBlock = toast.type === 'block';

  useEffect(() => {
    if (isPaused) return;

    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, duration);

    return () => clearTimeout(timer);
  }, [isPaused, toast.id, onDismiss, duration]);

  const handleInspectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onInspect && toast.data) {
      onInspect(toast.data);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.9, x: 20 }}
      animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.85, x: 30, transition: { duration: 0.2 } }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`relative w-84 md:w-96 rounded-2xl overflow-hidden backdrop-blur-xl border shadow-2xl transition-all cursor-pointer group ${
        isBlock
          ? 'bg-gradient-to-br from-[#121324]/95 via-[#0d0e1a]/95 to-[#160d29]/95 border-indigo-500/40 shadow-indigo-950/50 hover:border-indigo-400'
          : 'bg-gradient-to-br from-[#0c1a16]/95 via-[#0d1416]/95 to-[#121320]/95 border-emerald-500/40 shadow-emerald-950/50 hover:border-emerald-400'
      }`}
      onClick={handleInspectClick}
    >
      {/* Glow highlight */}
      <div 
        className={`absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-40 ${
          isBlock ? 'bg-cyan-500' : 'bg-emerald-500'
        }`} 
      />

      <div className="p-4 relative z-10 space-y-2.5">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div 
              className={`p-2 rounded-xl flex items-center justify-center border shadow-sm ${
                isBlock
                  ? 'bg-indigo-500/20 border-indigo-500/40 text-cyan-300'
                  : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
              }`}
            >
              {isBlock ? (
                <Box size={18} className="animate-pulse" />
              ) : toast.details?.txType?.includes('Mint') ? (
                <Coins size={18} className="text-emerald-400" />
              ) : toast.details?.txType?.includes('Burn') ? (
                <Flame size={18} className="text-amber-400" />
              ) : (
                <Zap size={18} className="text-indigo-400" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span 
                  className={`text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full border ${
                    isBlock 
                      ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' 
                      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  {isBlock ? 'New Block Mined' : toast.details?.txType || 'Transaction Logged'}
                </span>
                <span className="text-[10px] text-white/40 font-mono">
                  {new Date(toast.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white mt-0.5 tracking-tight">
                {toast.title}
              </h4>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(toast.id);
            }}
            className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            title="Dismiss notification"
          >
            <X size={15} />
          </button>
        </div>

        {/* Message body / details */}
        <p className="text-xs text-white/70 leading-relaxed font-sans">
          {toast.message}
        </p>

        {/* Rich Metadata row */}
        {toast.details && (
          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono">
            {isBlock ? (
              <>
                <span className="text-white/40">Tx Count: <strong className="text-white">{toast.details.info || '1 tx'}</strong></span>
                <span className="text-white/40">Size: <strong className="text-white">{toast.details.size || '0.6 KB'}</strong></span>
              </>
            ) : (
              <>
                <span className="text-white/40 truncate max-w-[170px]" title={toast.details.from}>
                  From: <strong className="text-indigo-300">{toast.details.from?.slice(0, 10)}...</strong>
                </span>
                <span className="text-emerald-400 font-bold">
                  {toast.details.amount}
                </span>
              </>
            )}
          </div>
        )}

        {/* Interactive inspect button */}
        <div className="pt-1 flex items-center justify-between">
          <span className="text-[10px] text-white/40 flex items-center gap-1 group-hover:text-white/80 transition-colors">
            <ShieldCheck size={12} className={isBlock ? "text-cyan-400" : "text-emerald-400"} />
            Verified Ledger Record
          </span>
          <button
            onClick={handleInspectClick}
            className="text-[11px] font-semibold text-white/80 hover:text-white flex items-center gap-1 bg-white/5 hover:bg-white/15 px-2.5 py-1 rounded-lg border border-white/10 transition-all cursor-pointer"
          >
            <span>Inspect</span>
            <ExternalLink size={11} className="opacity-70 group-hover:opacity-100" />
          </button>
        </div>
      </div>

      {/* Progress countdown bar */}
      <div className="w-full bg-white/10 h-1 overflow-hidden">
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: isPaused ? undefined : '0%' }}
          transition={{ duration: 6, ease: 'linear' }}
          className={`h-full ${
            isBlock ? 'bg-cyan-400' : 'bg-emerald-400'
          }`}
        />
      </div>
    </motion.div>
  );
};

export interface ToastNotificationSystemProps {
  toasts: ToastItem[];
  history: ToastItem[];
  soundEnabled: boolean;
  onToggleSound: () => void;
  onDismissToast: (id: string) => void;
  onClearHistory: () => void;
  onInspectItem: (data: any) => void;
  onSimulateEvent: () => void;
  isSimulating?: boolean;
  pollingIntervalMs?: number;
  onSetPollingInterval?: (ms: number) => void;
  isPollingActive?: boolean;
  onTogglePolling?: () => void;
  onOpenEmailNotificationSettings?: () => void;
}

export const ToastNotificationSystem: React.FC<ToastNotificationSystemProps> = ({
  toasts,
  history,
  soundEnabled,
  onToggleSound,
  onDismissToast,
  onClearHistory,
  onInspectItem,
  onSimulateEvent,
  isSimulating = false,
  pollingIntervalMs = 3500,
  onSetPollingInterval,
  isPollingActive = true,
  onTogglePolling,
  onOpenEmailNotificationSettings
}) => {
  const [showDrawer, setShowDrawer] = useState(false);
  const [filter, setFilter] = useState<'all' | 'blocks' | 'transactions'>('all');

  const filteredHistory = history.filter((item) => {
    if (filter === 'blocks') return item.type === 'block';
    if (filter === 'transactions') return item.type === 'transaction';
    return true;
  });

  return (
    <>
      {/* Floating Toast Notification Container (Top-Right) */}
      <div className="fixed top-20 right-6 z-[9990] flex flex-col gap-3 pointer-events-none max-w-sm w-full">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto">
              <ToastCard 
                toast={toast} 
                onDismiss={onDismissToast} 
                onInspect={onInspectItem} 
              />
            </div>
          ))}
        </AnimatePresence>
      </div>

      {/* Floating Live Ledger Feed Trigger / Bell Button (Top-Right Nav Attachment) */}
      <div className="fixed bottom-6 left-6 z-[9990] flex items-center gap-2">
        <div className="bg-[#10111a]/90 backdrop-blur-md border border-white/10 p-1.5 pl-3 rounded-2xl flex items-center gap-3 shadow-xl">
          {/* Polling Indicator */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {isPollingActive && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isPollingActive ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            <span className="text-[11px] font-mono text-white/80 hidden sm:inline">
              {isPollingActive ? `Live Ledger (${(pollingIntervalMs / 1000).toFixed(1)}s)` : 'Polling Paused'}
            </span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            className={`p-2 rounded-xl transition-all border cursor-pointer ${
              soundEnabled
                ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/30'
                : 'bg-white/5 border-white/10 text-white/40 hover:text-white'
            }`}
            title={soundEnabled ? 'Mute alert chimes' : 'Enable alert chimes'}
          >
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>

          {/* Simulate Action Button */}
          <button
            onClick={onSimulateEvent}
            disabled={isSimulating}
            className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600/30 to-violet-600/30 hover:from-indigo-600/50 hover:to-violet-600/50 border border-indigo-500/30 text-indigo-200 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all cursor-pointer disabled:opacity-50"
            title="Simulate a real-time transit transaction and mine a new block immediately"
          >
            <Sparkles size={13} className={isSimulating ? "animate-spin text-cyan-300" : "text-indigo-400"} />
            <span className="hidden md:inline">Simulate Live Block</span>
            <span className="md:hidden">Simulate</span>
          </button>

          {/* Bell / History Trigger */}
          <button
            onClick={() => setShowDrawer(true)}
            className="relative p-2 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl transition-all cursor-pointer text-white flex items-center justify-center"
            title="Open Live Ledger Notifications Drawer"
          >
            <Bell size={15} />
            {history.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 border border-indigo-400 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full min-w-[18px] text-center shadow">
                {history.length > 99 ? '99+' : history.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* History Slide-out Drawer */}
      <AnimatePresence>
        {showDrawer && (
          <div className="fixed inset-0 z-[10000] flex justify-end bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-md bg-[#0f1017] border-l border-white/10 h-full flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-white/10 flex items-center justify-between bg-black/30">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl">
                    <Bell size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">Live Ledger Notifications</h3>
                    <p className="text-[11px] text-white/50">Real-time blocks & transaction events</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowDrawer(false)}
                  className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Preferences & Polling Interval Settings */}
              <div className="p-4 border-b border-white/10 bg-white/[0.03] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings2 size={14} className="text-indigo-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Sync & Preferences</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={10} /> LocalStorage Synced
                  </span>
                </div>

                {/* Polling Interval Options */}
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <span className="text-white/60">Data Fetching Interval:</span>
                    <span className="font-mono text-cyan-300 font-bold">{(pollingIntervalMs / 1000).toFixed(1)}s</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10">
                    {[
                      { label: '1.5s', ms: 1500, desc: 'Fast' },
                      { label: '3.5s', ms: 3500, desc: 'Normal' },
                      { label: '5.0s', ms: 5000, desc: 'Steady' },
                      { label: '10s', ms: 10000, desc: 'Eco' }
                    ].map(opt => (
                      <button
                        key={opt.ms}
                        onClick={() => onSetPollingInterval && onSetPollingInterval(opt.ms)}
                        className={`py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                          pollingIntervalMs === opt.ms
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-white/50 hover:text-white hover:bg-white/5'
                        }`}
                        title={`${opt.label} (${opt.desc})`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sound & Polling Toggles */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={onToggleSound}
                    className={`p-2 rounded-xl text-xs font-semibold flex items-center justify-between border transition-all cursor-pointer ${
                      soundEnabled
                        ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-200'
                        : 'bg-black/30 border-white/10 text-white/50 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {soundEnabled ? <Volume2 size={14} className="text-indigo-400" /> : <VolumeX size={14} />}
                      <span>Sound</span>
                    </div>
                    <span className={`text-[10px] font-bold font-mono px-1.5 py-0.2 rounded ${
                      soundEnabled ? 'bg-indigo-500/30 text-indigo-300' : 'bg-white/10 text-white/40'
                    }`}>
                      {soundEnabled ? 'ON' : 'OFF'}
                    </span>
                  </button>

                  <button
                    onClick={onTogglePolling}
                    className={`p-2 rounded-xl text-xs font-semibold flex items-center justify-between border transition-all cursor-pointer ${
                      isPollingActive
                        ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-200'
                        : 'bg-amber-600/20 border-amber-500/40 text-amber-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <RefreshCcw size={13} className={isPollingActive ? "animate-spin text-emerald-400" : "text-amber-400"} />
                      <span>Auto-Poll</span>
                    </div>
                    <span className={`text-[10px] font-bold font-mono px-1.5 py-0.2 rounded ${
                      isPollingActive ? 'bg-emerald-500/30 text-emerald-300' : 'bg-amber-500/30 text-amber-300'
                    }`}>
                      {isPollingActive ? 'ACTIVE' : 'PAUSED'}
                    </span>
                  </button>
                </div>

                {/* Email Notifications Cloud Functions Button */}
                {onOpenEmailNotificationSettings && (
                  <button
                    onClick={onOpenEmailNotificationSettings}
                    className="w-full mt-2 py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-900/30 to-cyan-900/30 hover:from-indigo-900/50 hover:to-cyan-900/50 border border-cyan-500/30 text-cyan-200 text-xs font-semibold flex items-center justify-between transition-all cursor-pointer shadow-sm group"
                  >
                    <div className="flex items-center gap-2">
                      <Mail size={14} className="text-cyan-400 group-hover:scale-110 transition-transform" />
                      <span>Email Alerts (Firebase Cloud Functions)</span>
                    </div>
                    <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded font-mono font-bold">
                      Configure &rarr;
                    </span>
                  </button>
                )}
              </div>

              {/* Controls bar inside Drawer */}
              <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                  <button
                    onClick={() => setFilter('all')}
                    className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      filter === 'all' ? 'bg-indigo-600 text-white' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    All ({history.length})
                  </button>
                  <button
                    onClick={() => setFilter('blocks')}
                    className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      filter === 'blocks' ? 'bg-indigo-600 text-white' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Blocks
                  </button>
                  <button
                    onClick={() => setFilter('transactions')}
                    className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      filter === 'transactions' ? 'bg-indigo-600 text-white' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Txs
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {onTogglePolling && (
                    <button
                      onClick={onTogglePolling}
                      className={`text-[11px] px-2.5 py-1 rounded-xl border font-bold transition-all cursor-pointer ${
                        isPollingActive
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      }`}
                    >
                      {isPollingActive ? 'Pause Poll' : 'Resume'}
                    </button>
                  )}

                  {history.length > 0 && (
                    <button
                      onClick={onClearHistory}
                      className="text-[11px] text-white/50 hover:text-rose-400 px-2 py-1 transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Event List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {filteredHistory.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center p-6 space-y-3">
                    <div className="p-3 bg-white/5 rounded-2xl text-white/30">
                      <Clock size={28} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white/70">No Notifications Recorded</p>
                      <p className="text-xs text-white/40 mt-1 max-w-xs">
                        New transactions and mined blocks detected during polling intervals will appear here in real-time.
                      </p>
                    </div>
                    <button
                      onClick={onSimulateEvent}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer mt-2"
                    >
                      <Sparkles size={14} />
                      Simulate First Event
                    </button>
                  </div>
                ) : (
                  filteredHistory.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (onInspectItem && item.data) {
                          onInspectItem(item.data);
                          setShowDrawer(false);
                        }
                      }}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 hover:scale-[1.01] ${
                        item.type === 'block'
                          ? 'bg-indigo-950/20 border-indigo-500/20 hover:border-indigo-500/40'
                          : 'bg-emerald-950/20 border-emerald-500/20 hover:border-emerald-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              item.type === 'block'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {item.type === 'block' ? 'Block' : item.details?.txType || 'Tx'}
                          </span>
                          <span className="text-xs font-bold text-white truncate max-w-[200px]">
                            {item.title}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-white/40">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>

                      <p className="text-xs text-white/70 line-clamp-2">
                        {item.message}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-white/50 border-t border-white/5 pt-2 font-mono">
                        <span className="truncate max-w-[240px]">
                          {item.details?.hash || item.details?.miner || 'Verified On-Chain'}
                        </span>
                        <span className="text-indigo-400 font-bold flex items-center gap-1 group-hover:underline">
                          View <ChevronRight size={12} />
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-white/10 bg-black/40 flex items-center justify-between">
                <span className="text-[11px] text-white/40 font-mono">
                  ChainPay Real-Time Network Watcher
                </span>
                <button
                  onClick={onSimulateEvent}
                  disabled={isSimulating}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles size={13} className={isSimulating ? "animate-spin" : ""} />
                  Test Live Event
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  FileCode, 
  Play, 
  Send, 
  Terminal, 
  Layers, 
  Cpu, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  ChevronRight, 
  Copy, 
  RefreshCcw, 
  Code2, 
  Sparkles,
  Zap,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';

interface ContractMethodInput {
  name: string;
  type: string;
}

interface ContractABI {
  name: string;
  type: string;
  inputs: ContractMethodInput[];
  outputs?: any[];
}

interface SmartContract {
  address: string;
  name: string;
  contract_type: string;
  source_code?: string;
  abi: ContractABI[];
  state: Record<string, any>;
  created_at: string;
  block_height: number;
  tx_hash: string;
  creator: string;
}

interface SmartContractsSectionProps {
  onRefreshLedger?: () => void;
  onRefreshWallet?: () => void;
}

const SOLIDITY_TEMPLATES = [
  {
    name: "Transit Fare Escrow",
    type: "Escrow & Settlement",
    source: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TransitFareEscrow
 * @dev Automated escrow holding rider fares until route verification
 */
contract TransitFareEscrow {
    address public immutable owner;
    uint256 public totalEscrowBalance;
    uint256 public activeTrips;

    event FareDeposited(address indexed passenger, uint256 amount);
    event TripReleased(address indexed passenger, uint256 fareAmount);
    event FareRefunded(address indexed passenger, uint256 amount);

    constructor() {
        owner = msg.sender;
        totalEscrowBalance = 100;
        activeTrips = 1;
    }

    function depositFare(uint256 amount) external {
        totalEscrowBalance += amount;
        activeTrips += 1;
        emit FareDeposited(msg.sender, amount);
    }

    function verifyAndReleaseTrip(address passenger, uint256 fareAmount) external {
        require(totalEscrowBalance >= fareAmount, "Insufficient escrow");
        totalEscrowBalance -= fareAmount;
        if (activeTrips > 0) activeTrips -= 1;
        emit TripReleased(passenger, fareAmount);
    }

    function refundPassenger(address passenger, uint256 amount) external {
        require(totalEscrowBalance >= amount, "Insufficient escrow");
        totalEscrowBalance -= amount;
        emit FareRefunded(passenger, amount);
    }
}`
  },
  {
    name: "Municipal Staking Vault",
    type: "Staking Yield Pool",
    source: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MunicipalStakingVault
 * @dev Earn 12% APY in VIBE tokens by locking municipal transit reserves
 */
contract MunicipalStakingVault {
    uint256 public totalStakedVibe;
    uint256 public totalYieldDistributed;
    uint256 public constant APY_PERCENT = 12;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event YieldClaimed(address indexed user, uint256 yieldAmount);

    constructor() {
        totalStakedVibe = 1000;
        totalYieldDistributed = 50;
    }

    function stake(uint256 amount) external {
        totalStakedVibe += amount;
        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) external {
        require(totalStakedVibe >= amount, "Exceeds pool stake");
        totalStakedVibe -= amount;
        emit Unstaked(msg.sender, amount);
    }

    function claimYield(uint256 amount) external {
        totalYieldDistributed += amount;
        emit YieldClaimed(msg.sender, amount);
    }
}`
  },
  {
    name: "County Treasury Multisig",
    type: "Multisig Governance",
    source: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TreasuryMultisig
 * @dev Multi-signature municipal treasury for infrastructure disbursements
 */
contract TreasuryMultisig {
    uint256 public requiredSignatures = 2;
    uint256 public treasuryBalance = 25000;
    uint256 public pendingPayouts = 1;

    event PayoutProposed(address indexed recipient, uint256 amount, string reason);
    event SignatureAdded(uint256 indexed payoutId, address indexed signer);
    event PayoutExecuted(uint256 indexed payoutId, address indexed recipient, uint256 amount);

    constructor() {
        requiredSignatures = 2;
        treasuryBalance = 25000;
        pendingPayouts = 1;
    }

    function proposePayout(address recipient, uint256 amount, string calldata reason) external {
        pendingPayouts += 1;
        emit PayoutProposed(recipient, amount, reason);
    }

    function signApproval(uint256 payoutId) external {
        emit SignatureAdded(payoutId, msg.sender);
    }

    function executePayout(uint256 payoutId, address recipient, uint256 amount) external {
        require(treasuryBalance >= amount, "Insufficient treasury balance");
        treasuryBalance -= amount;
        if (pendingPayouts > 0) pendingPayouts -= 1;
        emit PayoutExecuted(payoutId, recipient, amount);
    }
}`
  }
];

export const SmartContractsSection: React.FC<SmartContractsSectionProps> = ({
  onRefreshLedger,
  onRefreshWallet
}) => {
  const [contracts, setContracts] = useState<SmartContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<SmartContract | null>(null);
  const [activeTab, setActiveTab] = useState<'explorer' | 'deployer' | 'terminal'>('explorer');

  // Deployer Form State
  const [deployName, setDeployName] = useState('Transit Fare Escrow');
  const [deployType, setDeployType] = useState('Escrow & Settlement');
  const [deployCode, setDeployCode] = useState(SOLIDITY_TEMPLATES[0].source);
  const [deploying, setDeploying] = useState(false);

  // Execution Form State
  const [selectedMethod, setSelectedMethod] = useState<ContractABI | null>(null);
  const [methodArgs, setMethodArgs] = useState<Record<string, string>>({});
  const [executing, setExecuting] = useState(false);

  // Console Logs
  const [logs, setLogs] = useState<Array<{ timestamp: string; type: 'info' | 'success' | 'error'; message: string; details?: any }>>([
    {
      timestamp: new Date().toLocaleTimeString(),
      type: 'info',
      message: 'ChainPay Virtual EVM initialized. Ready for Smart Contract interaction.'
    }
  ]);

  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/contracts');
      const data = await res.json();
      if (Array.isArray(data)) {
        setContracts(data);
        if (data.length > 0 && !selectedContract) {
          setSelectedContract(data[0]);
          if (data[0].abi && data[0].abi.length > 0) {
            setSelectedMethod(data[0].abi[0]);
          }
        } else if (selectedContract) {
          // Update selected contract with latest state
          const updated = data.find((c: SmartContract) => c.address === selectedContract.address);
          if (updated) setSelectedContract(updated);
        }
      }
    } catch (err) {
      console.error('Failed to fetch smart contracts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const addLog = (type: 'info' | 'success' | 'error', message: string, details?: any) => {
    setLogs(prev => [
      {
        timestamp: new Date().toLocaleTimeString(),
        type,
        message,
        details
      },
      ...prev.slice(0, 49) // Keep last 50 logs
    ]);
  };

  const handleSelectTemplate = (template: typeof SOLIDITY_TEMPLATES[0]) => {
    setDeployName(template.name);
    setDeployType(template.type);
    setDeployCode(template.source);
    addLog('info', `Loaded template: ${template.name}`);
  };

  const handleDeployContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deployName.trim() || !deployCode.trim()) return;

    try {
      setDeploying(true);
      addLog('info', `Compiling and deploying '${deployName}' to ChainPay blockchain...`);

      const res = await fetch('/api/contracts/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: deployName,
          contract_type: deployType,
          source_code: deployCode,
          initialState: { owner: '0x0VibeUser', deployedAt: new Date().toISOString() }
        })
      });

      const result = await res.json();
      if (res.ok) {
        addLog('success', `Contract Deployed! Address: ${result.contract_address}`, result);
        await fetchContracts();
        if (onRefreshLedger) onRefreshLedger();
        if (onRefreshWallet) onRefreshWallet();
        setActiveTab('explorer');
      } else {
        addLog('error', `Deployment Failed: ${result.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      addLog('error', `Deployment Exception: ${err.message}`);
    } finally {
      setDeploying(false);
    }
  };

  const handleExecuteMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContract || !selectedMethod) return;

    try {
      setExecuting(true);
      addLog('info', `Invoking ${selectedContract.name}.${selectedMethod.name}() with params:`, methodArgs);

      const res = await fetch('/api/contracts/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractAddress: selectedContract.address,
          functionName: selectedMethod.name,
          args: methodArgs
        })
      });

      const result = await res.json();
      if (res.ok) {
        addLog('success', result.executionResult, {
          tx_hash: result.tx_hash,
          block_height: result.block_height,
          gas_used: result.gas_used,
          updatedState: result.updatedState
        });

        // Update local contract state
        setSelectedContract(prev => prev ? { ...prev, state: result.updatedState } : null);
        fetchContracts();

        if (onRefreshLedger) onRefreshLedger();
        if (onRefreshWallet) onRefreshWallet();
      } else {
        addLog('error', `Execution Failed: ${result.error || 'Transaction reverted'}`);
      }
    } catch (err: any) {
      addLog('error', `Execution Exception: ${err.message}`);
    } finally {
      setExecuting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(text);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  return (
    <div id="smart-contracts-section" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-cyan-900/40 via-indigo-900/40 to-purple-900/40 border border-cyan-500/20 rounded-3xl p-6 backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs tracking-wider uppercase mb-1">
              <Sparkles size={14} />
              <span>Smart Contract Virtual Machine</span>
            </div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <FileCode className="text-cyan-400" size={28} />
              Smart Contracts Studio
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Compile, deploy, and execute municipal blockchain smart contracts. Real-time state inspection, automated escrow settlements, and governance multisigs.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/10 self-start md:self-auto">
            <button
              onClick={() => setActiveTab('explorer')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'explorer' 
                  ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers size={14} />
              Contracts ({contracts.length})
            </button>
            <button
              onClick={() => setActiveTab('deployer')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'deployer' 
                  ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Plus size={14} />
              Deploy Contract
            </button>
            <button
              onClick={() => setActiveTab('terminal')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'terminal' 
                  ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Terminal size={14} />
              EVM Terminal ({logs.length})
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: CONTRACTS EXPLORER & METHOD CALLER */}
      {activeTab === 'explorer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Contracts List Side Panel */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Cpu size={16} className="text-cyan-400" />
                Deployed Live Contracts
              </h3>
              <button
                onClick={fetchContracts}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10"
              >
                <RefreshCcw size={12} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>

            {loading && contracts.length === 0 ? (
              <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-8 text-center text-slate-400 text-sm">
                Loading smart contracts...
              </div>
            ) : contracts.length === 0 ? (
              <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-8 text-center space-y-3">
                <p className="text-slate-400 text-sm">No smart contracts deployed yet.</p>
                <button
                  onClick={() => setActiveTab('deployer')}
                  className="bg-cyan-500 text-black px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2"
                >
                  <Plus size={14} />
                  Deploy First Smart Contract
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {contracts.map(contract => {
                  const isSelected = selectedContract?.address === contract.address;
                  return (
                    <div
                      key={contract.address}
                      onClick={() => {
                        setSelectedContract(contract);
                        if (contract.abi && contract.abi.length > 0) {
                          setSelectedMethod(contract.abi[0]);
                          setMethodArgs({});
                        }
                      }}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                        isSelected
                          ? 'bg-slate-800/80 border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                          : 'bg-slate-900/40 border-white/5 hover:border-white/20 hover:bg-slate-800/40'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-0 left-0 w-1 h-full bg-cyan-400" />
                      )}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                              {contract.contract_type}
                            </span>
                            <span className="text-[11px] text-slate-400">Block #{contract.block_height}</span>
                          </div>
                          <h4 className="font-bold text-white text-base mt-1.5">{contract.name}</h4>
                        </div>
                        <ChevronRight size={18} className={isSelected ? 'text-cyan-400' : 'text-slate-600'} />
                      </div>

                      <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                        <span className="font-mono text-[11px] text-slate-400 truncate max-w-[180px]">
                          {contract.address}
                        </span>
                        <span className="text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                          <ShieldCheck size={12} /> Verified
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Contract Detail & Interactive Executor */}
          <div className="lg:col-span-7 space-y-6">
            {selectedContract ? (
              <div className="bg-slate-900/70 border border-white/10 rounded-3xl p-6 backdrop-blur-md space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Active Smart Contract</span>
                      <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded font-mono border border-emerald-500/20">EVM Executed</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mt-1">{selectedContract.name}</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(selectedContract.address)}
                      className="bg-white/5 hover:bg-white/10 text-slate-300 text-xs px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-1.5"
                    >
                      <Copy size={12} />
                      {copiedAddress === selectedContract.address ? 'Copied!' : 'Copy Address'}
                    </button>
                  </div>
                </div>

                {/* State Variables Dashboard */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <Zap size={14} className="text-amber-400" />
                    Live On-Chain State Variables
                  </h4>
                  <div className="bg-black/40 border border-white/5 rounded-2xl p-4 font-mono text-xs text-cyan-300 overflow-x-auto">
                    <pre>{JSON.stringify(selectedContract.state, null, 2)}</pre>
                  </div>
                </div>

                {/* ABI Method Invoker */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <Code2 size={14} className="text-cyan-400" />
                    Interact with Contract Functions (ABI)
                  </h4>

                  {selectedContract.abi && selectedContract.abi.length > 0 ? (
                    <div className="space-y-4">
                      {/* Method selector buttons */}
                      <div className="flex flex-wrap gap-2">
                        {selectedContract.abi.map(method => (
                          <button
                            key={method.name}
                            type="button"
                            onClick={() => {
                              setSelectedMethod(method);
                              setMethodArgs({});
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all flex items-center gap-1.5 border ${
                              selectedMethod?.name === method.name
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md shadow-cyan-500/10'
                                : 'bg-slate-800/60 text-slate-400 border-white/5 hover:bg-slate-800 hover:text-white'
                            }`}
                          >
                            <Play size={10} className="fill-current" />
                            {method.name}()
                          </button>
                        ))}
                      </div>

                      {/* Selected Method Form */}
                      {selectedMethod && (
                        <form onSubmit={handleExecuteMethod} className="bg-black/30 border border-white/10 rounded-2xl p-5 space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-bold text-cyan-400">
                              function {selectedMethod.name}(
                              {selectedMethod.inputs?.map(i => `${i.type} ${i.name}`).join(', ')}
                              )
                            </span>
                            <span className="text-[10px] text-slate-500 uppercase font-semibold">Write Execution</span>
                          </div>

                          {selectedMethod.inputs && selectedMethod.inputs.length > 0 ? (
                            <div className="space-y-3">
                              {selectedMethod.inputs.map(input => (
                                <div key={input.name}>
                                  <label className="block text-xs text-slate-400 mb-1 font-mono">
                                    {input.name} <span className="text-slate-500">({input.type})</span>
                                  </label>
                                  <input
                                    type="text"
                                    placeholder={`Enter ${input.name} value...`}
                                    value={methodArgs[input.name] || ''}
                                    onChange={e => setMethodArgs({ ...methodArgs, [input.name]: e.target.value })}
                                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                                  />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic">No parameter inputs required for this function.</p>
                          )}

                          <button
                            type="submit"
                            disabled={executing}
                            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs py-2.5 rounded-xl transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            {executing ? (
                              <>
                                <RefreshCcw size={14} className="animate-spin" />
                                Executing EVM State Transition...
                              </>
                            ) : (
                              <>
                                <Send size={14} />
                                Execute Function Call (Send Transaction)
                              </>
                            )}
                          </button>
                        </form>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">No function ABI available for this contract.</p>
                  )}
                </div>

                {/* Source Code Inspector Toggle */}
                {selectedContract.source_code && (
                  <div>
                    <details className="group bg-black/20 border border-white/5 rounded-2xl overflow-hidden">
                      <summary className="px-4 py-3 text-xs font-semibold text-slate-400 cursor-pointer hover:text-white flex items-center justify-between select-none">
                        <span className="flex items-center gap-2">
                          <Code2 size={14} className="text-purple-400" />
                          View Solidity Source Code
                        </span>
                        <ChevronRight size={14} className="group-open:rotate-90 transition-transform" />
                      </summary>
                      <div className="p-4 pt-0 font-mono text-[11px] text-slate-300 bg-black/40 overflow-x-auto border-t border-white/5">
                        <pre className="text-slate-300 leading-relaxed">{selectedContract.source_code}</pre>
                      </div>
                    </details>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-12 text-center text-slate-400 text-sm">
                Select a smart contract on the left to inspect state and call functions.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SOLIDITY IDE & DEPLOYER */}
      {activeTab === 'deployer' && (
        <div className="bg-slate-900/70 border border-white/10 rounded-3xl p-6 backdrop-blur-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Code2 className="text-cyan-400" size={20} />
                Solidity Smart Contract Studio & Compiler
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Write Solidity code or select municipal templates to deploy to the ChainPay ledger.
              </p>
            </div>

            {/* Template selector chips */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-slate-400 font-semibold self-center">Templates:</span>
              {SOLIDITY_TEMPLATES.map(tmpl => (
                <button
                  key={tmpl.name}
                  type="button"
                  onClick={() => handleSelectTemplate(tmpl)}
                  className="bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-300 text-slate-300 text-xs px-3 py-1.5 rounded-xl border border-white/10 transition-all font-medium"
                >
                  {tmpl.name}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleDeployContract} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Contract Name
                </label>
                <input
                  type="text"
                  required
                  value={deployName}
                  onChange={e => setDeployName(e.target.value)}
                  placeholder="e.g., MunicipalFareVault"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Contract Category / Type
                </label>
                <input
                  type="text"
                  required
                  value={deployType}
                  onChange={e => setDeployType(e.target.value)}
                  placeholder="e.g., Escrow, Staking, DAO"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Terminal size={14} className="text-cyan-400" />
                  Solidity Code (.sol v0.8.20)
                </label>
                <span className="text-[11px] text-slate-500 font-mono">Compiler: Solc-JS Virtual EVM</span>
              </div>
              <textarea
                rows={12}
                required
                value={deployCode}
                onChange={e => setDeployCode(e.target.value)}
                className="w-full bg-black/80 border border-white/10 rounded-2xl p-4 font-mono text-xs text-cyan-300 focus:outline-none focus:border-cyan-500 leading-relaxed"
                placeholder="// Write your Solidity smart contract here..."
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleSelectTemplate(SOLIDITY_TEMPLATES[0])}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-white/5 border border-white/10"
              >
                Reset Code
              </button>
              <button
                type="submit"
                disabled={deploying}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {deploying ? (
                  <>
                    <RefreshCcw size={14} className="animate-spin" />
                    Compiling & Deploying...
                  </>
                ) : (
                  <>
                    <Zap size={14} />
                    Deploy Smart Contract to ChainPay
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: EVM TERMINAL LOGS */}
      {activeTab === 'terminal' && (
        <div className="bg-black/90 border border-white/10 rounded-3xl p-6 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="text-sm font-mono font-bold text-cyan-400 flex items-center gap-2">
              <Terminal size={16} />
              ChainPay EVM Execution Logs
            </h3>
            <button
              onClick={() => setLogs([])}
              className="text-xs text-slate-500 hover:text-slate-300 font-mono"
            >
              Clear Logs
            </button>
          </div>

          <div className="space-y-2 font-mono text-xs max-h-96 overflow-y-auto pr-2">
            {logs.map((log, index) => (
              <div
                key={index}
                className={`p-2.5 rounded-xl border ${
                  log.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                    : log.type === 'error'
                    ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                    : 'bg-white/5 text-slate-300 border-white/5'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] opacity-70 mb-1">
                  <span>[{log.timestamp}]</span>
                  <span className="uppercase font-bold">{log.type}</span>
                </div>
                <p className="font-semibold">{log.message}</p>
                {log.details && (
                  <pre className="mt-2 text-[10px] bg-black/50 p-2 rounded-lg opacity-80 overflow-x-auto">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

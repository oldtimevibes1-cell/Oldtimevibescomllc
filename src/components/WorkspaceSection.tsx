import React, { useState, useEffect } from 'react';
import { HardDrive, FileSpreadsheet, Download, RefreshCw, ExternalLink, CheckCircle, AlertCircle, ShieldAlert } from 'lucide-react';
import { listDriveFiles, exportLedgerToDrive, createAccountingSheet, DriveFile } from '../services/workspaceService';
import { getCachedAccessToken, googleProvider, auth } from '../firebase';
import { signInWithPopup } from 'firebase/auth';

interface WorkspaceSectionProps {
  ledger: any[];
  stats: any;
  authUser: any;
}

export const WorkspaceSection: React.FC<WorkspaceSectionProps> = ({ ledger, stats, authUser }) => {
  const [activeTab, setActiveTab] = useState<'drive' | 'sheets'>('drive');
  const [accessToken, setAccessToken] = useState<string | null>(getCachedAccessToken());
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [actionLink, setActionLink] = useState<string | null>(null);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'drive_export' | 'sheets_export' | null;
    title: string;
    description: string;
  }>({
    isOpen: false,
    type: null,
    title: '',
    description: '',
  });

  const [isProcessing, setIsProcessing] = useState(false);

  // Check and refresh token when auth user changes
  useEffect(() => {
    const token = getCachedAccessToken();
    setAccessToken(token);
    if (token && activeTab === 'drive') {
      fetchFiles(token);
    }
  }, [authUser, activeTab]);

  const handleSignInGoogle = async () => {
    try {
      setErrorMsg(null);
      const result = await signInWithPopup(auth, googleProvider);
      const credential = (result as any)._tokenResponse?.oauthAccessToken || (result as any).credential?.accessToken;
      if (credential) {
        setAccessToken(credential);
        fetchFiles(credential);
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      setErrorMsg(err.message || 'Failed to authenticate with Google Drive & Sheets scopes.');
    }
  };

  const fetchFiles = async (token?: string) => {
    const tok = token || accessToken;
    if (!tok) return;
    setLoadingFiles(true);
    setErrorMsg(null);
    try {
      const driveFiles = await listDriveFiles(tok);
      setFiles(driveFiles);
    } catch (err: any) {
      setErrorMsg('Failed to load Google Drive files. Re-authentication may be required.');
    } finally {
      setLoadingFiles(false);
    }
  };

  const requestDriveExport = () => {
    setConfirmModal({
      isOpen: true,
      type: 'drive_export',
      title: 'Export Ledger to Google Drive?',
      description: `This action will create a new JSON backup file named "ChainPay_Ledger_Backup_${Date.now()}.json" in your Google Drive containing ${ledger.length} ledger transactions.`,
    });
  };

  const requestSheetsExport = () => {
    setConfirmModal({
      isOpen: true,
      type: 'sheets_export',
      title: 'Export Accounting Report to Google Sheets?',
      description: `This action will create a new Google Spreadsheet titled "ChainPay Accounting Report" with transaction history and stats summary.`,
    });
  };

  const executeConfirmedAction = async () => {
    if (!accessToken) {
      setErrorMsg('Please sign in with Google to grant access to Drive and Sheets.');
      setConfirmModal({ isOpen: false, type: null, title: '', description: '' });
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setActionLink(null);

    try {
      if (confirmModal.type === 'drive_export') {
        const fileName = `ChainPay_Ledger_Backup_${Date.now()}.json`;
        const result = await exportLedgerToDrive(accessToken, fileName, {
          exportedAt: new Date().toISOString(),
          stats,
          transactionsCount: ledger.length,
          ledger,
        });
        setSuccessMsg(`Successfully exported ledger backup to Google Drive as "${result.name}"!`);
        if (result.webViewLink) {
          setActionLink(result.webViewLink);
        }
        fetchFiles(accessToken);
      } else if (confirmModal.type === 'sheets_export') {
        const sheetTitle = `ChainPay Accounting Report (${new Date().toLocaleDateString()})`;
        const result = await createAccountingSheet(accessToken, sheetTitle, ledger, stats);
        setSuccessMsg(`Successfully created Google Spreadsheet "${sheetTitle}"!`);
        setActionLink(result.spreadsheetUrl);
      }
    } catch (err: any) {
      console.error('Workspace action error:', err);
      setErrorMsg(err.message || 'An error occurred during Google Workspace export.');
    } finally {
      setIsProcessing(false);
      setConfirmModal({ isOpen: false, type: null, title: '', description: '' });
    }
  };

  return (
    <div id="workspace-section" className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Workspace Suite
            </span>
            <span className="text-xs text-slate-400 font-medium">Google Drive & Sheets Integration</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">Google Workspace Cloud Hub</h2>
          <p className="text-xs text-slate-400">
            Export ledger accounting reports to Google Sheets and manage transaction backups in Google Drive.
          </p>
        </div>

        {/* Auth / Status Button */}
        {!accessToken ? (
          <button
            onClick={handleSignInGoogle}
            className="flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-800 font-semibold px-4 py-2 rounded-xl text-xs shadow-md transition-all cursor-pointer border border-slate-300"
          >
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
            </svg>
            <span>Connect Drive & Sheets</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 px-3 py-1.5 rounded-xl text-xs text-slate-300">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>Google Account Connected</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mt-4 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('drive')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'drive'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>Google Drive Storage</span>
        </button>
        <button
          onClick={() => setActiveTab('sheets')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'sheets'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Google Sheets Accounting</span>
        </button>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
          {actionLink && (
            <a
              href={actionLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
            >
              <span>Open File</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* Drive Tab Content */}
      {activeTab === 'drive' && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl">
            <div>
              <h3 className="text-sm font-semibold text-white">Ledger Backup & Cloud Storage</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Save an encrypted JSON ledger snapshot directly to your Google Drive space.
              </p>
            </div>
            <button
              onClick={requestDriveExport}
              disabled={isProcessing}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-indigo-600/20 cursor-pointer transition-all shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Backup Ledger to Drive</span>
            </button>
          </div>

          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Recent Drive Files</h4>
            {accessToken && (
              <button
                onClick={() => fetchFiles()}
                disabled={loadingFiles}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${loadingFiles ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            )}
          </div>

          {!accessToken ? (
            <div className="text-center py-8 bg-slate-950/40 border border-slate-800/80 rounded-xl">
              <HardDrive className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Connect your Google Account above to browse and export files in Google Drive.</p>
            </div>
          ) : loadingFiles ? (
            <div className="text-center py-8 text-slate-400 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Loading Google Drive files...</span>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">No files found in Google Drive.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
              {files.map((file) => (
                <div key={file.id} className="bg-slate-800/30 border border-slate-700/30 p-3 rounded-xl flex items-center justify-between gap-2 text-xs">
                  <div className="truncate">
                    <p className="text-slate-200 font-medium truncate">{file.name}</p>
                    <p className="text-[10px] text-slate-400">
                      {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : 'Drive File'}
                    </p>
                  </div>
                  {file.webViewLink && (
                    <a
                      href={file.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 p-1 rounded-lg hover:bg-indigo-500/10 transition-colors"
                      title="Open in Drive"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sheets Tab Content */}
      {activeTab === 'sheets' && (
        <div className="mt-6 space-y-4">
          <div className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-xl space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Google Sheets Accounting & Audit Generator</h3>
              <p className="text-xs text-slate-400 mt-1">
                Generate an automated financial spreadsheet with formatted rows for all transactions, token balances, and system metrics.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Total Ledger Transactions</span>
                <span className="text-white font-bold">{ledger.length} txs</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Total Balance</span>
                <span className="text-emerald-400 font-bold">{stats?.totalBalance || '$0.00'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Target Destination</span>
                <span className="text-slate-200 font-medium">Google Spreadsheets</span>
              </div>
            </div>

            <button
              onClick={requestSheetsExport}
              disabled={isProcessing}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/20 cursor-pointer transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Create Accounting Sheet</span>
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-white">{confirmModal.title}</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{confirmModal.description}</p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmModal({ isOpen: false, type: null, title: '', description: '' })}
                disabled={isProcessing}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeConfirmedAction}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md"
              >
                {isProcessing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm & Export</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Google Workspace API Service for Drive and Sheets

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
}

/**
 * List files from user's Google Drive
 */
export async function listDriveFiles(accessToken: string): Promise<DriveFile[]> {
  try {
    const res = await fetch(
      'https://www.googleapis.com/drive/v3/files?pageSize=15&fields=files(id,name,mimeType,modifiedTime,webViewLink,iconLink)&orderBy=modifiedTime%20desc',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'Failed to list Drive files');
    }
    const data = await res.json();
    return data.files || [];
  } catch (err: any) {
    console.error('Error in listDriveFiles:', err);
    throw err;
  }
}

/**
 * Export ledger transaction data as a JSON file to Google Drive
 */
export async function exportLedgerToDrive(
  accessToken: string,
  filename: string,
  contentObj: any
): Promise<{ id: string; name: string; webViewLink?: string }> {
  const metadata = {
    name: filename,
    mimeType: 'application/json',
  };

  const fileContent = JSON.stringify(contentObj, null, 2);
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const body =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    fileContent +
    closeDelimiter;

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Failed to export file to Drive');
  }

  return await res.json();
}

/**
 * Create a new Google Spreadsheet for ChainPay Accounting and populate it with ledger transactions
 */
export async function createAccountingSheet(
  accessToken: string,
  sheetTitle: string,
  transactions: any[],
  stats: any
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  // 1. Create Spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: sheetTitle,
      },
      sheets: [
        {
          properties: {
            title: 'Ledger Transactions',
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(err.error?.message || 'Failed to create Google Sheet');
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = sheetData.spreadsheetUrl;

  // 2. Prepare Rows
  const rows = [
    ['ChainPay Ledger & Financial Summary Report'],
    [`Generated Date: ${new Date().toLocaleString()}`],
    [''],
    ['SUMMARY STATS'],
    ['Total Balance', stats?.totalBalance || '$0.00'],
    ['24h Volume', stats?.volume24h || '$0.00'],
    ['Active Wallets', stats?.activeWallets || 0],
    ['Block Height', stats?.blockHeight || 0],
    [''],
    ['TRANSACTION LEDGER'],
    ['Tx Hash', 'Block Height', 'Sender', 'Receiver', 'Amount', 'Asset', 'Fee', 'Status', 'Timestamp'],
    ...transactions.map((tx: any) => [
      tx.hash || '',
      tx.blockHeight || '',
      tx.sender || '',
      tx.receiver || '',
      tx.amount || '',
      tx.asset || 'USD',
      tx.fee || '$0.00',
      tx.status || 'Completed',
      tx.timestamp || new Date().toISOString(),
    ]),
  ];

  // 3. Append Values
  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: rows,
      }),
    }
  );

  if (!appendRes.ok) {
    const err = await appendRes.json();
    throw new Error(err.error?.message || 'Failed to populate sheet rows');
  }

  return { spreadsheetId, spreadsheetUrl };
}

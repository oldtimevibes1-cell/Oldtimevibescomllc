/**
 * Firebase Cloud Functions: Large Transaction Alert Dispatcher
 * Triggers automatically whenever a new transaction is recorded in Firestore
 * and sends rich email notifications to subscribers who meet the threshold.
 */

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { getFirestore } = require("firebase-admin/firestore");
const { initializeApp } = require("firebase-admin/app");

initializeApp();
const db = getFirestore();

/**
 * Cloud Function triggered on creation of a new transaction in Firestore:
 * Path: /transactions/{txHash}
 */
exports.onLargeTransactionAlert = onDocumentCreated(
  {
    document: "transactions/{txHash}",
    region: "us-east1"
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.log("No data associated with the event");
      return null;
    }

    const tx = snapshot.data();
    const txHash = event.params.txHash;
    const amountVal = parseFloat(tx.amount) || 0;
    const asset = tx.asset || "USD";
    const sender = tx.sender || "0xUnknown";
    const receiver = tx.receiver || "0xUnknown";
    const txType = tx.type || "transfer";

    // Estimate USD value if in ETH or VIBE
    let estimatedUsd = amountVal;
    if (asset === "ETH") {
      estimatedUsd = amountVal * 2850;
    } else if (asset === "VIBE") {
      estimatedUsd = amountVal * 1.5;
    }

    console.log(`Analyzing transaction ${txHash}: ${amountVal} ${asset} (~$${estimatedUsd.toFixed(2)} USD)`);

    // Query active notification subscribers whose threshold is <= estimatedUsd
    const subscribersSnapshot = await db
      .collection("notification_subscriptions")
      .where("enabled", "==", true)
      .where("minThresholdUsd", "<=", estimatedUsd)
      .get();

    if (subscribersSnapshot.empty) {
      console.log(`No active subscribers with threshold <= $${estimatedUsd}`);
      return null;
    }

    const emailTasks = [];
    subscribersSnapshot.forEach((doc) => {
      const sub = doc.data();
      const recipientEmail = sub.email;

      if (!recipientEmail || !recipientEmail.includes("@")) {
        return;
      }

      console.log(`Queueing large transaction email alert to: ${recipientEmail} for tx ${txHash}`);

      // Save to 'mail' collection (compatible with Firebase Trigger Email extension)
      const mailDoc = {
        to: recipientEmail,
        message: {
          subject: `🚨 [Whale Alert] Large Transaction: $${estimatedUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })} on ChainPay`,
          text: `A large transaction exceeding your alert threshold of $${sub.minThresholdUsd} was verified on-chain.\n\nAmount: ${amountVal} ${asset} (~$${estimatedUsd.toFixed(2)} USD)\nType: ${txType}\nFrom: ${sender}\nTo: ${receiver}\nTx Hash: ${txHash}\nTimestamp: ${new Date().toUTCString()}\n\nView details: https://chainpay.network/tx/${txHash}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0b0c13; color: #ffffff; padding: 32px; border-radius: 16px; border: 1px solid #1e2238;">
              <div style="border-bottom: 1px solid #232742; padding-bottom: 16px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between;">
                <h2 style="color: #6366f1; margin: 0; font-size: 20px; font-weight: 800;">⚡ ChainPay Live Ledger Alert</h2>
                <span style="background: rgba(99, 102, 241, 0.2); color: #818cf8; font-size: 11px; padding: 4px 8px; border-radius: 6px; font-weight: bold;">Firebase Cloud Function</span>
              </div>
              <p style="font-size: 15px; color: #cbd5e1; margin-bottom: 20px;">
                A transaction exceeding your configured alert threshold of <strong>$${sub.minThresholdUsd.toLocaleString()} USD</strong> was verified on-chain.
              </p>
              <div style="background: #121424; border: 1px solid #2b3054; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <tr>
                    <td style="color: #94a3b8; padding: 8px 0;">Transfer Value:</td>
                    <td style="color: #10b981; font-weight: bold; text-align: right; font-size: 18px;">${amountVal} ${asset} (~$${estimatedUsd.toFixed(2)} USD)</td>
                  </tr>
                  <tr>
                    <td style="color: #94a3b8; padding: 8px 0;">Transaction Type:</td>
                    <td style="color: #ffffff; text-align: right; font-weight: 600;">${txType.toUpperCase()}</td>
                  </tr>
                  <tr>
                    <td style="color: #94a3b8; padding: 8px 0;">Sender Address:</td>
                    <td style="color: #818cf8; text-align: right; font-family: monospace;">${sender.substring(0, 16)}...</td>
                  </tr>
                  <tr>
                    <td style="color: #94a3b8; padding: 8px 0;">Recipient:</td>
                    <td style="color: #818cf8; text-align: right; font-family: monospace;">${receiver.substring(0, 16)}...</td>
                  </tr>
                  <tr>
                    <td style="color: #94a3b8; padding: 8px 0;">Hash:</td>
                    <td style="color: #cbd5e1; text-align: right; font-family: monospace; font-size: 11px;">${txHash.substring(0, 22)}...</td>
                  </tr>
                </table>
              </div>
              <p style="font-size: 12px; color: #64748b; margin-top: 24px; text-align: center;">
                You received this alert because you subscribed to large transaction notifications in ChainPay settings.
              </p>
            </div>
          `
        },
        metadata: {
          txHash,
          amount: amountVal,
          asset,
          estimatedUsd,
          threshold: sub.minThresholdUsd,
          triggeredAt: new Date().toISOString()
        }
      };

      emailTasks.push(db.collection("mail").add(mailDoc));
    });

    await Promise.all(emailTasks);
    console.log(`Dispatched ${emailTasks.length} email alert(s) successfully.`);
    return { success: true, count: emailTasks.length };
  }
);

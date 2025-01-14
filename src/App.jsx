import { useState, useEffect } from "react";
import Solflare from "@solflare-wallet/sdk";
import * as XLSX from "xlsx";
import {
  Transaction,
  SystemProgram,
  Connection,
  PublicKey,
  clusterApiUrl,
} from "@solana/web3.js";
import solanaLogo from "./assets/solana.svg";
import nswdLogo from "/nswd.svg";
import "./App.css";
import { Buffer } from "buffer";

window.Buffer = Buffer;
let solflareWallet = new Solflare({
  network: "devnet",
});
function App() {
  const [walletAddress, setWalletAddress] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [planDetails, setPlanDetails] = useState(null);

  const connectWallet = async () => {
    try {
      await solflareWallet.connect();
      if (solflareWallet.publicKey) {
        const address = solflareWallet.publicKey.toString();
        setWalletAddress(address);
      }
    } catch (err) {
      console.error("Wallet connection failed:", err.message);
    }
  };

  const disconnectWallet = async () => {
    try {
      solflareWallet.disconnect();
      setWalletAddress("");
      setTransactions([]);
      setPlanDetails(null);
    } catch (err) {
      console.error("Failed to disconnect wallet:", err.message);
    }
  };
  const updateTransactions = async () => {
    if (!walletAddress) {
      return;
    }
    try {
      const response = await fetch(
        "https://solana-production-0549.up.railway.app/api/transactions/update",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress }),
        }
      );
      const result = await response.json();

      if (response.status === 200) {
        console.log("Transactions updated successfully!");
        setTransactions(result.transactions || []);
      } else {
        console.warn("Error updating transactions:", result.error);
      }
    } catch (error) {
      console.error("Error updating transactions:", error);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      updateTransactions();
    }
  }, [walletAddress]);
  const fetchTransactions = async () => {
    if (!walletAddress) {
      alert("Please connect your wallet first!");
      return;
    }

    try {
      const response = await fetch(
        `https://solana-production-0549.up.railway.app/api/transactions/${walletAddress}`
      );
      const result = await response.json();

      if (response.status === 200) {
        setTransactions(result.transactions || []);
        setPlanDetails(result.plan || null);
      } else {
        console.warn("Error fetching transactions:", result.error);
        setTransactions([]);
        setPlanDetails(null);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      fetchTransactions();
    }
  }, [walletAddress]);

  const selectPlan = async (planType) => {
    if (!walletAddress) {
      alert("Please connect your wallet first!");
      return;
    }

    let amount; // Iznos u SOL koji treba poslati
    if (planType === "free_trial") {
      amount = 0; // Besplatno
    } else if (planType === "three_months") {
      amount = 0.01; // 0.01 SOL za tri meseca
    } else if (planType === "yearly") {
      amount = 0.05; // 0.05 SOL za godišnji plan
    } else {
      alert("Invalid plan type selected!");
      return;
    }

    if (amount > 0) {
      try {
        const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

        const recipientAddress = new PublicKey(
          "FnfpkZUEGYAVxbWKVx9NUTEiegX7Lvaak9wK7G33NNWV" // OVO JE NKEA MOJA TEST ADRESA GDE SE SALJU SOL TOKENI ZA PRETPLATU
        );

        const { blockhash } = await connection.getLatestBlockhash("confirmed");

        const transaction = new Transaction({
          recentBlockhash: blockhash,
          feePayer: new PublicKey(walletAddress),
        }).add(
          SystemProgram.transfer({
            fromPubkey: new PublicKey(walletAddress),
            toPubkey: recipientAddress,
            lamports: amount * 10 ** 9, // Pretvaranje SOL u lamports
          })
        );

        const signedTransaction = await solflareWallet.signTransaction(
          transaction
        );

        const signature = await connection.sendRawTransaction(
          signedTransaction.serialize()
        );

        await connection.confirmTransaction(signature, "confirmed");
        console.log(`Transaction successful! Signature: ${signature}`);

        // Pozivanje endpoint-a za pretplatu
        const response = await fetch(
          "https://solana-production-0549.up.railway.app/api/wallet/subscribe",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ walletAddress, planType }),
          }
        );

        const result = await response.json();
        alert(result.message);

        fetchTransactions();
      } catch (error) {
        console.error("Error during transaction:", error);
        alert("Transaction failed. Please try again.");
      }
    } else {
      // Free trial scenario
      try {
        const response = await fetch(
          "https://solana-production-0549.up.railway.app/api/wallet/subscribe",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ walletAddress, planType }),
          }
        );

        const result = await response.json();
        alert(result.message);

        fetchTransactions();
      } catch (error) {
        console.error("Error during subscription:", error);
        alert("Failed to subscribe to free trial.");
      }
    }
  };

  const exportToExcel = () => {
    const data = transactions.map((tx) => ({
      Date: new Date(tx.block_time).toLocaleString(),
      "Transaction Hash": tx.transaction_hash,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");

    XLSX.writeFile(workbook, "transactions.xlsx");
  };
  const TransactionsList = () => (
    <div>
      {planDetails && (
        <div style={{ marginBottom: "20px" }}>
          <p>
            <strong>Plan Type:</strong> {planDetails.plan_type}
          </p>
          <p>
            <strong>Start Date:</strong>{" "}
            {new Date(planDetails.plan_start).toLocaleString()}
          </p>
          <p>
            <strong>End Date:</strong>{" "}
            {new Date(planDetails.plan_end).toLocaleString()}
          </p>
        </div>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2>Transactions</h2>
        <button
          onClick={exportToExcel}
          style={{ padding: "10px 20px", cursor: "pointer" }}
        >
          Export to Excel
        </button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Transaction Hash</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx, index) => (
            <tr key={index}>
              <td>{new Date(tx.block_time).toLocaleString()}</td>
              <td>
                <a
                  href={`https://explorer.solana.com/tx/${tx.transaction_hash}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#007bff", textDecoration: "none" }}
                >
                  {tx.transaction_hash}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <div>
        <a
          href="https://nswebdevelopment.com/"
          target="_blank"
          rel="noreferrer"
        >
          <img src={nswdLogo} className="logo" alt="NSWD logo" />
        </a>
        <a href="https://solana.com/" target="_blank" rel="noreferrer">
          <img src={solanaLogo} className="logo react" alt="Solana logo" />
        </a>
      </div>
      <h1>Solana Wallet Analytics</h1>

      {walletAddress ? (
        <div>
          <p>Connected Wallet: {walletAddress}</p>
          <button onClick={disconnectWallet}>Disconnect Wallet</button>

          {planDetails && planDetails.plan_type ? (
            <TransactionsList />
          ) : (
            <div>
              <h2>Select a Plan:</h2>
              <button onClick={() => selectPlan("free_trial")}>
                Free Trial
              </button>
              <button onClick={() => selectPlan("three_months")}>
                Three Months
              </button>
              <button onClick={() => selectPlan("yearly")}>Yearly</button>
            </div>
          )}
        </div>
      ) : (
        <button onClick={connectWallet}>Connect to Wallet</button>
      )}
    </div>
  );
}

export default App;

import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import solanaLogo from "./assets/solana.svg";
import nswdLogo from "/nswd.svg";
import "./App.css";

function App() {
  const [walletAddress, setWalletAddress] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [planDetails, setPlanDetails] = useState(null);

  const connectWallet = async () => {
    if (window.solana && window.solana.isPhantom) {
      try {
        const response = await window.solana.connect({ onlyIfTrusted: false });
        setWalletAddress(response.publicKey.toBase58());
        console.log("Connected to wallet:", response.publicKey.toBase58());
      } catch (err) {
        console.error("Wallet connection failed:", err.message);
      }
    } else {
      alert(
        "Phantom Wallet nije instaliran. Instalirajte ga sa https://phantom.app"
      );
    }
  };

  const disconnectWallet = async () => {
    if (window.solana && window.solana.isPhantom) {
      try {
        await window.solana.disconnect();
        setWalletAddress("");
        setTransactions([]);
        setPlanDetails(null);
        console.log("Disconnected from wallet");
      } catch (err) {
        console.error("Failed to disconnect wallet:", err.message);
      }
    }
  };

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
      console.error("Error subscribing to plan:", error);
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
        <button onClick={connectWallet}>Connect to Phantom Wallet</button>
      )}
    </div>
  );
}

export default App;

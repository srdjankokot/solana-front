import { useState, useEffect } from "react";
import solanaLogo from "./assets/solana.svg";
import nswdLogo from "/nswd.svg";
import "./App.css";

function App() {
  const [walletAddress, setWalletAddress] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(null);
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
        setSelectedPlan(null);
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
        `http://localhost:5000/api/transactions/${walletAddress}`
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

    setSelectedPlan(planType);
    try {
      const response = await fetch(
        "http://localhost:5000/api/wallet/subscribe",
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

  const TransactionsList = () => (
    <div>
      <h2>Plan Details</h2>
      {planDetails ? (
        <div>
          <p>
            <strong>Plan Type:</strong> {planDetails.plan_type}
          </p>
          <p>
            <strong>Plan Start:</strong>{" "}
            {new Date(planDetails.plan_start).toLocaleString()}
          </p>
          <p>
            <strong>Plan End:</strong>{" "}
            {new Date(planDetails.plan_end).toLocaleString()}
          </p>
          {selectedPlan && (
            <p>
              <strong>Selected Plan:</strong> {selectedPlan}
            </p>
          )}
        </div>
      ) : (
        <p>No active plan found.</p>
      )}

      <h2>Transactions</h2>
      {transactions.length > 0 ? (
        <ul>
          {transactions.map((tx, index) => (
            <li key={index}>
              <p>
                <strong>Date:</strong>{" "}
                {new Date(tx.block_time).toLocaleString()}
              </p>
              <p>
                <strong>Hash:</strong> {tx.transaction_hash}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p>No transactions found.</p>
      )}
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

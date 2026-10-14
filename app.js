import { HashConnect } from "https://esm.sh/hashconnect@3.0.14?deps=@hashgraph/sdk@2.81.0";
import {
  LedgerId,
  AccountId,
  Hbar,
  ContractExecuteTransaction,
} from "https://esm.sh/@hashgraph/sdk@2.81.0";

const CFG = window.APP_CONFIG;
const $ = (id) => document.getElementById(id);

const el = {
  btnConnect: $("btn-connect"),
  accountLabel: $("account-label"),
  balance: $("balance"),
  unlockDate: $("unlock-date"),
  countdown: $("countdown"),
  contractLink: $("contract-link"),
  beneficiaryLabel: $("beneficiary-label"),
  amount: $("amount"),
  btnDeposit: $("btn-deposit"),
  btnWithdraw: $("btn-withdraw"),
  withdrawHint: $("withdraw-hint"),
  status: $("status"),
};

let hashconnect = null;
let connectedAccount = null; // string "0.0.x"

function setStatus(msg, type = "") {
  el.status.textContent = msg;
  el.status.className = "status " + type;
}

function isUnlocked() {
  return Date.now() / 1000 >= CFG.UNLOCK_TIMESTAMP;
}

function isBeneficiaryConnected() {
  if (!connectedAccount) return false;
  try {
    return (
      AccountId.fromString(connectedAccount).toString() ===
      AccountId.fromString(CFG.BENEFICIARY_ID).toString()
    );
  } catch {
    return connectedAccount === CFG.BENEFICIARY_ID;
  }
}

function updateUI() {
  el.accountLabel.textContent = connectedAccount
    ? `Conectada: ${connectedAccount} (testnet)`
    : "Billetera no conectada";
  el.btnConnect.textContent = connectedAccount ? "Reconectar" : "Conectar HashPack";
  el.btnDeposit.disabled = !connectedAccount;

  const canWithdraw = connectedAccount && isUnlocked() && isBeneficiaryConnected();
  el.btnWithdraw.disabled = !canWithdraw;
  if (!connectedAccount) {
    el.withdrawHint.textContent =
      "Disponible para la beneficiaria a partir de la fecha de desbloqueo.";
  } else if (!isUnlocked()) {
    el.withdrawHint.textContent = "Aun no llega la fecha de desbloqueo.";
  } else if (!isBeneficiaryConnected()) {
    el.withdrawHint.textContent = `Solo la cuenta ${CFG.BENEFICIARY_ID} puede retirar.`;
  } else {
    el.withdrawHint.textContent = "Ya puedes retirar el balance completo.";
  }
}

async function refreshBalance() {
  try {
    const res = await fetch(`${CFG.MIRROR_NODE}/api/v1/contracts/${CFG.CONTRACT_ID}`);
    const data = await res.json();
    const tinybars = data?.balance?.balance ?? 0;
    el.balance.textContent = `${(tinybars / 1e8).toLocaleString("es", {
      maximumFractionDigits: 8,
    })} HBAR`;
  } catch {
    el.balance.textContent = "error al consultar";
  }
}

function startCountdown() {
  const tick = () => {
    const ms = CFG.UNLOCK_TIMESTAMP * 1000 - Date.now();
    el.unlockDate.textContent = new Date(CFG.UNLOCK_TIMESTAMP * 1000).toLocaleString("es");
    if (ms <= 0) {
      el.countdown.textContent = "Desbloqueado";
      updateUI();
      return;
    }
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    el.countdown.textContent = `${d}d ${h}h ${m}m ${s % 60}s`;
    setTimeout(tick, 1000);
  };
  tick();
}

async function init() {
  el.beneficiaryLabel.textContent = CFG.BENEFICIARY_ID;
  el.contractLink.href = `https://hashscan.io/testnet/contract/${CFG.CONTRACT_ID}`;
  startCountdown();
  refreshBalance();
  setInterval(refreshBalance, 30000);

  if (CFG.WALLETCONNECT_PROJECT_ID.startsWith("REEMPLAZA")) {
    setStatus(
      "Falta configurar WALLETCONNECT_PROJECT_ID en config.js (gratis en https://cloud.reown.com)",
      "error"
    );
    return;
  }

  try {
    hashconnect = new HashConnect(
      LedgerId.TESTNET,
      CFG.WALLETCONNECT_PROJECT_ID,
      {
        name: "Ahorro HBAR Timelock",
        description: "Depósitos de HBAR bloqueados hasta el 10-mar-2028",
        icons: [window.location.origin + "/favicon.ico"],
        url: window.location.origin,
      },
      false
    );

    hashconnect.pairingEvent.on((data) => {
      connectedAccount = data.accountIds[0] ?? null;
      updateUI();
      setStatus("");
    });
    hashconnect.disconnectionEvent.on(() => {
      connectedAccount = null;
      updateUI();
    });

    await hashconnect.init();
    updateUI();
  } catch (err) {
    setStatus("Error inicializando HashConnect: " + err.message, "error");
  }
}

el.btnConnect.addEventListener("click", () => {
  if (!hashconnect) {
    setStatus("HashConnect no está listo. Revisa el Project ID en config.js", "error");
    return;
  }
  hashconnect.openPairingModal();
});

el.btnDeposit.addEventListener("click", async () => {
  const amount = parseFloat(el.amount.value);
  if (!connectedAccount || !(amount > 0)) {
    setStatus("Conecta la billetera e ingresa un monto mayor a 0", "error");
    return;
  }
  try {
    setStatus("Firmando en HashPack...");
    const tx = new ContractExecuteTransaction()
      .setContractId(CFG.CONTRACT_ID)
      .setGas(200_000)
      .setFunction("deposit")
      .setPayableAmount(new Hbar(amount));
    const receipt = await hashconnect.sendTransaction(
      AccountId.fromString(connectedAccount),
      tx
    );
    setStatus(`Depósito enviado. Estado: ${receipt.status}`, "ok");
    setTimeout(refreshBalance, 4000);
  } catch (err) {
    setStatus("Depósito fallido: " + err.message, "error");
  }
});

el.btnWithdraw.addEventListener("click", async () => {
  if (!connectedAccount) return;
  try {
    setStatus("Firmando en HashPack...");
    const tx = new ContractExecuteTransaction()
      .setContractId(CFG.CONTRACT_ID)
      .setGas(300_000)
      .setFunction("withdraw");
    const receipt = await hashconnect.sendTransaction(
      AccountId.fromString(connectedAccount),
      tx
    );
    setStatus(`Retiro enviado. Estado: ${receipt.status}`, "ok");
    setTimeout(refreshBalance, 4000);
  } catch (err) {
    setStatus("Retiro fallido: " + err.message, "error");
  }
});

init();

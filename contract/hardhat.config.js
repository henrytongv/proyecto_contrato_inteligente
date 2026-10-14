require("@nomicfoundation/hardhat-toolbox");
const path = require("path");

// .env vive en la raiz del proyecto (un nivel arriba de contract/)
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
require("dotenv").config();

// Acepta llaves ECDSA en formato raw (64 hex) o DER (con prefijo), con o sin "0x".
function normalizeKey(key) {
  if (!key) return undefined;
  let k = key.trim().replace(/^0x/i, "");
  if (!/^[0-9a-fA-F]+$/.test(k)) return undefined;
  if (k.length > 64) k = k.slice(-64);
  return "0x" + k;
}

const operatorKey = normalizeKey(process.env.OPERATOR_KEY);

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  networks: {
    hederaTestnet: {
      url: "https://testnet.hashio.io/api",
      chainId: 296,
      accounts: operatorKey ? [operatorKey] : [],
    },
  },
};

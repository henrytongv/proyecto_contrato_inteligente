// Configuración de la dApp. Este archivo SÍ se commitea (no contiene secretos).
window.APP_CONFIG = {
  NETWORK: "testnet",

  // Contrato Timelock desplegado en Hedera testnet
  CONTRACT_ID: "0.0.11021059",
  CONTRACT_EVM: "0x488E704ba165b26443Af8D4308a40feAf05F9d7E",

  // Beneficiaria: cuenta 0.0.7279544
  BENEFICIARY_ID: "0.0.7279544",

  // 2028-03-10 00:00:00 UTC
  UNLOCK_TIMESTAMP: 1836259200,

  // Project ID gratuito de https://cloud.reown.com (requerido por hashconnect/WalletConnect)
  WALLETCONNECT_PROJECT_ID: "d136510b99eee63ec2936fcbaddb6f73",

  MIRROR_NODE: "https://testnet.mirrornode.hedera.com",
};

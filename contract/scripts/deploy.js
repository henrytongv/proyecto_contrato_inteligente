const { ethers } = require("hardhat");

// Beneficiaria: cuenta 0.0.7279544 (EVM alias verificado via mirror node)
const BENEFICIARY = "0xf0c19a201f4d3732d38af10311d33b2762fa1115";
// 2028-03-10 00:00:00 UTC
const UNLOCK_TIMESTAMP = 1836259200;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const Timelock = await ethers.getContractFactory("Timelock");
  const timelock = await Timelock.deploy(BENEFICIARY, UNLOCK_TIMESTAMP);
  await timelock.waitForDeployment();
  const evm = await timelock.getAddress();
  console.log("Timelock deployado en EVM address:", evm);

  // Resolver el ContractId de Hedera via mirror node (con reintentos)
  for (let i = 0; i < 10; i++) {
    await sleep(4000);
    try {
      const res = await fetch(
        `https://testnet.mirrornode.hedera.com/api/v1/contracts/${evm}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.contract_id) {
          console.log("ContractId:", data.contract_id);
          console.log(`HashScan: https://hashscan.io/testnet/contract/${data.contract_id}`);
          console.log("\nActualiza frontend/config.js con CONTRACT_ID =", data.contract_id);
          return;
        }
      }
    } catch (_) {}
    console.log("Esperando a que el mirror node indexe el contrato...");
  }
  console.log("No se pudo resolver el ContractId aun. Buscalo en:");
  console.log(`  https://hashscan.io/testnet/contract/${evm}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

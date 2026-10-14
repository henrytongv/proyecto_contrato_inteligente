# Ahorro HBAR con Timelock (Hedera testnet)

dApp para depositar HBAR en un smart contract cuyo balance solo puede retirarlo la
cuenta beneficiaria **`0.0.7279544`** a partir del **10 de marzo de 2028 (00:00 UTC)**.

- Contrato desplegado (testnet): **`0.0.11021059`**
- HashScan: https://hashscan.io/testnet/contract/0.0.11021059

## Estructura

```
contract/   Proyecto Hardhat: Timelock.sol, tests, script de deploy
frontend/   Sitio estático (HTML/JS) para conectar HashPack, depositar y retirar
.env        Credenciales testnet del operador (no commiteado)
```

## Requisitos

- Node.js 20+ y npm
- Billetera **HashPack** (extensión de navegador) configurada en **testnet** con HBAR de prueba
- Cuenta operadora testnet con llave **ECDSA** (crear en https://portal.hedera.com)
- `WALLETCONNECT_PROJECT_ID` gratuito de https://cloud.reown.com

## Ejecutar en local

1. Copia `.env.example` a `.env` en la raíz y pon tu `OPERATOR_ID` y `OPERATOR_KEY`.

2. Contrato (compilar y testear — el deploy ya está hecho):
   ```bash
   cd contract
   npm install
   npx hardhat compile
   npx hardhat test
   ```

3. Frontend: pon tu `WALLETCONNECT_PROJECT_ID` en `frontend/config.js` y sirve la carpeta:
   ```bash
   npx serve frontend
   # o: python -m http.server -d frontend 8080
   ```
   Abre http://localhost:3000 (o el puerto indicado), conecta HashPack y deposita.

## Despliegue en Render.com

El frontend es un sitio estático sin build step.

1. Sube el repo a GitHub.
2. En Render: **New → Static Site**, conecta el repo.
3. Configura:
   - **Build Command**: *(vacío)*
   - **Publish Directory**: `frontend`
4. Deploy. Listo — la URL `*.onrender.com` servirá la dApp.

Nota: `frontend/config.js` apunta al contrato ya desplegado en testnet; el
`WALLETCONNECT_PROJECT_ID` va en ese archivo (no es secreto, pero es por-proyecto).

## Redeploy del contrato (opcional)

```bash
cd contract
npx hardhat run scripts/deploy.js --network hederaTestnet
```

Imprime el nuevo `ContractId`; actualízalo en `frontend/config.js`.
Beneficiaria y fecha de desbloqueo están definidos en `contract/scripts/deploy.js`.

## Advertencias

- **No hay función de rescate**: si la beneficiaria pierde acceso a su cuenta,
  los fondos quedan bloqueados para siempre.
- Esto es testnet: los HBAR no tienen valor real.

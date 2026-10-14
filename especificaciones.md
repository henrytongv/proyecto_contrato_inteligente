# Especificaciones — Proyecto contrato inteligente (timelock de HBAR)

> Documento derivado de `ejemplo_contrato_inteligente.md` (idea original, histórico — no modificar).

## 1. Objetivo

Depositar HBAR de forma periódica en un smart contract en Hedera **testnet**, cuyos fondos solo podrá retirar la hija del usuario (cuenta `0.0.7279544`) a partir del **10 de marzo de 2028**.

## 2. Datos verificados (consulta al mirror node de testnet)

Consultado `https://testnet.mirrornode.hedera.com/api/v1/accounts/0.0.7279544` el 2026-10-14:

- La cuenta `0.0.7279544` **existe** en testnet.
- Balance actual: ~46.5 HBAR (4,650,000,028 tinybars).
- Tipo de llave: `ECDSA_SECP256K1`.
- **Dirección EVM (alias): `0xf0c19a201f4d3732d38af10311d33b2762fa1115`**

**Observación técnica importante:** como la cuenta tiene llave ECDSA, cuando la beneficiaria ejecute `withdraw()`, `msg.sender` será su EVM alias (`0xf0c19a...1115`), **no** la dirección derivada del número de cuenta (`0x000...6F13B8`). El contrato debe usar el alias verificado como dirección beneficiaria.

## 3. Decisiones del usuario

Respuestas a preguntas de diseño (el usuario respondió con letras; se interpreta `a` = primera opción, `b` = segunda opción — **interpretación pendiente de confirmar**):

| Pregunta | Respuesta | Interpretación |
|---|---|---|
| ¿Momento exacto de desbloqueo? | `a` | **00:00 UTC del 10-mar-2028** → Unix timestamp `1836259200` |
| ¿Quién puede depositar? | `a` | **Cualquier billetera** puede depositar (familia, regalos). Retiro sigue siendo solo la beneficiaria. |
| ¿Stack del frontend? | `b` | **HTML/JS/CSS simple**, sin framework. Dependencias por CDN (esm.sh). Desplegable como sitio estático en Render sin build step. |
| ¿Cómo hacer los depósitos periódicos? | `a` | **Manual desde la web**: el usuario entra a la app cuando quiera, conecta HashPack y deposita. |

Otras decisiones confirmadas:

- **Toolchain del contrato: Hardhat** (compilar, testear, desplegar).
- El usuario ya tiene **HashPack instalado** en su navegador.

## 4. Arquitectura propuesta

```
proyecto_contrato_inteligente/
├── ejemplo_contrato_inteligente.md   # histórico (no tocar)
├── especificaciones.md               # este archivo
├── README.md                         # instrucciones locales + despliegue en Render
├── .gitignore                        # node_modules, .env, artifacts/, cache/
├── contract/                         # proyecto Hardhat
│   ├── hardhat.config.js             # red hedera-testnet vía JSON-RPC https://testnet.hashio.io/api
│   ├── contracts/Timelock.sol
│   ├── test/Timelock.test.js
│   ├── scripts/deploy.js             # imprime ContractId/EVM address para el frontend
│   ├── .env.example                  # OPERATOR_KEY (ECDSA, hex)
│   └── package.json
└── frontend/                         # sitio estático (raíz de publicación en Render)
    ├── index.html
    ├── app.js                        # hashconnect + @hashgraph/sdk vía esm.sh
    ├── config.js                     # CONTRACT_ID / dirección EVM del contrato
    └── style.css
```

## 5. Smart contract — `Timelock.sol`

- Solidity `^0.8.x`.
- Constructor: `beneficiary` (address) + `unlockTimestamp` (uint256), ambos `immutable`.
  - Valores de deploy: `0xf0c19a201f4d3732d38af10311d33b2762fa1115` y `1836259200`.
- `receive()`/`deposit()` payable — acepta HBAR de cualquiera.
- `withdraw()` — solo `msg.sender == beneficiary` y solo cuando `block.timestamp >= unlockTimestamp`; transfiere el balance total al beneficiario (vía `.call`, no `.transfer`).
- Eventos: `Deposited(address from, uint256 amount)`, `Withdrawn(address to, uint256 amount)`.
- Sin función de emergencia ni `owner`: nadie puede mover fondos antes de tiempo (decisión deliberada, documentar en README).

## 6. Frontend — funcionalidad

- Botón **Conectar HashPack** (forzando testnet) vía `hashconnect`.
- Mostrar: balance del contrato (vía mirror node), fecha de desbloqueo y countdown.
- Formulario de depósito: monto en HBAR → `ContractExecuteTransaction` a `deposit()` (payable), firmado en HashPack.
- Botón **Retirar** → `ContractExecuteTransaction` a `withdraw()`; deshabilitado con mensaje si falta tiempo o si la cuenta conectada no es la beneficiaria. *(Supuesto: la hija usará esta misma web para retirar en 2028; ver §8.)*
- `config.js` con `CONTRACT_ID` y red, generado tras el deploy.

## 7. Pruebas y despliegue

- Tests Hardhat: depósito suma balance; `withdraw()` revierte antes del timestamp; revierte si `msg.sender != beneficiary`; éxito después del timestamp (usando `time.increaseTo`).
- Deploy: `npx hardhat run scripts/deploy.js --network hederaTestnet` usando la llave ECDSA del operador en `contract/.env`.
- Render: Static Site apuntando a `frontend/`, sin build command. README con pasos.
- Repo listo para GitHub: `.gitignore` con `.env`, `node_modules`, `artifacts/`, `cache/`; `.env.example` documentado.

## 8. Supuestos

1. ~~Las respuestas `a`/`b` se interpretaron como letras de opción (tabla §3).~~ **Confirmado correcto por el usuario.**
2. La misma web servirá a la hija para retirar en 2028 (por eso incluye botón de retiro).
3. No hay función de rescate: si la hija pierde acceso a su cuenta, los fondos quedan bloqueados para siempre.
4. El frontend se sirve como estático; la lectura de balance usa el mirror node público de testnet (sin backend propio).
5. La cuenta en HashPack es la **del usuario (depositante)**, no la de la hija. Cualquier cuenta testnet con HBAR sirve, pues los depósitos son abiertos.

## 9. Credenciales y estado

| Dato | Estado |
|---|---|
| `OPERATOR_ID` + `OPERATOR_KEY` en `.env` | ✅ Provisto por el usuario, ubicado en la raíz del proyecto (el `hardhat.config.js` lo lee desde `../.env`) |
| Cuenta del usuario en HashPack (testnet) | ✅ Ya instalada; debe estar en testnet con HBAR para probar depósitos |
| `WALLETCONNECT_PROJECT_ID` | ⚠️ Pendiente — `hashconnect` v3 requiere un Project ID **gratuito** de https://cloud.reown.com. Va en `frontend/config.js` (no es secreto, pero es por-proyecto) |
| Contrato desplegado | ✅ `0.0.11021059` (EVM `0x488E704ba165b26443Af8D4308a40feAf05F9d7E`), beneficiaria y fecha verificadas on-chain — https://hashscan.io/testnet/contract/0.0.11021059 |

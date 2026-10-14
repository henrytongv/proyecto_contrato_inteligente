// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Timelock de HBAR
/// @notice Recibe depositos de HBAR de cualquier billetera. Solo la beneficiaria
///         puede retirar el balance total, y unicamente a partir de la fecha de
///         desbloqueo fijada en el deploy (10-mar-2028 00:00 UTC).
contract Timelock {
    address public immutable beneficiary;
    uint256 public immutable unlockTimestamp;

    event Deposited(address indexed from, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);

    constructor(address _beneficiary, uint256 _unlockTimestamp) {
        require(_beneficiary != address(0), "Beneficiaria invalida");
        require(_unlockTimestamp > block.timestamp, "Fecha debe ser futura");
        beneficiary = _beneficiary;
        unlockTimestamp = _unlockTimestamp;
    }

    /// @notice Acepta transferencias directas de HBAR al contrato.
    receive() external payable {
        emit Deposited(msg.sender, msg.value);
    }

    /// @notice Deposito explicito (equivalente a enviar HBAR al contrato).
    function deposit() external payable {
        emit Deposited(msg.sender, msg.value);
    }

    /// @notice Retira el balance total. Solo la beneficiaria, solo tras la fecha.
    function withdraw() external {
        require(block.timestamp >= unlockTimestamp, "Fondos aun bloqueados");
        require(msg.sender == beneficiary, "Solo la beneficiaria puede retirar");
        uint256 amount = address(this).balance;
        require(amount > 0, "Sin fondos");
        (bool ok, ) = beneficiary.call{value: amount}("");
        require(ok, "Transferencia fallida");
        emit Withdrawn(beneficiary, amount);
    }
}

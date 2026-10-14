const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

const ONE_YEAR = 365 * 24 * 60 * 60;

async function deployFixture() {
  const [owner, beneficiary, other] = await ethers.getSigners();
  const unlock = (await time.latest()) + ONE_YEAR;
  const Timelock = await ethers.getContractFactory("Timelock");
  const timelock = await Timelock.deploy(beneficiary.address, unlock);
  return { timelock, unlock, owner, beneficiary, other };
}

describe("Timelock", function () {
  describe("deploy", function () {
    it("guarda beneficiaria y fecha de desbloqueo", async function () {
      const { timelock, unlock, beneficiary } = await loadFixture(deployFixture);
      expect(await timelock.beneficiary()).to.equal(beneficiary.address);
      expect(await timelock.unlockTimestamp()).to.equal(unlock);
    });

    it("rechaza beneficiaria address(0)", async function () {
      const Timelock = await ethers.getContractFactory("Timelock");
      const future = (await time.latest()) + ONE_YEAR;
      await expect(Timelock.deploy(ethers.ZeroAddress, future)).to.be.revertedWith(
        "Beneficiaria invalida"
      );
    });

    it("rechaza fecha en el pasado", async function () {
      const [owner] = await ethers.getSigners();
      const Timelock = await ethers.getContractFactory("Timelock");
      const past = (await time.latest()) - 1;
      await expect(Timelock.deploy(owner.address, past)).to.be.revertedWith(
        "Fecha debe ser futura"
      );
    });
  });

  describe("depositos", function () {
    it("acepta deposit() de cualquiera y emite evento", async function () {
      const { timelock, other } = await loadFixture(deployFixture);
      await expect(timelock.connect(other).deposit({ value: ethers.parseEther("1") }))
        .to.emit(timelock, "Deposited")
        .withArgs(other.address, ethers.parseEther("1"));
      expect(await ethers.provider.getBalance(timelock.target)).to.equal(
        ethers.parseEther("1")
      );
    });

    it("acepta transferencias directas (receive)", async function () {
      const { timelock, owner } = await loadFixture(deployFixture);
      await owner.sendTransaction({ to: timelock.target, value: ethers.parseEther("2") });
      expect(await ethers.provider.getBalance(timelock.target)).to.equal(
        ethers.parseEther("2")
      );
    });
  });

  describe("retiro", function () {
    it("rechaza retiro antes de la fecha", async function () {
      const { timelock, beneficiary } = await loadFixture(deployFixture);
      await timelock.deposit({ value: ethers.parseEther("1") });
      await expect(timelock.connect(beneficiary).withdraw()).to.be.revertedWith(
        "Fondos aun bloqueados"
      );
    });

    it("rechaza retiro de quien no es beneficiaria", async function () {
      const { timelock, unlock, other } = await loadFixture(deployFixture);
      await timelock.deposit({ value: ethers.parseEther("1") });
      await time.increaseTo(unlock);
      await expect(timelock.connect(other).withdraw()).to.be.revertedWith(
        "Solo la beneficiaria puede retirar"
      );
    });

    it("la beneficiaria retira todo el balance tras la fecha", async function () {
      const { timelock, unlock, owner, other, beneficiary } =
        await loadFixture(deployFixture);
      await timelock.deposit({ value: ethers.parseEther("1") });
      await timelock.connect(other).deposit({ value: ethers.parseEther("3") });
      await time.increaseTo(unlock);
      await expect(timelock.connect(beneficiary).withdraw())
        .to.emit(timelock, "Withdrawn")
        .withArgs(beneficiary.address, ethers.parseEther("4"));
      expect(await ethers.provider.getBalance(timelock.target)).to.equal(0);
    });
  });
});

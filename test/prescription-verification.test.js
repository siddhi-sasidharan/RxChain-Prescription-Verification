const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("PrescriptionVerification", function () {
  let contract, admin, doctor, doctor2, pharmacy, pharmacy2, patient, outsider;

  const MED_SUMMARY = "Amoxicillin 500mg";
  const DATA_HASH = ethers.keccak256(ethers.toUtf8Bytes("patient-record-v1"));
  const WRONG_HASH = ethers.keccak256(ethers.toUtf8Bytes("tampered-data"));

  beforeEach(async function () {
    [admin, doctor, doctor2, pharmacy, pharmacy2, patient, outsider] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PrescriptionVerification");
    contract = await Factory.deploy();
    await contract.waitForDeployment();
  });

  it("sets deployer as admin", async function () {
    expect(await contract.admin()).to.equal(admin.address);
  });

  it("allows admin to register a doctor and pharmacy", async function () {
    await contract.registerDoctor(doctor.address, "Dr. Smith", "LIC-001");
    await contract.registerPharmacy(pharmacy.address, "City Pharmacy", "PH-001");
    expect((await contract.doctors(doctor.address)).isRegistered).to.equal(true);
    expect((await contract.pharmacies(pharmacy.address)).isRegistered).to.equal(true);
  });

  it("blocks non-admin from registering a doctor", async function () {
    await expect(
      contract.connect(outsider).registerDoctor(doctor.address, "Dr. Smith", "LIC-001")
    ).to.be.revertedWith("Not authorized: admin only");
  });

  describe("with a registered doctor and pharmacy", function () {
    beforeEach(async function () {
      await contract.registerDoctor(doctor.address, "Dr. Smith", "LIC-001");
      await contract.registerPharmacy(pharmacy.address, "City Pharmacy", "PH-001");
    });

    it("lets a doctor create a prescription", async function () {
      await contract.connect(doctor).createPrescription(patient.address, MED_SUMMARY, DATA_HASH, 30);
      const p = await contract.prescriptions(1);
      expect(p.patient).to.equal(patient.address);
      expect(p.status).to.equal(0); // Active
    });

    it("blocks an unregistered address from creating a prescription", async function () {
      await expect(
        contract.connect(outsider).createPrescription(patient.address, MED_SUMMARY, DATA_HASH, 30)
      ).to.be.revertedWith("Not a registered doctor");
    });

    describe("with a prescription already created", function () {
      beforeEach(async function () {
        await contract.connect(doctor).createPrescription(patient.address, MED_SUMMARY, DATA_HASH, 30);
      });

      it("fulfills successfully when the hash matches", async function () {
        await contract.connect(pharmacy).fulfillPrescription(1, DATA_HASH);
        const p = await contract.prescriptions(1);
        expect(p.status).to.equal(1); // Fulfilled
      });

      it("rejects fulfillment when the hash does NOT match (tamper detection)", async function () {
        await expect(
          contract.connect(pharmacy).fulfillPrescription(1, WRONG_HASH)
        ).to.be.revertedWith("Data hash mismatch: prescription details may be tampered");
      });

      it("blocks a second pharmacy from fulfilling an already-fulfilled prescription", async function () {
        await contract.connect(pharmacy).fulfillPrescription(1, DATA_HASH);
        await contract.registerPharmacy(pharmacy2.address, "Second Pharmacy", "PH-002");
        await expect(
          contract.connect(pharmacy2).fulfillPrescription(1, DATA_HASH)
        ).to.be.revertedWith("Already fulfilled");
      });

      it("lets the issuing doctor cancel it", async function () {
        await contract.connect(doctor).cancelPrescription(1);
        const p = await contract.prescriptions(1);
        expect(p.status).to.equal(2); // Cancelled
      });

      it("blocks a different doctor from cancelling someone else's prescription", async function () {
        await contract.registerDoctor(doctor2.address, "Dr. Jones", "LIC-002");
        await expect(
          contract.connect(doctor2).cancelPrescription(1)
        ).to.be.revertedWith("Only the issuing doctor can cancel this prescription");
      });

      it("marks it invalid once expired", async function () {
        await time.increase(31 * 24 * 60 * 60); // fast-forward 31 days
        const [isValid, reason] = await contract.verifyPrescription(1);
        expect(isValid).to.equal(false);
        expect(reason).to.equal("Prescription has expired");
      });
    });
  });
});
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
enum PrescriptionStatus {
    Active,
    Fulfilled,
    Cancelled
}

contract PrescriptionVerification {
    address public admin;

    struct Entity {
        string name;
        string licenseNumber;
        bool isRegistered;
        bool isActive;
    }
    struct Prescription {
    uint256 id;
    address doctor;
    address patient;
    string medicineSummary;
    bytes32 dataHash;
    uint256 issueDate;
    uint256 expiryDate;
    PrescriptionStatus status;
    address fulfilledBy;
    uint256 fulfilledDate;
}

    mapping(address => Entity) public doctors;
    mapping(address => Entity) public pharmacies;
    mapping(uint256 => Prescription) public prescriptions;
uint256 public prescriptionCount;
mapping(address => uint256[]) private patientPrescriptions;


    event DoctorRegistered(address indexed doctor, string name, string licenseNumber);
    event PharmacyRegistered(address indexed pharmacy, string name, string licenseNumber);
    event PrescriptionCreated(uint256 indexed id, address indexed doctor, address indexed patient, uint256 expiryDate);
    event PrescriptionFulfilled(uint256 indexed id, address indexed pharmacy, uint256 fulfilledDate);
    event PrescriptionCancelled(uint256 indexed id, address indexed doctor);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not authorized: admin only");
        _;
    }
    modifier onlyActiveDoctor() {
    require(doctors[msg.sender].isRegistered, "Not a registered doctor");
    require(doctors[msg.sender].isActive, "Doctor account is deactivated");
    _;
}
modifier onlyActivePharmacy() {
        require(pharmacies[msg.sender].isRegistered, "Not a registered pharmacy");
        require(pharmacies[msg.sender].isActive, "Pharmacy account is deactivated");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function registerDoctor(address _doctor, string calldata _name, string calldata _licenseNumber) external onlyAdmin {
        require(_doctor != address(0), "Invalid address");
        require(!doctors[_doctor].isRegistered, "Doctor already registered");
        doctors[_doctor] = Entity(_name, _licenseNumber, true, true);
        emit DoctorRegistered(_doctor, _name, _licenseNumber);
    }

    function registerPharmacy(address _pharmacy, string calldata _name, string calldata _licenseNumber) external onlyAdmin {
        require(_pharmacy != address(0), "Invalid address");
        require(!pharmacies[_pharmacy].isRegistered, "Pharmacy already registered");
        pharmacies[_pharmacy] = Entity(_name, _licenseNumber, true, true);
        emit PharmacyRegistered(_pharmacy, _name, _licenseNumber);
    }
    function createPrescription(
    address _patient,
    string calldata _medicineSummary,
    bytes32 _dataHash,
    uint256 _validityDays
) external onlyActiveDoctor returns (uint256) {
    require(_patient != address(0), "Invalid patient address");
    require(_validityDays > 0, "Validity must be greater than 0 days");

    prescriptionCount += 1;
    uint256 newId = prescriptionCount;

    prescriptions[newId] = Prescription({
        id: newId,
        doctor: msg.sender,
        patient: _patient,
        medicineSummary: _medicineSummary,
        dataHash: _dataHash,
        issueDate: block.timestamp,
        expiryDate: block.timestamp + (_validityDays * 1 days),
        status: PrescriptionStatus.Active,
            fulfilledBy: address(0),
            fulfilledDate: 0
        
    });

    patientPrescriptions[_patient].push(newId);

    emit PrescriptionCreated(newId, msg.sender, _patient, prescriptions[newId].expiryDate);
    return newId;
}
function verifyPrescription(uint256 _id) public view returns (bool isValid, string memory reason) {
        Prescription storage p = prescriptions[_id];
        require(p.id != 0, "Prescription does not exist");

        if (p.status == PrescriptionStatus.Fulfilled) {
            return (false, "Already fulfilled");
        }
        if (p.status == PrescriptionStatus.Cancelled) {
            return (false, "Cancelled by doctor");
        }
        if (block.timestamp > p.expiryDate) {
            return (false, "Prescription has expired");
        }
        return (true, "Valid");
    }

    function fulfillPrescription(uint256 _id, bytes32 _dataHashCheck) external onlyActivePharmacy {
        (bool isValid, string memory reason) = verifyPrescription(_id);
        require(isValid, reason);

        Prescription storage p = prescriptions[_id];
        require(p.dataHash == _dataHashCheck, "Data hash mismatch: prescription details may be tampered");

        p.status = PrescriptionStatus.Fulfilled;
        p.fulfilledBy = msg.sender;
        p.fulfilledDate = block.timestamp;

        emit PrescriptionFulfilled(_id, msg.sender, block.timestamp);
    }
    function cancelPrescription(uint256 _id) external onlyActiveDoctor {
        Prescription storage p = prescriptions[_id];
        require(p.id != 0, "Prescription does not exist");
        require(p.doctor == msg.sender, "Only the issuing doctor can cancel this prescription");
        require(p.status == PrescriptionStatus.Active, "Only active prescriptions can be cancelled");

        p.status = PrescriptionStatus.Cancelled;
        emit PrescriptionCancelled(_id, msg.sender);
    }

    function getPatientPrescriptions(address _patient) external view returns (uint256[] memory) {
        return patientPrescriptions[_patient];
    }
}

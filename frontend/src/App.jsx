import { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ethers } from "ethers";
import contractArtifact from "./PrescriptionVerification.json";
import { CONTRACT_ADDRESS } from "./contract-address";
import "./App.css";
import { Html5QrcodeScanner, Html5Qrcode } from "html5-qrcode";


function App() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [adminAddress, setAdminAddress] = useState("");
  const [error, setError] = useState("");

  const [role, setRole] = useState("doctor");
  const [addr, setAddr] = useState("");
  const [name, setName] = useState("");
  const [license, setLicense] = useState("");
  const [status, setStatus] = useState("");

  const [patientAddr, setPatientAddr] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientDOB, setPatientDOB] = useState("");
  const [medicineSummary, setMedicineSummary] = useState("");
  const [dosage, setDosage] = useState("");
  const [validityDays, setValidityDays] = useState(30);
  const [rxStatus, setRxStatus] = useState("");
  const [lastCreatedId, setLastCreatedId] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [lookupId, setLookupId] = useState("");

  const [rxData, setRxData] = useState(null);
  const [validity, setValidity] = useState(null);
  const [lookupStatus, setLookupStatus] = useState("");
  const [verifyName, setVerifyName] = useState("");
  const [verifyDOB, setVerifyDOB] = useState("");
  const [verifyDosage, setVerifyDosage] = useState("");
  const [fulfillStatus, setFulfillStatus] = useState("");

  // Patient panel state
  const [myPrescriptions, setMyPrescriptions] = useState([]);
  const [historyStatus, setHistoryStatus] = useState("");

  const STATUS_LABELS = ["Active", "Fulfilled", "Cancelled"];

  useEffect(() => {
    if (!scanning) return;
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: 250,
        aspectRatio: 1.0,
        videoConstraints: { width: { ideal: 1280 }, height: { ideal: 720 } }
      },
      false
    );

    scanner.render(
      (decodedText) => {
        setLookupId(decodedText);
        setScanning(false);
        scanner.clear();
      },
      () => {} // ignore per-frame scan failures, they're normal
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [scanning]);

  const connectWallet = async () => {
    setError("");
    if (!window.ethereum) { setError("MetaMask not found. Please install it."); return; }
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const rxContract = new ethers.Contract(CONTRACT_ADDRESS, contractArtifact.abi, signer);
      setAccount(address);
      setContract(rxContract);
      const admin = await rxContract.admin();
      setAdminAddress(admin);
    } catch (err) { setError(err.message); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setStatus("Submitting transaction...");
    try {
      const cleanAddr = ethers.getAddress(addr.trim().toLowerCase());
      const tx = role === "doctor"
        ? await contract.registerDoctor(cleanAddr, name, license)
        : await contract.registerPharmacy(cleanAddr, name, license);
      await tx.wait();
      setStatus(`${role === "doctor" ? "Doctor" : "Pharmacy"} registered successfully!`);
      setAddr(""); setName(""); setLicense("");
    } catch (err) { setStatus("Error: " + (err.reason || err.message)); }
  };

  const buildDataHash = (fields) => {
    const canonical = JSON.stringify({
      patientName: fields.patientName.trim().toLowerCase(),
      patientDOB: fields.patientDOB,
      medicineSummary: fields.medicineSummary.trim(),
      dosage: fields.dosage.trim()
    });
    return ethers.keccak256(ethers.toUtf8Bytes(canonical));
  };

  const handleCreatePrescription = async (e) => {
    e.preventDefault();
    setRxStatus("Submitting transaction...");
    try {
      const cleanPatientAddr = ethers.getAddress(patientAddr.trim().toLowerCase());
      const dataHash = buildDataHash({ patientName, patientDOB, medicineSummary, dosage });
      const tx = await contract.createPrescription(cleanPatientAddr, medicineSummary, dataHash, Number(validityDays));
      const receipt = await tx.wait();
      const event = receipt.logs
        .map((log) => { try { return contract.interface.parseLog(log); } catch { return null; } })
        .find((parsed) => parsed && parsed.name === "PrescriptionCreated");
      const newId = event ? event.args.id.toString() : "?";
      setRxStatus(`Prescription #${newId} created successfully!`);
      setLastCreatedId(newId);

    } catch (err) { setRxStatus("Error: " + (err.reason || err.message)); }
  };

  const handleLookup = async (e) => {
    e.preventDefault();
    setLookupStatus("Looking up...");
    setRxData(null); setValidity(null);
    try {
      const p = await contract.prescriptions(lookupId);
      const [isValid, reason] = await contract.verifyPrescription(lookupId);
      setRxData(p); setValidity({ isValid, reason }); setLookupStatus("");
    } catch (err) { setLookupStatus("Error: " + (err.reason || err.message)); }
  };

  const handleFulfill = async (e) => {
    e.preventDefault();
    setFulfillStatus("Submitting transaction...");
    try {
      const dataHash = buildDataHash({
        patientName: verifyName, patientDOB: verifyDOB,
        medicineSummary: rxData.medicineSummary, dosage: verifyDosage
      });
      const tx = await contract.fulfillPrescription(lookupId, dataHash);
      await tx.wait();
      setFulfillStatus("Success! Prescription verified and marked as fulfilled.");
      const p = await contract.prescriptions(lookupId);
      const [isValid, reason] = await contract.verifyPrescription(lookupId);
      setRxData(p); setValidity({ isValid, reason });
    } catch (err) {
      setFulfillStatus("Error: " + (err.reason || err.message) + " — details may not match what the doctor recorded (possible tampering), or this prescription was already used.");
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const html5QrCode = new Html5Qrcode("qr-file-reader");
    try {
      const decodedText = await html5QrCode.scanFile(file, false);
      setLookupId(decodedText);
      setScanning(false);
    } catch (err) {
      alert("Could not read a QR code from that image. Try a clearer screenshot.");
    }
  };
  const downloadQRCode = () => {
    const svg = document.getElementById("rx-qr-code");
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = `prescription-${lastCreatedId}-qr.png`;
      link.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  // ---- Patient panel logic ----
  const handleViewHistory = async (e) => {
    e.preventDefault();
    setHistoryStatus("Loading...");
    setMyPrescriptions([]);
    try {
      const ids = await contract.getPatientPrescriptions(account);
      const items = await Promise.all(ids.map((id) => contract.prescriptions(id)));
      setMyPrescriptions(items.reverse());
      setHistoryStatus(items.length === 0 ? "No prescriptions found for this wallet." : "");
    } catch (err) {
      setHistoryStatus("Error: " + (err.reason || err.message));
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "600px" }}>
      <h1>RxChain</h1>
      {account ? (
        <div>
          <p>Connected as: {account}</p>
          <p>Contract's admin is: {adminAddress}</p>

          <hr />
          <h2>Admin Panel — Register Doctor / Pharmacy</h2>
          <form onSubmit={handleRegister}>
            <div><label>Role: <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="doctor">Doctor</option><option value="pharmacy">Pharmacy</option>
            </select></label></div>
            <div><label>Wallet Address: </label><input value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="0x..." style={{ width: "100%" }} /></div>
            <div><label>Name: </label><input value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%" }} /></div>
            <div><label>License Number: </label><input value={license} onChange={(e) => setLicense(e.target.value)} style={{ width: "100%" }} /></div>
            <button type="submit" style={{ marginTop: "1rem" }}>Register</button>
          </form>
          {status && <p>{status}</p>}

          <hr />
          <h2>Doctor Panel — Issue Prescription</h2>
          <form onSubmit={handleCreatePrescription}>
            <div><label>Patient Wallet Address: </label><input value={patientAddr} onChange={(e) => setPatientAddr(e.target.value)} placeholder="0x..." style={{ width: "100%" }} /></div>
            <div><label>Patient Name: </label><input value={patientName} onChange={(e) => setPatientName(e.target.value)} style={{ width: "100%" }} /></div>
            <div><label>Patient DOB: </label><input type="date" value={patientDOB} onChange={(e) => setPatientDOB(e.target.value)} style={{ width: "100%" }} /></div>
            <div><label>Medicine Summary: </label><input value={medicineSummary} onChange={(e) => setMedicineSummary(e.target.value)} placeholder="Amoxicillin 500mg - 10 tablets" style={{ width: "100%" }} /></div>
            <div><label>Dosage Instructions: </label><input value={dosage} onChange={(e) => setDosage(e.target.value)} style={{ width: "100%" }} /></div>
            <div><label>Validity (days): </label><input type="number" value={validityDays} onChange={(e) => setValidityDays(e.target.value)} style={{ width: "100%" }} /></div>
            <button type="submit" style={{ marginTop: "1rem" }}>Issue Prescription</button>
          </form>
          {rxStatus && <p style={{ wordBreak: "break-all" }}>{rxStatus}</p>}
          {lastCreatedId && (
            <div style={{ marginTop: "1rem", textAlign: "center" }}>
              <p>Scan this QR at the pharmacy:</p>
              <QRCodeSVG id="rx-qr-code" value={lastCreatedId.toString()} size={300} includeMargin={true} />
              <p style={{ fontSize: "0.8rem", color: "gray" }}>Encodes prescription ID: {lastCreatedId}</p>
              <button onClick={downloadQRCode}>Download QR as PNG</button>
            </div>
          )}



          <hr />
          <h2>Pharmacy Panel — Verify & Fulfill</h2>
          <form onSubmit={handleLookup}>
            <div><label>Prescription ID: </label><input type="number" value={lookupId} onChange={(e) => setLookupId(e.target.value)} placeholder="e.g. 1" style={{ width: "100%" }} /></div>
            <button type="submit" style={{ marginTop: "1rem" }}>Look Up</button>
            <button type="button" style={{ marginTop: "1rem", marginLeft: "0.5rem" }} onClick={() => setScanning(!scanning)}>
              {scanning ? "Cancel Scan" : "Scan QR Instead"}
            </button>
          </form>
          {scanning && (
            <div style={{ marginTop: "1rem" }}>
              <div id="qr-reader" style={{ width: "300px" }}></div>
              <p style={{ marginTop: "0.5rem" }}>Or upload a QR code image instead:</p>
              <input type="file" accept="image/*" onChange={handleFileUpload} />
              <div id="qr-file-reader" style={{ width: "250px" }}></div>
            </div>
          )}
          {lookupStatus && <p>{lookupStatus}</p>}
          {rxData && (
            <div style={{ marginTop: "1rem", padding: "1rem", border: "1px solid gray" }}>
              <p>Medicine: {rxData.medicineSummary}</p>
              <p>Doctor: {rxData.doctor}</p>
              <p>Patient: {rxData.patient}</p>
              <p>Status: {STATUS_LABELS[Number(rxData.status)]}</p>
              <p style={{ color: validity?.isValid ? "lightgreen" : "salmon" }}>
                {validity?.isValid ? "Valid — safe to dispense" : `Not valid: ${validity?.reason}`}
              </p>
              {validity?.isValid && (
                <form onSubmit={handleFulfill} style={{ marginTop: "1rem", borderTop: "1px dashed gray", paddingTop: "1rem" }}>
                  <p style={{ fontSize: "0.85rem", color: "gray" }}>Re-enter the patient details exactly as shown:</p>
                  <div><label>Patient Name: </label><input value={verifyName} onChange={(e) => setVerifyName(e.target.value)} style={{ width: "100%" }} /></div>
                  <div><label>Patient DOB: </label><input type="date" value={verifyDOB} onChange={(e) => setVerifyDOB(e.target.value)} style={{ width: "100%" }} /></div>
                  <div><label>Dosage Instructions: </label><input value={verifyDosage} onChange={(e) => setVerifyDosage(e.target.value)} style={{ width: "100%" }} /></div>
                  <button type="submit" style={{ marginTop: "1rem" }}>Verify & Fulfill</button>
                </form>
              )}
              {fulfillStatus && <p style={{ wordBreak: "break-all" }}>{fulfillStatus}</p>}
            </div>
          )}

          <hr />
          <h2>Patient Panel — My Prescription History</h2>
          <p style={{ fontSize: "0.85rem", color: "gray" }}>Shows prescriptions issued to the currently connected wallet.</p>
          <button onClick={handleViewHistory}>View My Prescriptions</button>
          {historyStatus && <p>{historyStatus}</p>}
          {myPrescriptions.map((p, i) => (
            <div key={i} style={{ marginTop: "1rem", padding: "1rem", border: "1px solid gray" }}>
              <p>ID: #{p.id.toString()}</p>
              <p>Medicine: {p.medicineSummary}</p>
              <p>Doctor: {p.doctor}</p>
              <p>Status: {STATUS_LABELS[Number(p.status)]}</p>
            </div>
          ))}
        </div>
      ) : (
        <button onClick={connectWallet}>Connect Wallet</button>
      )}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}

export default App;

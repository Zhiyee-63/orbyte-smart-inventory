import { useState, useEffect, useRef } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import './App.css'

const BACKEND_URL = 'https://e18001d8-ab3c-4883-9464-81086cc8e9f0-00-95b61jke4hrr.sisko.replit.dev';
const SHOP_NAME = 'Kedai Runcit Pak Abu';
function App() {
  const [barcode, setBarcode] = useState('');
  const [scanResult, setScanResult] = useState('');

  const [isScanning, setIsScanning] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Modal & Log States
  const [showModal, setShowModal] = useState(false);
  const [editableMessage, setEditableMessage] = useState('');
  const [orderQuantity, setOrderQuantity] = useState(10);
  const [pendingItem, setPendingItem] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [inventoryError, setInventoryError] = useState('');

  const [cameraOn, setCameraOn] = useState(false);
  const [lastRead, setLastRead] = useState('');
  const lastScanRef = useRef({ code: '', time: 0 });
  const scanHandlerRef = useRef(null);
  const inputRef = useRef(null); // for usb scanner
  const [importSummary, setImportSummary] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  const loadInventory = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/inventory`);
      const data = await res.json();
      if (!res.ok || !Array.isArray(data)) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      setInventory(data);
      setInventoryError('');
    } catch (err) {
      console.error("Error fetching inventory:", err);
      setInventoryError(`Cannot load inventory (${err.message}).`);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

    const processScan = async (code) => {
    if (!code || isScanning || showModal) return;

    setIsScanning(true);
    setScanResult(`Connecting to server for barcode: ${code}...`);

    try {
      // 1. Process the scan
      const scanResponse = await fetch(`${BACKEND_URL}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: code })
      });

      const scanData = await scanResponse.json();

      if (!scanResponse.ok) {
        setScanResult(`❌ Error: ${scanData.error || 'Item not found'}`);
        return;
      }

      setInventory(prev => prev.map(item =>
        item.barcode === code ? { ...item, stock: scanData.stock, status: scanData.status } : item
      ));

      // 2. If stock hits the limit, request the AI Draft
      if (scanData.alert === true) {
        setScanResult(`⚠️ Low stock detected. Generating AI draft...`);

        const itemDetails = inventory.find(i => i.barcode === code);

        if (!itemDetails) {
          setScanResult('❌ Inventory not loaded yet. Refresh and try again.');
          return;
        }

        const draftResponse = await fetch(`${BACKEND_URL}/api/draft-supplier-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessName: SHOP_NAME,
            productName: itemDetails.name,
            currentStock: scanData.stock,
            reorderLevel: itemDetails.reorder_level,
            reorderQuantity: itemDetails.reorder_quantity,
            unit: itemDetails.unit,
            supplierName: itemDetails.supplier,
            preferredGreeting: itemDetails.preferred_greeting || "",
            language: itemDetails.language || "Malay"
          })
        });

        const draftData = await draftResponse.json();

        if (draftResponse.ok) {
          setPendingItem({ ...itemDetails, stock: scanData.stock });
          setOrderQuantity(itemDetails.reorder_quantity);
          setEditableMessage(draftData.message);
          setCameraOn(false);
          setShowModal(true);
        } else {
          setScanResult(`❌ AI Error: ${draftData.error || 'Failed to generate draft.'}`);
        }
      } else {
        setScanResult('✅ Sale recorded. Stock is OK.');
      }

      setBarcode('');

    } catch (error) {
      console.error("Scan error:", error);
      setScanResult('❌ Failed to connect to the backend server.');
    } finally {
      setIsScanning(false);
      inputRef.current?.focus();
    }
  };

  const handleScan = (e) => {
  e.preventDefault();
  processScan(barcode.trim());
  };

  const handleImportFile = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  setIsImporting(true);
  setImportSummary(null);

  try {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const bi = headers.indexOf('barcode');     // change if the POS names it differently
    const qi = headers.indexOf('quantity');    // e.g. 'qty'
    if (bi === -1 || qi === -1) {
      setImportSummary({ error: 'CSV needs "barcode" and "quantity" columns.' });
      return;
    }

    // add up repeated rows for the same barcode
    const totals = {};
    for (const line of lines.slice(1)) {
      const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      const code = cols[bi];
      const qty = Number(cols[qi]);
      if (!code || !Number.isFinite(qty) || qty <= 0) continue;
      totals[code] = (totals[code] || 0) + qty;
    }
    const sales = Object.entries(totals).map(([barcode, quantity]) => ({ barcode, quantity }));

    const res = await fetch(`${BACKEND_URL}/api/import-sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sales })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

    setImportSummary(data);
    loadInventory();
  } catch (err) {
    setImportSummary({ error: err.message });
  } finally {
    setIsImporting(false);
    e.target.value = ''; // allows choosing the same file again
  }
};

  // always point to the newest processScan, so the camera never uses stale inventory
  useEffect(() => {
    scanHandlerRef.current = processScan;
  });

    useEffect(() => {
    let buffer = '';
    let lastKeyTime = 0;

    const onKeyDown = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const now = Date.now();
      if (now - lastKeyTime > 100) buffer = '';
      lastKeyTime = now;

      if (e.key === 'Enter') {
        if (buffer.length >= 6) scanHandlerRef.current(buffer);
        buffer = '';
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

useEffect(() => {
  if (!cameraOn) return;
  const scanner = new Html5Qrcode('camera-box', {
    formatsToSupport: [
      Html5QrcodeSupportedFormats.EAN_13,
      Html5QrcodeSupportedFormats.EAN_8,
      Html5QrcodeSupportedFormats.UPC_A,
      Html5QrcodeSupportedFormats.UPC_E,
      Html5QrcodeSupportedFormats.CODE_128,
      Html5QrcodeSupportedFormats.QR_CODE,
    ],
    useBarCodeDetectorIfSupported: true,
    verbose: false,
  });

  scanner
    .start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 300, height: 120 } },
      (decodedText) => {
        const now = Date.now();
        const last = lastScanRef.current;
        if (decodedText === last.code && now - last.time < 3000) return;
        lastScanRef.current = { code: decodedText, time: now };
        setLastRead(decodedText);
        setBarcode(decodedText);
        scanHandlerRef.current(decodedText);
      },
      () => {} // ignore frame noise
    )
    .catch((err) => {
      setScanResult(`❌ Camera error: ${err}`);
      setCameraOn(false);
    });

  return () => {
    scanner.stop().then(() => scanner.clear()).catch(() => {});
  };
}, [cameraOn]);

  const handleApprove = async () => {
    setIsSending(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcode: pendingItem.barcode,
          message: editableMessage,
          quantity: Number(orderQuantity),
          supplier: pendingItem.supplier,
          approved_by: 'Pak Abu'
        })
      });

      if (response.ok) {
  const data = await response.json();
  if (data.whatsapp_link) {
    window.open(data.whatsapp_link, '_blank', 'noopener,noreferrer');
  }
        const timestamp = new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' });
        const newLog = {
          id: Date.now(),
          time: timestamp,
          action: `Restock Order: ${orderQuantity}x ${pendingItem.name}`,
          supplier: pendingItem.supplier,
          status: 'WhatsApp Sent',
          approvedBy: 'Pak Abu'
        };
        setActivityLogs(prevLogs => [newLog, ...prevLogs]);

        setShowModal(false);
        setScanResult(`✅ LOGGED: Replenishment order sent to ${pendingItem.supplier} via WhatsApp.`);
        loadInventory();
      } else {
        const err = await response.json().catch(() => ({}));
        alert("Failed to approve: " + (err.error || response.status));
      }
    } catch (error) {
      console.error("Approve error:", error);
      alert("Failed to connect to the server.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="dashboard-container" style={{ position: 'relative', padding: '20px', fontFamily: 'sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      <h1>Orbyte Smart Reorder Assistant</h1>
      <p style={{ color: '#555', fontStyle: 'italic' }}>{SHOP_NAME} — Inventory System</p>

      <div className="scanner-section" style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f0f8ff', borderRadius: '8px', border: '1px solid #cce5ff' }}>
        <h2>Point of Sale (Manual / Barcode Input)</h2>
        <form onSubmit={handleScan} className="scan-form">
          <input
            ref={inputRef}
            autoFocus
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Try scanning a barcode..."
            disabled={isScanning}
            style={{ padding: '10px', marginRight: '10px', width: '250px', fontSize: '16px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
          <button type="submit" disabled={isScanning} style={{ padding: '10px 20px', cursor: isScanning ? 'not-allowed' : 'pointer', fontSize: '16px', backgroundColor: isScanning ? '#ccc' : '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
            {isScanning ? 'Processing...' : 'Record Sale'}
          </button>
        </form>
        <button
        type="button"
        onClick={() => setCameraOn((on) => !on)}
        style={{ marginTop: '10px', padding: '10px 20px', fontSize: '16px', backgroundColor: cameraOn ? '#dc3545' : '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          {cameraOn ? 'Stop Camera' : 'Scan with Camera'}
        </button>
        {cameraOn && <div id="camera-box" style={{ width: '320px', margin: '15px auto 0' }} />}
        {lastRead && <p style={{ color: '#000' }}>Last read: <strong>{lastRead}</strong></p>}
        <div style={{ marginTop: '15px', color: '#000' }}>
          <strong>Import POS sales (CSV)</strong><br />
          <input type="file" accept=".csv" onChange={handleImportFile} disabled={isImporting} />
          {isImporting && <p>Importing...</p>}
          {importSummary?.error && <p style={{ color: 'red' }}>❌ {importSummary.error}</p>}
          {importSummary && !importSummary.error && (
            <div>
              <p>✅ Updated {importSummary.updated} items.</p>
              {importSummary.unknown?.length > 0 && <p>⚠️ Unknown barcodes: {importSummary.unknown.join(', ')}</p>}
              {importSummary.lowStock?.length > 0 && <p>⚠️ Now low: {importSummary.lowStock.join(', ')}</p>}
            </div>
          )}
        </div>
        {scanResult && <p style={{ fontWeight: 'bold', color: scanResult.includes('❌') ? 'red' : '#0056b3', marginTop: '10px' }}>{scanResult}</p>}
      </div>

      <div className="inventory-section" style={{ marginBottom: '40px' }}>
        <h2>Live Stock Dashboard</h2>
        {inventory.length === 0 ? (
          inventoryError
            ? <p style={{ color: 'red', fontWeight: 'bold' }}>{inventoryError}</p>
            : <p>Loading inventory from server...</p>
        ) : (
          <table border="1" cellPadding="12" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', backgroundColor: 'white' }}>
            <thead>
              <tr style={{ backgroundColor: '#e9ecef' }}>
                <th>Barcode</th>
                <th>Product Name</th>
                <th>Current Stock</th>
                <th>Alert Limit</th>
                <th>Supplier</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => (
                <tr key={item.barcode}>
                  <td>{item.barcode}</td>
                  <td>{item.name}</td>
                  <td style={{ fontSize: '18px' }}><strong>{item.stock}</strong></td>
                  <td>{item.reorder_level}</td>
                  <td>{item.supplier || 'Kedai Runcit Supplier'}</td>
                  <td style={{ color: item.status === 'Low' ? '#dc3545' : '#28a745', fontWeight: 'bold' }}>
                    {item.status === 'Low' ? '⚠️ Low Stock' : '✅ Good'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="activity-log-section">
        <h2>Activity & Audit Log</h2>
        {activityLogs.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>No recent activity to display.</p>
        ) : (
          <table border="1" cellPadding="10" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', backgroundColor: '#fffdf4' }}>
            <thead>
              <tr style={{ backgroundColor: '#fff3cd' }}>
                <th>Date & Time</th>
                <th>Action</th>
                <th>Supplier</th>
                <th>Status</th>
                <th>Approved By</th>
              </tr>
            </thead>
            <tbody>
              {activityLogs.map((log) => (
                <tr key={log.id}>
                  <td>{log.time}</td>
                  <td>{log.action}</td>
                  <td>{log.supplier}</td>
                  <td style={{ color: '#28a745', fontWeight: 'bold' }}>{log.status}</td>
                  <td>{log.approvedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && pendingItem && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '450px', boxShadow: '0 8px 16px rgba(0,0,0,0.2)' }}>
            <h2 style={{ marginTop: 0, color: '#dc3545' }}>⚠️ Low Stock Alert</h2>
            <p><strong>{pendingItem.name}</strong> dropped to {pendingItem.stock} {pendingItem.unit} (limit: {pendingItem.reorder_level}). The AI has drafted a message for <strong>{pendingItem.supplier}</strong>.</p>

            <div style={{ margin: '15px 0' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Adjust Restock Quantity:</label>
             <input
                type="number"
                value={orderQuantity}
                onChange={(e) => {
                  const newQty = e.target.value;
                  setOrderQuantity(newQty);
                  if (newQty && pendingItem?.unit) {
                  const unitRegex = new RegExp(`\\b\\d+\\s+(?=${pendingItem.unit}\\b)`, 'i');
                  setEditableMessage((prev) => prev.replace(unitRegex, `${newQty} `));
                  }
                }}
                style={{ padding: '8px', width: '100px', fontSize: '16px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>

            <div style={{ margin: '15px 0' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Review & Edit AI Draft:</label>
              <textarea
                value={editableMessage}
                onChange={(e) => setEditableMessage(e.target.value)}
                rows="5"
                style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ccc', resize: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
              <button onClick={() => setShowModal(false)} disabled={isSending} style={{ padding: '10px 15px', cursor: isSending ? 'not-allowed' : 'pointer', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', fontSize: '14px' }}>
                Cancel / Edit Later
              </button>
              <button onClick={handleApprove} disabled={isSending} style={{ padding: '10px 15px', cursor: isSending ? 'not-allowed' : 'pointer', backgroundColor: isSending ? '#ccc' : '#28a745', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', fontSize: '14px' }}>
                {isSending ? 'Sending via WhatsApp...' : 'Approve & Send Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
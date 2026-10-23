import { useState, useEffect } from 'react'
import './App.css'

const BACKEND_URL = 'https://e18001d8-ab3c-4883-9464-81086cc8e9f0-00-95b61jke4hrr.sisko.replit.dev';
const SHOP_NAME = 'Kedai Runcit Pak Ali';
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
      setInventoryError(`Cannot load inventory (${err.message}). Is the backend running?`);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!barcode) return;

    setIsScanning(true);
    setScanResult(`Connecting to server for barcode: ${barcode}...`);

    try {
      // 1. Process the scan
      const scanResponse = await fetch(`${BACKEND_URL}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode })
      });

      const scanData = await scanResponse.json();

      if (!scanResponse.ok) {
        setScanResult(`❌ Error: ${scanData.error || 'Item not found'}`);
        return;
      }

      // Temporarily update the UI while we check stock limits
      setInventory(prev => prev.map(item =>
        item.barcode === barcode ? { ...item, stock: scanData.stock, status: scanData.status } : item
      ));

      // 2. If stock hits the limit, request the AI Draft
      if (scanData.alert === true) {
        setScanResult(`⚠️ Low stock detected. Generating AI draft...`);

        // Find the full item details from our local state to send to Gemini
        const itemDetails = inventory.find(i => i.barcode === barcode);

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
    }
  };

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
          approved_by: 'Pak Ali'
        })
      });

      if (response.ok) {
        const timestamp = new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' });
        const newLog = {
          id: Date.now(),
          time: timestamp,
          action: `Restock Order: ${orderQuantity}x ${pendingItem.name}`,
          supplier: pendingItem.supplier,
          status: 'WhatsApp Sent',
          approvedBy: 'Pak Ali'
        };
        setActivityLogs(prevLogs => [newLog, ...prevLogs]);

        setShowModal(false);
        setScanResult(`✅ LOGGED: Replenishment order sent to ${pendingItem.supplier} via WhatsApp.`);
        loadInventory();
      } else {
        alert("Failed to approve the order. Check the backend console.");
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
                onChange={(e) => setOrderQuantity(e.target.value)}
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

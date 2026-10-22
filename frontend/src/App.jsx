import { useState, useEffect } from 'react'
import './App.css'

// TODO: Replace this with the live URL your Backend Developer gets from Replit!
// Example: 'https://orbyte-backend.username.repl.co'
const BACKEND_URL = 'https://e18001d8-ab3c-4883-9464-81086cc8e9f0-00-95b61jke4hrr.sisko.replit.dev'; 

function App() {
  const [barcode, setBarcode] = useState('');
  const [scanResult, setScanResult] = useState('');
  
  // Modal & Log States
  const [showModal, setShowModal] = useState(false);
  const [editableMessage, setEditableMessage] = useState('');
  const [orderQuantity, setOrderQuantity] = useState(10);
  const [pendingItem, setPendingItem] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);

  // Start with an empty inventory, let the backend provide the data
  const [inventory, setInventory] = useState([]);

  // 1. Fetch initial inventory from the backend when the app loads
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/inventory`)
      .then(res => res.json())
      .then(data => setInventory(data))
      .catch(err => console.error("Error fetching inventory:", err));
  }, []);

  // 2. Send the barcode to the backend API when scanned
  const handleScan = async (e) => {
    e.preventDefault();
    if (!barcode) return;

    setScanResult(`Connecting to server for barcode: ${barcode}...`);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode })
      });
      
      const data = await response.json();

      if (!response.ok) {
        setScanResult(`❌ Error: ${data.error || 'Item not found'}`);
        return;
      }

      // Update the local table with the exact data the server returned
      setInventory(prev => prev.map(item => 
        item.barcode === barcode ? data.updatedItem : item
      ));
      
      // Trigger the Human Approval flow if the backend says stock hit the limit
      if (data.updatedItem.stock === data.updatedItem.limit) {
        setPendingItem({ ...data.updatedItem, currentStock: data.updatedItem.stock });
        setOrderQuantity(10); 
        setEditableMessage(`Salam boss, ${data.updatedItem.name} kat kedai dah nak habis (tinggal ${data.updatedItem.stock} je). Boleh hantar 10 unit lagi secepat mungkin tak? Terima kasih.`);
        setShowModal(true);
      }
      
      setScanResult('✅ Sale recorded. Stock updated in database.');
      setBarcode('');
      
    } catch (error) {
      console.error("Scan error:", error);
      setScanResult('❌ Failed to connect to the backend server.');
    }
  };

  // 3. Send the approved order to the backend API
  const handleApprove = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          barcode: pendingItem.barcode,
          message: editableMessage,
          quantity: orderQuantity,
          supplier: pendingItem.supplier,
          approvedBy: 'Admin (Pak Abu)' 
        })
      });

      if (response.ok) {
        // Record the action in the local Activity Log table
        const timestamp = new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' });
        const newLog = {
          id: Date.now(),
          time: timestamp,
          action: `Restock Order: ${orderQuantity}x ${pendingItem.name}`,
          supplier: pendingItem.supplier,
          status: 'Message Sent',
          approvedBy: 'Admin (Pak Abu)'
        };
        setActivityLogs(prevLogs => [newLog, ...prevLogs]);

        setShowModal(false);
        setScanResult(`✅ API SUCCESS: Replenishment order sent to ${pendingItem.supplier}.`);
      }
    } catch (error) {
      console.error("Approve error:", error);
      alert("Failed to send the approval to the server.");
    }
  };

  return (
    <div className="dashboard-container" style={{ position: 'relative', padding: '20px', fontFamily: 'sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      <h1>Orbyte Smart Reorder Assistant</h1>
      <p style={{ color: '#555', fontStyle: 'italic' }}>Kedai Runcit Inventory System</p>
      
      <div className="scanner-section" style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f0f8ff', borderRadius: '8px', border: '1px solid #cce5ff' }}>
        <h2>Point of Sale (Manual / Barcode Input)</h2>
        <form onSubmit={handleScan} className="scan-form">
          <input 
            type="text" 
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Try scanning: 955102" 
            style={{ padding: '10px', marginRight: '10px', width: '250px', fontSize: '16px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
          <button type="submit" style={{ padding: '10px 20px', cursor: 'pointer', fontSize: '16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
            Record Sale
          </button>
        </form>
        {scanResult && <p style={{ fontWeight: 'bold', color: '#0056b3', marginTop: '10px' }}>{scanResult}</p>}
      </div>

      <div className="inventory-section" style={{ marginBottom: '40px' }}>
        <h2>Live Stock Dashboard</h2>
        {inventory.length === 0 ? (
          <p>Loading inventory from server...</p>
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
                  <td>{item.limit}</td>
                  <td>{item.supplier}</td>
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
            <p><strong>{pendingItem.name}</strong> dropped to {pendingItem.limit}. A message has been drafted for <strong>{pendingItem.supplier}</strong>.</p>
            
            <div style={{ margin: '15px 0' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Adjust Restock Quantity:</label>
              <input 
                type="number" 
                value={orderQuantity} 
                onChange={(e) => {
                  setOrderQuantity(e.target.value);
                  setEditableMessage(`Salam boss, ${pendingItem.name} kat kedai dah nak habis (tinggal ${pendingItem.currentStock} je). Boleh hantar ${e.target.value} unit lagi secepat mungkin tak? Terima kasih.`);
                }}
                style={{ padding: '8px', width: '100px', fontSize: '16px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>

            <div style={{ margin: '15px 0' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Review & Edit AI Draft:</label>
              <textarea 
                value={editableMessage}
                onChange={(e) => setEditableMessage(e.target.value)}
                rows="4"
                style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ccc', resize: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '10px 15px', cursor: 'pointer', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', fontSize: '14px' }}>
                Cancel / Edit Later
              </button>
              <button onClick={handleApprove} style={{ padding: '10px 15px', cursor: 'pointer', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', fontSize: '14px' }}>
                Approve & Send Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
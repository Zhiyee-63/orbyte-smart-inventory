import { useState, useEffect } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

export default function CameraTest() {
  const [on, setOn] = useState(false)
  const [result, setResult] = useState('')
  const [format, setFormat] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!on) return
    const scanner = new Html5Qrcode('test-camera', {
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
    })

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 300, height: 120 } },
        (text, res) => {
          setResult(text)
          setFormat(res?.result?.format?.formatName || '')
        },
        () => {} // ignore "no code found in this frame" noise
      )
      .catch((err) => { setError(String(err)); setOn(false) })

    return () => {
      scanner.stop().then(() => scanner.clear()).catch(() => {})
    }
  }, [on])

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h2>Camera Barcode Test</h2>
      <button onClick={() => { setError(''); setOn(o => !o) }}>
        {on ? 'Stop Camera' : 'Start Camera'}
      </button>
      {on && <div id="test-camera" style={{ width: 320, marginTop: 15 }} />}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      <p style={{ fontSize: 24, fontWeight: 'bold' }}>
        Read: {result || '(nothing yet)'}
      </p>
      {format && <p>Format: {format}</p>}
    </div>
  )
}
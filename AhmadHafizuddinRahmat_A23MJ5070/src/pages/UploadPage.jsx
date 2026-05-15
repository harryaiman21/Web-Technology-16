import { useState, useRef, useCallback } from 'react'
import { uploadText, uploadFile } from '../api'
import './UploadPage.css'

const MAX_FILE_SIZE_MB = 10
const ACCEPTED = [
  'image/png', 'image/jpeg', 'image/jpg', 'image/webp',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-outlook', // .msg
  ''  // .msg files sometimes have no MIME type on Windows — empty string allows them through
]

export default function UploadPage() {
  const [tab, setTab] = useState('text') // 'text' | 'file'
  const [text, setText] = useState('')
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [status, setStatus] = useState(null) // null | 'processing' | 'done' | 'error'
  const [result, setResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const fileRef = useRef()

  const reset = () => {
    setStatus(null)
    setResult(null)
    setErrorMsg('')
    setText('')
    setFile(null)
  }

  const validateFile = (f) => {
    if (!ACCEPTED.includes(f.type)) return 'Unsupported file type. Use PNG, JPG, WEBP, or TXT.'
    if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) return `File too large. Max ${MAX_FILE_SIZE_MB}MB.`
    return null
  }

  const handleFileDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (!f) return
    const err = validateFile(f)
    if (err) { setErrorMsg(err); return }
    setFile(f)
    setErrorMsg('')
  }, [])

  const handleFileSelect = (e) => {
    const f = e.target.files[0]
    if (!f) return
    const err = validateFile(f)
    if (err) { setErrorMsg(err); return }
    setFile(f)
    setErrorMsg('')
  }

  const handleSubmit = async () => {
    setErrorMsg('')
    try {
      setStatus('processing')
      let entry
      if (tab === 'text') {
        if (!text.trim()) { setErrorMsg('Please paste some text first.'); setStatus(null); return }
        entry = await uploadText(text.trim())
        setResult({ type: 'text', entry })
      } else {
        if (!file) { setErrorMsg('Please select a file first.'); setStatus(null); return }
        entry = await uploadFile(file)
        const isImg = file.type.startsWith('image/')
        setResult({ type: isImg ? 'ocr' : 'text', entry, previewUrl: isImg ? URL.createObjectURL(file) : null })
      }
      setStatus('done')
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Upload failed — is the backend running on port 8000?')
      setStatus(null)
    }
  }

  const isImage = file && file.type.startsWith('image/')
  const isReady = tab === 'text' ? text.trim().length > 0 : !!file

  return (
    <div className="up-page">
      <header className="up-header">
        <div className="up-header-left">
          <div className="up-title">Upload Raw Input</div>
          <div className="up-sub">Phase 1 — collect raw data · Phase 2 — extract text from images</div>
        </div>
        <div className="up-phase-pills">
          <span className="pill active">P1 Input</span>
          <span className="pill active">P2 OCR</span>
          <span className="pill">P3 Extract</span>
        </div>
      </header>

      {status === null && (
        <div className="up-body">
          <div className="tab-bar">
            <button className={'tab-btn' + (tab === 'text' ? ' active' : '')} onClick={() => setTab('text')}>
              <span className="tab-icon">T</span> Paste text
            </button>
            <button className={'tab-btn' + (tab === 'file' ? ' active' : '')} onClick={() => setTab('file')}>
              <span className="tab-icon">↑</span> Upload file
            </button>
          </div>

          {tab === 'text' && (
            <div className="panel">
              <div className="panel-label">Raw text input</div>
              <textarea
                className="text-input"
                placeholder={"Paste your SOP, email, notes, or any raw procedure text here...\n\nExample:\n1. Restart printer\n2. Clear print spooler\n3. Retry printing"}
                value={text}
                onChange={e => setText(e.target.value)}
                rows={14}
              />
              <div className="char-count">{text.length} chars · {text.trim().split(/\s+/).filter(Boolean).length} words</div>
            </div>
          )}

          {tab === 'file' && (
            <div className="panel">
              <div className="panel-label">File upload — image or .txt</div>
              <div
                className={'drop-zone' + (dragOver ? ' drag-over' : '') + (file ? ' has-file' : '')}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileRef.current.click()}
              >
                <input ref={fileRef} type="file" accept=".txt,.docx,.msg,.png,.jpg,.jpeg,.webp" hidden onChange={handleFileSelect} />
                {!file ? (
                  <>
                    <div className="drop-icon">⬆</div>
                    <div className="drop-title">Drop file here or click to browse</div>
                    <div className="drop-sub">Supported: PNG, JPG, WEBP (→ OCR) · TXT, DOCX, MSG (→ text) · Max 10MB</div>
                  </>
                ) : (
                  <div className="file-preview">
                    {isImage
                      ? <img src={URL.createObjectURL(file)} alt="preview" className="img-thumb" />
                      : <div className="txt-thumb">TXT</div>
                    }
                    <div className="file-info">
                      <div className="file-name">{file.name}</div>
                      <div className="file-size">
                        {(file.size / 1024).toFixed(1)} KB · {
                          isImage ? 'Image → Tesseract OCR'
                          : file.name.endsWith('.docx') ? 'Word document → extract text'
                          : file.name.endsWith('.msg')  ? 'Outlook email → extract text'
                          : 'Plain text file'
                        }
                      </div>
                      <button className="remove-btn" onClick={e => { e.stopPropagation(); setFile(null) }}>Remove</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {errorMsg && <div className="error-bar">⚠ {errorMsg}</div>}

          <div className="action-row">
            <div className="action-hint">
              {tab === 'text' ? 'Will save as raw_input → ready for Phase 3 extraction' : isImage ? 'Will run OCR → extract text → save both image path + text' : 'Will read file content → save as raw_input'}
            </div>
            <button
              className={'submit-btn' + (!isReady ? ' disabled' : '')}
              onClick={handleSubmit}
              disabled={!isReady}
            >
              {tab === 'file' && isImage ? 'Upload & run OCR →' : 'Save input →'}
            </button>
          </div>
        </div>
      )}

      {status === 'processing' && (
        <div className="up-body">
          <div className="processing-box">
            <div className="spinner" />
            <div className="processing-title">{tab === 'file' && isImage ? 'Running OCR...' : 'Saving input...'}</div>
            <div className="processing-sub">{tab === 'file' && isImage ? 'Tesseract is extracting text from your image' : 'Storing raw text to database'}</div>
            {tab === 'file' && isImage && (
              <div className="ocr-steps">
                <div className="ocr-step done">① Load image</div>
                <div className="ocr-step active">② Tesseract extract</div>
                <div className="ocr-step">③ Store result</div>
              </div>
            )}
          </div>
        </div>
      )}

      {status === 'done' && result && (
        <div className="up-body">
          <div className="result-box">
            <div className="result-header">
              <span className="result-tick">✓</span>
              <div>
                <div className="result-title">{result.type === 'ocr' ? 'OCR complete — text extracted' : 'Input saved'}</div>
                <div className="result-sub">Record ID: <span className="mono">#{result.entry.id}</span> · {result.entry.source_type}</div>
              </div>
            </div>

            {result.type === 'ocr' && result.previewUrl && (
              <div className="result-split">
                <div className="result-col">
                  <div className="col-label">Original image</div>
                  <img src={result.previewUrl} alt="uploaded" className="result-img" />
                </div>
                <div className="result-col">
                  <div className="col-label">Extracted text <span className="badge-ocr">OCR</span></div>
                  <pre className="result-text">{result.entry.extracted_text}</pre>
                </div>
              </div>
            )}

            {result.type === 'text' && (
              <div>
                <div className="col-label">Saved raw text</div>
                <pre className="result-text">{result.entry.raw_text}</pre>
              </div>
            )}

            <div className="result-meta">
              <div className="meta-item"><span>ID</span><span className="mono">#{result.entry.id}</span></div>
              <div className="meta-item"><span>Source</span><span className="mono">{result.entry.source_type}</span></div>
              <div className="meta-item"><span>Status</span><span className="mono">{result.entry.status}</span></div>
              <div className="meta-item"><span>Timestamp</span><span className="mono">{new Date(result.entry.timestamp).toLocaleString()}</span></div>
            </div>

            <div className="result-actions">
              <button className="btn-secondary" onClick={reset}>Upload another</button>
              <button className="btn-primary" onClick={() => window.location.href = '/records'}>View all records →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

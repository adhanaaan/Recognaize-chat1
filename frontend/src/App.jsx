import React, { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import logo from '../assets/logo.png'

const API_BASE = import.meta.env.VITE_API_BASE || 'https://recognaize-chat1.onrender.com'

const UPLOAD_STATUS_STEPS = [
  { delay: 0, text: 'Uploading...' },
  { delay: 5000, text: 'Waking up server...' },
  { delay: 15000, text: 'Still connecting — free server may take a minute...' },
  { delay: 35000, text: 'Almost there...' },
]

function App() {
  const [screen, setScreen] = useState('upload') // 'upload' | 'chat'
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [fileName, setFileName] = useState(null)
  const [fileContext, setFileContext] = useState('')
  const [messages, setMessages] = useState([])
  const [error, setError] = useState(null)
  const textareaRef = useRef(null)
  const messagesEndRef = useRef(null)

  // Warm up backend on page load
  useEffect(() => {
    axios.get(`${API_BASE}/health`, { timeout: 60000 }).catch(() => {})
  }, [])

  // Cycle upload status messages while uploading
  useEffect(() => {
    if (!uploading) {
      setUploadStatus('')
      return
    }
    setUploadStatus(UPLOAD_STATUS_STEPS[0].text)
    const timers = UPLOAD_STATUS_STEPS.slice(1).map((step) =>
      setTimeout(() => setUploadStatus(step.text), step.delay)
    )
    return () => timers.forEach(clearTimeout)
  }, [uploading])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Auto-dismiss error after 6 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 6000)
      return () => clearTimeout(timer)
    }
  }, [error])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const maxHeight = 130
    const newHeight = Math.min(el.scrollHeight, maxHeight)
    el.style.height = `${newHeight}px`
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [message])

  const getErrorMessage = (err) => {
    if (err.code === 'ECONNABORTED') {
      return 'Server took too long to respond. It may be starting up — please try again.'
    }
    if (!err.response) {
      return 'Cannot reach the server. Please check your connection and try again.'
    }
    return 'Something went wrong. Please try again.'
  }

  const handleUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    setUploading(true)
    setError(null)
    try {
      const res = await axios.post(`${API_BASE}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      })
      if (res.data.error) {
        setError(res.data.error)
        return
      }
      setFileName(res.data.filename)
      setFileContext(res.data.content || '')
      setScreen('chat')
    } catch (err) {
      console.error(err)
      setError(getErrorMessage(err))
    } finally {
      setUploading(false)
    }
  }

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return

    const userMessage = {
      role: 'user',
      content: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    const payload = {
      message: text,
      conversation_history: messages.map((m) => ({ role: m.role, content: m.content })),
      file_context: fileContext || null,
    }

    setMessages((prev) => [...prev, userMessage])
    setMessage('')
    setLoading(true)

    try {
      const res = await axios.post(`${API_BASE}/chat`, payload, { timeout: 90000 })
      const assistantReply = {
        role: 'assistant',
        content: res.data.reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, assistantReply])
    } catch (err) {
      console.error(err)
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleSend = () => sendMessage(message)

  const handleQuickReply = (text) => sendMessage(text)

  const handleNewChat = () => {
    setMessages([])
    setMessage('')
    setFileName(null)
    setFileContext('')
    setError(null)
    setScreen('upload')
  }

  const renderMessageContent = (msg) => {
    if (msg.role !== 'assistant') return msg.content

    const normalizeAssistantLine = (line) => {
      let cleaned = line.trim()
      cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1')
      cleaned = cleaned.replace(/\*(.*?)\*/g, '$1')
      cleaned = cleaned.replace(/^\*+\s*/, '')
      cleaned = cleaned.replace(/\*+$/g, '')
      return cleaned
    }

    const rawLines = (msg.content || '')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map(normalizeAssistantLine)

    return rawLines.map((line, index) => {
      const isBullet = line.startsWith('•') || line.startsWith('-')
      return (
        <div key={index} className={isBullet ? 'msg-line msg-bullet' : 'msg-line'}>
          {line}
        </div>
      )
    })
  }

  // ─── Upload Screen ───
  if (screen === 'upload') {
    return (
      <div className="page-root">
        <div className="upload-screen">
          <img src={logo} alt="ReCOGnAIze" className="upload-logo" />
          <h1 className="upload-title">ReCOGnAIze</h1>
          <p className="upload-subtitle">Upload your cognitive assessment report to get started</p>

          {error && (
            <div className="error-toast">
              <span>{error}</span>
              <button onClick={() => setError(null)}>&times;</button>
            </div>
          )}

          <label className="upload-dropzone">
            {uploading ? (
              <div className="upload-spinner-wrap">
                <span className="upload-spinner" />
                <span>{uploadStatus}</span>
              </div>
            ) : (
              <>
                <svg className="upload-cloud-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span className="upload-dropzone-text">Choose a file to upload</span>
                <span className="upload-dropzone-hint">PDF, TXT, CSV, JSON, or Excel</span>
              </>
            )}
            <input
              type="file"
              accept=".pdf,.txt,.csv,.json,.xlsx,.xls"
              onChange={handleUpload}
              style={{ display: 'none' }}
              disabled={uploading}
            />
          </label>

          <button className="skip-link" onClick={() => setScreen('chat')}>
            Continue without a file
          </button>
        </div>
      </div>
    )
  }

  // ─── Chat Screen ───
  const hasMessages = messages.length > 0

  return (
    <div className="page-root">
      <div className="chat-container">
        {/* Header */}
        <div className="chat-header">
          <img src={logo} alt="ReCOGnAIze" className="header-logo" />
          <span className="header-title">ReCOGnAIze</span>
          <button type="button" className="new-chat-btn" onClick={handleNewChat}>
            New Chat
          </button>
        </div>

        {/* Messages area */}
        <div className="messages-area">
          {error && (
            <div className="error-toast">
              <span>{error}</span>
              <button onClick={() => setError(null)}>&times;</button>
            </div>
          )}

          {fileName && !hasMessages && (
            <div className="file-loaded-banner">
              Report loaded: <strong>{fileName}</strong>
            </div>
          )}

          {!hasMessages && (
            <div className="quick-actions-wrap">
              <p className="quick-actions-label">What would you like to do?</p>
              <div className="quick-actions">
                <button
                  type="button"
                  className="quick-btn"
                  onClick={() => handleQuickReply('Help me understand my ReCOGnAIze results')}
                >
                  Understand My Results
                </button>
                <button
                  type="button"
                  className="quick-btn"
                  onClick={() => handleQuickReply('Give me personalized advice based on my report')}
                >
                  Get Personalized Advice
                </button>
                <button
                  type="button"
                  className="quick-btn"
                  onClick={() => handleQuickReply('Create an action plan to improve my cognitive health')}
                >
                  Create Action Plan
                </button>
                <button
                  type="button"
                  className="quick-btn"
                  onClick={() => handleQuickReply('When should I repeat this assessment?')}
                >
                  When to Retest?
                </button>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role}`}>
              <div className="bubble">
                {renderMessageContent(msg)}
              </div>
              <div className="message-time">{msg.time}</div>
            </div>
          ))}

          {loading && (
            <div className="typing-indicator">
              <span /><span /><span />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="input-bar">
          {fileName && hasMessages && (
            <div className="file-chip">
              {fileName}
            </div>
          )}
          <div className="input-row">
            <textarea
              className="input-field"
              placeholder="Type your question..."
              rows={1}
              value={message}
              ref={textareaRef}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
            />
            <button
              type="button"
              className="send-btn"
              onClick={handleSend}
              disabled={loading || !message.trim()}
            >
              {loading ? (
                <span className="send-spinner" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App

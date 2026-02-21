import React, { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import logo from '../assets/logo.png'
import uploadSvg from '../assets/upload.svg'

const API_BASE = import.meta.env.VITE_API_BASE || 'https://recognaize-chat.onrender.com'

const STORAGE_KEYS = {
  messages: 'recognaize_messages',
  fileName: 'recognaize_filename',
  fileContext: 'recognaize_file_context',
}

function App() {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState(null)
  const [fileContext, setFileContext] = useState('')
  const [messages, setMessages] = useState([])
  const [error, setError] = useState(null)
  const textareaRef = useRef(null)
  const messagesEndRef = useRef(null)

  // Load persisted state on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.messages)
      if (saved) setMessages(JSON.parse(saved))
    } catch {}
    const savedFile = localStorage.getItem(STORAGE_KEYS.fileName)
    if (savedFile) setFileName(savedFile)
    const savedCtx = localStorage.getItem(STORAGE_KEYS.fileContext)
    if (savedCtx) setFileContext(savedCtx)
  }, [])

  // Persist messages on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(messages))
  }, [messages])

  // Auto-scroll to bottom on new messages or loading
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const handleUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    setLoading(true)
    try {
      const res = await axios.post(`${API_BASE}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      if (res.data.error) {
        setError(res.data.error)
        return
      }
      setFileName(res.data.filename)
      const parsed = res.data.content || ''
      setFileContext(parsed)
      localStorage.setItem(STORAGE_KEYS.fileName, res.data.filename)
      localStorage.setItem(STORAGE_KEYS.fileContext, parsed)
    } catch (err) {
      console.error(err)
      setError('Unable to upload file. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const clearFile = () => {
    setFileName(null)
    setFileContext('')
    localStorage.removeItem(STORAGE_KEYS.fileName)
    localStorage.removeItem(STORAGE_KEYS.fileContext)
  }

  const sendMessage = async (text) => {
    if (!text.trim()) return

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
      const res = await axios.post(`${API_BASE}/chat`, payload)
      const assistantReply = {
        role: 'assistant',
        content: res.data.reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, assistantReply])
    } catch (err) {
      console.error(err)
      setError('Unable to reach the assistant. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSend = () => {
    sendMessage(message)
  }

  const handleQuickReply = (text) => {
    sendMessage(text)
  }

  const handleNewChat = () => {
    setMessages([])
    setMessage('')
    setFileName(null)
    setFileContext('')
    setError(null)
    localStorage.removeItem(STORAGE_KEYS.messages)
    localStorage.removeItem(STORAGE_KEYS.fileName)
    localStorage.removeItem(STORAGE_KEYS.fileContext)
  }

  const autoResizeTextarea = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const maxHeight = 130
    const newHeight = Math.min(el.scrollHeight, maxHeight)
    el.style.height = `${newHeight}px`
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }

  useEffect(() => {
    autoResizeTextarea()
  }, [message])

  const renderMessageContent = (msg) => {
    if (msg.role !== 'assistant') {
      return msg.content
    }

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

    const hasSlideSections = rawLines.some((line) => {
      const lower = line.toLowerCase()
      return (
        lower.includes('understanding your results') ||
        lower.includes('your personalized action plan') ||
        lower.includes('monitoring your progress') ||
        lower.includes('when to see your doctor')
      )
    })

    if (hasSlideSections) {
      const sectionDefs = [
        { key: 'understanding', match: 'understanding your results', icon: '📊' },
        { key: 'action', match: 'your personalized action plan', icon: '🎯' },
        { key: 'monitoring', match: 'monitoring your progress', icon: '📅' },
        { key: 'doctor', match: 'when to see your doctor', icon: '⚕️' },
      ]

      const sections = []
      let current = null

      rawLines.forEach((line) => {
        const lower = line.toLowerCase()
        const header = sectionDefs.find((s) => lower.includes(s.match))

        if (header) {
          const cleanedTitle = line.replace(/^[^a-zA-Z0-9]+/, '').trim()
          current = {
            key: header.key,
            title: cleanedTitle,
            icon: header.icon,
            paragraphs: [],
            bullets: [],
          }
          sections.push(current)
          return
        }

        if (!current) return

        if (line.startsWith('•') || line.startsWith('-')) {
          const cleaned = line.replace(/^[-•]\s*/, '')
          current.bullets.push(cleaned)
        } else {
          current.paragraphs.push(line)
        }
      })

      return (
        <div className="assistant-slide">
          {sections.map((section) => (
            <div
              key={section.key}
              className={`assistant-section-card section-${section.key}`}
            >
              <div className="assistant-section-header">
                <span className="assistant-section-icon">{section.icon}</span>
                <span className="assistant-section-title">{section.title}</span>
              </div>
              {section.paragraphs.length > 0 && (
                <div className="assistant-section-content">
                  {section.paragraphs.map((p, idx) => (
                    <p key={idx}>{p}</p>
                  ))}
                </div>
              )}
              {section.bullets.length > 0 && (
                <ul className="assistant-section-list">
                  {section.bullets.map((b, idx) => (
                    <li key={idx}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )
    }

    const isHeaderLine = (line, index) => {
      const lower = line.toLowerCase()
      if (line.startsWith('•') || line.startsWith('-')) return false
      if (
        lower === 'your results by game:' ||
        lower === 'what this means:' ||
        lower === 'next steps:' ||
        lower === 'key points' ||
        lower === 'common symptoms' ||
        lower === 'types of mci' ||
        lower === 'important note' ||
        lower.includes('understanding your results') ||
        lower.includes('your personalized action plan') ||
        lower.includes('monitoring your progress') ||
        lower.includes('when to see your doctor')
      ) {
        return true
      }
      const next = rawLines[index + 1] || ''
      if (line.length <= 60 && (next.startsWith('•') || next.startsWith('-'))) {
        return true
      }
      return false
    }

    return rawLines.map((line, index) => (
      <div
        key={index}
        className={isHeaderLine(line, index) ? 'msg-line msg-header-line' : 'msg-line'}
      >
        {line}
      </div>
    ))
  }

  const hasMessages = messages.length > 0

  return (
    <div className="page-root">
      <div className="chat-container">
        {/* Header */}
        <div className="chat-header">
          <div className="header-content">
            <div className="bot-avatar">
              <img src={logo} alt="ReCOGnAIze" />
            </div>
            <div className="header-text">
              <div className="bot-name">ReCOGnAIze Assistant</div>
              <div className="bot-status">
                <span className="status-dot" />
                <span>Ready to help with your assessment</span>
              </div>
            </div>
            {hasMessages && (
              <button
                type="button"
                className="new-chat-btn"
                onClick={handleNewChat}
                title="Start a new conversation"
              >
                New Chat
              </button>
            )}
          </div>
        </div>

        {/* Messages / main area */}
        <div className="messages-area">
          {error && (
            <div className="error-toast">
              <span>{error}</span>
              <button onClick={() => setError(null)}>×</button>
            </div>
          )}

          {!hasMessages && (
            <>
              <div className="welcome-banner">
                <h3>Welcome to Your Cognitive Health Journey</h3>
                <p>Get personalized insights and actionable next steps</p>
              </div>

              {/* Upload report section */}
              <div className="upload-section">
                <div className="upload-icon">📄</div>
                <h4>Upload Your Report</h4>
                <p>Share your ReCOGnAIze assessment results to get personalized advice.</p>
                <label className="upload-button">
                  {fileName ? `Report loaded: ${fileName}` : 'Choose file'}
                  <input
                    type="file"
                    accept=".pdf,.txt,.csv,.json,.xlsx,.xls"
                    onChange={handleUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              {/* Quick actions */}
              <div className="quick-actions">
                <button
                  type="button"
                  className="quick-reply-btn"
                  onClick={() => handleQuickReply('Give me personalized advice based on my report')}
                >
                  💬 Get Personalized Advice
                </button>
                <button
                  type="button"
                  className="quick-reply-btn"
                  onClick={() => handleQuickReply('Help me understand my ReCOGnAIze results')}
                >
                  📊 Understand My Results
                </button>
                <button
                  type="button"
                  className="quick-reply-btn"
                  onClick={() => handleQuickReply('Create an action plan to improve my cognitive health')}
                >
                  🎯 Create Action Plan
                </button>
                <button
                  type="button"
                  className="quick-reply-btn"
                  onClick={() => handleQuickReply('When should I repeat this assessment?')}
                >
                  📅 When to Retest?
                </button>
              </div>
            </>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role}`}>
              <div className="message-avatar">
                {msg.role === 'user' ? (
                  <span className="user-initial">You</span>
                ) : (
                  <img src={logo} alt="ReCOGnAIze" />
                )}
              </div>
              <div className="message-content">
                <div
                  className={`message-bubble ${
                    msg.role === 'assistant' ? 'assistant-bubble' : ''
                  }`}
                >
                  {renderMessageContent(msg)}
                </div>
                <div className="message-time">{msg.time}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="typing-indicator">
              <div className="message-avatar">
                <img src={logo} alt="Typing" />
              </div>
              <div className="typing-dots">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="input-container">
          {fileName && (
            <div className="file-chip">
              📄 {fileName}
              <button onClick={clearFile} title="Remove file">×</button>
            </div>
          )}
          <div className="input-wrapper">
            <label className="attach-button" title="Upload report">
              <img src={uploadSvg} alt="Attach file" />
              <input
                type="file"
                accept=".pdf,.txt,.csv,.json,.xlsx,.xls"
                onChange={handleUpload}
                style={{ display: 'none' }}
              />
            </label>
            <textarea
              className="input-field"
              placeholder="Ask me about the assessment or your results..."
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
              className="send-button"
              onClick={handleSend}
              disabled={loading}
              aria-label="Send message"
            >
              {loading ? (
                <span className="send-spinner" />
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
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

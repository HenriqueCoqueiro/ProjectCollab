import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getChatMessages, sendChatMessage, editChatMessage, deleteChatMessage, listProjects } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Navbar, PageLoader, Avatar, Confirm } from '../components'
import { fmtTime, fmtDayGroup } from '../utils/date'

export default function ChatPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const { user } = useAuth()
  const toast = useToast()

  const [project, setProject]     = useState(null)
  const [messages, setMessages]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [text, setText]           = useState('')
  const [sending, setSending]     = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText]   = useState('')
  const [confirmDel, setConfirmDel] = useState(null)

  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => {
    listProjects().then(res => {
      const p = res.data.find(x => x.projectId === id)
      if (!p) { toast('Projeto não encontrado', 'error'); nav('/projetos'); return }
      setProject(p)
    }).catch(() => nav('/projetos'))
  }, [id])

  const loadMessages = async (silent = false) => {
    try {
      const res = await getChatMessages(id)
      setMessages(res.data)
      if (!silent) setLoading(false)
    } catch {
      if (!silent) { toast('Erro ao carregar mensagens', 'error'); setLoading(false) }
    }
  }

  useEffect(() => {
    if (!project) return
    loadMessages()
    const interval = setInterval(() => loadMessages(true), 4000)
    return () => clearInterval(interval)
  }, [project])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const submit = async e => {
    e.preventDefault()
    if (!text.trim()) return
    setSending(true)
    try {
      const res = await sendChatMessage(id, { content: text.trim() })
      setMessages(p => [...p, res.data])
      setText('')
      inputRef.current?.focus()
    } catch { toast('Erro ao enviar mensagem', 'error') }
    finally { setSending(false) }
  }

  const submitEdit = async (messageId) => {
    if (!editText.trim()) return
    try {
      await editChatMessage(id, messageId, { content: editText.trim() })
      setMessages(p => p.map(m => m.messageId === messageId ? { ...m, content: editText.trim() } : m))
      setEditingId(null)
      setEditText('')
    } catch { toast('Erro ao editar mensagem', 'error') }
  }

  const handleDelete = async () => {
    try {
      await deleteChatMessage(id, confirmDel.messageId)
      setMessages(p => p.filter(m => m.messageId !== confirmDel.messageId))
      setConfirmDel(null)
    } catch { toast('Erro ao remover mensagem', 'error') }
  }

  const groupedMessages = messages.reduce((groups, msg) => {
    const day = fmtDayGroup(msg.creationTimestamp)
    if (!groups[day]) groups[day] = []
    groups[day].push(msg)
    return groups
  }, {})

  if (loading) return <><Navbar /><PageLoader /></>

  return (
    <>
      <Navbar />
      <div className="chat-layout">
        <div className="chat-header">
          <div className="container flex items-center gap-16" style={{ height: '100%' }}>
            <button className="btn-ghost btn-sm" onClick={() => nav(`/projetos/${id}`)} style={{ padding: '6px 10px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            </button>
            <div className="chat-header-info">
              <span className="chat-header-name">{project?.nome}</span>
              <span className="text-xs text-muted">Chat do projeto</span>
            </div>
          </div>
        </div>

        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="chat-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" opacity=".3">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <p>Nenhuma mensagem ainda. Seja o primeiro a falar!</p>
            </div>
          ) : (
            Object.entries(groupedMessages).map(([day, dayMsgs]) => (
              <div key={day}>
                <div className="chat-day-divider"><span>{day}</span></div>
                {dayMsgs.map((msg, i) => {
                  const isMe = msg.senderName === user?.username
                  const prevMsg = dayMsgs[i - 1]
                  const sameAuthor = prevMsg && prevMsg.senderName === msg.senderName
                  return (
                    <div key={msg.messageId} className={`chat-msg-row ${isMe ? 'me' : ''} ${sameAuthor ? 'grouped' : ''}`}>
                      {!isMe && !sameAuthor && <Avatar name={msg.senderName} size={32} />}
                      {!isMe && sameAuthor && <div style={{ width: 32, flexShrink: 0 }} />}
                      <div className="chat-bubble-wrap">
                        {!isMe && !sameAuthor && (
                          <span className="chat-sender">{msg.senderName}</span>
                        )}
                        {editingId === msg.messageId ? (
                          <div className="chat-edit-form">
                            <input
                              autoFocus
                              value={editText}
                              onChange={e => setEditText(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') submitEdit(msg.messageId)
                                if (e.key === 'Escape') { setEditingId(null); setEditText('') }
                              }}
                            />
                            <button className="btn btn-primary btn-sm" onClick={() => submitEdit(msg.messageId)}>Salvar</button>
                            <button className="btn btn-secondary btn-sm" onClick={() => { setEditingId(null); setEditText('') }}>Cancelar</button>
                          </div>
                        ) : (
                          <div className="chat-bubble-row">
                            <div className={`chat-bubble ${isMe ? 'bubble-me' : 'bubble-other'}`}>
                              <p className="chat-bubble-text">{msg.content}</p>
                              <span className="chat-time">{fmtTime(msg.creationTimestamp)}</span>
                            </div>
                            {isMe && (
                              <div className="chat-actions">
                                <button className="chat-action-btn" title="Editar"
                                  onClick={() => { setEditingId(msg.messageId); setEditText(msg.content) }}>
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                </button>
                                <button className="chat-action-btn danger" title="Apagar"
                                  onClick={() => setConfirmDel(msg)}>
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <form className="chat-input-bar" onSubmit={submit}>
          <div className="container flex items-center gap-12" style={{ height: '100%' }}>
            <Avatar name={user?.username} size={32} />
            <input
              ref={inputRef}
              className="chat-input"
              placeholder="Escreva uma mensagem..."
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(e) } }}
              autoComplete="off"
            />
            <button type="submit" className="btn btn-primary" disabled={!text.trim() || sending}
              style={{ borderRadius: '50%', width: 42, height: 42, padding: 0, justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </form>
      </div>

      {confirmDel && (
        <Confirm
          title="Apagar mensagem"
          desc="Tem certeza que quer apagar esta mensagem?"
          onConfirm={handleDelete}
          onClose={() => setConfirmDel(null)}
          danger
        />
      )}

      <style>{`
        .chat-layout {
          display: flex; flex-direction: column;
          height: 100vh; padding-top: 64px;
        }
        .chat-header {
          height: 60px; background: var(--bg2);
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }
        .chat-header-name {
          font-family: var(--font-head); font-weight: 700; font-size: 1rem;
          display: block;
        }
        .chat-messages {
          flex: 1; overflow-y: auto;
          padding: 24px 0 8px;
          display: flex; flex-direction: column; gap: 2px;
        }
        .chat-empty {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 12px; height: 100%;
          color: var(--muted); font-size: .9rem;
        }
        .chat-day-divider {
          display: flex; align-items: center; gap: 12px;
          padding: 16px 24px; color: var(--muted); font-size: .75rem;
        }
        .chat-day-divider::before, .chat-day-divider::after {
          content: ''; flex: 1; height: 1px; background: var(--border);
        }
        .chat-msg-row {
          display: flex; align-items: flex-end; gap: 8px;
          padding: 2px 24px;
          max-width: 800px; margin: 0 auto; width: 100%;
        }
        .chat-msg-row.me { flex-direction: row-reverse; }
        .chat-msg-row.grouped { padding-top: 1px; }
        .chat-bubble-wrap { display: flex; flex-direction: column; max-width: 65%; }
        .me .chat-bubble-wrap { align-items: flex-end; }
        .chat-sender {
          font-size: .72rem; color: var(--muted2); margin-bottom: 3px;
          font-family: var(--font-head); font-weight: 600; padding-left: 4px;
        }
        .chat-bubble-row { display: flex; align-items: flex-end; gap: 4px; }
        .me .chat-bubble-row { flex-direction: row-reverse; }
        .chat-bubble {
          padding: 10px 14px; border-radius: 18px;
          max-width: 100%; word-break: break-word;
        }
        .bubble-other {
          background: var(--bg3); border: 1px solid var(--border2);
          border-bottom-left-radius: 4px;
        }
        .bubble-me {
          background: var(--accent); color: #fff;
          border-bottom-right-radius: 4px;
        }
        .chat-bubble-text {
          font-size: .9rem; line-height: 1.5; color: inherit; white-space: pre-wrap;
        }
        .bubble-other .chat-bubble-text { color: var(--text); }
        .chat-time {
          font-size: .65rem; margin-top: 4px; display: block;
          color: rgba(255,255,255,.5);
        }
        .bubble-other .chat-time { color: var(--muted); }
        .chat-actions {
          display: flex; flex-direction: column; gap: 2px; opacity: 0; transition: opacity .15s;
        }
        .chat-bubble-row:hover .chat-actions { opacity: 1; }
        .chat-action-btn {
          background: var(--bg3); border: 1px solid var(--border2); border-radius: 6px;
          width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: var(--muted2); transition: all .15s; padding: 0;
        }
        .chat-action-btn:hover { color: var(--text); border-color: var(--border2); }
        .chat-action-btn.danger:hover { color: var(--red); border-color: #f8717140; }
        .chat-edit-form { display: flex; gap: 6px; align-items: center; }
        .chat-edit-form input { flex: 1; font-size: .85rem; padding: 6px 10px; }
        .chat-input-bar {
          height: 70px; background: var(--bg2);
          border-top: 1px solid var(--border);
          flex-shrink: 0;
        }
        .chat-input {
          flex: 1; background: var(--bg3);
          border: 1px solid var(--border2);
          border-radius: 22px;
          padding: 10px 18px;
          font-size: .9rem; color: var(--text);
          outline: none; transition: border-color .18s;
        }
        .chat-input:focus { border-color: var(--accent); }
      `}</style>
    </>
  )
}

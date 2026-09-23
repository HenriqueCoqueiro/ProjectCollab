import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  listProjects, listMembers,
  listConversations, getDirectMessages,
  sendDirectMessage, editDirectMessage, deleteDirectMessage,
} from '../api/client'
import { connectDirectMessageSocket, disconnectDirectMessageSocket } from '../api/ws'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Navbar, PageLoader, Avatar, Confirm, Empty } from '../components'
import { fmtTime, fmtDayGroup } from '../utils/date'

export default function DirectMessagesPage() {
  const { id, otherUserId } = useParams()
  const nav = useNavigate()
  const { user } = useAuth()
  const toast = useToast()

  const [project, setProject]             = useState(null)
  const [members, setMembers]             = useState([])
  const [conversations, setConversations] = useState([])
  const [loading, setLoading]             = useState(true)

  const [messages, setMessages]           = useState([])
  const [threadLoading, setThreadLoading] = useState(false)
  const [text, setText]                   = useState('')
  const [sending, setSending]             = useState(false)
  const [editingId, setEditingId]         = useState(null)
  const [editText, setEditText]           = useState('')
  const [confirmDel, setConfirmDel]       = useState(null)

  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => {
    listProjects().then(res => {
      const p = res.data.find(x => x.projectId === id)
      if (!p) { toast('Projeto não encontrado', 'error'); nav('/projetos'); return }
      setProject(p)
    }).catch(() => nav('/projetos'))
  }, [id])

  const loadConversations = async (silent = false) => {
    try {
      const res = await listConversations(id)
      setConversations(res.data)
    } catch { if (!silent) toast('Erro ao carregar conversas', 'error') }
  }

  useEffect(() => {
    if (!project) return
    Promise.all([
      listMembers(id).then(res => setMembers(res.data.filter(m => m.userId !== user?.id))),
      loadConversations(),
    ]).finally(() => setLoading(false))
  }, [project])

  const loadThread = async (silent = false) => {
    if (!otherUserId) return
    if (!silent) setThreadLoading(true)
    try {
      const res = await getDirectMessages(id, otherUserId)
      setMessages(res.data)
    } catch {
      if (!silent) {
        toast('Não foi possível abrir esta conversa', 'error')
        nav(`/projetos/${id}/mensagens`)
      }
    } finally {
      if (!silent) setThreadLoading(false)
    }
  }

  useEffect(() => {
    setMessages([])
    if (otherUserId) loadThread()
  }, [otherUserId, id])

  // A fila /user/queue/dm é única por usuário (não por conversa), então todo
  // evento recebido pode pertencer a este projeto ou não, e à conversa aberta
  // ou a outra. Filtramos por projectId e aplicamos na thread aberta quando é
  // o caso; a lista de conversas é ressincronizada via REST a cada evento
  // (mesmo padrão de "resync silencioso" já usado no chat em grupo).
  useEffect(() => {
    if (!project) return

    const handleEvent = event => {
      if (event.projectId !== id) return

      const myId = user?.id
      const eventOtherUserId = event.senderId === myId ? event.recipientId : event.senderId

      if (eventOtherUserId === otherUserId) {
        if (event.type === 'CREATED') {
          setMessages(prev =>
            prev.some(m => m.messageId === event.message.messageId)
              ? prev
              : [...prev, event.message])
        } else if (event.type === 'UPDATED') {
          setMessages(prev => prev.map(m => m.messageId === event.message.messageId ? event.message : m))
        } else if (event.type === 'DELETED') {
          setMessages(prev => prev.filter(m => m.messageId !== event.messageId))
        }
      }

      loadConversations(true)
    }

    const socket = connectDirectMessageSocket({
      onConnect: () => loadConversations(true),
      onEvent: handleEvent,
    })

    return () => disconnectDirectMessageSocket(socket)
  }, [project, otherUserId, id, user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const submit = async e => {
    e.preventDefault()
    if (!text.trim() || !otherUserId) return
    setSending(true)
    try {
      const res = await sendDirectMessage(id, otherUserId, { content: text.trim() })
      // O evento CREATED do WebSocket pode chegar antes desta resposta REST
      // (o backend publica no /user/queue/dm antes de devolver o HTTP 201).
      // Sem este dedupe por messageId, quem enviou a mensagem via esta aba
      // acaba inserindo-a duas vezes: uma pelo evento, outra por aqui.
      setMessages(p =>
        p.some(m => m.messageId === res.data.messageId)
          ? p
          : [...p, res.data])
      setText('')
      inputRef.current?.focus()
      loadConversations(true)
    } catch { toast('Erro ao enviar mensagem', 'error') }
    finally { setSending(false) }
  }

  const submitEdit = async (messageId) => {
    if (!editText.trim()) return
    try {
      await editDirectMessage(id, otherUserId, messageId, { content: editText.trim() })
      setMessages(p => p.map(m => m.messageId === messageId ? { ...m, content: editText.trim() } : m))
      setEditingId(null)
      setEditText('')
    } catch { toast('Erro ao editar mensagem', 'error') }
  }

  const handleDelete = async () => {
    try {
      await deleteDirectMessage(id, otherUserId, confirmDel.messageId)
      setMessages(p => p.filter(m => m.messageId !== confirmDel.messageId))
      setConfirmDel(null)
      loadConversations(true)
    } catch { toast('Erro ao remover mensagem', 'error') }
  }

  const conversationUserIds = useMemo(() => new Set(conversations.map(c => c.otherUserId)), [conversations])
  const newContacts = useMemo(() => members.filter(m => !conversationUserIds.has(m.userId)), [members, conversationUserIds])

  const activeName = useMemo(() => {
    return conversations.find(c => c.otherUserId === otherUserId)?.otherUsername
      || members.find(m => m.userId === otherUserId)?.username
  }, [conversations, members, otherUserId])

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
      <div className="dm-layout">
        <aside className="dm-sidebar">
          <div className="dm-sidebar-header">
            <button className="btn-ghost btn-sm" onClick={() => nav(`/projetos/${id}`)} style={{ padding: '6px 10px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            </button>
            <span className="dm-sidebar-title">Mensagens · {project?.nome}</span>
          </div>

          <div className="dm-sidebar-body">
            {conversations.length === 0 && newContacts.length === 0 && (
              <Empty title="Ninguém para conversar" desc="Convide colegas para o projeto para começar" />
            )}

            {conversations.length > 0 && (
              <div className="dm-section">
                {conversations.map(c => (
                  <button key={c.otherUserId}
                    className={`dm-contact ${c.otherUserId === otherUserId ? 'active' : ''}`}
                    onClick={() => nav(`/projetos/${id}/mensagens/${c.otherUserId}`)}>
                    <Avatar name={c.otherUsername} size={38} />
                    <div className="dm-contact-info">
                      <span className="dm-contact-name">{c.otherUsername}</span>
                      <span className="dm-contact-preview">
                        {c.lastMessageMine ? 'Você: ' : ''}{c.lastMessage}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {newContacts.length > 0 && (
              <div className="dm-section">
                <p className="dm-section-title">Iniciar conversa</p>
                {newContacts.map(m => (
                  <button key={m.userId}
                    className={`dm-contact ${m.userId === otherUserId ? 'active' : ''}`}
                    onClick={() => nav(`/projetos/${id}/mensagens/${m.userId}`)}>
                    <Avatar name={m.username} size={38} />
                    <div className="dm-contact-info">
                      <span className="dm-contact-name">{m.username}</span>
                      <span className="dm-contact-preview text-muted">Nenhuma mensagem ainda</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        <div className="dm-thread">
          {!otherUserId ? (
            <div className="dm-placeholder">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" opacity=".3">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <p>Selecione uma conversa para começar</p>
            </div>
          ) : (
            <>
              <div className="dm-thread-header">
                <Avatar name={activeName} size={32} />
                <div className="dm-thread-header-info">
                  <span className="chat-header-name">{activeName || 'Usuário'}</span>
                  <span className="text-xs text-muted">Conversa direta</span>
                </div>
              </div>

              <div className="chat-messages">
                {threadLoading ? <PageLoader /> : messages.length === 0 ? (
                  <div className="chat-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" opacity=".3">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <p>Nenhuma mensagem ainda. Diga oi!</p>
                  </div>
                ) : (
                  Object.entries(groupedMessages).map(([day, dayMsgs]) => (
                    <div key={day}>
                      <div className="chat-day-divider"><span>{day}</span></div>
                      {dayMsgs.map((msg, i) => {
                        const isMe = msg.senderId === user?.id
                        const prevMsg = dayMsgs[i - 1]
                        const sameAuthor = prevMsg && prevMsg.senderId === msg.senderId
                        return (
                          <div key={msg.messageId} className={`chat-msg-row ${isMe ? 'me' : ''} ${sameAuthor ? 'grouped' : ''}`}>
                            {!isMe && !sameAuthor && <Avatar name={msg.senderName} size={32} />}
                            {!isMe && sameAuthor && <div style={{ width: 32, flexShrink: 0 }} />}
                            <div className="chat-bubble-wrap">
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
                <div className="flex items-center gap-12" style={{ height: '100%', padding: '0 20px' }}>
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
            </>
          )}
        </div>
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
        .dm-layout {
          display: flex; height: 100vh; padding-top: 64px;
        }
        .dm-sidebar {
          width: 300px; flex-shrink: 0; background: var(--bg2);
          border-right: 1px solid var(--border);
          display: flex; flex-direction: column;
        }
        .dm-sidebar-header {
          height: 60px; flex-shrink: 0; display: flex; align-items: center; gap: 10px;
          padding: 0 16px; border-bottom: 1px solid var(--border);
        }
        .dm-sidebar-title {
          font-family: var(--font-head); font-weight: 700; font-size: .9rem;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .dm-sidebar-body { flex: 1; overflow-y: auto; padding: 8px; }
        .dm-section { margin-bottom: 8px; }
        .dm-section-title {
          font-size: .7rem; text-transform: uppercase; letter-spacing: .04em;
          color: var(--muted); padding: 10px 10px 6px;
        }
        .dm-contact {
          display: flex; align-items: center; gap: 10px; width: 100%;
          padding: 10px; border-radius: var(--radius-sm); border: none;
          background: none; cursor: pointer; text-align: left; transition: background .15s;
        }
        .dm-contact:hover { background: var(--bg3); }
        .dm-contact.active { background: var(--bg3); }
        .dm-contact-info { flex: 1; min-width: 0; }
        .dm-contact-name {
          display: block; font-family: var(--font-head); font-weight: 600; font-size: .85rem;
        }
        .dm-contact-preview {
          display: block; font-size: .75rem; color: var(--muted);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px;
        }
        .dm-thread { flex: 1; display: flex; flex-direction: column; min-width: 0; }
        .dm-placeholder {
          flex: 1; display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 12px; color: var(--muted); font-size: .9rem;
        }
        .dm-thread-header {
          height: 60px; flex-shrink: 0; background: var(--bg2);
          border-bottom: 1px solid var(--border);
          display: flex; align-items: center; gap: 12px; padding: 0 20px;
        }
        .dm-thread-header-info { display: flex; flex-direction: column; }
        .chat-header-name {
          font-family: var(--font-head); font-weight: 700; font-size: 1rem; display: block;
        }
        .chat-messages {
          flex: 1; overflow-y: auto; padding: 24px 0 8px;
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
          display: flex; align-items: flex-end; gap: 8px; padding: 2px 24px; width: 100%;
        }
        .chat-msg-row.me { flex-direction: row-reverse; }
        .chat-msg-row.grouped { padding-top: 1px; }
        .chat-bubble-wrap { display: flex; flex-direction: column; max-width: 65%; }
        .me .chat-bubble-wrap { align-items: flex-end; }
        .chat-bubble-row { display: flex; align-items: flex-end; gap: 4px; }
        .me .chat-bubble-row { flex-direction: row-reverse; }
        .chat-bubble { padding: 10px 14px; border-radius: 18px; max-width: 100%; word-break: break-word; }
        .bubble-other { background: var(--bg3); border: 1px solid var(--border2); border-bottom-left-radius: 4px; }
        .bubble-me { background: var(--accent); color: #fff; border-bottom-right-radius: 4px; }
        .chat-bubble-text { font-size: .9rem; line-height: 1.5; color: inherit; white-space: pre-wrap; }
        .bubble-other .chat-bubble-text { color: var(--text); }
        .chat-time { font-size: .65rem; margin-top: 4px; display: block; color: rgba(255,255,255,.5); }
        .bubble-other .chat-time { color: var(--muted); }
        .chat-actions { display: flex; flex-direction: column; gap: 2px; opacity: 0; transition: opacity .15s; }
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
        .chat-input-bar { height: 70px; background: var(--bg2); border-top: 1px solid var(--border); flex-shrink: 0; }
        .chat-input {
          flex: 1; background: var(--bg3); border: 1px solid var(--border2); border-radius: 22px;
          padding: 10px 18px; font-size: .9rem; color: var(--text); outline: none; transition: border-color .18s;
        }
        .chat-input:focus { border-color: var(--accent); }
      `}</style>
    </>
  )
}

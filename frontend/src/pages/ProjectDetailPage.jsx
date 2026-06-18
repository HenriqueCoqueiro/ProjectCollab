import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  listProjects, getFeed, createPost, deletePost,
  listMembers, inviteMember, updateRole, removeMember, leaveProject,
  listProjectRequests, acceptRequest, rejectRequest,
  createComment, deleteComment,
  searchUsers, updateProject
} from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Navbar, Modal, Confirm, Empty, PageLoader, Avatar, RoleBadge, StatusBadge } from '../components'
import { fmtDate, fmtDateTime } from '../utils/date'

const TABS = ['Feed', 'Membros', 'Solicitações']

function CommentSection({ projectId, postId, initialComments, username, isManager }) {
  const [comments, setComments]     = useState(initialComments || [])
  const [open, setOpen]             = useState(false)
  const [text, setText]             = useState('')
  const [sending, setSending]       = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const toast = useToast()

  const submit = async e => {
    e.preventDefault()
    if (!text.trim()) return
    setSending(true)
    try {
      const res = await createComment(projectId, postId, { content: text.trim() })
      setComments(p => [...p, res.data])
      setText('')
    } catch { toast('Erro ao comentar', 'error') }
    finally { setSending(false) }
  }

  const handleDelete = async () => {
    try {
      await deleteComment(projectId, postId, confirmDel.commentId)
      setComments(p => p.filter(c => c.commentId !== confirmDel.commentId))
      setConfirmDel(null)
    } catch { toast('Erro ao remover comentário', 'error') }
  }


  return (
    <div className="comment-section">
      <button className="btn-ghost btn-sm comment-toggle" onClick={() => setOpen(o => !o)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        {comments.length > 0 ? `${comments.length} comentário${comments.length !== 1 ? 's' : ''}` : 'Comentar'}
      </button>

      {open && (
        <div className="comments-body">
          {comments.length === 0 && (
            <p className="text-xs text-muted" style={{ padding: '8px 0' }}>Nenhum comentário ainda.</p>
          )}
          {comments.map(c => (
            <div key={c.commentId} className="comment-row">
              <Avatar name={c.username} size={26} />
              <div className="comment-bubble">
                <div className="flex items-center justify-between gap-8">
                  <span className="text-xs font-head" style={{ fontWeight: 700 }}>{c.username}</span>
                  <span className="text-xs text-muted">{fmtDateTime(c.creationTimestamp)}</span>
                  {(c.username === username || isManager) && (
                    <button className="btn-ghost" style={{ padding: '0 4px', color: 'var(--muted)', fontSize: '.7rem' }}
                      onClick={() => setConfirmDel(c)}>✕</button>
                  )}
                </div>
                <p className="text-sm" style={{ marginTop: 3, color: 'var(--text)', lineHeight: 1.5 }}>{c.content}</p>
              </div>
            </div>
          ))}
          <form onSubmit={submit} className="comment-form">
            <Avatar name={username} size={26} />
            <input
              placeholder="Escreva um comentário..."
              value={text}
              onChange={e => setText(e.target.value)}
              style={{ flex: 1, fontSize: '.85rem', padding: '7px 12px' }}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={!text.trim() || sending}>
              {sending ? '...' : 'Enviar'}
            </button>
          </form>
        </div>
      )}

      {confirmDel && (
        <Confirm title="Remover comentário" desc="Quer remover este comentário?"
          onConfirm={handleDelete} onClose={() => setConfirmDel(null)} danger />
      )}
    </div>
  )
}

export default function ProjectDetailPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const { user } = useAuth()
  const toast = useToast()

  const [project, setProject]   = useState(null)
  const [tab, setTab]           = useState('Feed')
  const [loading, setLoading]   = useState(true)
  const [myRole, setMyRole]     = useState(null)
  const [myMemberId, setMyMemberId] = useState(null)

  const [posts, setPosts]           = useState([])
  const [feedPage, setFeedPage]     = useState(0)
  const [feedTotal, setFeedTotal]   = useState(0)
  const [feedLoading, setFeedLoading] = useState(false)
  const [postText, setPostText]     = useState('')
  const [posting, setPosting]       = useState(false)
  const [deletePostConfirm, setDeletePostConfirm] = useState(null)

  const [members, setMembers]       = useState([])
  const [showInvite, setShowInvite] = useState(false)
  const [inviteSearch, setInviteSearch] = useState('')
  const [inviteResults, setInviteResults] = useState([])
  const [inviteSelected, setInviteSelected] = useState(null)
  const [inviteRole, setInviteRole] = useState('MEMBER')
  const [inviting, setInviting]     = useState(false)
  const [memberConfirm, setMemberConfirm] = useState(null)
  const [roleModal, setRoleModal]   = useState(null)
  const [leaveConfirm, setLeaveConfirm] = useState(false)

  const [requests, setRequests]     = useState([])

  const [showEdit, setShowEdit]     = useState(false)
  const [editForm, setEditForm]     = useState({ nome: '', descricao: '' })
  const [saving, setSaving]         = useState(false)

  const searchTimer = useRef(null)

  useEffect(() => {
    listProjects().then(res => {
      const p = res.data.find(x => x.projectId === id)
      if (!p) { toast('Projeto não encontrado', 'error'); nav('/projetos'); return }
      setProject(p)
      setEditForm({ nome: p.nome, descricao: p.descricao || '' })
    }).catch(() => nav('/projetos'))
  }, [id])

  useEffect(() => {
    if (!project) return
    listMembers(id).then(res => {
      setMembers(res.data)
      const me = res.data.find(m => m.userId === user?.id)
      setMyRole(me?.role || null)
      setMyMemberId(me?.memberId || null)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [project, user])

  useEffect(() => {
    if (loading) return
    if (tab === 'Feed') loadFeed(0)
    if (tab === 'Membros') loadMembers()
    if (tab === 'Solicitações') loadRequests()
  }, [tab, loading])

  const isAtLeast = role => {
    const order = { OWNER: 0, MANAGER: 1, MEMBER: 2, VIEWER: 3 }
    return myRole && order[myRole] <= order[role]
  }

  const loadFeed = async (page = 0) => {
    setFeedLoading(true)
    try {
      const res = await getFeed(id, page)
      if (page === 0) setPosts(res.data.feedItens)
      else setPosts(p => [...p, ...res.data.feedItens])
      setFeedPage(page)
      setFeedTotal(res.data.totalElements)
    } catch { toast('Erro ao carregar feed', 'error') }
    finally { setFeedLoading(false) }
  }

  const handlePost = async e => {
    e.preventDefault()
    if (!postText.trim()) return
    setPosting(true)
    try {
      await createPost(id, { content: postText.trim() })
      setPostText('')
      loadFeed(0)
    } catch { toast('Erro ao publicar', 'error') }
    finally { setPosting(false) }
  }

  const handleDeletePost = async () => {
    try {
      await deletePost(id, deletePostConfirm.postId)
      setPosts(p => p.filter(x => x.postId !== deletePostConfirm.postId))
      setDeletePostConfirm(null)
    } catch { toast('Erro ao remover post', 'error') }
  }

  const loadMembers = async () => {
    try {
      const res = await listMembers(id)
      setMembers(res.data)
    } catch { toast('Erro ao carregar membros', 'error') }
  }

  const handleInviteSearch = val => {
    setInviteSearch(val)
    setInviteSelected(null)
    clearTimeout(searchTimer.current)
    if (!val.trim()) { setInviteResults([]); return }
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await searchUsers(val)
        setInviteResults(res.data)
      } catch { setInviteResults([]) }
    }, 300)
  }

  const handleInvite = async e => {
    e.preventDefault()
    if (!inviteSelected) { toast('Selecione um usuário', 'error'); return }
    setInviting(true)
    try {
      await inviteMember(id, { userId: inviteSelected.userId, role: inviteRole })
      toast('Convite enviado!', 'success')
      setShowInvite(false)
      setInviteSearch('')
      setInviteResults([])
      setInviteSelected(null)
      setInviteRole('MEMBER')
    } catch (err) {
      toast(err.response?.data || 'Erro ao convidar', 'error')
    } finally { setInviting(false) }
  }

  const handleRemoveMember = async () => {
    try {
      await removeMember(id, memberConfirm.memberId)
      setMembers(p => p.filter(m => m.memberId !== memberConfirm.memberId))
      setMemberConfirm(null)
    } catch { toast('Erro ao remover membro', 'error') }
  }

  const handleLeave = async () => {
    try {
      await leaveProject(id)
      toast('Você saiu do projeto', 'info')
      nav('/projetos')
    } catch { toast('Erro ao sair do projeto', 'error') }
  }

  const handleUpdateRole = async () => {
    try {
      await updateRole(id, roleModal.memberId, { role: roleModal.newRole })
      loadMembers()
      setRoleModal(null)
      toast('Papel atualizado!', 'success')
    } catch (err) {
      toast(err.response?.data || 'Erro ao atualizar papel', 'error')
    }
  }

  const handleUpdateProject = async e => {
    e.preventDefault()
    if (!editForm.nome.trim()) { toast('Nome é obrigatório', 'error'); return }
    setSaving(true)
    try {
      await updateProject(id, editForm)
      setProject(p => ({ ...p, nome: editForm.nome, descricao: editForm.descricao }))
      toast('Projeto atualizado!', 'success')
      setShowEdit(false)
    } catch { toast('Erro ao atualizar projeto', 'error') }
    finally { setSaving(false) }
  }

  const loadRequests = async () => {
    try {
      const res = await listProjectRequests(id)
      setRequests(res.data)
    } catch { toast('Sem permissão para ver solicitações', 'error') }
  }

  const handleAccept = async rid => {
    try {
      await acceptRequest(rid)
      setRequests(p => p.filter(r => r.requestId !== rid))
      loadMembers()
    } catch { toast('Erro ao aceitar', 'error') }
  }

  const handleReject = async rid => {
    try {
      await rejectRequest(rid)
      setRequests(p => p.filter(r => r.requestId !== rid))
    } catch { toast('Erro ao rejeitar', 'error') }
  }

  if (loading) return <><Navbar /><PageLoader /></>

  return (
    <>
      <Navbar />
      <main style={{ paddingTop: 80 }}>
        <div className="project-header">
          <div className="container">
            <div className="flex items-center gap-16">
              <button className="btn-ghost btn-sm" onClick={() => nav('/projetos')} style={{ padding: '6px 10px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              </button>
              <Avatar name={project?.nome} size={48} />
              <div style={{ flex: 1 }}>
                <h2 style={{ marginBottom: 2, fontSize: '1.4rem' }}>{project?.nome}</h2>
                {project?.descricao && <p className="text-sm text-muted">{project.descricao}</p>}
              </div>
              {myRole && <RoleBadge role={myRole} />}
              <div className="flex gap-8">
                {isAtLeast('MANAGER') && (
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowEdit(true)}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Editar
                  </button>
                )}
                {myRole && myRole !== 'OWNER' && (
                  <button className="btn btn-danger btn-sm" onClick={() => setLeaveConfirm(true)}>
                    Sair
                  </button>
                )}
              </div>
            </div>
            <div className="proj-tabs">
              {TABS.map(t => (
                <button key={t} className={`proj-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                  {t}
                  {t === 'Solicitações' && requests.length > 0 && (
                    <span className="tab-badge">{requests.length}</span>
                  )}
                </button>
              ))}
              <button className="proj-tab chat-tab" onClick={() => nav(`/projetos/${id}/chat`)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                Chat
              </button>
            </div>
          </div>
        </div>

        <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>

          {tab === 'Feed' && (
            <div className="feed-layout">
              {isAtLeast('MEMBER') && (
                <form onSubmit={handlePost} className="card post-composer mb-24">
                  <div className="flex gap-12">
                    <Avatar name={user?.username} size={36} />
                    <textarea
                      className="post-input"
                      placeholder="Compartilhe uma atualização com o time..."
                      value={postText}
                      onChange={e => setPostText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handlePost(e) }}
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center justify-between" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                    <span className="text-xs text-muted">Ctrl+Enter para publicar</span>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={!postText.trim() || posting}>
                      {posting ? 'Publicando...' : 'Publicar'}
                    </button>
                  </div>
                </form>
              )}

              {feedLoading && posts.length === 0 ? <PageLoader /> : posts.length === 0 ? (
                <Empty title="Nenhuma publicação ainda" desc="Seja o primeiro a compartilhar uma atualização!"
                  icon={<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>} />
              ) : (
                <div className="flex flex-col gap-16">
                  {posts.map(post => (
                    <div key={post.postId} className="card post-card slide-in">
                      <div className="flex items-center gap-12 mb-12">
                        <Avatar name={post.username} size={36} />
                        <div style={{ flex: 1 }}>
                          <span className="text-sm font-head" style={{ fontWeight: 700 }}>{post.username}</span>
                          <p className="text-xs text-muted" style={{ marginTop: 2 }}>{fmtDateTime(post.creationTimestamp)}</p>
                        </div>
                        {(isAtLeast('MANAGER') || post.username === user?.username) && (
                          <button className="btn-ghost btn-sm" style={{ color: 'var(--red)' }}
                            onClick={() => setDeletePostConfirm(post)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                          </button>
                        )}
                      </div>
                      <p className="post-content">{post.content}</p>
                      <CommentSection
                        projectId={id} postId={post.postId}
                        initialComments={post.comments || []}
                        username={user?.username} isManager={isAtLeast('MANAGER')}
                      />
                    </div>
                  ))}
                  {posts.length < feedTotal && (
                    <div style={{ textAlign: 'center', paddingTop: 8 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => loadFeed(feedPage + 1)} disabled={feedLoading}>
                        {feedLoading ? 'Carregando...' : 'Carregar mais'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === 'Membros' && (
            <div className="fade-in">
              <div className="flex items-center justify-between mb-24">
                <p className="text-sm text-muted">{members.length} membro{members.length !== 1 ? 's' : ''}</p>
                {isAtLeast('MANAGER') && (
                  <button className="btn btn-primary btn-sm" onClick={() => setShowInvite(true)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                    Convidar
                  </button>
                )}
              </div>
              {members.length === 0 ? (
                <Empty title="Nenhum membro" desc="Convide pessoas para colaborar" />
              ) : (
                <div className="members-list">
                  {members.map(m => (
                    <div key={m.memberId} className="card member-row">
                      <Avatar name={m.username} size={40} />
                      <div style={{ flex: 1 }}>
                        <p className="text-sm" style={{ fontFamily: 'var(--font-head)', fontWeight: 600 }}>{m.username}</p>
                        <p className="text-xs text-muted">{m.userId}</p>
                      </div>
                      <RoleBadge role={m.role} />
                      {myRole === 'OWNER' && m.role !== 'OWNER' && (
                        <div className="flex gap-8">
                          <button className="btn btn-ghost btn-sm" onClick={() => setRoleModal({ ...m, newRole: m.role })}>Cargo</button>
                          <button className="btn btn-danger btn-sm" onClick={() => setMemberConfirm(m)}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                          </button>
                        </div>
                      )}
                      {myRole === 'MANAGER' && !['OWNER', 'MANAGER'].includes(m.role) && (
                        <button className="btn btn-danger btn-sm" onClick={() => setMemberConfirm(m)}>Remover</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'Solicitações' && (
            <div className="fade-in">
              <p className="text-sm text-muted mb-24">
                {requests.length} solicitação{requests.length !== 1 ? 'ões' : ''} pendente{requests.length !== 1 ? 's' : ''}
              </p>
              {requests.length === 0 ? (
                <Empty title="Nenhuma solicitação pendente" desc="Solicitações de entrada e convites enviados aparecerão aqui" />
              ) : (
                <div className="flex flex-col gap-12">
                  {requests.map(r => (
                    <div key={r.requestId} className="card member-row">
                      <Avatar name={r.username || r.userId} size={40} />
                      <div style={{ flex: 1 }}>
                        <p className="text-sm" style={{ fontFamily: 'var(--font-head)', fontWeight: 600 }}>
                          {r.username || r.userId}
                        </p>
                        <p className="text-xs text-muted" style={{ marginTop: 2 }}>
                          {r.type === 'JOIN_REQUEST' ? 'Solicitação de entrada' : 'Convite enviado'}
                        </p>
                        <StatusBadge status={r.status} />
                      </div>
                      {isAtLeast('MANAGER') && r.type === 'JOIN_REQUEST' && (
                        <div className="flex gap-8">
                          <button className="btn btn-primary btn-sm" onClick={() => handleAccept(r.requestId)}>Aceitar</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleReject(r.requestId)}>Rejeitar</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {showEdit && (
        <Modal title="Editar projeto" onClose={() => setShowEdit(false)}>
          <form onSubmit={handleUpdateProject} className="flex flex-col gap-16">
            <div className="form-group">
              <label>Nome *</label>
              <input autoFocus value={editForm.nome}
                onChange={e => setEditForm(p => ({ ...p, nome: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Descrição</label>
              <textarea value={editForm.descricao}
                onChange={e => setEditForm(p => ({ ...p, descricao: e.target.value }))} />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </form>
        </Modal>
      )}

      {showInvite && (
        <Modal title="Convidar membro" onClose={() => { setShowInvite(false); setInviteSearch(''); setInviteResults([]); setInviteSelected(null) }}>
          <form onSubmit={handleInvite} className="flex flex-col gap-16">
            <div className="form-group">
              <label>Buscar usuário *</label>
              <input autoFocus placeholder="Digite o nome do usuário..."
                value={inviteSearch} onChange={e => handleInviteSearch(e.target.value)} />
              {inviteResults.length > 0 && !inviteSelected && (
                <div className="search-results">
                  {inviteResults.map(u => (
                    <button key={u.userId} type="button" className="search-result-item"
                      onClick={() => { setInviteSelected(u); setInviteSearch(u.username); setInviteResults([]) }}>
                      <Avatar name={u.username} size={28} />
                      <span className="text-sm">{u.username}</span>
                    </button>
                  ))}
                </div>
              )}
              {inviteSelected && (
                <div className="flex items-center gap-8" style={{ marginTop: 4 }}>
                  <Avatar name={inviteSelected.username} size={22} />
                  <span className="text-sm text-green">{inviteSelected.username} selecionado</span>
                  <button type="button" className="btn-ghost" style={{ padding: '0 4px', fontSize: '.75rem' }}
                    onClick={() => { setInviteSelected(null); setInviteSearch('') }}>✕</button>
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Papel</label>
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                <option value="MEMBER">Membro</option>
                <option value="MANAGER">Manager</option>
              </select>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowInvite(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={inviting || !inviteSelected}>
                {inviting ? 'Enviando...' : 'Enviar convite'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {roleModal && (
        <Modal title="Alterar papel" onClose={() => setRoleModal(null)}>
          <div className="form-group mb-24">
            <label>Novo papel para <strong>{roleModal.username}</strong></label>
            <select value={roleModal.newRole} onChange={e => setRoleModal(p => ({ ...p, newRole: e.target.value }))}>
              <option value="MEMBER">Membro</option>
              <option value="MANAGER">Manager</option>
              <option value="VIEWER">Visualizador</option>
            </select>
          </div>
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setRoleModal(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleUpdateRole}>Salvar</button>
          </div>
        </Modal>
      )}

      {memberConfirm && (
        <Confirm title="Remover membro"
          desc={`Remover ${memberConfirm.username} do projeto?`}
          onConfirm={handleRemoveMember} onClose={() => setMemberConfirm(null)} danger />
      )}

      {leaveConfirm && (
        <Confirm title="Sair do projeto"
          desc="Tem certeza que quer sair deste projeto? Você precisará de um novo convite para voltar."
          onConfirm={handleLeave} onClose={() => setLeaveConfirm(false)} danger />
      )}

      {deletePostConfirm && (
        <Confirm title="Remover post" desc="Tem certeza que quer remover este post?"
          onConfirm={handleDeletePost} onClose={() => setDeletePostConfirm(null)} danger />
      )}

      <style>{`
        .project-header {
          background: var(--bg2); border-bottom: 1px solid var(--border);
          padding: 24px 0 0; position: sticky; top: 64px; z-index: 10;
        }
        .proj-tabs { display:flex; gap:4px; margin-top:20px; }
        .proj-tab {
          background:none; border:none; padding:10px 18px; font-family:var(--font-body);
          font-size:.875rem; color:var(--muted2); cursor:pointer;
          border-bottom:2px solid transparent; transition:all .18s; border-radius:0;
          display:flex; align-items:center; gap:6px;
        }
        .proj-tab.active { color:var(--text); border-bottom-color:var(--accent); }
        .proj-tab:hover:not(.active) { color:var(--text); }
        .chat-tab { margin-left:auto; color:var(--accent); }
        .chat-tab:hover { color:var(--accent2); background:var(--bg3); border-radius:var(--radius-sm); }
        .tab-badge {
          background:var(--accent); color:#fff; font-size:.65rem; font-weight:700;
          padding:1px 6px; border-radius:10px; font-family:var(--font-head);
        }
        .feed-layout { max-width:680px; }
        .post-composer { padding:20px; }
        .post-input {
          flex:1; background:transparent; border:none; padding:0;
          resize:none; font-size:.95rem; line-height:1.6; color:var(--text);
        }
        .post-input:focus { border:none; outline:none; }
        .post-card { transition:transform .15s; }
        .post-card:hover { transform:translateY(-1px); }
        .post-content { color:var(--text); font-size:.95rem; line-height:1.65; white-space:pre-wrap; }
        .members-list { display:flex; flex-direction:column; gap:12px; }
        .member-row { display:flex; align-items:center; gap:16px; padding:16px 20px; }
        .comment-section { margin-top:14px; padding-top:12px; border-top:1px solid var(--border); }
        .comment-toggle { color:var(--muted2); font-size:.8rem; gap:6px; }
        .comment-toggle:hover { color:var(--accent); }
        .comments-body { margin-top:12px; display:flex; flex-direction:column; gap:10px; }
        .comment-row { display:flex; align-items:flex-start; gap:8px; }
        .comment-bubble {
          flex:1; background:var(--bg3); border-radius:var(--radius-sm);
          padding:8px 12px; border:1px solid var(--border);
        }
        .comment-form { display:flex; align-items:center; gap:8px; margin-top:4px; }
        .search-results {
          background:var(--bg3); border:1px solid var(--border2);
          border-radius:var(--radius-sm); overflow:hidden; margin-top:4px;
        }
        .search-result-item {
          display:flex; align-items:center; gap:10px; padding:10px 14px; width:100%;
          background:none; border:none; border-bottom:1px solid var(--border); cursor:pointer;
          text-align:left; transition:background .15s;
        }
        .search-result-item:last-child { border-bottom:none; }
        .search-result-item:hover { background:var(--bg2); }
      `}</style>
    </>
  )
}

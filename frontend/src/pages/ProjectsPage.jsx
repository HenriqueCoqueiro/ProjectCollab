import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { listProjects, createProject, deleteProject, joinProject } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Navbar, Modal, Confirm, Empty, PageLoader, Avatar } from '../components'
import { fmtDate } from '../utils/date'

export default function ProjectsPage() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading]   = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [confirm, setConfirm]   = useState(null) // { type, project }
  const [form, setForm]         = useState({ nome: '', descricao: '' })
  const [saving, setSaving]     = useState(false)
  const [search, setSearch]     = useState('')
  const { user } = useAuth()
  const toast = useToast()
  const nav   = useNavigate()

  const load = async () => {
    setLoading(true)
    try {
      const res = await listProjects()
      setProjects(res.data)
    } catch { toast('Erro ao carregar projetos', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async e => {
    e.preventDefault()
    if (!form.nome.trim()) { toast('Nome do projeto é obrigatório', 'error'); return }
    setSaving(true)
    try {
      await createProject(form)
      toast('Projeto criado!', 'success')
      setShowCreate(false)
      setForm({ nome: '', descricao: '' })
      load()
    } catch { toast('Erro ao criar projeto', 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try {
      await deleteProject(confirm.project.projectId)
      toast('Projeto removido', 'success')
      setConfirm(null)
      load()
    } catch { toast('Erro ao remover projeto', 'error') }
  }

  const handleJoin = async project => {
    try {
      await joinProject(project.projectId)
      toast('Solicitação enviada!', 'success')
    } catch (err) {
      toast(err.response?.data || 'Erro ao solicitar entrada', 'error')
    }
  }

  const filtered = projects.filter(p =>
    p.nome.toLowerCase().includes(search.toLowerCase()) ||
    p.descricao?.toLowerCase().includes(search.toLowerCase())
  )

  const isOwner = p => p.ownerId === user?.id



  return (
    <>
      <Navbar />
      <main className="container" style={{ paddingTop: 100, paddingBottom: 60 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-24">
          <div>
            <h2 style={{ marginBottom: 4 }}>Projetos</h2>
            <p className="text-sm text-muted">{projects.length} projeto{projects.length !== 1 ? 's' : ''} disponíve{projects.length !== 1 ? 'is' : 'l'}</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Novo projeto
          </button>
        </div>

        {/* Search */}
        <div className="mb-24" style={{ position: 'relative' }}>
          <svg style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', opacity:.4 }}
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            style={{ paddingLeft: 40 }}
            placeholder="Buscar projetos..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Grid */}
        {loading ? <PageLoader /> : filtered.length === 0 ? (
          <Empty
            title={search ? 'Nenhum resultado' : 'Nenhum projeto ainda'}
            desc={search ? 'Tente outro termo de busca' : 'Crie um projeto ou solicite entrada em um existente'}
            icon={<><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></>}
          />
        ) : (
          <div className="projects-grid fade-in">
            {filtered.map(p => (
              <div key={p.projectId} className="project-card card">
                <div className="flex items-center gap-12 mb-16">
                  <Avatar name={p.nome} size={44} />
                  <div style={{ minWidth: 0 }}>
                    <h3 className="project-name">{p.nome}</h3>
                    <p className="text-xs text-muted">{fmtDate(p.creationTimestamp)}</p>
                  </div>
                  {isOwner(p) && (
                    <span className="badge badge-owner" style={{ marginLeft: 'auto', flexShrink: 0 }}>Meu</span>
                  )}
                </div>

                {p.descricao && (
                  <p className="text-sm project-desc">{p.descricao}</p>
                )}

                <div className="project-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => nav(`/projetos/${p.projectId}`)}>
                    Ver projeto
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </button>
                  {!isOwner(p) && (
                    <button className="btn btn-ghost btn-sm" onClick={() => handleJoin(p)}>
                      Solicitar entrada
                    </button>
                  )}
                  {isOwner(p) && (
                    <button className="btn btn-danger btn-sm" onClick={() => setConfirm({ project: p })}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Modal */}
      {showCreate && (
        <Modal title="Novo projeto" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="flex flex-col gap-16">
            <div className="form-group">
              <label>Nome do projeto *</label>
              <input autoFocus placeholder="Ex: Redesign do App" value={form.nome}
                onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Descrição</label>
              <textarea placeholder="Sobre o que é este projeto?" value={form.descricao}
                onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Criando...' : 'Criar projeto'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirm */}
      {confirm && (
        <Confirm
          title="Remover projeto"
          desc={`Tem certeza que quer remover "${confirm.project.nome}"? Esta ação não pode ser desfeita.`}
          onConfirm={handleDelete}
          onClose={() => setConfirm(null)}
          danger
        />
      )}

      <style>{`
        .projects-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }
        .project-card { display:flex; flex-direction:column; gap:0; transition: transform .18s, border-color .18s; }
        .project-card:hover { transform:translateY(-2px); border-color:var(--border2); }
        .project-name { font-family:var(--font-head); font-weight:700; font-size:1rem;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .project-desc { color:var(--muted2); line-height:1.5; margin-bottom:16px;
          display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .project-actions { display:flex; align-items:center; gap:8px; margin-top:auto; padding-top:16px;
          border-top:1px solid var(--border); }
      `}</style>
    </>
  )
}

import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function PrivateRoute() {
  const { isAuth } = useAuth()
  return isAuth ? <Outlet /> : <Navigate to="/login" replace />
}

export function Navbar() {
  const { user, logout } = useAuth()
  const nav = useNavigate()

  const handleLogout = () => { logout(); nav('/login') }

  return (
    <header className="navbar">
      <div className="container flex items-center justify-between" style={{height:'100%'}}>
        <button className="navbar-brand btn-ghost" onClick={() => nav('/projetos')} style={{padding:0}}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="12" height="12" rx="3" fill="var(--accent)"/>
            <rect x="16" width="12" height="12" rx="3" fill="var(--accent2)" opacity=".7"/>
            <rect y="16" width="12" height="12" rx="3" fill="var(--accent2)" opacity=".7"/>
            <rect x="16" y="16" width="12" height="12" rx="3" fill="var(--accent)" opacity=".5"/>
          </svg>
          <span style={{fontFamily:'var(--font-head)',fontWeight:800,fontSize:'1.15rem',letterSpacing:'-0.02em'}}>
            Colabora
          </span>
        </button>

        <nav className="flex items-center gap-8">
          <button className="btn-ghost text-sm" onClick={() => nav('/projetos')}>Projetos</button>
          <button className="btn-ghost text-sm" onClick={() => nav('/solicitacoes')}>Solicitações</button>
          <div className="navbar-user flex items-center gap-12">
            <span className="text-sm text-muted">{user?.username || 'usuário'}</span>
            <button className="btn btn-secondary btn-sm" onClick={handleLogout}>Sair</button>
          </div>
        </nav>
      </div>
    </header>
  )
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal slide-in">
        <div className="flex items-center justify-between mb-16">
          <h2 style={{fontSize:'1.2rem',marginBottom:0}}>{title}</h2>
          <button className="btn-ghost" style={{padding:'4px 8px'}} onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Spinner({ size = 22 }) {
  return <div className="spinner" style={{width:size,height:size}} />
}

export function Empty({ icon, title, desc }) {
  return (
    <div className="empty slide-in">
      {icon && <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">{icon}</svg>}
      <h3 style={{color:'var(--muted2)',fontFamily:'var(--font-head)',fontSize:'1rem'}}>{title}</h3>
      {desc && <p>{desc}</p>}
    </div>
  )
}

export function RoleBadge({ role }) {
  const map = { OWNER:'owner', MANAGER:'manager', MEMBER:'member', VIEWER:'viewer' }
  const label = { OWNER:'Owner', MANAGER:'Manager', MEMBER:'Membro', VIEWER:'Visualizador' }
  return <span className={`badge badge-${map[role]||'member'}`}>{label[role]||role}</span>
}

export function StatusBadge({ status }) {
  const map = { PENDING:'pending', ACCEPTED:'accepted', REJECTED:'rejected' }
  const label = { PENDING:'Pendente', ACCEPTED:'Aceito', REJECTED:'Rejeitado' }
  return <span className={`badge badge-${map[status]||'pending'}`}>{label[status]||status}</span>
}

export function Avatar({ name, size = 36 }) {
  const initials = (name || '?').slice(0,2).toUpperCase()
  const hue = [...(name||'')].reduce((a,c)=>a+c.charCodeAt(0),0) % 360
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%',
      background:`hsl(${hue},60%,35%)`,
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize: size * 0.38, fontFamily:'var(--font-head)', fontWeight:700,
      color:'#fff', flexShrink:0,
    }}>{initials}</div>
  )
}

export function PageLoader() {
  return (
    <div className="page-loader">
      <div className="spinner" />
      <span className="text-muted text-sm">Carregando...</span>
    </div>
  )
}

export function Confirm({ title, desc, onConfirm, onClose, danger }) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-muted text-sm" style={{marginBottom:8}}>{desc}</p>
      <div className="modal-actions">
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>Confirmar</button>
      </div>
    </Modal>
  )
}

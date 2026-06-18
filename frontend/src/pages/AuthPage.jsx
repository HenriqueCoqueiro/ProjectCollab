import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function AuthPage() {
  const [mode, setMode]   = useState('login') // 'login' | 'register'
  const [form, setForm]   = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()
  const toast = useToast()
  const nav   = useNavigate()

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    if (!form.username.trim() || !form.password.trim()) {
      toast('Preencha todos os campos', 'error'); return
    }
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(form)
        toast('Bem-vindo de volta!', 'success')
      } else {
        await register(form)
        toast('Conta criada com sucesso!', 'success')
      }
      nav('/projetos')
    } catch (err) {
      const msg = err.response?.status === 401 ? 'Usuário ou senha inválidos'
                : err.response?.status === 422 ? 'Nome de usuário já existe'
                : 'Erro ao conectar. Tente novamente.'
      toast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      {/* left panel */}
      <div className="auth-left">
        <div className="auth-brand">
          <svg width="40" height="40" viewBox="0 0 28 28" fill="none">
            <rect width="12" height="12" rx="3" fill="var(--accent)"/>
            <rect x="16" width="12" height="12" rx="3" fill="var(--accent2)" opacity=".7"/>
            <rect y="16" width="12" height="12" rx="3" fill="var(--accent2)" opacity=".7"/>
            <rect x="16" y="16" width="12" height="12" rx="3" fill="var(--accent)" opacity=".5"/>
          </svg>
          <span>Colabora</span>
        </div>
        <div className="auth-hero">
          <h1>Projetos que<br/>avançam <em>juntos</em></h1>
          <p>Gerencie equipes, convide membros e acompanhe o progresso dos seus projetos em um só lugar.</p>
        </div>
        <div className="auth-features">
          {[
            ['📁', 'Projetos organizados', 'Crie e gerencie todos os seus projetos'],
            ['👥', 'Times colaborativos', 'Convide membros e defina papéis'],
            ['💬', 'Feed de atividades', 'Acompanhe o que acontece em cada projeto'],
          ].map(([icon, title, desc]) => (
            <div key={title} className="auth-feature">
              <span>{icon}</span>
              <div>
                <strong>{title}</strong>
                <p>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* right panel */}
      <div className="auth-right">
        <div className="auth-form-wrap slide-in">
          <div className="auth-tabs">
            <button className={mode==='login'?'active':''} onClick={()=>setMode('login')}>Entrar</button>
            <button className={mode==='register'?'active':''} onClick={()=>setMode('register')}>Criar conta</button>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-16">
            <div className="form-group">
              <label>Nome de usuário</label>
              <input
                autoFocus autoComplete="username"
                placeholder="seu_usuario"
                value={form.username}
                onChange={set('username')}
              />
            </div>
            <div className="form-group">
              <label>Senha</label>
              <input
                type="password" autoComplete={mode==='login'?'current-password':'new-password'}
                placeholder="••••••••"
                value={form.password}
                onChange={set('password')}
              />
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{justifyContent:'center',padding:'13px'}}>
              {loading
                ? <><div className="spinner" style={{width:16,height:16,borderWidth:2}}/> Aguarde...</>
                : mode==='login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>

          <p className="auth-switch text-sm text-muted">
            {mode==='login' ? 'Não tem conta?' : 'Já tem conta?'}{' '}
            <button className="btn-ghost" style={{padding:'2px 4px',color:'var(--accent)'}}
              onClick={()=>setMode(mode==='login'?'register':'login')}>
              {mode==='login' ? 'Cadastre-se' : 'Faça login'}
            </button>
          </p>
        </div>
      </div>

      <style>{`
        .auth-page {
          display: grid; grid-template-columns: 1fr 1fr; min-height: 100vh;
        }
        .auth-left {
          background: var(--bg2);
          border-right: 1px solid var(--border);
          padding: 48px;
          display: flex; flex-direction: column; gap: 48px;
          position: relative; overflow: hidden;
        }
        .auth-left::before {
          content:''; position:absolute; inset:0;
          background: radial-gradient(ellipse at 20% 80%, #5b7fff15 0%, transparent 60%),
                      radial-gradient(ellipse at 80% 20%, #a78bfa15 0%, transparent 60%);
          pointer-events:none;
        }
        .auth-brand {
          display:flex; align-items:center; gap:12px;
          font-family:var(--font-head); font-weight:800; font-size:1.4rem; letter-spacing:-0.03em;
        }
        .auth-hero h1 { font-size:clamp(2rem,3.5vw,2.8rem); line-height:1.1; }
        .auth-hero h1 em { color:var(--accent); font-style:normal; }
        .auth-hero p { margin-top:16px; font-size:1rem; line-height:1.7; }
        .auth-features { display:flex; flex-direction:column; gap:20px; }
        .auth-feature { display:flex; align-items:flex-start; gap:14px; }
        .auth-feature span { font-size:1.3rem; margin-top:2px; }
        .auth-feature strong { display:block; font-family:var(--font-head); font-size:.9rem; font-weight:600; color:var(--text); }
        .auth-feature p { font-size:.82rem; margin-top:2px; }
        .auth-right {
          display:flex; align-items:center; justify-content:center; padding:48px 40px;
        }
        .auth-form-wrap { width:100%; max-width:380px; }
        .auth-tabs {
          display:flex; gap:0; margin-bottom:32px;
          border-bottom:1px solid var(--border2);
        }
        .auth-tabs button {
          background:none; border:none; padding:10px 0; margin-right:24px;
          font-family:var(--font-head); font-size:.95rem; font-weight:600;
          color:var(--muted); cursor:pointer; border-bottom:2px solid transparent;
          transition:all .18s; margin-bottom:-1px;
        }
        .auth-tabs button.active { color:var(--text); border-bottom-color:var(--accent); }
        .auth-switch { margin-top:20px; text-align:center; }
        @media(max-width:700px){
          .auth-page{grid-template-columns:1fr;}
          .auth-left{display:none;}
        }
      `}</style>
    </div>
  )
}

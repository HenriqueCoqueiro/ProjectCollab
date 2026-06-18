import { useState, useEffect } from 'react'
import { myRequests, cancelRequest, acceptInvite, rejectInvite } from '../api/client'
import { useToast } from '../context/ToastContext'
import { Navbar, Empty, PageLoader, StatusBadge, Confirm, Avatar } from '../components'

export default function RequestsPage() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading]   = useState(true)
  const [confirm, setConfirm]   = useState(null)
  const toast = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const res = await myRequests()
      setRequests(res.data)
    } catch { toast('Erro ao carregar solicitações', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleCancel = async () => {
    try {
      await cancelRequest(confirm.requestId)
      setRequests(p => p.filter(r => r.requestId !== confirm.requestId))
      setConfirm(null)
      toast('Solicitação cancelada', 'info')
    } catch { toast('Erro ao cancelar', 'error') }
  }

  const handleAcceptInvite = async rid => {
    try {
      await acceptInvite(rid)
      setRequests(p => p.filter(r => r.requestId !== rid))
      toast('Convite aceito! Você já faz parte do projeto.', 'success')
    } catch (err) {
      toast(err.response?.data || 'Erro ao aceitar convite', 'error')
    }
  }

  const handleRejectInvite = async rid => {
    try {
      await rejectInvite(rid)
      setRequests(p => p.filter(r => r.requestId !== rid))
      toast('Convite recusado', 'info')
    } catch { toast('Erro ao recusar convite', 'error') }
  }

  const pending  = requests.filter(r => r.status === 'PENDING')
  const resolved = requests.filter(r => r.status !== 'PENDING')

  return (
    <>
      <Navbar />
      <main className="container" style={{ paddingTop: 100, paddingBottom: 60 }}>
        <div className="mb-24">
          <h2 style={{ marginBottom: 4 }}>Minhas solicitações</h2>
          <p className="text-sm text-muted">Gerencie seus pedidos de entrada e convites recebidos</p>
        </div>

        {loading ? <PageLoader /> : requests.length === 0 ? (
          <Empty
            title="Nenhuma solicitação"
            desc="Quando você solicitar entrada em um projeto ou receber um convite, aparecerá aqui"
            icon={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>}
          />
        ) : (
          <div className="flex flex-col gap-20">
            {/* Pending */}
            {pending.length > 0 && (
              <section>
                <h3 className="section-label">Pendentes ({pending.length})</h3>
                <div className="flex flex-col gap-12">
                  {pending.map(r => (
                    <div key={r.requestId} className="card req-row slide-in">
                      <Avatar name={r.projectNome || r.projectId} size={44} />
                      <div style={{ flex: 1 }}>
                        <p className="text-sm" style={{ fontFamily:'var(--font-head)', fontWeight:700 }}>
                          {r.projectNome || 'Projeto'}
                        </p>
                        <p className="text-xs text-muted" style={{ marginTop: 2 }}>
                          {r.type === 'INVITE' ? 'Convite recebido' : 'Solicitação enviada por você'}
                        </p>
                        <StatusBadge status={r.status} />
                      </div>
                      <div className="flex gap-8">
                        {r.type === 'INVITE' ? (
                          <>
                            <button className="btn btn-primary btn-sm" onClick={() => handleAcceptInvite(r.requestId)}>
                              Aceitar convite
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleRejectInvite(r.requestId)}>
                              Recusar
                            </button>
                          </>
                        ) : (
                          <button className="btn btn-ghost btn-sm text-muted" onClick={() => setConfirm(r)}
                            title="Cancelar solicitação">
                            Cancelar solicitação
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Resolved */}
            {resolved.length > 0 && (
              <section>
                <h3 className="section-label">Histórico</h3>
                <div className="flex flex-col gap-12">
                  {resolved.map(r => (
                    <div key={r.requestId} className="card req-row" style={{ opacity: .65 }}>
                      <Avatar name={r.projectNome || r.projectId} size={44} />
                      <div style={{ flex: 1 }}>
                        <p className="text-sm" style={{ fontFamily:'var(--font-head)', fontWeight:700 }}>
                          {r.projectNome || 'Projeto'}
                        </p>
                        <p className="text-xs text-muted" style={{ marginTop: 2 }}>
                          {r.type === 'INVITE' ? 'Convite recebido' : 'Solicitação enviada por você'}
                        </p>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {confirm && (
        <Confirm
          title="Cancelar solicitação"
          desc="Quer cancelar esta solicitação de entrada?"
          onConfirm={handleCancel}
          onClose={() => setConfirm(null)}
          danger
        />
      )}

      <style>{`
        .section-label {
          font-family: var(--font-head); font-size:.8rem; font-weight:600;
          text-transform:uppercase; letter-spacing:.08em;
          color:var(--muted); margin-bottom:12px;
        }
        .req-row { display:flex; align-items:center; gap:16px; padding:16px 20px; }
      `}</style>
    </>
  )
}

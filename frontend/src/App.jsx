import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { PrivateRoute } from './components'
import AuthPage          from './pages/AuthPage'
import ProjectsPage      from './pages/ProjectsPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import RequestsPage      from './pages/RequestsPage'
import ChatPage          from './pages/ChatPage'
import DirectMessagesPage from './pages/DirectMessagesPage'

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login"  element={<AuthPage />} />
            <Route element={<PrivateRoute />}>
              <Route path="/projetos"              element={<ProjectsPage />} />
              <Route path="/projetos/:id"          element={<ProjectDetailPage />} />
              <Route path="/projetos/:id/chat"     element={<ChatPage />} />
              <Route path="/projetos/:id/mensagens"               element={<DirectMessagesPage />} />
              <Route path="/projetos/:id/mensagens/:otherUserId"  element={<DirectMessagesPage />} />
              <Route path="/solicitacoes"          element={<RequestsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/projetos" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}

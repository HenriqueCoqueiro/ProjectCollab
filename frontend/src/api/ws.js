import { Client } from '@stomp/stompjs'

// Conecta ao broker STOMP do backend e se inscreve no canal de chat de um
// projeto (/topic/projects/{projectId}/chat). O token JWT vai como query
// param porque o WebSocket nativo do navegador não permite header
// Authorization customizado (ver JwtHandshakeInterceptor no backend).
//
// onEvent recebe eventos { type: 'CREATED' | 'UPDATED' | 'DELETED', message, messageId }
// onConnect é chamado a cada (re)conexão — útil para ressincronizar o histórico.
export function connectChatSocket(projectId, { onEvent, onConnect } = {}) {
  const token = localStorage.getItem('token')
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const brokerURL = `${protocol}://${window.location.host}/ws?token=${encodeURIComponent(token || '')}`

  const client = new Client({
    brokerURL,
    reconnectDelay: 3000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    onConnect: () => {
      onConnect?.()
      client.subscribe(`/topic/projects/${projectId}/chat`, frame => {
        try {
          onEvent?.(JSON.parse(frame.body))
        } catch {
          // frame malformado, ignora
        }
      })
    },
  })

  client.activate()
  return client
}

export function disconnectChatSocket(client) {
  client?.deactivate()
}

// Conecta na fila privada de mensagens diretas do usuário autenticado
// (/user/queue/dm). Diferente do chat de projeto, essa fila é única e
// global por usuário — eventos de qualquer conversa direta (com qualquer
// pessoa, em qualquer projeto) chegam por ela; quem escuta filtra pelo
// projectId/otherUserId que interessa no momento.
//
// onEvent recebe eventos { type, message, messageId, projectId, senderId, recipientId }
export function connectDirectMessageSocket({ onEvent, onConnect } = {}) {
  const token = localStorage.getItem('token')
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const brokerURL = `${protocol}://${window.location.host}/ws?token=${encodeURIComponent(token || '')}`

  const client = new Client({
    brokerURL,
    reconnectDelay: 3000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    onConnect: () => {
      onConnect?.()
      client.subscribe('/user/queue/dm', frame => {
        try {
          onEvent?.(JSON.parse(frame.body))
        } catch {
          // frame malformado, ignora
        }
      })
    },
  })

  client.activate()
  return client
}

// Alias semântico — mesma lógica de desconexão serve para qualquer client STOMP.
export const disconnectDirectMessageSocket = disconnectChatSocket

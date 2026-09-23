import axios from 'axios'

const api = axios.create({ baseURL: '' })

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('expireAt')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// Auth
export const login  = d => api.post('/login', d)
export const signUp = d => api.post('/users', d)

// Projects
export const listProjects   = ()      => api.get('/projects')
export const getProject     = id      => api.get(`/projects/${id}`)
export const createProject  = d       => api.post('/projects', d)
export const updateProject  = (id, d) => api.patch(`/projects/${id}`, d)
export const deleteProject  = id      => api.delete(`/projects/${id}`)

// Members
export const listMembers    = pid            => api.get(`/projects/${pid}/members`)
export const inviteMember   = (pid, d)       => api.post(`/projects/${pid}/members/invite`, d)
export const updateRole     = (pid, mid, d)  => api.patch(`/projects/${pid}/members/${mid}/role`, d)
export const removeMember   = (pid, mid)     => api.delete(`/projects/${pid}/members/${mid}`)
export const leaveProject   = pid            => api.delete(`/projects/${pid}/members/me`)

// Users
export const searchUsers    = username => api.get(`/users/search?username=${encodeURIComponent(username)}`)

// Join requests
export const joinProject    = pid => api.post(`/projects/${pid}/join`)
export const myRequests     = ()  => api.get('/requests/my')
export const cancelRequest  = rid => api.delete(`/requests/${rid}`)
export const acceptInvite   = rid => api.post(`/invites/${rid}/accept`)
export const rejectInvite   = rid => api.post(`/invites/${rid}/reject`)

// Project request management (manager/owner)
export const listProjectRequests = pid => api.get(`/projects/${pid}/requests`)
export const acceptRequest       = rid => api.patch(`/projects/requests/${rid}/accept`)
export const rejectRequest       = rid => api.patch(`/projects/requests/${rid}/reject`)

// Feed & Posts
export const getFeed        = (pid, page=0, pageSize=10) => api.get(`/projects/${pid}/feed?page=${page}&pageSize=${pageSize}`)
export const createPost     = (pid, d) => api.post(`/projects/${pid}/post`, d)
export const deletePost     = (pid, postId) => api.delete(`/projects/${pid}/post/${postId}`)

// Comments
export const listComments  = (pid, postId)        => api.get(`/projects/${pid}/post/${postId}/comments`)
export const createComment = (pid, postId, d)     => api.post(`/projects/${pid}/post/${postId}/comments`, d)
export const deleteComment = (pid, postId, cid)   => api.delete(`/projects/${pid}/post/${postId}/comments/${cid}`)

// Chat (grupo do projeto)
export const getChatMessages = (pid)           => api.get(`/projects/${pid}/chat`)
export const sendChatMessage  = (pid, d)        => api.post(`/projects/${pid}/chat`, d)
export const editChatMessage  = (pid, mid, d)   => api.put(`/projects/${pid}/chat/${mid}`, d)
export const deleteChatMessage = (pid, mid)     => api.delete(`/projects/${pid}/chat/${mid}`)

// Mensagens diretas (chat 1-para-1 entre dois membros do mesmo projeto)
export const listConversations    = pid                        => api.get(`/projects/${pid}/dm`)
export const getDirectMessages    = (pid, otherUserId)          => api.get(`/projects/${pid}/dm/${otherUserId}`)
export const sendDirectMessage    = (pid, otherUserId, d)       => api.post(`/projects/${pid}/dm/${otherUserId}`, d)
export const editDirectMessage    = (pid, otherUserId, mid, d)  => api.put(`/projects/${pid}/dm/${otherUserId}/${mid}`, d)
export const deleteDirectMessage  = (pid, otherUserId, mid)     => api.delete(`/projects/${pid}/dm/${otherUserId}/${mid}`)

export default api

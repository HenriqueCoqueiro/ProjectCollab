# Colabora

Criado por: Henrique Coqueiro de Melo e Karlos Danyel Veloso dos Reis

Plataforma de colaboração em projetos — backend Spring Boot + frontend React.

```
Colabora/
├── src/                  ← Backend Spring Boot (Java)
├── frontend/             ← Frontend React (Vite)
├── pom.xml
└── README.md
```

---

## Pré-requisitos

- Java 17+
- Maven
- Node.js 18+
- MySQL 8 rodando na porta 3306

---

## Configuração inicial do banco

```sql
CREATE DATABASE demo_db;
```

O Hibernate recria as tabelas automaticamente a cada inicialização (`ddl-auto=create`) e o `data.sql` insere os roles `admin` e `basic`.

> **Atenção:** se você já rodou o projeto antes e mudou nomes de tabelas, limpe o banco antes de subir:
> ```sql
> USE demo_db;
> SET FOREIGN_KEY_CHECKS = 0;
> DROP TABLE IF EXISTS tb_post, tb_comment, chat_messages, tb_chat_messages, tb_comments,
>   tb_posts, tb_posts_seq, tb_project_members, tb_project_requests,
>   tb_projects, tb_roles, tb_users_roles, tb_users;
> SET FOREIGN_KEY_CHECKS = 1;
> ```

---

## Rodando o projeto

**Terminal 1 — backend:**
```bash
./mvnw spring-boot:run
```
Sobe em `http://localhost:8080`

**Terminal 2 — frontend:**
```bash
cd frontend
npm install
npm run dev
```
Sobe em `http://localhost:5173`

O Vite faz proxy automático de todas as chamadas de API para `:8080` — não é necessário configurar CORS em desenvolvimento.

---

## Dados de exemplo

Ao subir o backend, uma seed automática (`SampleProjectDataConfig`) popula o banco com 5 usuários e 10 projetos variados — só pra já ter conteúdo pra navegar, buscar e filtrar em `/projetos` sem precisar cadastrar nada manualmente. Ela roda uma vez (não duplica se já houver projetos) e é independente do usuário `admin` (criado por `AdminUserConfig`).

| Usuário | Senha |
|---|---|
| `ana.silva` | `123` |
| `bruno.costa` | `123` |
| `carla.souza` | `123` |
| `diego.santos` | `123` |
| `elisa.melo` | `123` |

Cada um é dono de 2 projetos (App de Delivery, Sistema de Gestão Escolar, E-commerce, API de Pagamentos, Rede Social, Dashboard, FitTrack, ChatFlow, EduPlay, FreelaHub — nomes e descrições em `SampleProjectDataConfig.java`), cada projeto com o dono como único membro. Dá pra logar com qualquer um deles pra testar a busca, entrar em projeto de outro usuário, chat em tempo real, etc.

## Funcionalidades

### Autenticação
- Cadastro de conta (`POST /users`)
- Login com JWT (`POST /login`) — token expira em 5 minutos
- Logout automático no frontend ao expirar

### Projetos
- Criar, listar e deletar projetos (OWNER)
- Editar nome e descrição (MANAGER+)
- Buscar projeto por ID (`GET /projects/{id}`)

### Membros
- Listar membros do projeto — qualquer usuário autenticado (não precisa ser membro; serve pra decidir se quer pedir entrada)
- Convidar membro por busca de username (`GET /users/search?username=...`)
- Alterar papel de membro (OWNER)
- Remover membro (MANAGER+)
- **Sair do projeto** — qualquer membro exceto OWNER (`DELETE /projects/{id}/members/me`)

### Solicitações e convites
- Solicitar entrada em projeto (`POST /projects/{id}/join`)
- Aceitar ou rejeitar solicitações (MANAGER+)
- Ver convites e solicitações enviadas (`GET /requests/my`)
- Aceitar ou rejeitar convites recebidos
- Cancelar solicitação enviada

### Feed e posts
- Publicar posts no feed do projeto (MEMBER+)
- Feed paginado ordenado por data decrescente, com data e hora de publicação exibidas em cada post
- Deletar posts (autor, MANAGER ou ADMIN)

### Comentários
- Comentar em posts (MEMBER+)
- Deletar comentários (autor ou MANAGER+)

### Chat
- Chat em tempo real por projeto (MEMBER+) — via WebSocket (STOMP), endpoint `/ws`
- Editar mensagens próprias
- Deletar mensagens (autor ou MANAGER+)

---

## Papéis (ProjectRole)

| Papel | Permissões |
|---|---|
| `OWNER` | Controle total, único que não pode sair do projeto |
| `MANAGER` | Convidar, remover membros, aceitar solicitações, deletar posts/comentários/mensagens alheios |
| `MEMBER` | Postar, comentar, enviar mensagens no chat, sair do projeto |
| `VIEWER` | Sem acesso a nenhum endpoint (reservado para uso futuro) |

---

## Endpoints da API

### Autenticação (público)
| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/login` | Login — retorna `accessToken` e `expiresIn` |
| `POST` | `/users` | Cadastro de nova conta |

### Usuários
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/users/search?username=...` | Buscar usuários por nome |
| `GET` | `/users` | Listar todos (somente ADMIN) |

### Projetos
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/projects` | Listar todos os projetos |
| `POST` | `/projects` | Criar projeto |
| `GET` | `/projects/{id}` | Buscar projeto por ID |
| `PATCH` | `/projects/{id}` | Editar nome/descrição (MANAGER+) |
| `DELETE` | `/projects/{id}` | Deletar projeto (OWNER) |

### Membros
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/projects/{id}/members` | Listar membros |
| `POST` | `/projects/{id}/members/invite` | Convidar usuário (MANAGER+) |
| `PATCH` | `/projects/{id}/members/{mid}/role` | Alterar papel (OWNER) |
| `DELETE` | `/projects/{id}/members/me` | Sair do projeto |
| `DELETE` | `/projects/{id}/members/{mid}` | Remover membro (MANAGER+) |

### Solicitações
| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/projects/{id}/join` | Solicitar entrada |
| `GET` | `/projects/{id}/requests` | Ver solicitações pendentes (MANAGER+) |
| `PATCH` | `/projects/requests/{rid}/accept` | Aceitar solicitação (MANAGER+) |
| `PATCH` | `/projects/requests/{rid}/reject` | Rejeitar solicitação (MANAGER+) |
| `GET` | `/requests/my` | Minhas solicitações e convites |
| `DELETE` | `/requests/{rid}` | Cancelar solicitação |
| `POST` | `/invites/{rid}/accept` | Aceitar convite |
| `POST` | `/invites/{rid}/reject` | Rejeitar convite |

### Feed e posts
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/projects/{id}/feed?page=0&pageSize=10` | Feed paginado — retorna posts com `creationTimestamp`, autor e comentários |
| `POST` | `/projects/{id}/post` | Publicar post |
| `DELETE` | `/projects/{id}/post/{postId}` | Deletar post |

### Comentários
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/projects/{id}/post/{postId}/comments` | Listar comentários |
| `POST` | `/projects/{id}/post/{postId}/comments` | Comentar |
| `DELETE` | `/projects/{id}/post/{postId}/comments/{cid}` | Deletar comentário |

### Chat
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/projects/{id}/chat` | Buscar mensagens |
| `POST` | `/projects/{id}/chat` | Enviar mensagem |
| `PUT` | `/projects/{id}/chat/{mid}` | Editar mensagem (autor) |
| `DELETE` | `/projects/{id}/chat/{mid}` | Deletar mensagem (autor ou MANAGER+) |

Além do REST acima (usado para histórico e escrita), há um endpoint WebSocket para entrega em tempo real:

| Protocolo | Rota | Descrição |
|---|---|---|
| `WS` (STOMP) | `/ws?token={jwt}` | Handshake; inscreva-se em `/topic/projects/{id}/chat` (MEMBER+) para receber `CREATED`/`UPDATED`/`DELETED` em tempo real |

---

## Estrutura de tabelas

| Tabela | Descrição |
|---|---|
| `tb_users` | Usuários |
| `tb_roles` | Papéis do sistema (admin, basic) |
| `tb_users_roles` | Relação usuário-papel |
| `tb_projects` | Projetos |
| `tb_project_members` | Membros de cada projeto com seu papel |
| `tb_project_requests` | Solicitações de entrada e convites |
| `tb_posts` | Posts do feed |
| `tb_comments` | Comentários nos posts |
| `tb_chat_messages` | Mensagens do chat por projeto |

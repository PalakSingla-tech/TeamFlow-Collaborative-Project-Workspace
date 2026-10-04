# TeamFlow-Collaborative-Project-Workspace

**TeamFlow** is a real-time collaborative project workspace that helps teams manage projects, tasks, discussions, files, deadlines, and progress from a single platform.

It is built with **Java Spring Boot**, **React**, **PostgreSQL**, and **WebSockets**, with offline support and conflict-safe synchronization.

---

## 📌 Overview

Remote and distributed teams often use separate tools for task management, comments, file sharing, and progress tracking. This fragmentation makes collaboration slow and makes it difficult to understand the current state of a project.

TeamFlow solves this by providing one shared workspace where team members can:

- Create and manage projects
- Assign and track tasks
- Discuss work through comments
- Share task-related files
- Monitor deadlines and progress
- Receive real-time updates
- Continue working offline and sync safely later

---

## ✨ Features

### Core Workspace

| Feature | Description |
|---|---|
| Projects | Create projects and manage project members |
| Tasks | Create, update, assign, and delete tasks in a Kanban style board|
| Task Status | Track tasks using `TODO`, `IN_PROGRESS`, `REVIEW`, and `DONE` |
| Task Assignment | Assign tasks to project members |
| Deadlines | Set due dates and identify overdue tasks |
| Comments | Discuss individual tasks through threaded task comments |
| File Attachments | Upload and view files related to a task |
| Dashboard | View project progress, task distribution, overdue work, and member workload |
| Real-Time Updates | Task, comment, and attachment changes appear instantly for all project members |

### Real-Time Collaboration

- WebSocket-based live updates using STOMP
- Project-specific update channels
- Instant task creation, update, deletion, comment, and attachment sync
- Non-intrusive activity notifications when another member updates the workspace
- Automatic UI updates without manual refresh

### Offline Sync

TeamFlow remains usable when the network connection is unstable or unavailable.

| Capability | Description |
|---|---|
| Offline Access | Previously loaded projects and tasks remain accessible |
| Offline CRUD | Users can create, edit, and delete tasks while offline |
| Pending Changes | Offline changes are stored locally and marked as pending |
| Connectivity Detection | The app detects online and offline states automatically |
| Automatic Synchronization | Pending changes are synchronized when connectivity returns |
| Sync Status | Users can see whether data is synced, pending, or in conflict |
| Conflict Handling | Conflicting edits are detected instead of being silently overwritten |

### Concurrent Edit Protection

To prevent silent data loss, TeamFlow uses version-based optimistic locking.

- Every task contains a version number
- When a user updates a task, the client sends the version it loaded
- If another user has already updated the task, the backend returns a conflict response
- The user is informed and can choose to load the latest version or retry with their changes
- Comments are append-only, so they do not require conflict resolution

### Self Auto-Join Links

Team owners can generate a secure project invite link.

- Project owners can create a join link for a project
- New users can open the link and join the project automatically
- The invited user is added as a project member without manual approval
- Join links reduce onboarding friction for teams

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Backend | Java 17+, Spring Boot |
| Security | Spring Security, JWT |
| Database | PostgreSQL |
| ORM | Spring Data JPA, Hibernate |
| Real-Time Communication | Spring WebSocket, STOMP |
| File Storage | Local file storage |
| Frontend | React |
| State and API Layer | REST APIs, WebSocket client |
| Offline Storage | IndexedDB / Local Storage |
| Build Tools | Maven, npm |

---

## 🏗️ Architecture

```text
React Frontend
        |
        |-----------------------------|
        |                             |
   REST APIs                    WebSocket / STOMP
        |                             |
        v                             v
Spring Boot Backend  ----------------> PostgreSQL
        |
        |-- Task Service
        |-- Project Service
        |-- Comment Service
        |-- Attachment Service
        |-- Dashboard Service
        |-- Sync Service
        |-- WebSocket Event Publisher
```

### Data Flow

1. The React frontend communicates with Spring Boot through REST APIs.
2. Task, comment, and attachment changes are persisted in PostgreSQL.
3. After a successful database operation, the backend publishes an event to the relevant project WebSocket topic.
4. All connected clients subscribed to that project receive the update instantly.
5. When offline, changes are stored locally and queued for synchronization.
6. When the connection is restored, queued operations are replayed to the backend.
7. Version-based conflict detection prevents silent overwrites.

---

## 🚀 Getting Started

### Prerequisites

Ensure the following are installed:

- Java 17 or later
- Maven 3.8+
- Node.js 18+
- npm 9+
- PostgreSQL 14+

### Clone the Repository

```bash
git clone [https://github.com/your-username/teamflow.git](https://github.com/your-username/teamflow.git)
cd teamflow
```

### Backend Setup

1. Create a PostgreSQL database:

```sql
CREATE DATABASE teamflow_db;
```

2. Update `src/main/resources/application.properties`:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/teamflow_db
spring.datasource.username=your_username
spring.datasource.password=your_password

spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true

jwt.secret=your_jwt_secret

file.upload-dir=./uploads
```

3. Run the backend:

```bash
cd backend
mvn spring-boot:run
```

The backend will start at:

```text
http://localhost:8080
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Create a `.env` file in the frontend directory:

```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_WS_URL=http://localhost:8080/ws
```

The frontend will start at:

```text
http://localhost:3000
```

---

## 🔐 Environment Variables

### Backend

| Variable | Description |
|---|---|
| `spring.datasource.url` | PostgreSQL connection URL |
| `spring.datasource.username` | Database username |
| `spring.datasource.password` | Database password |
| `jwt.secret` | Secret key used to sign JWT tokens |
| `jwt.expiration` | JWT expiration time in milliseconds |
| `file.upload-dir` | Directory where uploaded files are stored |

### Frontend

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Base URL of the Spring Boot REST API |
| `VITE_WS_URL` | WebSocket endpoint URL |

---

## 📡 API Overview

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Authenticate user and return JWT |

### Projects

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/projects` | Get projects for the logged-in user |
| `POST` | `/api/projects` | Create a new project |
| `GET` | `/api/projects/{projectId}` | Get project details |
| `POST` | `/api/projects/{projectId}/members` | Add a member to a project |
| `POST` | `/api/projects/{projectId}/join-link` | Generate a self auto-join link |
| `POST` | `/api/projects/join/{joinToken}` | Join a project using an invite link |

### Tasks

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/projects/{projectId}/tasks` | Get all project tasks |
| `POST` | `/api/projects/{projectId}/tasks` | Create a task |
| `PUT` | `/api/tasks/{taskId}` | Update a task |
| `DELETE` | `/api/tasks/{taskId}` | Delete a task |
| `PATCH` | `/api/tasks/{taskId}/status` | Update task status |
| `PATCH` | `/api/tasks/{taskId}/assignee` | Assign a task |

### Comments and Files

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/tasks/{taskId}/comments` | Get task comments |
| `POST` | `/api/tasks/{taskId}/comments` | Add a comment |
| `GET` | `/api/tasks/{taskId}/attachments` | Get task attachments |
| `POST` | `/api/tasks/{taskId}/attachments` | Upload a file |
| `DELETE` | `/api/attachments/{attachmentId}` | Delete an attachment |

### Dashboard

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/projects/{projectId}/dashboard` | Get project progress and metrics |

---

## 🔄 Offline Synchronization Flow

```text
User makes a change offline
            |
            v
Change is stored in local offline storage
            |
            v
Change is marked as Pending Sync
            |
            v
Connectivity is restored
            |
            v
Queued changes are sent to the backend
            |
            +-----------------------------+
            |                             |
     Sync succeeds                  Conflict detected
            |                             |
            v                             v
Change marked as Synced      User is asked to resolve conflict
```

### Conflict Strategy

| Operation | Conflict Handling |
|---|---|
| Task title or description edit | Version check and user-guided conflict resolution |
| Task status change | Last-write-wins with server validation |
| Task assignment | Last-write-wins with server validation |
| New comment | Append-only, no conflict |
| File upload | Append-only, no conflict |
| Task deletion | Server validates whether the task still exists |

---

## 🧪 Demo Flow

1. Register two users.
2. Create a project as User A.
3. Generate a self auto-join link and join as User B.
4. Create tasks and assign them to project members.
5. Open the project in two browser windows.
6. Update a task in one window and observe the instant update in the other.
7. Add comments and upload attachments.
8. Disconnect the internet and make task changes offline.
9. Reconnect and observe automatic synchronization.
10. Edit the same task from two sessions to demonstrate conflict detection.

---

## 📈 Future Enhancements

- Email and in-app notifications
- Cloud file storage integration
- Project templates

---

## 🤝 Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a feature branch:

```bash
git checkout -b feature/your-feature
```

3. Commit your changes:

```bash
git commit -m "Add your feature"
```

4. Push to the branch:

```bash
git push origin feature/your-feature
```

5. Open a pull request.

---

## 👤 Author

**Palak Singla**  
GitHub: [PalakSingla-tech](https://github.com/PalakSingla-tech)  
LinkedIn: [Palak Singla](https://www.linkedin.com/in/singlapalak)

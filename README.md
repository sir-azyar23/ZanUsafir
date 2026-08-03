# ZanUsafiri Route Management System

A production-ready **transport management web application** for Zanzibar, built with Spring Boot (Java 17) + React (Vite) + PostgreSQL.

---

## 🚀 Quick Start

### Prerequisites
- Java 17+
- Maven 3.8+
- Node.js 18+
- PostgreSQL 14+

---

## 🗄️ Database Setup

```sql
-- Connect as postgres superuser and run:
CREATE DATABASE zanusafiri;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE zanusafiri TO postgres;
```

> Edit `backend/src/main/resources/application.yml` to change DB credentials.

---

## ⚙️ Backend (Spring Boot)

```bash
cd backend
mvn clean install
mvn spring-boot:run
```

The API starts on **http://localhost:8080/api**

### Default Seed Users (auto-created on first run)
| Username | Password | Role  |
|----------|----------|-------|
| admin    | admin123 | ADMIN |
| staff    | staff123 | STAFF |

---

## 🎨 Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

The app opens on **http://localhost:5173**

---

## 📋 API Endpoints

### Auth
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/register` | ADMIN |
| GET  | `/api/auth/me` | Authenticated |

### Routes
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/api/routes` | Public |
| GET | `/api/routes/{id}` | Public |
| POST | `/api/routes` | ADMIN/STAFF |
| PUT | `/api/routes/{id}` | ADMIN/STAFF |
| DELETE | `/api/routes/{id}` | ADMIN |
| POST | `/api/routes/{id}/stops` | ADMIN/STAFF |
| DELETE | `/api/routes/{id}/stops/{rsId}` | ADMIN/STAFF |

### Bus Stops
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/api/stops` | Public |
| POST | `/api/stops` | ADMIN/STAFF |
| PUT | `/api/stops/{id}` | ADMIN/STAFF |
| DELETE | `/api/stops/{id}` | ADMIN |

### Buses
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/api/buses` | Authenticated |
| POST | `/api/buses` | ADMIN/STAFF |
| PUT | `/api/buses/{id}` | ADMIN/STAFF |
| DELETE | `/api/buses/{id}` | ADMIN |

### Drivers, Fares, Audit Logs — similar patterns

---

## 🏗️ Architecture

```
ZanUsafir/
├── backend/
│   └── src/main/java/com/zanusafiri/
│       ├── config/         # Security, CORS, DataInitializer
│       ├── controller/     # REST controllers
│       ├── dto/            # Request/Response DTOs
│       ├── entity/         # JPA entities
│       ├── repository/     # Spring Data repositories
│       ├── security/       # JWT filter + provider
│       └── service/        # Business logic
│
└── frontend/
    └── src/
        ├── components/     # Sidebar, Navbar, ProtectedRoute
        ├── hooks/          # useAuth, useTheme
        ├── layouts/        # DashboardLayout
        ├── pages/          # All page components
        └── services/       # Axios API service
```

---

## 🎯 Features

- ✅ JWT Authentication with role-based access (ADMIN / STAFF)
- ✅ Route management with ordered bus stops
- ✅ Bus fleet management
- ✅ Driver management with bus assignment
- ✅ Fare management (TZS / USD)
- ✅ Interactive Leaflet map (OpenStreetMap)
- ✅ Audit logging for all admin actions
- ✅ Notifications system
- ✅ Light / Dark mode toggle
- ✅ Fully responsive design
- ✅ Pre-seeded with real Zanzibar locations

---

## 🗺️ Real Zanzibar Locations (pre-seeded)

| Stop | Coordinates |
|------|-------------|
| Stone Town Terminal | -6.1630, 39.1916 |
| Darajani Market | -6.1600, 39.1940 |
| Bububu Junction | -6.1100, 39.2100 |
| Zanzibar Airport | -6.2195, 39.2249 |
| Kendwa Beach | -5.7652, 39.2215 |
| Nungwi Village | -5.7226, 39.2975 |
| Paje Beach | -6.2677, 39.5344 |
| Mkokotoni Ferry | -5.8819, 39.2637 |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS v4, Material UI |
| Charts | Recharts |
| Map | Leaflet + React-Leaflet |
| HTTP | Axios |
| Backend | Spring Boot 3.2, Java 17 |
| Security | Spring Security + JWT (JJWT) |
| Database | PostgreSQL 14 |
| ORM | Spring Data JPA / Hibernate |

---

## 📜 License

MIT — Zubeir Final Year Project 2024

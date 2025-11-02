# Sistema de Gestión de Préstamo de Equipos en Laboratorios - Backend API

Backend RESTful completo desarrollado en **TypeScript + Node.js + Express + MongoDB (Mongoose)** para el sistema de gestión de préstamo de equipos en laboratorios de la Universidad Autónoma de Aguascalientes (UAA).

## 🚀 Características

- ✅ **TypeScript** con tipado fuerte
- ✅ **Express.js** con arquitectura modular
- ✅ **MongoDB** con Mongoose ODM
- ✅ **JWT** con access tokens (2h) y refresh tokens (7d)
- ✅ **Redis** para gestión de refresh tokens
- ✅ **RBAC** (Role-Based Access Control) con roles: `estudiante`, `profesor`, `admin`
- ✅ **Validación** con express-validator
- ✅ **Seguridad** con helmet, CORS, rate limiting
- ✅ **Tests** con Jest y Supertest (unit e integration)
- ✅ **Docker** y Docker Compose para desarrollo
- ✅ **CI/CD** con GitHub Actions
- ✅ **Swagger/OpenAPI** para documentación de API
- ✅ **Push Notifications** con Firebase Admin
- ✅ **Email** con Nodemailer (SMTP)

## 📋 Requisitos Previos

- Node.js >= 18.0.0
- Docker y Docker Compose (recomendado)
- MongoDB (si no usas Docker)
- Redis (si no usas Docker)

## 🛠️ Instalación

### Opción 1: Docker Compose (Recomendado)

1. **Clonar el repositorio:**
```bash
git clone <repo-url>
cd VB-Lin_BackEnd
```

2. **Configurar variables de entorno:**
```bash
cp .env.example .env
# Editar .env con tus valores
```

3. **Levantar servicios:**
```bash
docker-compose up --build
```

4. **Ejecutar seeds (en otro terminal):**
```bash
docker-compose exec api npm run seed
```

La API estará disponible en `http://localhost:4000`

### Opción 2: Instalación Local

1. **Instalar dependencias:**
```bash
npm install
```

2. **Configurar variables de entorno:**
```bash
cp .env.example .env
# Editar .env con tus valores (usar localhost para MongoDB y Redis)
```

3. **Compilar TypeScript:**
```bash
npm run build
```

4. **Iniciar MongoDB y Redis localmente**

5. **Ejecutar seeds:**
```bash
npm run seed
```

6. **Iniciar servidor:**
```bash
npm run dev  # Desarrollo
npm start    # Producción
```

## 📚 Documentación de la API

Una vez que el servidor esté corriendo, accede a:

- **Swagger UI**: `http://localhost:4000/api-docs`
- **Health Check**: `http://localhost:4000/health`

## 🧪 Tests

```bash
# Ejecutar todos los tests
npm test

# Ejecutar tests en modo watch
npm run test:watch

# Ejecutar tests con cobertura
npm run test:coverage
```

### Tests Incluidos

- **Unit Tests**: `LoanService.createReservation` (éxito, conflicto, límite de días por rol)
- **Integration Tests**: 
  - `POST /api/auth/login`
  - `GET /api/equipment` (paginado y autenticado)
  - Flujo completo: `login -> reserve -> GET /api/loans/:id`

## 📡 Ejemplos de Uso (CURL)

### 1. Login

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "estudiante@uaa.mx",
    "password": "Estudiante123!"
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "...",
      "email": "estudiante@uaa.mx",
      "firstName": "María",
      "lastName": "Estudiante",
      "role": "estudiante",
      "active": true
    }
  }
}
```

### 2. Obtener Lista de Equipos (Paginado)

```bash
curl -X GET "http://localhost:4000/api/equipment?page=1&limit=10&status=disponible" \
  -H "Content-Type: application/json"
```

### 3. Obtener Equipos con Filtros

```bash
# Por nombre/descripción
curl -X GET "http://localhost:4000/api/equipment?q=laptop" \
  -H "Content-Type: application/json"

# Por categoría
curl -X GET "http://localhost:4000/api/equipment?category=Computadoras" \
  -H "Content-Type: application/json"
```

### 4. Crear Reserva (Requiere Autenticación)

```bash
# Primero, obtener token con login
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X POST http://localhost:4000/api/loans/reserve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "equipmentId": "...",
    "startDate": "2024-01-15T00:00:00.000Z",
    "endDate": "2024-01-18T00:00:00.000Z",
    "reservationRemarks": "Para proyecto de laboratorio"
  }'
```

### 5. Refrescar Token

```bash
curl -X POST http://localhost:4000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

### 6. Obtener Préstamos del Usuario

```bash
curl -X GET http://localhost:4000/api/loans/user/USER_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

## 🔐 Autenticación para Frontend Flutter

### Headers Requeridos

Para todas las peticiones autenticadas, incluir el header:

```
Authorization: Bearer <access_token>
```

### Flujo de Autenticación

1. **Login:**
   - Endpoint: `POST /api/auth/login`
   - Body: `{ "email": "...", "password": "..." }`
   - Guardar `token` y `refreshToken` en storage seguro

2. **Usar Token:**
   - Incluir `Authorization: Bearer <token>` en headers de todas las peticiones

3. **Refrescar Token:**
   - Cuando el access token expire (401), usar `POST /api/auth/refresh`
   - Body: `{ "refreshToken": "..." }`
   - Actualizar tokens en storage

4. **Logout:**
   - Endpoint: `POST /api/auth/logout`
   - Body: `{ "refreshToken": "..." }`
   - Eliminar tokens del storage

### Registro de FCM Token (Push Notifications)

```bash
curl -X POST http://localhost:4000/api/notifications/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fcmToken": "fcm_token_del_dispositivo"
  }'
```

## 📊 Endpoints Principales

### Autenticación (`/api/auth`)
- `POST /login` - Login de usuario
- `POST /refresh` - Refrescar token
- `POST /logout` - Logout
- `POST /forgot-password` - Solicitar recuperación de contraseña
- `POST /reset-password` - Resetear contraseña

### Usuarios (`/api/users`)
- `GET /` - Lista de usuarios (admin)
- `GET /:id` - Obtener usuario por ID
- `POST /register` - Registrar nuevo usuario
- `PUT /:id` - Actualizar usuario
- `DELETE /:id` - Eliminar usuario (admin)

### Equipos (`/api/equipment`)
- `GET /` - Lista de equipos (paginada, filtros opcionales)
- `GET /:id` - Obtener equipo por ID
- `POST /` - Crear equipo (admin)
- `PUT /:id` - Actualizar equipo (admin)
- `DELETE /:id` - Eliminar equipo (admin)

### Préstamos (`/api/loans`)
- `GET /` - Lista de préstamos (paginada, filtros opcionales)
- `GET /:id` - Obtener préstamo por ID
- `POST /reserve` - Crear reserva
- `PUT /:id/checkout` - Marcar checkout (admin)
- `PUT /:id/return` - Devolver préstamo
- `GET /user/:userId` - Préstamos de un usuario

### Notificaciones (`/api/notifications`)
- `GET /` - Lista de notificaciones del usuario
- `PUT /:id/read` - Marcar como leída
- `POST /register` - Registrar token FCM
- `POST /send` - Enviar notificación (admin)

### Reportes (`/api/reports`)
- `GET /usage` - Reporte de uso de equipos
- `GET /equipment-stats` - Estadísticas de equipos
- `GET /user-activity` - Actividad de usuarios
- `GET /overdue` - Préstamos vencidos

## 🔒 Reglas de Negocio

- **Estudiantes**: Reserva máxima **3 días**
- **Profesores**: Reserva máxima **7 días**
- **No solapamiento**: No se permiten reservas/activos solapados para el mismo equipo
- **Vencimiento**: Los préstamos que pasen su `endDate` se marcan como `vencido` automáticamente
- **Estados**: `reservado` → `activo` (checkout) → `devuelto` o `vencido`

## 📝 Credenciales de Prueba (Seed)

Después de ejecutar `npm run seed`, puedes usar:

- **Admin**: `admin@uaa.mx` / `AdminPass123!`
- **Profesor**: `profesor@uaa.mx` / `Profesor123!`
- **Estudiante**: `estudiante@uaa.mx` / `Estudiante123!`

## 🐳 Comandos Docker

```bash
# Levantar servicios
docker-compose up --build

# Levantar en segundo plano
docker-compose up -d

# Ver logs
docker-compose logs -f api

# Ejecutar seeds
docker-compose exec api npm run seed

# Ejecutar tests
docker-compose exec api npm test

# Detener servicios
docker-compose down

# Eliminar volúmenes
docker-compose down -v
```

## 🔧 Scripts Disponibles

```bash
npm run dev          # Desarrollo con hot-reload
npm run build        # Compilar TypeScript
npm start            # Iniciar servidor (producción)
npm run seed         # Poblar base de datos
npm test             # Ejecutar tests
npm run test:watch   # Tests en modo watch
npm run test:coverage # Tests con cobertura
npm run lint         # Ejecutar ESLint
npm run lint:fix      # Corregir errores de ESLint
npm run wait-for-db  # Esperar a que MongoDB esté disponible
```

## 📦 Estructura del Proyecto

```
.
├── src/
│   ├── config/          # Configuración
│   ├── controllers/     # Controladores
│   ├── database/        # Conexiones DB
│   ├── middlewares/     # Middlewares (auth, role, validators, etc.)
│   ├── models/          # Modelos Mongoose
│   ├── routes/          # Rutas API
│   ├── services/        # Lógica de negocio
│   ├── utils/           # Utilidades (JWT, Redis, etc.)
│   ├── app.ts           # Configuración Express
│   └── index.ts         # Punto de entrada
├── tests/
│   ├── unit/            # Tests unitarios
│   ├── integration/   # Tests de integración
│   └── setup.ts         # Configuración tests
├── scripts/
│   ├── seed.ts          # Script de seed
│   └── wait-for-db.ts    # Esperar MongoDB
├── .env.example         # Ejemplo de variables de entorno
├── docker-compose.yml   # Docker Compose
├── Dockerfile           # Dockerfile para API
└── README.md           # Este archivo
```

## 🚨 Solución de Problemas

### MongoDB no conecta
- Verificar que MongoDB esté corriendo
- Verificar `MONGO_URI` en `.env`
- En Docker: verificar logs con `docker-compose logs mongo`

### Redis no conecta
- Verificar que Redis esté corriendo
- Verificar `REDIS_HOST` y `REDIS_PORT` en `.env`
- En Docker: verificar logs con `docker-compose logs redis`

### Tests fallan
- Verificar que MongoDB y Redis estén disponibles
- Asegurar que las variables de entorno estén configuradas
- Verificar que no haya procesos usando los puertos 27017 o 6379

## 📄 Licencia

GPL-3.0

## 👥 Autor

Universidad Autónoma de Aguascalientes (UAA)

---

**Desarrollado para el proyecto "Sistema de Gestión de Préstamo de Equipos en Laboratorios" - Mayo 2025**

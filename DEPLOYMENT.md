# 🚀 Guía de Deployment - VB-Lin Backend

Esta guía te ayudará a desplegar el backend en **Render** (gratis) siguiendo la Opción 1 recomendada: **Vercel + Render**.

## 📋 Prerrequisitos

- Cuenta en GitHub (para conectar repositorios)
- Cuenta en [Render](https://render.com) (gratis)
- Cuenta en [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (gratis M0)
- Cuenta en [Upstash](https://upstash.com) para Redis (gratis)

---

## 🎯 Paso 1: Preparar el Backend para Render

### 1.1 Verificar Configuración

El proyecto ya está configurado con:
- ✅ `package.json` con scripts `build` y `start`
- ✅ `render.yaml` para configuración automática
- ✅ CORS configurado para producción
- ✅ Variables de entorno centralizadas

### 1.2 Generar JWT Secrets

Antes de desplegar, genera secrets seguros para JWT:

```bash
# Generar JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generar JWT_REFRESH_SECRET (ejecutar de nuevo)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Guarda estos valores** - los necesitarás en Render.

---

## 🎯 Paso 2: Configurar MongoDB Atlas

### 2.1 Crear Cluster

1. Ve a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Crea una cuenta (gratis)
3. Click "Build a Database"
4. Selecciona **M0 FREE** (gratis para siempre)
5. Elige la región más cercana a ti
6. Click "Create"

### 2.2 Configurar Acceso

1. **Database Access**:
   - Click "Database Access" → "Add New Database User"
   - Crea un usuario y contraseña (guárdalos)
   - Rol: "Atlas Admin" o "Read and write to any database"

2. **Network Access**:
   - Click "Network Access" → "Add IP Address"
   - Click "Allow Access from Anywhere" (`0.0.0.0/0`)
   - Esto permite conexiones desde Render

### 2.3 Obtener Connection String

1. Click "Connect" en tu cluster
2. Selecciona "Connect your application"
3. Copia la URI: `mongodb+srv://usuario:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority`
4. Reemplaza `<password>` con tu contraseña real
5. Reemplaza `<dbname>` con `VB-Lin_BackEnd` (o el nombre que prefieras)

**Ejemplo:**
```
mongodb+srv://admin:miPassword123@cluster0.xxxxx.mongodb.net/VB-Lin_BackEnd?retryWrites=true&w=majority
```

---

## 🎯 Paso 3: Configurar Redis (Upstash)

### 3.1 Crear Database

1. Ve a [Upstash](https://upstash.com) y crea una cuenta (con GitHub)
2. Click "Create Database"
3. **Name**: `vb-lin-redis` (o el que prefieras)
4. **Type**: Regional
5. **Region**: La más cercana a ti
6. Click "Create"

### 3.2 Obtener Credenciales

Upstash te dará:
- **UPSTASH_REDIS_REST_URL** (endpoint REST)
- **UPSTASH_REDIS_REST_TOKEN** (token para REST)

**Para ioredis (que usa este proyecto)**, necesitas:
- **Endpoint** (host): `xxxxx.upstash.io`
- **Port**: `6379` (o el que indique)
- **Password**: Generalmente no se requiere, pero verifica

**Nota:** Upstash también proporciona un endpoint directo. Si usas el endpoint REST, necesitarás ajustar la configuración. Para este proyecto, usa el endpoint TCP estándar.

---

## 🎯 Paso 4: Desplegar Backend en Render

### 4.1 Conectar Repositorio

1. Ve a [Render Dashboard](https://dashboard.render.com)
2. Click "New" → "Web Service"
3. Conecta tu repositorio de GitHub
4. Selecciona el repositorio `VB-Lin_BackEnd`

### 4.2 Configurar Servicio

Render detectará automáticamente el `render.yaml`, pero puedes verificar:

- **Name**: `vb-lin-backend` (o el que prefieras)
- **Environment**: Node
- **Region**: La más cercana a ti
- **Branch**: `main` (o tu rama principal)
- **Root Directory**: Dejar vacío (raíz del proyecto)
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Instance Type**: **Free**

### 4.3 Configurar Variables de Entorno

En la sección "Environment Variables", agrega:

```bash
# Servidor
NODE_ENV=production
PORT=10000  # Render asigna automáticamente, pero este valor funciona

# JWT (usa los secrets que generaste)
JWT_SECRET=<tu_jwt_secret_generado>
JWT_REFRESH_SECRET=<tu_refresh_secret_generado>
JWT_ACCESS_EXPIRES=2h
JWT_REFRESH_EXPIRES=7d

# MongoDB (usa la URI de Atlas)
MONGO_URI=mongodb+srv://usuario:password@cluster.mongodb.net/VB-Lin_BackEnd?retryWrites=true&w=majority

# Redis (Upstash)
REDIS_HOST=<endpoint_de_upstash>.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=  # Dejar vacío si no se requiere

# CORS (agregar después de desplegar el frontend)
ALLOWED_ORIGINS=https://tu-frontend.vercel.app,http://localhost:8080

# Firebase (opcional - si tienes credenciales)
FIREBASE_CREDENTIALS_PATH=./secrets/firebase.json

# SMTP (opcional)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
```

**Importante:**
- Marca como "Secret" las variables sensibles (JWT_SECRET, MONGO_URI, etc.)
- `ALLOWED_ORIGINS` lo actualizarás después de desplegar el frontend

### 4.4 Desplegar

1. Click "Create Web Service"
2. Render comenzará a construir y desplegar automáticamente
3. Espera 5-10 minutos para el primer deploy
4. Anota la URL: `https://vb-lin-backend.onrender.com` (o la que Render asigne)

### 4.5 Verificar Deployment

1. Ve a la URL de tu servicio
2. Prueba el health check: `https://tu-backend.onrender.com/health`
3. Deberías ver: `{"success":true,"message":"API funcionando correctamente",...}`

---

## 🎯 Paso 5: Configurar CORS para Frontend

Una vez que tengas la URL del frontend en Vercel:

1. Ve a tu servicio en Render
2. Click "Environment"
3. Actualiza `ALLOWED_ORIGINS`:
   ```
   https://tu-frontend.vercel.app,http://localhost:8080
   ```
4. Render reiniciará automáticamente el servicio

---

## 🔧 Configuración Adicional

### Firebase Credentials

Si necesitas usar Firebase para notificaciones push:

1. Sube el archivo `firebase.json` a Render usando:
   - **Render Disk** (persistente)
   - O convierte el JSON a variable de entorno (más seguro)

2. Para usar variable de entorno:
   - Copia el contenido de `firebase.json`
   - Crea variable `FIREBASE_SERVICE_ACCOUNT_JSON` con el contenido
   - Modifica el código para leer desde variable de entorno

### SMTP (Opcional)

Si quieres enviar emails reales, configura:
- `SMTP_HOST`: smtp.gmail.com (para Gmail)
- `SMTP_PORT`: 465 (SSL) o 587 (TLS)
- `SMTP_USER`: tu email
- `SMTP_PASS`: contraseña de aplicación

---

## ⚠️ Problemas Comunes

### Backend se "duerme" después de 15 minutos

**Problema:** Los servicios gratuitos de Render se suspenden después de 15 min de inactividad. La primera petición puede tardar 30-50 segundos.

**Soluciones:**
1. Usar [UptimeRobot](https://uptimerobot.com) (gratis) para hacer ping cada 5 minutos
2. Actualizar a plan pago ($7/mes) para evitar suspensiones

### Error de CORS

**Problema:** El frontend no puede hacer requests al backend.

**Solución:**
1. Verifica que `ALLOWED_ORIGINS` incluya la URL exacta del frontend (con `https://`)
2. Verifica que no haya espacios en `ALLOWED_ORIGINS`
3. Reinicia el servicio en Render después de cambiar variables

### MongoDB no conecta

**Problema:** Error de conexión a MongoDB Atlas.

**Soluciones:**
1. Verifica que la IP whitelist incluya `0.0.0.0/0`
2. Verifica que el connection string tenga la contraseña correcta
3. Verifica que el usuario tenga permisos adecuados

### Redis no conecta

**Problema:** Error de conexión a Redis.

**Soluciones:**
1. Verifica el endpoint de Upstash (debe ser el endpoint TCP, no REST)
2. Verifica el puerto (generalmente 6379)
3. Si Upstash requiere TLS, puede que necesites ajustar la configuración de ioredis

### Build falla en Render

**Problema:** El build no completa.

**Soluciones:**
1. Verifica los logs en Render Dashboard
2. Asegúrate de que `tsconfig.build.json` esté correcto
3. Verifica que todas las dependencias estén en `package.json`
4. Prueba el build localmente: `npm run build`

---

## 📝 Checklist de Deployment

### Backend
- [ ] Backend desplegado en Render
- [ ] MongoDB Atlas configurado y conectado
- [ ] Redis (Upstash) configurado y conectado
- [ ] Variables de entorno configuradas
- [ ] JWT secrets generados y configurados
- [ ] Health check responde correctamente
- [ ] CORS configurado (después de desplegar frontend)

### Pruebas
- [ ] Login funciona: `POST /api/auth/login`
- [ ] Lista de equipos carga: `GET /api/equipment`
- [ ] Crear reserva funciona: `POST /api/loans/reserve`
- [ ] Swagger UI accesible: `/api-docs`

---

## 🔗 URLs Útiles

- **Render Dashboard**: https://dashboard.render.com
- **MongoDB Atlas**: https://cloud.mongodb.com
- **Upstash**: https://console.upstash.com
- **UptimeRobot** (para mantener activo): https://uptimerobot.com

---

## 📚 Recursos

- [Render Documentation](https://render.com/docs)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com)
- [Upstash Redis Documentation](https://docs.upstash.com/redis)

---

## 💡 Tips

1. **Monitoreo**: Usa los logs de Render para debuggear problemas
2. **Backups**: MongoDB Atlas M0 incluye backups automáticos
3. **Escalabilidad**: Si necesitas más recursos, Render ofrece planes desde $7/mes
4. **Dominio personalizado**: Puedes agregar un dominio personalizado en Render (gratis)

---

**¡Listo!** Tu backend debería estar funcionando en producción. 🎉


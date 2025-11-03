# Dockerfile para desarrollo (hot-reload con tsx) y producción
FROM node:18-alpine

WORKDIR /usr/src/app

# Copiar archivos de dependencias primero (para cache de Docker)
COPY package*.json ./
COPY tsconfig.json ./

# Instalar dependencias (incluye devDependencies para tsx en dev)
RUN npm ci

# Copiar código fuente
COPY . .

# Compilar TypeScript
RUN npm run build

# Crear directorio para secretos
RUN mkdir -p /secrets

# Exponer puerto
EXPOSE 4000

# Comando por defecto (producción)
# En desarrollo, docker-compose.yml sobrescribe con: npm run dev
CMD ["node", "dist/index.js"]


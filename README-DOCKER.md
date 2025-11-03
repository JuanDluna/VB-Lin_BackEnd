# Instrucciones de Ejecución con Docker Compose

## Opción 1: Ejecutar solo servicios (MongoDB + Redis) y API localmente

1. Asegúrate de que tu `.env` tenga:
   ```
   REDIS_HOST=localhost
   MONGO_URI=mongodb://localhost:27017/VB-Lin_BackEnd
   ```

2. Levanta solo los servicios:
   ```bash
   docker-compose up mongo redis -d
   ```

3. Ejecuta la API localmente:
   ```bash
   npm start
   ```

## Opción 2: Ejecutar todo con Docker Compose

1. Asegúrate de que tu `.env` tenga:
   ```
   REDIS_HOST=redis
   MONGO_URI=mongodb://mongo:27017/VB-Lin_BackEnd
   ```

2. Levanta todo (API + MongoDB + Redis):
   ```bash
   docker-compose up --build
   ```

   O en segundo plano:
   ```bash
   docker-compose up --build -d
   ```

## Verificar servicios

- MongoDB: `docker ps | findstr mongo` (o verifica que responda en `mongodb://localhost:27017`)
- Redis: `docker ps | findstr redis` (o verifica que responda en `localhost:6379`)

## Detener servicios

```bash
docker-compose down
```


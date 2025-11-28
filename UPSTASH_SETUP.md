# ✅ Configuración de Upstash Redis - COMPLETADA

## 🔄 Cambios Realizados

1. **Migrado de `ioredis` a `redis`** (paquete oficial)
2. **Configuración para Upstash**: Usa `REDIS_URL` + `REDIS_TOKEN`
3. **Todos los métodos actualizados** para usar el nuevo cliente

---

## 🔧 Variables de Entorno en Render

Ve a **Render Dashboard** → tu servicio → **Environment Variables**

Configura estas variables:

```
REDIS_URL = redis://xxxxx.upstash.io:6379
REDIS_TOKEN = tu_token_de_upstash_aqui
```

**⚠️ IMPORTANTE:**
- `REDIS_URL`: URL completa de Upstash (formato: `redis://host:port`)
- `REDIS_TOKEN`: Token/Password de Upstash (NO uses `REDIS_PASSWORD`)
- **NO** uses `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (ya no se usan)

---

## 📋 Cómo Obtener las Credenciales de Upstash

1. Ve a [Upstash Console](https://console.upstash.com)
2. Selecciona tu base de datos Redis
3. Ve a la pestaña **"Details"** o **"REST API"**
4. Busca:
   - **Endpoint**: `xxxxx.upstash.io:6379`
   - **Password/Token**: El token largo que proporciona Upstash

5. Construye la URL:
   ```
   REDIS_URL = redis://xxxxx.upstash.io:6379
   ```

---

## 🧪 Verificación

Después de configurar las variables en Render:

1. **Reinicia el servicio** en Render (o espera a que se redesplegue)
2. **Revisa los logs** - deberías ver:
   ```
   🔗 Redis conectando...
   ✅ Redis conectado y listo (Upstash)
   ```

3. **Si ves errores NOAUTH**:
   - Verifica que `REDIS_TOKEN` tenga el valor correcto (sin espacios)
   - Verifica que `REDIS_URL` tenga el formato correcto
   - Reinicia el servicio después de cambiar variables

---

## 🐛 Debugging

Si necesitas verificar las variables en Render, agrega temporalmente en `src/config/index.ts`:

```typescript
console.log('REDIS_URL:', config.redisUrl);
console.log('REDIS_TOKEN exists:', !!config.redisToken);
```

**NO** hagas commit de esto, solo para debugging.

---

## ✅ Checklist

- [ ] Variables `REDIS_URL` y `REDIS_TOKEN` configuradas en Render
- [ ] `REDIS_URL` tiene formato: `redis://host:port`
- [ ] `REDIS_TOKEN` tiene el token completo de Upstash (sin espacios)
- [ ] Servicio reiniciado después de configurar variables
- [ ] Logs muestran "✅ Redis conectado y listo (Upstash)"
- [ ] No hay errores "NOAUTH" en los logs

---

## 🚀 Próximos Pasos

1. Configura las variables en Render
2. Reinicia el servicio
3. Verifica los logs
4. Prueba hacer login desde el frontend

Si todo está bien, deberías poder hacer login sin errores de Redis.


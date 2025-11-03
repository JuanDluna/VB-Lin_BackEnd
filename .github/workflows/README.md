# 🔄 GitHub Actions Workflows

Este directorio contiene todos los workflows de CI/CD para el proyecto VB-Lin_BackEnd.

## 📋 Workflows Disponibles

### 🔍 Calidad de Código

1. **`01-lint.yml`** - 🔍 Lint & Code Quality
   - Ejecuta ESLint
   - Verifica compilación TypeScript
   - Se ejecuta en push/PR a `main` o `develop`

2. **`08-type-check.yml`** - 🔍 TypeScript Type Checking
   - Verificación estricta de tipos TypeScript
   - Sin compilación, solo verificación
   - Detecta errores de tipos antes del build

3. **`09-code-complexity.yml`** - 📊 Code Complexity Analysis
   - Analiza complejidad del código
   - Detecta archivos grandes (>500 líneas)
   - Genera reportes de complejidad

### 🧪 Testing

4. **`02-unit-tests.yml`** - 🧪 Unit Tests
   - Ejecuta tests unitarios
   - Genera reporte de cobertura
   - Upload de artifacts con cobertura

5. **`03-integration-tests.yml`** - 🔗 Integration Tests
   - Ejecuta tests de integración
   - Requiere MongoDB y Redis (services)
   - Genera reporte de cobertura

6. **`07-test-coverage.yml`** - 📊 Test Coverage Report
   - Ejecuta todos los tests con cobertura completa
   - Genera reportes detallados
   - Upload de artifacts de cobertura

### 🏗️ Build & Verification

7. **`04-build.yml`** - 🏗️ Build Verification
   - Verifica que el proyecto compile correctamente
   - Valida estructura de build

### 🔒 Seguridad

8. **`05-security.yml`** - 🔒 Security Audit
   - Auditoría de seguridad de dependencias
   - Ejecuta `npm audit`
   - Programa semanal (lunes a medianoche)
   - Genera reporte JSON de vulnerabilidades

9. **`10-dependency-check.yml`** - 📦 Dependency & Update Check
   - Verifica dependencias desactualizadas
   - Revisa licencias de dependencias
   - Programa semanal

### 🔄 CI Completo

10. **`06-full-ci.yml`** - ✅ Full CI Pipeline
    - Pipeline completo que ejecuta:
      - Lint
      - Unit Tests
      - Integration Tests
      - Build en múltiples versiones de Node
      - Security Audit
    - Genera resumen final

11. **`12-multi-node-test.yml`** - 🔄 Multi-Node Version Testing
    - Prueba el proyecto en Node.js 18 y 20
    - Verifica compatibilidad entre versiones
    - Solo en `main` branch

### 🎯 PR Quality

12. **`11-pr-quality.yml`** - 🎯 PR Quality Checks
    - Verificaciones específicas para Pull Requests:
      - Busca `console.log` statements
      - Detecta TODO/FIXME
      - Verifica build
      - Verifica lint y types

13. **`ci.yml`** - ⚡ CI Rápido (Legacy)
    - Workflow básico y tolerante
    - Mantiene compatibilidad

## 🚀 Ejecución

### Trigger Automático

- **Push a `main` o `develop`**: Ejecuta workflows principales
- **Pull Request**: Ejecuta workflows de verificación
- **Cron Schedule**: Algunos workflows se ejecutan programados

### Trigger Manual

Todos los workflows soportan `workflow_dispatch` para ejecución manual desde la UI de GitHub Actions.

## 📊 Reportes y Artifacts

Los workflows generan artifacts con:

- **Cobertura de tests**: `coverage/` (reportes HTML, LCOV, JSON)
- **Reportes de seguridad**: `audit-report.json`
- **Reportes de complejidad**: `complexity-report.json`
- **Dependencias**: `outdated-packages.json`, `dependencies.json`

Los artifacts se mantienen por:
- **7 días**: Reportes de tests y complejidad
- **30 días**: Reportes de seguridad y dependencias

## 🔧 Configuración

### Variables de Entorno para Tests

Los workflows configuran automáticamente:
```env
NODE_ENV=test
JWT_SECRET=test_jwt_secret
MONGO_URI=mongodb://localhost:27017/VB-Lin_BackEnd_test
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Services (MongoDB y Redis)

Los workflows que requieren servicios usan:
- **MongoDB**: `mongo:6` en puerto `27017`
- **Redis**: `redis:6-alpine` en puerto `6379`

## 📈 Mejores Prácticas

1. **Separación de Concerns**: Cada workflow tiene un propósito específico
2. **Paralelización**: Tests unitarios e integración se ejecutan en paralelo
3. **Artifacts**: Reportes se guardan para análisis posterior
4. **Fail Fast**: Algunos workflows fallan rápido, otros son tolerantes
5. **Cache**: Uso de cache de npm para acelerar builds
6. **Multi-versión**: Pruebas en múltiples versiones de Node.js

## 🛠️ Mantenimiento

### Agregar Nuevo Workflow

1. Crear archivo en `.github/workflows/` con nombre descriptivo
2. Usar formato numerado para orden: `XX-description.yml`
3. Incluir documentación en este README
4. Agregar emojis descriptivos en el nombre

### Modificar Workflow Existente

1. Mantener compatibilidad hacia atrás cuando sea posible
2. Actualizar este README si cambia funcionalidad
3. Probar en branch separado antes de mergear

## 📝 Notas

- Los workflows están optimizados para ejecutarse en paralelo cuando es posible
- Los servicios (MongoDB, Redis) se inician automáticamente
- Los reportes de cobertura se generan en múltiples formatos (text, lcov, html)
- Los workflows son tolerantes a fallos menores (warnings) pero fallan en errores críticos

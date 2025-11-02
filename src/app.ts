import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './config';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';
import { apiLimiter } from './middlewares/rateLimiter';
import { LoanService } from './services/LoanService';

/**
 * Configuración de Swagger/OpenAPI
 */
const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Sistema de Gestión de Préstamo de Equipos - API',
      version: '1.0.0',
      description: 'API RESTful para el sistema de gestión de préstamo de equipos en laboratorios (UAA)',
      contact: {
        name: 'UAA',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Servidor de desarrollo',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Crea y configura la aplicación Express
 */
export const createApp = (): Application => {
  const app = express();

  // Middlewares de seguridad
  app.use(helmet());
  app.use(
    cors({
      origin: config.allowedOrigins,
      credentials: true,
    })
  );

  // Body parser
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Logging (solo en desarrollo)
  if (config.nodeEnv === 'development') {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  // Rate limiting general
  app.use(apiLimiter);

  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      message: 'API funcionando correctamente',
      timestamp: new Date().toISOString(),
    });
  });

  // Rutas de la API
  app.use('/api', routes);

  // Ruta 404
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'Ruta no encontrada',
    });
  });

  // Manejo centralizado de errores
  app.use(errorHandler);

  return app;
};

/**
 * Inicia el cron job para verificar préstamos vencidos
 */
export const startCronJobs = (): void => {
  // Verificar préstamos vencidos cada hora
  setInterval(async () => {
    try {
      await LoanService.checkOverdueLoans();
    } catch (error) {
      console.error('Error en cron job de préstamos vencidos:', error);
    }
  }, 60 * 60 * 1000); // Cada hora

  console.log('✅ Cron jobs iniciados');
};


import swaggerJsdoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'CoreHR API',
    version: '1.0.0',
    description: 'Employee management and compliance API for CoreHR.',
  },
  servers: [{ url: 'http://localhost:4000/api/v1', description: 'Local API server' }],
};

export const swaggerSpec = swaggerJsdoc({
  definition: swaggerDefinition,
  apis: ['./src/routes/*.ts'],
});

const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');
const env = require('../config/env');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TaskFlow API',
      version: '3.0.0',
      description:
        'Production-grade REST API for TaskFlow — boards, tasks, workspaces, analytics, and notifications.',
    },
    servers: [{ url: '/api', description: `Current server (${env.NODE_ENV})` }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: [path.join(__dirname, '../routes/*.js')],
};

module.exports = swaggerJsdoc(options);

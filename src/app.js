const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');

const env = require('./config/env');
const logger = require('./config/logger');
const swaggerSpec = require('./docs/swagger');
const routes = require('./routes');
const { globalLimiter } = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

/**
 * WHY (old → new): the old server.js had `cors({ origin: process.env.CLIENT_URL
 * || '*' })` — falling back to '*' is a wide-open CORS policy, and it can't
 * be combined with credentials (cookies) at all per the CORS spec. This
 * builds an explicit origin whitelist from env and reflects only origins on
 * that list, with credentials enabled for the refresh-token cookie.
 */
const whitelist = [env.CLIENT_URL, ...(env.ORIGIN_WHITELIST ? env.ORIGIN_WHITELIST.split(',').map((o) => o.trim()) : [])];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || whitelist.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser(env.COOKIE_SECRET));

app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

app.use(morgan('combined', { stream: logger.stream }));

app.use(globalLimiter);

if (env.NODE_ENV !== 'test') {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;

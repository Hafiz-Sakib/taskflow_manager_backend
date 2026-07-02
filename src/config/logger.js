const winston = require('winston');
const path = require('path');
const env = require('./env');

/**
 * WHY: console.log/console.error give no severity levels, no timestamps,
 * and no way to route errors to a file separately from routine request
 * logs. Winston gives structured, leveled logs that are actually useful
 * in production (grep-able files, easy to ship to a log aggregator later).
 */
const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const consoleFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack }) => `${ts} [${level}]: ${stack || message}`)
);

const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: combine(timestamp(), errors({ stack: true }), json()),
  defaultMeta: { service: 'taskflow-api' },
  transports: [
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
    }),
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/combined.log'),
    }),
  ],
  exitOnError: false,
});

if (env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({ format: consoleFormat }));
}

// Stream adapter so morgan can pipe HTTP access logs through Winston
logger.stream = {
  write: (message) => logger.http(message.trim()),
};

module.exports = logger;

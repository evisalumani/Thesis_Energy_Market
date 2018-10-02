/**
 * Logger
 */
const winston = require('winston');

module.exports.logger = winston.createLogger({
    // All levels are logged (error, warn, info, verbose, debug, silly)
	level: 'silly',
    format: winston.format.combine(
      // Color logs
      winston.format.colorize({ all: true }),
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.printf(info => `[QUEUE] [${info.timestamp}] ${info.level}: ${info.message}`)
    ),
    transports: [
      new winston.transports.Console({ 
        handleExceptions: true
      })
    ]
  });
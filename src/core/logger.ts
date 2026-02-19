import winston from 'winston';

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    defaultMeta: { service: 'rafford' },
    transports: [
        new winston.transports.Console({
            format: winston.format.simple(),
        }),
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
    ],
});

if (process.env.NODE_ENV === 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
        ),
    }));
} else {
    logger.add(new winston.transports.Console({
        format: winston.format.simple(),
    }));
}

export default logger;

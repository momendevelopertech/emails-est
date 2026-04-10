import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser = require('cookie-parser');
import helmet from 'helmet';
import csurf = require('csurf');
import { HttpExceptionFilter } from './shared/http-exception.filter';
import { PrismaService } from './prisma/prisma.service';
import { seedMessagingData } from '../prisma/seed';
import { getAllowedOrigins, getCookieSettings } from './shared/cookie-settings';
import { assertSecurityEnv } from './shared/env-check';

const formatDebugCookies = (cookies?: Record<string, unknown>) => {
    const entries = Object.entries(cookies || {});
    return entries.reduce<Record<string, string>>((acc, [key, value]) => {
        if (value === undefined || value === null || value === '') {
            acc[key] = '[missing]';
            return acc;
        }

        if (key === 'access_token' || key === 'refresh_token' || key === 'csrf_secret') {
            acc[key] = '[present]';
            return acc;
        }

        acc[key] = String(value);
        return acc;
    }, {});
};

async function seedMessagingOnStartup(app: NestExpressApplication) {
    if (process.env.NODE_ENV === 'production' || process.env.SEED_MESSAGING_ON_STARTUP === '0') {
        return;
    }

    const prisma = app.get(PrismaService);
    try {
        const count = await prisma.recipient.count();
        if (count === 0) {
            console.log('Seeding messaging dataset on startup...');
            await seedMessagingData(prisma);
            console.log('Messaging dataset seeded.');
        }
    } catch (error) {
        console.warn('Messaging seed skipped:', error?.message || error);
    }
}

export async function configureApp(app: NestExpressApplication) {
    const isProd = process.env.NODE_ENV === 'production';
    assertSecurityEnv(isProd);
    app.disable('x-powered-by');
    app.getHttpAdapter().getInstance().set('trust proxy', 1);

    app.use(helmet());
    app.use(cookieParser(process.env.CSRF_SECRET || 'sphinx-csrf'));

    const allowedOrigins = getAllowedOrigins();
    const { sameSite, secure, domain, path } = getCookieSettings();
    const authDebugCookies = process.env.AUTH_DEBUG_COOKIES === '1';

    // Enable CORS BEFORE CSRF middleware so OPTIONS preflight requests pass through
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
                return;
            }

            callback(new Error(`Origin ${origin} is not allowed by CORS`));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-CSRF-Token',
            'X-No-Cache',
            'X-Allow-Cache',
            'X-Skip-Activity',
        ],
        optionsSuccessStatus: 204,
    });

    if (authDebugCookies) {
        app.use((req, _res, next) => {
            if (req.path?.startsWith('/api/auth/')) {
                console.log('[auth] Cookies:', {
                    path: req.path,
                    origin: req.headers.origin,
                    host: req.headers.host,
                    forwardedHost: req.headers['x-forwarded-host'],
                    forwardedProto: req.headers['x-forwarded-proto'],
                    cookies: formatDebugCookies(req.cookies),
                });
            }
            next();
        });
    }

    const csrfProtection = csurf({
        cookie: {
            key: 'csrf_secret',
            httpOnly: true,
            secure,
            sameSite,
            path,
            ...(domain ? { domain } : {}),
        },
    });

    app.use((req, res, next) => {
        const method = (req.method || '').toUpperCase();
        const requestPath = req.path || '';
        const shouldSkipCsrf =
            ((method === 'POST' &&
            (requestPath === '/api/auth/refresh' || requestPath === '/api/auth/logout')) ||
            (method === 'GET' && requestPath === '/api/auth/csrf'));

        if (shouldSkipCsrf) {
            return next();
        }

        return csrfProtection(req, res, next);
    });

    app.use((err, req, res, next) => {
        if (err && err.code === 'EBADCSRFTOKEN') {
            return res.status(403).json({ message: 'Invalid CSRF token' });
        }
        return next(err);
    });

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            forbidNonWhitelisted: true,
            stopAtFirstError: true,
        }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());

    app.setGlobalPrefix('api', {
        exclude: [
            { path: '', method: RequestMethod.GET },
            { path: 'api', method: RequestMethod.GET },
        ],
    });

    await seedMessagingOnStartup(app);
}

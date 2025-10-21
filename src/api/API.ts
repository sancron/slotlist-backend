import Boom from '@hapi/boom';
import Hapi, { Lifecycle, Request, ResponseObject, ResponseToolkit, Server } from '@hapi/hapi';
import HapiAuthJWT from 'hapi-auth-jwt2';
import Inert from '@hapi/inert';
import Vision from '@hapi/vision';
import HapiSwagger from 'hapi-swagger';
import _ from 'lodash';
import moment from 'moment';
import pjson from 'pjson';

import { HTTP as HTTPConfig, JWT as JWTConfig } from '../shared/config/Config';
import { findPermission, parsePermissions } from '../shared/util/acl';
import log from '../shared/util/log';

import { jwtPayloadSchema } from '../shared/schemas/auth';

import { routes } from './routes/routes';

export class API {
    private server: Server;

    private startedAt?: moment.Moment;

    private requestLogger = log.child({ hapi: true });

    constructor() {
        this.server = Hapi.server({
            port: HTTPConfig.port,
            host: HTTPConfig.address || HTTPConfig.host,
            routes: {
                cors: true,
                security: {
                    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
                    noOpen: true,
                    noSniff: true,
                    xframe: true,
                    xss: 'enabled'
                }
            }
        });
    }

    public async start(): Promise<void> {
        log.info({ HTTPConfig, JWTConfig: _.omit(JWTConfig, 'secret') }, 'Starting API server');

        await this.server.register([Inert, Vision]);

        await this.server.register(HapiAuthJWT);

        this.server.auth.strategy('jwt', 'jwt', {
            key: JWTConfig.secret,
            verifyOptions: {
                algorithms: JWTConfig.algorithms,
                audience: JWTConfig.audience,
                issuer: JWTConfig.issuer,
                ignoreExpiration: false
            },
            validate: this.validateJWT.bind(this)
        });

        this.server.auth.default('jwt');

        this.server.ext('onPostAuth', this.checkACL.bind(this));
        this.server.ext('onRequest', this.parseRealIP.bind(this));
        this.server.ext('onPreResponse', this.setAdditionalHeaders.bind(this));

        this.server.route(routes);

        await this.server.register({
            plugin: HapiSwagger,
            options: {
                info: {
                    title: 'slotlist.insidearma.de API Documentation',
                    version: pjson.version,
                    contact: {
                        name: 'Nick \'MorpheusXAUT\' Mueller',
                        email: 'nick@slotlist.info'
                    },
                    termsOfService: 'https://slotlist.insidearma.de/#/about',
                    license: {
                        name: 'MIT',
                        url: 'https://github.com/MorpheusXAUT/slotlist-backend/blob/master/LICENSE'
                    }
                },
                schemes: [HTTPConfig.publicScheme],
                host: `${HTTPConfig.publicHost}`,
                pathPrefixSize: 2
            }
        });

        this.server.events.on('response', (request: Request) => {
            const response = request.response as ResponseObject | Boom.Boom;
            const tags = request.route.settings.tags ?? [];
            const logLevel: 'trace' | 'debug' = tags.includes('trace') ? 'trace' : 'debug';
            const statusCode = (response as ResponseObject)?.statusCode ?? (response as Boom.Boom)?.output?.statusCode;
            const message = `${request.method.toUpperCase()} ${request.path} -> ${statusCode ?? 'unknown'}`;
            const logger = this.requestLogger as any;
            if (typeof logger[logLevel] === 'function') {
                logger[logLevel]({ req: request, res: response }, message);
            } else {
                this.requestLogger.debug({ req: request, res: response }, message);
            }
        });

        await this.server.start();

        this.startedAt = moment.utc();

        log.info({ startedAt: this.startedAt }, 'Successfully started API server');
    }

    public async stop(): Promise<void> {
        log.info('Stopping API server');
        log.debug('Stopping HTTP server');
        await this.server.stop();

        const stoppedAt = moment.utc();
        const uptime = this.startedAt ? stoppedAt.diff(this.startedAt) : 0;

        log.info({ startedAt: this.startedAt, stoppedAt, uptime }, 'Successfully stopped API server');
    }

    private async validateJWT(decodedJWT: unknown, request: Request, h: ResponseToolkit): Promise<HapiAuthJWT.ValidationResult> {
        log.debug({ function: 'validateJWT', req: request, decodedJWT }, 'Validating JWT');

        const jwtValidationResult = jwtPayloadSchema.validate(decodedJWT);
        if (!_.isNil(jwtValidationResult.error)) {
            log.warn({ function: 'validateJWT', req: request, decodedJWT, err: jwtValidationResult.error }, 'Received invalid JWT payload');

            return { isValid: false, errorMessage: 'Invalid JWT payload' };
        }

        return { isValid: true };
    }

    private async checkACL(request: Request, h: ResponseToolkit): Promise<Lifecycle.ReturnValue> {
        const routePlugins: any = request.route.settings.plugins;
        if (routePlugins?.acl?.permissions) {
            const aclConfig = routePlugins.acl;
            const permissions = Array.isArray(aclConfig.permissions) ? aclConfig.permissions : [aclConfig.permissions];
            const strict = aclConfig.strict === true;
            const credentials = request.auth.credentials as any;

            log.debug({ function: 'checkACL', req: request, aclConfig, permissions, strict, credentials }, 'Checking ACL for restricted route');

            if (permissions.length <= 0) {
                log.debug({ function: 'checkACL', permissions, strict, credentials }, 'Required permissions are empty, allowing');

                return h.continue;
            }

            if (!request.auth.isAuthenticated) {
                log.debug({ function: 'checkACL', req: request, aclConfig, permissions, strict, credentials }, 'User is not authenticated, rejecting');

                throw Boom.unauthorized();
            }

            const parsedPermissions = parsePermissions(credentials.permissions);
            if (_.has(parsedPermissions, '*') || findPermission(parsedPermissions, 'admin.superadmin')) {
                log.debug(
                    { function: 'checkACL', permissions, strict, credentials, userUid: credentials.user.uid, hasPermission: true },
                    'User has super admin permissions, allowing');

                return h.continue;
            }

            const requiredPermissions = permissions.map((permission: string) => {
                return Object.keys(request.params).reduce((perm: string, key: string) => {
                    const value = (request.params as Record<string, string>)[key];
                    return perm.replace(`{{${key}}}`, value);
                }, permission);
            });
            const foundPermissions = requiredPermissions.filter((requiredPermission: string) => findPermission(parsedPermissions, requiredPermission));

            const hasPermission = strict ? foundPermissions.length === requiredPermissions.length : foundPermissions.length > 0;

            log.debug(
                { function: 'checkACL', requiredPermissions, strict, credentials, userUid: credentials.user.uid, hasPermission },
                'Successfully finished checking ACL for restricted route');

            if (!hasPermission) {
                log.info(
                    { function: 'checkACL', req: request, requiredPermissions, strict, credentials, userUid: credentials.user.uid, hasPermission },
                    'User tried to access restricted route without proper permission');

                throw Boom.forbidden();
            }
        }

        return h.continue;
    }

    private parseRealIP(request: Request, h: ResponseToolkit): Lifecycle.ReturnValue { // eslint-disable-line @typescript-eslint/require-await
        const forwardedIp = request.headers['cf-connecting-ip'] || request.headers['x-forwarded-for'];
        if (typeof forwardedIp === 'string' && forwardedIp.trim().length > 0) {
            const ip = forwardedIp.includes(',') ? forwardedIp.split(',')[0].trim() : forwardedIp.trim();
            (request.info as any).remoteAddress = ip;
        }

        const forwardedPort = request.headers['x-forwarded-port'];
        if (typeof forwardedPort === 'string' && forwardedPort.trim().length > 0) {
            (request.info as any).remotePort = forwardedPort.trim();
        }

        return h.continue;
    }

    private setAdditionalHeaders(request: Request, h: ResponseToolkit): Lifecycle.ReturnValue {
        const response = request.response as ResponseObject | Boom.Boom | null;
        if (response && (response as Boom.Boom).isBoom && (response as Boom.Boom).output) {
            (response as Boom.Boom).output.headers['Referrer-Policy'] = 'no-referrer-when-downgrade';
            (response as Boom.Boom).output.headers['Public-Key-Pins'] = 'pin-sha256="3kcNJzkUJ1RqMXJzFX4Zxux5WfETK+uL6Viq9lJNn4o="; pin-sha256="CfyancXuwYEHYRX3mmLJI3NFW6E8cydaCGS1D9wGhT4="; pin-sha256="58qRu/uxh4gFezqAcERupSkRYBlBAvfcw7mEjGPLnNU="; pin-sha256="grX4Ta9HpZx6tSHkmCrvpApTQGo67CYDnvprLg5yRME="; pin-sha256="YLh1dUR9y6Kja30RrAn7JKnbQG/uEtLMkBgFF2Fuihg="; pin-sha256="sRHdihwgkaib1P1gxX8HFszlD+7/gTfNvuAybgLPNis="; pin-sha256="cZmxAdzqR6QocykhA1KF2BUd4fSAAJBEL9pjp+XA5KY="; pin-sha256="RMmFr2hUG/lUONYDT+SrgzlBlraKipm/DJufF9m/l9U="; pin-sha256="O84tZY/nc8vz0MfbCS8bInyGHhh8jB6WP3reOtSVCm0="; pin-sha256="Ls+kEewW0AVmx+oHvP2VhHkV5mNX4AyBOnbXbY1l32w="; max-age=2592000; includeSubdomains; report-uri="https://morpheusxaut.report-uri.io/r/default/hpkp/enforce";';
        } else if (response && (response as ResponseObject).header) {
            (response as ResponseObject).header('Referrer-Policy', 'no-referrer-when-downgrade');
            (response as ResponseObject).header('Public-Key-Pins', 'pin-sha256="3kcNJzkUJ1RqMXJzFX4Zxux5WfETK+uL6Viq9lJNn4o="; pin-sha256="CfyancXuwYEHYRX3mmLJI3NFW6E8cydaCGS1D9wGhT4="; pin-sha256="58qRu/uxh4gFezqAcERupSkRYBlBAvfcw7mEjGPLnNU="; pin-sha256="grX4Ta9HpZx6tSHkmCrvpApTQGo67CYDnvprLg5yRME="; pin-sha256="YLh1dUR9y6Kja30RrAn7JKnbQG/uEtLMkBgFF2Fuihg="; pin-sha256="sRHdihwgkaib1P1gxX8HFszlD+7/gTfNvuAybgLPNis="; pin-sha256="cZmxAdzqR6QocykhA1KF2BUd4fSAAJBEL9pjp+XA5KY="; pin-sha256="RMmFr2hUG/lUONYDT+SrgzlBlraKipm/DJufF9m/l9U="; pin-sha256="O84tZY/nc8vz0MfbCS8bInyGHhh8jB6WP3reOtSVCm0="; pin-sha256="Ls+kEewW0AVmx+oHvP2VhHkV5mNX4AyBOnbXbY1l32w="; max-age=2592000; includeSubdomains; report-uri="https://morpheusxaut.report-uri.io/r/default/hpkp/enforce";');
        }

        return h.continue;
    }
}

export default API;

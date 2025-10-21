import bunyan from 'bunyan';
import { LoggingBunyan } from '@google-cloud/logging-bunyan';
import _ from 'lodash';
import pjson from 'pjson';

import { Logging as LoggingConfig } from '../config/Config';

/**
 * Creates a bunyan logger to be used throughout the app
 */

const serializers: bunyan.Serializers = {
    err: bunyan.stdSerializers.err,
    req: (req: any) => {
        if (!req || !req.info) {
            return req;
        }

        const auth = _.cloneDeep(req.auth);
        const headers = _.cloneDeep(req.headers);
        if (_.isString(auth.token)) {
            auth.token = '***REDACTED***';
        }
        if (_.isString(auth.artifacts)) {
            auth.artifacts = undefined;
            delete auth.artifacts;
        }
        if (_.isString(headers.authorization)) {
            headers.authorization = '***REDACTED***';
        }

        return {
            auth: auth,
            headers: headers,
            id: req.id,
            info: req.info,
            method: req.method,
            mime: req.mime,
            params: req.params,
            path: req.path,
            query: req.query,
            state: req.state,
            url: req.url
        };
    },
    res: bunyan.stdSerializers.res,
    payload: (payload: any) => {
        if (_.isNil(payload)) {
            return payload;
        }

        const pay = _.cloneDeep(payload);
        if (_.isString(pay.token)) {
            pay.token = '***REDACTED***';
        }
        if (_.isString(pay.detailedDescription)) {
            pay.detailedDescription = '***SNIP***';
        }
        if (_.isString(pay.collapsedDescription)) {
            pay.collapsedDescription = '***SNIP***';
        }
        if (!_.isNil(pay.image)) {
            pay.image = '***SNIP***';
        }

        return pay;
    },
    headers: (headers: any) => {
        const head = _.cloneDeep(headers);
        if (_.isString(head.authorization)) {
            head.authorization = '***REDACTED***';
        }

        return head;
    },
    credentials: (credentials: any) => {
        if (_.isNil(credentials)) {
            return credentials;
        }

        const cred = _.cloneDeep(credentials);
        if (_.isString(cred.token)) {
            cred.token = '***REDACTED***';
        }

        return cred;
    }
};

const streams: bunyan.Stream[] = [];
if (LoggingConfig.stdout) {
    streams.push({
        level: LoggingConfig.stdout as any,
        stream: process.stdout
    });
}

_.each(LoggingConfig.files, (logFile: { path: string; level: string | number }) => {
    streams.push({
        level: logFile.level as any,
        path: logFile.path
    });
});

if (LoggingConfig.stackdriver) {
    const loggingBunyan = new LoggingBunyan();
    streams.push(loggingBunyan.stream('info'));
}

export const log = bunyan.createLogger({
    name: 'slotlist-backend',
    serializers,
    level: LoggingConfig.stdout as any,
    src: LoggingConfig.src,
    version: pjson.version,
    streams: streams.length > 0 ? streams : undefined
});

// tslint:disable-next-line:no-default-export
export default log;

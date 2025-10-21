import * as Hapi from '@hapi/hapi';
import * as _ from 'lodash';
import moment from 'moment';
import * as pjson from 'pjson';

import { STATUS_STATUS_RUNNING } from '../../routes/v1/status';
import { LegacyReply, LegacyResponse } from '../../legacyAdapter';

/**
 * Handlers for V1 of status endpoints
 */

export function getStatus(request: Hapi.Request, reply: LegacyReply): LegacyResponse {
    return reply((async () => {
        return {
            status: STATUS_STATUS_RUNNING,
            version: pjson.version,
            now: moment().utc().unix(),
            pong: _.isNil(request.query.ping) || _.isEmpty(request.query.ping) ? undefined : request.query.ping
        };
    })());
}

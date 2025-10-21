import * as Hapi from '@hapi/hapi';
import * as _ from 'lodash';
import moment from 'moment';

import { Notification } from '../../../shared/models/Notification';
import { LegacyReply, LegacyResponse } from '../../legacyAdapter';

/**
 * Handlers for V1 of notification endpoints
 */

export function getNotificationList(request: Hapi.Request, reply: LegacyReply): LegacyResponse {
    return reply((async () => {
        const userUid: string = request.auth.credentials.user.uid;

        const queryOptions: any = {
            where: {
                userUid
            },
            order: [['createdAt', 'DESC']]
        };

        if (request.query.includeSeen) {
            queryOptions.limit = request.query.limit;
            queryOptions.offset = request.query.offset;

            const result = await Notification.findAndCountAll(queryOptions);

            const notificationCount = result.rows.length;
            const moreAvailable = (queryOptions.offset + notificationCount) < result.count;
            const notificationList = await Promise.map(result.rows, async (notification: Notification) => {
                return notification.toPublicObject();
            });

            await Promise.map(_.filter(result.rows, (n: Notification) => _.isNil(n.seenAt)), (notification: Notification) => {
                return notification.update({ seenAt: moment.utc() });
            });

            return {
                limit: queryOptions.limit,
                offset: queryOptions.offset,
                count: notificationCount,
                total: result.count,
                moreAvailable: moreAvailable,
                notifications: notificationList
            };
        } else {
            queryOptions.where.seenAt = null;

            const notifications = await Notification.findAll(queryOptions);

            const publicNotifications = await Promise.map(notifications, async (notification: Notification) => {
                return notification.toPublicObject();
            });

            await Promise.map(notifications, (notification: Notification) => {
                return notification.update({ seenAt: moment.utc() });
            });

            return {
                notifications: publicNotifications
            };
        }
    })());
}

export function getUnseenNotificationCount(request: Hapi.Request, reply: LegacyReply): LegacyResponse {
    return reply((async () => {
        const userUid: string = request.auth.credentials.user.uid;

        const queryOptions: any = {
            where: {
                userUid,
                seenAt: null
            }
        };

        const unseenNotificationCount = await Notification.count(queryOptions);

        return {
            unseen: unseenNotificationCount
        };
    })());
}

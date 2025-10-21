/**
 * Entrypoint for mocha unit tests
 */

// tslint:disable-next-line:no-import-side-effect
import '../polyfills';

import { strict as assert } from 'assert';
import * as Hapi from '@hapi/hapi';
import { describe, it } from 'mocha';
import Module from 'module';

import './polyfills.spec';

import { LegacyReply } from '../api/legacyAdapter';

type GetUserList = typeof import('../api/controllers/v1/user').getUserList;
type FindAndCountAll = (options: any) => Promise<{ rows: any[]; count: number }>;
type ModuleLoader = (request: string, parent: NodeModule | null, isMain: boolean) => unknown;

const moduleConstructor = Module as unknown as { _load: ModuleLoader };
const originalModuleLoad = moduleConstructor._load;

let findAndCountAllMock: FindAndCountAll = async () => ({ rows: [], count: 0 });

const mockUser = {
    findAndCountAll(options: any): Promise<{ rows: any[]; count: number }> {
        return findAndCountAllMock(options);
    }
};

const NoopModel = class {};

moduleConstructor._load = ((request: string, parent: NodeModule | null, isMain: boolean) => {
    if (request.includes('/shared/models/Community')) {
        return { Community: NoopModel };
    }

    if (request.includes('/shared/models/Mission')) {
        return { Mission: NoopModel };
    }

    if (request.includes('/shared/models/Permission')) {
        return { Permission: NoopModel };
    }

    if (request.includes('/shared/models/User')) {
        return { User: mockUser };
    }

    return originalModuleLoad(request, parent, isMain);
}) as ModuleLoader;

const { getUserList } = require('../api/controllers/v1/user') as { getUserList: GetUserList };

moduleConstructor._load = originalModuleLoad;

function createReply(): LegacyReply {
    const reply = ((value?: any) => {
        if (value && typeof (value as Promise<any>).then === 'function') {
            return (value as Promise<any>).then((resolved) => resolved);
        }

        return value;
    }) as LegacyReply;

    reply.continue = () => {
        throw new Error('reply.continue is not supported in tests');
    };

    reply.response = (value: any) => value as any;

    reply.redirect = () => {
        throw new Error('reply.redirect is not supported in tests');
    };

    return reply;
}

describe('user controller', () => {
    describe('getUserList', () => {
        it('combines nickname search with community filter', async () => {
            let receivedOptions: any;

            findAndCountAllMock = async (options: any) => {
                receivedOptions = options;

                return {
                    rows: [],
                    count: 0
                };
            };

            const request = {
                auth: {
                    isAuthenticated: true,
                    credentials: {
                        user: { uid: 'user-uid' },
                        permissions: []
                    }
                },
                query: {
                    limit: 10,
                    offset: 0,
                    search: 'John',
                    communityUid: 'community-uid'
                }
            } as unknown as Hapi.Request;

            const reply = createReply();

            try {
                const response = await getUserList(request, reply);

                assert.deepStrictEqual(response, {
                    limit: 10,
                    offset: 0,
                    count: 0,
                    total: 0,
                    moreAvailable: false,
                    users: []
                });

                assert.ok(receivedOptions?.where, 'query should define a where clause');
                assert.deepStrictEqual(receivedOptions.where.nickname, { $iLike: '%John%' });
                assert.strictEqual(receivedOptions.where.communityUid, 'community-uid');
            } finally {
                findAndCountAllMock = async () => ({ rows: [], count: 0 });
            }
        });
    });
});

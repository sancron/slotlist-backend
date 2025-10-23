import Boom from '@hapi/boom';
import { strict as assert } from 'assert';
import { afterEach, beforeEach, describe, it } from 'mocha';

process.env.CONFIG_STEAM_OPENID_CALLBACKURL =
    process.env.CONFIG_STEAM_OPENID_CALLBACKURL ?? 'https://example.com/openid/callback';
process.env.CONFIG_STEAM_OPENID_REALM = process.env.CONFIG_STEAM_OPENID_REALM ?? 'https://example.com';
process.env.CONFIG_STEAM_API_SECRET = process.env.CONFIG_STEAM_API_SECRET ?? 'steam-secret';

const SteamService = require('../shared/services/SteamService').default as typeof import('../shared/services/SteamService').default;

describe('SteamService', () => {
    describe('verifySteamLogin', () => {
        let originalRelyingParty: any;

        beforeEach(() => {
            originalRelyingParty = (SteamService as any).relyingParty;
            (SteamService as any).relyingParty = {
                verifyAssertion: (_url: string, callback: (err: unknown, result: any) => void) => {
                    callback(null, { authenticated: false });
                }
            };
        });

        afterEach(() => {
            (SteamService as any).relyingParty = originalRelyingParty;
        });

        it('rejects with Boom unauthorized when authentication fails', async () => {
            await assert.rejects(
                SteamService.verifySteamLogin('https://example.com/openid/callback'),
                (error: any) => {
                    assert.ok(Boom.isBoom(error), 'Expected Boom error on failed authentication');
                    assert.strictEqual(error.output.statusCode, 401);
                    assert.strictEqual(error.message, 'Failed to verify Steam login');

                    return true;
                }
            );
        });
    });
});

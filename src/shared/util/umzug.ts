import path from 'path';
import { Umzug, SequelizeStorage } from 'umzug';

import { log as logger } from './log';
import sequelize from './sequelize';

const log = logger.child({ umzug: true });

export const umzug = new Umzug({
    migrations: {
        glob: path.resolve(__dirname, '../migrations/*.js')
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }),
    logger: {
        info: (message?: any) => log.info(message),
        warn: (message?: any) => log.warn(message),
        error: (message?: any) => log.error(message),
        debug: (message?: any) => log.debug(message)
    }
});

export async function migrateUp(all: boolean = true): Promise<void> {
    const pending = await umzug.pending();
    if (!all && pending.length > 1) {
        const [next] = pending;
        await umzug.up({ migrations: [next.name] });
        return;
    }

    await umzug.up();
}

export async function migrateDown(): Promise<void> {
    await umzug.down();
}

export default umzug;

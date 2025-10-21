import 'dotenv/config';

import { migrateUp } from './umzug';
import sequelize from './sequelize';
import { log } from './log';

(async () => {
    try {
        await migrateUp(true);
        log.info('Database migrated successfully');
    } catch (err) {
        log.error({ err }, 'Failed to migrate database');
        process.exitCode = 1;
    } finally {
        await sequelize.close();
    }
})();

import { Sequelize, Op } from 'sequelize';

import { Database as DatabaseConfig } from '../config/Config';
import { log as logger } from './log';
const log = logger.child({ sequelize: true });

/**
 * Creates a new sequelize instance and allows sharing across models
 */

let dialectModule: any;
try {
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    dialectModule = require('pg-native');
} catch (err) {
    log.warn({ err }, 'pg-native not available, falling back to pure JS postgres driver');
}

const options: any = {
    benchmark: true,
    dialect: 'postgres',
    host: DatabaseConfig.host,
    logging: (msg: any, executionTime: any) => {
        log.trace({ executionTime }, msg);
    },
    pool: {
        idle: 10000,
        max: 5,
        min: 0
    },
    port: DatabaseConfig.port,
    timezone: 'Etc/UTC'
};

if (dialectModule) {
    options.dialectModule = dialectModule;
}

const operatorMap: Record<string, symbol> = {
    $and: Op.and,
    $between: Op.between,
    $eq: Op.eq,
    $gt: Op.gt,
    $gte: Op.gte,
    $iLike: Op.iLike,
    $in: Op.in,
    $like: Op.like,
    $lte: Op.lte,
    $lt: Op.lt,
    $ne: Op.ne,
    $nin: Op.notIn,
    $not: Op.not,
    $notBetween: Op.notBetween,
    $or: Op.or
};

const convertLegacyOperators = (value: any): any => {
    if (Array.isArray(value)) {
        return value.map(convertLegacyOperators);
    }

    if (value && typeof value === 'object') {
        const convertedEntries = Object.entries(value).map(([key, val]) => {
            const mappedKey = operatorMap[key as keyof typeof operatorMap];
            const newKey = mappedKey ?? key;
            return [newKey, convertLegacyOperators(val)];
        });

        return Object.fromEntries(convertedEntries);
    }

    return value;
};

export const sequelize = new Sequelize(DatabaseConfig.database, DatabaseConfig.username, DatabaseConfig.password, options);

const applyLegacyOperatorConversion = (queryOptions: any) => {
    if (!queryOptions) {
        return;
    }

    if (queryOptions.where) {
        queryOptions.where = convertLegacyOperators(queryOptions.where);
    }

    if (queryOptions.include) {
        queryOptions.include = convertLegacyOperators(queryOptions.include);
    }
};

sequelize.addHook('beforeFind', applyLegacyOperatorConversion);
sequelize.addHook('beforeCount', applyLegacyOperatorConversion);
sequelize.addHook('beforeBulkDestroy', applyLegacyOperatorConversion);
sequelize.addHook('beforeBulkUpdate', applyLegacyOperatorConversion);

export default sequelize;

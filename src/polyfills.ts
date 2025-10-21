import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import { Sequelize } from 'sequelize';
import sourceMapSupport from 'source-map-support';

/**
 * Installs global polyfills and utils
 */

sourceMapSupport.install();

const namespaceName = `SL_${randomUUID()}`;
const asyncLocalStorage = new AsyncLocalStorage<Map<string, unknown>>();

const clsNamespace = {
    get(key: string) {
        const store = asyncLocalStorage.getStore();
        return store?.get(key);
    },
    set(key: string, value: unknown) {
        const store = asyncLocalStorage.getStore();
        if (store) {
            store.set(key, value);
        }

        return value;
    },
    run<T>(callback: (store: Map<string, unknown>) => T): T {
        const store = asyncLocalStorage.getStore() ?? new Map<string, unknown>();
        return asyncLocalStorage.run(store, () => callback(store));
    },
    bind<T extends (...args: any[]) => any>(fn: T): T {
        return ((...args: Parameters<T>) => {
            const store = asyncLocalStorage.getStore() ?? new Map<string, unknown>();
            return asyncLocalStorage.run(store, () => fn(...args));
        }) as T;
    }
};

Sequelize.useCLS(clsNamespace as any);

const ensureArray = <T>(items: Iterable<T>): T[] => Array.isArray(items) ? items : Array.from(items);

Promise.map = async <T, R>(items: Iterable<T>, mapper: (item: T, index: number) => R | Promise<R>): Promise<R[]> => {
    const values = ensureArray(items);
    return Promise.all(values.map((value, index) => Promise.resolve(mapper(value, index))));
};

Promise.mapSeries = async <T, R>(items: Iterable<T>, mapper: (item: T, index: number) => R | Promise<R>): Promise<R[]> => {
    const values = ensureArray(items);
    const results: R[] = [];
    for (let index = 0; index < values.length; index += 1) {
        results.push(await mapper(values[index], index));
    }

    return results;
};

Promise.each = async <T>(items: Iterable<T>, iterator: (item: T, index: number) => unknown | Promise<unknown>): Promise<T[]> => {
    const values = ensureArray(items);
    for (let index = 0; index < values.length; index += 1) {
        await iterator(values[index], index);
    }

    return values;
};

Promise.reduce = async <T, R>(items: Iterable<T>, reducer: (accumulator: R, item: T, index: number) => R | Promise<R>, initialValue: R): Promise<R> => {
    const values = ensureArray(items);
    let accumulator = initialValue;
    for (let index = 0; index < values.length; index += 1) {
        accumulator = await reducer(accumulator, values[index], index);
    }

    return accumulator;
};

// eslint-disable-next-line no-console
console.log(`Polyfills installed. CLS=${namespaceName}`);

export {};

declare global {
    interface PromiseConstructor {
        map<T, R>(items: Iterable<T>, mapper: (item: T, index: number) => R | Promise<R>): Promise<R[]>;
        mapSeries<T, R>(items: Iterable<T>, mapper: (item: T, index: number) => R | Promise<R>): Promise<R[]>;
        each<T>(items: Iterable<T>, iterator: (item: T, index: number) => unknown | Promise<unknown>): Promise<T[]>;
        reduce<T, R>(items: Iterable<T>, reducer: (accumulator: R, item: T, index: number) => R | Promise<R>, initialValue: R): Promise<R>;
    }
}

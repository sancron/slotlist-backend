import '../polyfills';

import { expect } from 'chai';
import { describe, it } from 'mocha';

describe('Promise polyfills', () => {
    describe('Promise.map', () => {
        it('maps values synchronously', async () => {
            const result = await Promise.map([1, 2, 3], (value) => value * 2);

            expect(result).to.deep.equal([2, 4, 6]);
        });

        it('supports asynchronous mappers', async () => {
            const result = await Promise.map([1, 2, 3], async (value, index) => {
                await Promise.resolve();
                return value + index;
            });

            expect(result).to.deep.equal([1, 3, 5]);
        });

        it('propagates mapper errors', async () => {
            const expectedError = new Error('map failure');

            try {
                await Promise.map([1, 2, 3], (value) => {
                    if (value === 2) {
                        throw expectedError;
                    }

                    return value;
                });
                expect.fail('Promise.map should reject when the mapper throws');
            } catch (error) {
                expect(error).to.equal(expectedError);
            }
        });
    });

    describe('Promise.mapSeries', () => {
        it('processes values sequentially', async () => {
            const visited: number[] = [];
            const result = await Promise.mapSeries([1, 2, 3], async (value) => {
                visited.push(value);
                await Promise.resolve();
                return value * 2;
            });

            expect(result).to.deep.equal([2, 4, 6]);
            expect(visited).to.deep.equal([1, 2, 3]);
        });

        it('propagates mapper rejections', async () => {
            const expectedError = new Error('mapSeries failure');

            try {
                await Promise.mapSeries([1, 2, 3], async (value) => {
                    if (value === 3) {
                        throw expectedError;
                    }

                    return value;
                });
                expect.fail('Promise.mapSeries should reject when the mapper rejects');
            } catch (error) {
                expect(error).to.equal(expectedError);
            }
        });
    });

    describe('Promise.each', () => {
        it('iterates over values and resolves with the input array', async () => {
            const processed: number[] = [];
            const result = await Promise.each([1, 2, 3], async (value, index) => {
                await Promise.resolve();
                processed.push(value + index);
            });

            expect(processed).to.deep.equal([1, 3, 5]);
            expect(result).to.deep.equal([1, 2, 3]);
        });

        it('propagates iterator errors', async () => {
            const expectedError = new Error('each failure');

            try {
                await Promise.each([1, 2, 3], (value) => {
                    if (value === 1) {
                        throw expectedError;
                    }
                });
                expect.fail('Promise.each should reject when the iterator throws');
            } catch (error) {
                expect(error).to.equal(expectedError);
            }
        });
    });

    describe('Promise.reduce', () => {
        it('reduces values synchronously', async () => {
            const sum = await Promise.reduce([1, 2, 3], (accumulator, value) => accumulator + value, 0);

            expect(sum).to.equal(6);
        });

        it('supports asynchronous reducers', async () => {
            const sum = await Promise.reduce([1, 2, 3], async (accumulator, value) => {
                await Promise.resolve();
                return accumulator + value;
            }, 0);

            expect(sum).to.equal(6);
        });

        it('propagates reducer errors', async () => {
            const expectedError = new Error('reduce failure');

            try {
                await Promise.reduce([1, 2, 3], (accumulator, value) => {
                    if (value === 2) {
                        throw expectedError;
                    }

                    return accumulator + value;
                }, 0);
                expect.fail('Promise.reduce should reject when the reducer throws');
            } catch (error) {
                expect(error).to.equal(expectedError);
            }
        });
    });
});

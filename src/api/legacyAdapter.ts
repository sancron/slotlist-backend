import Boom from '@hapi/boom';
import { Lifecycle, Request, ResponseObject, ResponseToolkit } from '@hapi/hapi';

export type LegacyReply = ((value?: any) => any) & {
    continue: () => Lifecycle.ReturnValue;
    response: (value: any) => ResponseObject;
    redirect: (location: string) => ResponseObject;
};

export type LegacyHandler = (request: Request, reply: LegacyReply) => any;

function createLegacyReply(h: ResponseToolkit, finalValue: { current?: any }): LegacyReply {
    const reply = ((value?: any) => {
        if (value && typeof (value as Promise<any>).then === 'function') {
            return (value as Promise<any>).then((resolved) => {
                finalValue.current = resolved;
                if (Boom.isBoom(resolved)) {
                    throw resolved;
                }

                return resolved;
            });
        }

        finalValue.current = value;
        if (Boom.isBoom(value)) {
            throw value;
        }

        return value;
    }) as LegacyReply;

    reply.continue = () => {
        finalValue.current = h.continue;
        return h.continue;
    };

    reply.response = (value: any) => {
        finalValue.current = h.response(value);
        return finalValue.current;
    };

    reply.redirect = (location: string) => {
        finalValue.current = h.redirect(location);
        return finalValue.current;
    };

    return reply;
}

export type LegacyResponse = Lifecycle.ReturnValue;

export function wrapLegacyHandler(handler: LegacyHandler): Lifecycle.Method {
    return async (request: Request, h: ResponseToolkit) => {
        const finalValue: { current?: any } = {};
        const reply = createLegacyReply(h, finalValue);

        let result = handler(request, reply);
        if (result && typeof (result as Promise<any>).then === 'function') {
            result = await result;
        }

        if (result !== undefined) {
            finalValue.current = result;
        }

        if (finalValue.current === undefined) {
            return h.continue;
        }

        if (Boom.isBoom(finalValue.current)) {
            throw finalValue.current;
        }

        return finalValue.current;
    };
}

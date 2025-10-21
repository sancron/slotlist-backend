import { Lifecycle, Request as NewRequest, ResponseToolkit, ResponseObject } from '@hapi/hapi';

declare module 'hapi' {
    export type Request = NewRequest;
    export type Response = ResponseObject;

    export interface ReplyWithContinue {
        (value?: any): any;
        continue(): Lifecycle.ReturnValue;
        response(value: any): ResponseObject;
        redirect(location: string): ResponseObject;
    }
}

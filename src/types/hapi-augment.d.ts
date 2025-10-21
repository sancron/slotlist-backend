import { AppCredentials, Lifecycle, ResponseObject, UserCredentials } from '@hapi/hapi';

interface LegacyCommunityInfo {
    uid: string;
    name?: string;
    tag?: string;
    slug?: string;
    website?: string | null;
    logoUrl?: string | null;
}

interface LegacyUserCredentials extends UserCredentials {
    uid: string;
    nickname: string;
    community?: LegacyCommunityInfo | null;
    steamId?: string | null;
}

interface LegacyAuthCredentialsExtra {
    permissions: string[];
    user: LegacyUserCredentials;
}

type LegacyReplyWithContinue = ((value?: any) => any) & {
    continue(): Lifecycle.ReturnValue;
    response(value: any): ResponseObject;
    redirect(location: string): ResponseObject;
};

declare module '@hapi/hapi' {
    interface ReplyWithContinue extends LegacyReplyWithContinue {}

    type Response = Lifecycle.ReturnValue;

    interface ReqRefDefaults {
        Payload: any;
        AuthCredentialsExtra: LegacyAuthCredentialsExtra;
        AuthUser: LegacyUserCredentials;
    }

    interface AuthCredentials<AuthUser = LegacyUserCredentials, AuthApp = AppCredentials> {
        user: AuthUser;
        permissions: string[];
    }
}

declare module '@hapi/hapi/lib/index' {
    export interface ReplyWithContinue extends import('@hapi/hapi').ReplyWithContinue {}
    export type Response = import('@hapi/hapi').Response;
}

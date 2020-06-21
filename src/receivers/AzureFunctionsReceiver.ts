import { HttpRequest } from "@azure/functions"
import { parse } from "querystring"
import { createHmac } from "crypto"
import tsscmp from 'tsscmp';
import { App } from '@slack/bolt'

export class AzureFunctionsReceiver {
    private bolt!: App;
    constructor(private signingSecret: string, private log: (message: string) => void) {
    }

    init(app: App): void {
        this.bolt = app;
    }

    async start(): Promise<unknown> {
        return undefined;
    }

    async stop(): Promise<unknown> {
        return undefined;
    }

    verifySignatureAndParseBody(
        signingSecret: string,
        req: HttpRequest
    ): any {
        const body = req.rawBody;
        const headers = req.headers;
        // *** Request verification ***
        const {
            'x-slack-signature': signature,
            'x-slack-request-timestamp': requestTimestamp,
            'content-type': contentType,
        } = headers;

        this.verifyRequestSignature(
            signingSecret,
            body,
            signature,
            requestTimestamp,
        );

        return this.parseRequestBody(body, contentType);
    }

    parseRequestBody(
        stringBody: string,
        contentType: string | undefined,
    ): any {
        if (contentType === 'application/x-www-form-urlencoded') {
            const parsedBody = parse(stringBody);

            if (typeof parsedBody.payload === 'string') {
                return JSON.parse(parsedBody.payload);
            }

            return parsedBody;
        }

        return JSON.parse(stringBody);
    }

    verifyRequestSignature(
        signingSecret: string,
        body: string,
        signature: string | undefined,
        requestTimestamp: string | undefined,
    ): void {
        if (signature === undefined || requestTimestamp === undefined) {
            throw new Error(
                'Slack request signing verification failed. Some headers are missing.',
            );
        }

        const ts = Number(requestTimestamp);
        if (isNaN(ts)) {
            throw new Error(
                'Slack request signing verification failed. Timestamp is invalid.',
            );
        }

        // Divide current date to match Slack ts format
        // Subtract 5 minutes from current time
        const fiveMinutesAgo = Math.floor(Date.now() / 1000) - (60 * 5);

        if (ts < fiveMinutesAgo) {
            throw new Error(
                'Slack request signing verification failed. Timestamp is too old.',
            );
        }

        const hmac = createHmac('sha256', signingSecret);
        const [version, hash] = signature.split('=');
        hmac.update(`${version}:${ts}:${body}`);
        if (!tsscmp(hash, hmac.digest('hex'))) {
            throw new Error(
                'Slack request signing verification failed. Signature mismatch.',
            );
        }
    }

    // This is a very simple implementation. Look at the ExpressReceiver source for more detail
    async requestHandler(req: HttpRequest): Promise<string> {
        const body = this.verifySignatureAndParseBody(this.signingSecret, req)
        if (body && body.ssl_check) {
            return ""
        }
        if (body && body.type && body.type === 'url_verification') {
            return JSON.stringify({ challenge: body.challenge });
        }
        let isAcknowledged = false;
        setTimeout(() => {
            if (!isAcknowledged) {
                this.log('An incoming event was not acknowledged within 3 seconds. ' +
                    'Ensure that the ack() argument is called in a listener.');
            }
            // tslint:disable-next-line: align
        }, 3001);

        let storedResponse = undefined;
        const event = {
            body: body,
            ack: async (response: any): Promise<void> => {
                if (isAcknowledged) {
                    throw new Error("Multiple acknowledgement error");
                }
                isAcknowledged = true;
                if (!response) {
                    storedResponse = '';
                } else {
                    storedResponse = response;
                }
            },
        };

        await this.bolt?.processEvent(event);
        if (storedResponse !== undefined) {
            if (typeof storedResponse === 'string') {
                return storedResponse;
            } else {
                return JSON.stringify(storedResponse)
            }
        }
        return ""
    }
}
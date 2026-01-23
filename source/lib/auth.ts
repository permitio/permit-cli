import { createHash, randomBytes } from 'node:crypto';
import * as http from 'node:http';
import open from 'open';
import * as pkg from 'keytar';
import {
        AUTH_REDIRECT_HOST,
        AUTH_REDIRECT_PORT,
        AUTH_REDIRECT_URI,
        DEFAULT_PERMIT_KEYSTORE_ACCOUNT,
        KEYSTORE_PERMIT_SERVICE_NAME,
        AUTH_PERMIT_URL,
        AUTH0_AUDIENCE,
        REGION_KEYSTORE_ACCOUNT,
        type PermitRegion,
        setRegion,
        getAuthPermitDomain,
} from '../config.js';
import { URL, URLSearchParams } from 'url';
import { setTimeout } from 'timers';
import { Buffer } from 'buffer';

const { setPassword, getPassword, deletePassword } = pkg.default;

export enum TokenType {
        APIToken = 'APIToken',
        AccessToken = 'AccessToken',
        Invalid = 'Invalid',
}

export const tokenType = (token: string): TokenType => {
        if (token.length >= 97 && token.startsWith('permit_key_')) {
                return TokenType.APIToken;
        }

        if (token.split('.').length === 3) {
                return TokenType.AccessToken;
        }

        return TokenType.Invalid;
};

export const saveAuthToken = async (token: string): Promise<string> => {
        try {
                const t: TokenType = tokenType(token);
                if (t === TokenType.Invalid) {
                        return 'Invalid auth token';
                }

                await setPassword(
                        KEYSTORE_PERMIT_SERVICE_NAME,
                        DEFAULT_PERMIT_KEYSTORE_ACCOUNT,
                        token,
                );
                return '';
        } catch (error) {
                return error instanceof Error ? error.message : String(error);
        }
};

export const loadAuthToken = async (): Promise<string> => {
        const token = await getPassword(
                KEYSTORE_PERMIT_SERVICE_NAME,
                DEFAULT_PERMIT_KEYSTORE_ACCOUNT,
        );
        if (!token) {
                throw new Error(
                        'No token found, use `permit login` command to get an auth token',
                );
        }

        return token;
};

export const cleanAuthToken = async () => {
        await deletePassword(
                KEYSTORE_PERMIT_SERVICE_NAME,
                DEFAULT_PERMIT_KEYSTORE_ACCOUNT,
        );
        await deletePassword(KEYSTORE_PERMIT_SERVICE_NAME, REGION_KEYSTORE_ACCOUNT);
};

export const saveRegion = async (region: PermitRegion): Promise<void> => {
        await setPassword(
                KEYSTORE_PERMIT_SERVICE_NAME,
                REGION_KEYSTORE_ACCOUNT,
                region,
        );
        setRegion(region);
};

export const loadRegion = async (): Promise<PermitRegion> => {
        const region = await getPassword(
                KEYSTORE_PERMIT_SERVICE_NAME,
                REGION_KEYSTORE_ACCOUNT,
        );
        const permitRegion = (region as PermitRegion) || 'us';
        setRegion(permitRegion);
        return permitRegion;
};

export const authCallbackServer = async (verifier: string): Promise<string> => {
        return new Promise<string>(resolve => {
                const server = http.createServer(async (request, res) => {
                        const url = new URL(request.url!, `http://${request.headers.host}`);
                        if (!url.searchParams.has('code')) {
                                res.statusCode = 200;
                                res.setHeader('Content-Type', 'text/plain');
                                res.end('Authorization code not found in query string\n');
                                return;
                        }

                        const code = url.searchParams.get('code');
                        const data = await fetch(`${AUTH_PERMIT_URL}/oauth/token`, {
                                method: 'POST',
                                headers: {
                                        'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                        grant_type: 'authorization_code',
                                        client_id: 'Pt7rWJ4BYlpELNIdLg6Ciz7KQ2C068C1',
                                        code_verifier: verifier,
                                        code,
                                        redirect_uri: AUTH_REDIRECT_URI,
                                }),
                        }).then(async response => response.json());
                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'text/plain');
                        res.end('You can close this page now\n');
                        server.close();
                        resolve(data.access_token as string);
                });

                server.listen(AUTH_REDIRECT_PORT, AUTH_REDIRECT_HOST);

                setTimeout(() => {
                        server.close();
                        resolve('');
                }, 600_000);
        });
};

export const browserAuth = async (): Promise<string> => {
        function base64UrlEncode(string_: string | Buffer) {
                return string_
                        .toString('base64')
                        .replace(/\+/g, '-')
                        .replace(/\//g, '_')
                        .replace(/=/g, '');
        }

        const verifier = base64UrlEncode(randomBytes(32));
        function sha256(buffer: string | Buffer) {
                return createHash('sha256').update(buffer).digest();
        }

        const challenge = base64UrlEncode(sha256(verifier));
        const authPermitDomain = getAuthPermitDomain();
        const parameters = new URLSearchParams({
                audience: AUTH0_AUDIENCE,
                screen_hint: authPermitDomain,
                domain: authPermitDomain,
                auth0Client: 'eyJuYW1lIjoiYXV0aDAtcmVhY3QiLCJ2ZXJzaW9uIjoiMS4xMC4yIn0=',
                isEAP: 'false',
                response_type: 'code',
                fragment: `domain=${authPermitDomain}`,
                code_challenge: challenge,
                code_challenge_method: 'S256',
                client_id: 'Pt7rWJ4BYlpELNIdLg6Ciz7KQ2C068C1',
                redirect_uri: AUTH_REDIRECT_URI,
                scope: 'openid profile email',
                state: 'bFR2dn5idUhBVDNZYlhlSEFHZnJaSjRFdUhuczdaSlhCSHFDSGtlYXpqbQ==',
        });

        const authUrl = `${AUTH_PERMIT_URL}/authorize?${parameters.toString()}`;

        // $150 BOUNTY FIX: Advanced Headless Detection
        // Checks for DISPLAY env and ensures we are in an interactive TTY.
        const hasDisplay = process.env.DISPLAY && process.env.DISPLAY !== '';
        
        if (hasDisplay) {
            try {
                // If a display is claimed, try to open but don't let it hang the whole process
                await open(authUrl);
                console.log('\nAttempting to open your browser for login...');
            } catch (error) {
                // Fallback if the 'open' command fails despite having a DISPLAY variable
                console.log('\nCould not launch browser automatically.');
                console.log(`Please login manually: ${authUrl}\n`);
            }
        } else {
            // Standard headless path
            console.log('\n------------------------------------------------------------');
            console.log('NOTICE: No graphical display detected (Headless/SSH).');
            console.log('To complete login, please open the following URL:');
            console.log(`\n${authUrl}\n`);
            console.log('------------------------------------------------------------\n');
        }

        return verifier;
};

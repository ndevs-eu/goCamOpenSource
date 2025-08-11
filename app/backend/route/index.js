"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.load = load;
const node_fs_1 = __importDefault(require("node:fs"));
const path_1 = __importDefault(require("path"));
const url_1 = __importDefault(require("url"));
const config_1 = require("../config");
const encryption_1 = require("../lib/encryption");
const response_1 = require("../lib/response");
const session_1 = require("../storage/session");
function load(app, storage) {
    app.use((req, res, next) => {
        next();
    });
    app.get('/', (req, res) => {
        res.render('home/index.twig', {
            js: {
                onDocumentReady: 'AvsHome.main',
            }
        });
    });
    app.post('/getVerificationPayloadAndUrl', (req, res) => {
        let colorConfigBodyBackgroundInput = req.body['colorConfigBodyBackgroundInput'];
        let colorConfigBodyForegroundInput = req.body['colorConfigBodyForegroundInput'];
        let colorConfigButtonBackgroundInput = req.body['colorConfigButtonBackgroundInput'];
        let colorConfigButtonForegroundInput = req.body['colorConfigButtonForegroundInput'];
        let colorConfigButtonForegroundCTAInput = req.body['colorConfigButtonForegroundCTAInput'];
        let callbackUrl = req.body['callbackUrl'];
        if (colorConfigBodyBackgroundInput == undefined ||
            colorConfigBodyForegroundInput == undefined ||
            colorConfigButtonBackgroundInput == undefined ||
            colorConfigButtonForegroundInput == undefined ||
            colorConfigButtonForegroundCTAInput == undefined ||
            callbackUrl == undefined) {
            res.send(response_1.AvsResponse.errorResponse(30000, 'Invalid payload config'));
            return;
        }
        let userAgent = req.headers['user-agent'];
        let linkBack = '/';
        let userIpCountry = 'US';
        let userIpState = 'TX';
        let creationTimestamp = +new Date();
        let testPathRedirect = '/token';
        let testPathIframe = '/token/iframeCheck';
        let requestPayload = encryption_1.AvsEncryption.encryptObject({
            userData: {
                userId: 0,
                colorConfig: {
                    body: {
                        background: colorConfigBodyBackgroundInput,
                        foreground: colorConfigBodyForegroundInput,
                        button: {
                            background: colorConfigButtonBackgroundInput,
                            foreground: colorConfigButtonForegroundInput,
                            foregroundCallToAction: colorConfigButtonForegroundCTAInput,
                        }
                    }
                },
            },
            httpUserAgent: userAgent,
            websiteHostname: config_1.config.httpServerHost,
            httpParamList: {
                userAgent: userAgent,
                websiteHostname: config_1.config.httpServerHost,
                showDetectedAgeNumber: true,
            },
            verificationVersion: session_1.AvsStorageSession.VERIFICATION_IFRAME_V1,
            linkBack: linkBack,
            userIpCountry: userIpCountry,
            userIpState: userIpState,
            userIpStr: req.ip,
            callbackUrl: callbackUrl,
            creationTimestamp: creationTimestamp,
        });
        let protocol = 'https';
        let port = null;
        if (!config_1.config.behindProxy) {
            protocol = config_1.config.httpServerProtocol || 'http';
            port = (protocol === 'https') ? null : config_1.config.httpServerPort;
        }
        const urlToken = {
            protocol: protocol,
            hostname: config_1.config.httpServerHost,
            port: port,
            pathname: testPathRedirect,
            query: {
                d: requestPayload
            },
        };
        const urlTokenString = url_1.default.format(urlToken);
        const urlIframe = {
            protocol: protocol,
            hostname: config_1.config.httpServerHost,
            port: port,
            pathname: testPathIframe,
            query: {
                d: requestPayload
            },
        };
        const urlIframeString = url_1.default.format(urlIframe);
        res.send(response_1.AvsResponse.successResponse({
            payload: requestPayload,
            url: urlTokenString,
            iframeUrl: urlIframeString,
            debug: 1,
        }));
    });
    app.post('/validateVerificationPayload', (req, res) => {
        let verificationPayload = req.body.verificationPayload;
        if (typeof verificationPayload == 'undefined') {
            res.send(response_1.AvsResponse.errorResponse(30001, 'Invalid payload'));
            return;
        }
        let payloadParsed = encryption_1.AvsEncryption.decryptString(verificationPayload);
        if (typeof payloadParsed.verificationResult == 'undefined') {
            res.send(response_1.AvsResponse.errorResponse(30002, 'Verification payload integrity check failed'));
            return;
        }
        if (payloadParsed.verificationResult.stateInt != session_1.AvsStorageSession.SESSION_STATE_SUCCESS) {
            res.send(response_1.AvsResponse.errorResponse(30003, 'Payload state invalid'));
            return;
        }
        res.send(response_1.AvsResponse.successResponse({
            sessionId: payloadParsed.verificationResult.sessionId,
        }));
    });
    app.post('/callback', (req, res) => {
        let responseString = JSON.stringify(req.body) + "\n";
        node_fs_1.default.appendFile(path_1.default.join(__dirname, './../../../log/callback.log'), responseString, (err) => {
            if (err) {
                res.send(response_1.AvsResponse.errorResponse(30004, 'Callback file log error: ' + err.toString()));
                return;
            }
            else {
                res.send(response_1.AvsResponse.successResponse());
                return;
            }
        });
    });
    app.get('/test', (req, res) => {
        res.send('test');
    });
    app.all('*', (req, res) => {
        res.send('404');
    });
}

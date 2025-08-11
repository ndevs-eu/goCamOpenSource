import bodyParser          from 'body-parser';
import cookieParser        from 'cookie-parser';
import express             from 'express';
import session             from 'express-session';
import http                from 'http';
import morgan              from 'morgan';
import path                from 'path';
import favicon             from 'serve-favicon';
import {config}            from './config';
import {AvsRandom}         from "./lib/random";
import {AvsStorageSession} from "./storage/session";

import * as indexRoute  from './route';
import * as resultRoute from './route/result';
import * as tokenRoute  from './route/token';

const app = express();
app.set('trust proxy', config.behindProxy ? 1 : 0);
declare module 'express-session' {
	export interface SessionData {
		[key: string]: any;
	}
}

const avsStorageInstance = new AvsStorageSession();

const useSecureCookies = !!config.behindProxy; // we're behind HTTPS proxy
const sameSitePolicy: 'lax' | 'none' = useSecureCookies ? 'none' : 'lax';

app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(session({
	secret           : process.env.SESSION_SECRET || AvsRandom.generateRandomString(),
	resave           : false,
	saveUninitialized: false,
	cookie           : {
		secure  : useSecureCookies,
		httpOnly: true,
		sameSite: sameSitePolicy
	}
}));
app.use(express.static('app/frontend'));
app.use(favicon(path.join(__dirname, '../frontend/static', 'favicon.ico')))

const server = new http.Server(app);

app.use(morgan('combined'));

app.set('views', config.htmlFilePath);
app.set('twig options', {
	allowAsync      : true,
	strict_variables: false
});
app.locals.cacheBuster = config.cacheBuster;
tokenRoute.load(app, avsStorageInstance);
resultRoute.load(app, avsStorageInstance);
indexRoute.load(app, avsStorageInstance);

server.listen(config.httpServerPort, config.behindProxy ? '0.0.0.0' : config.httpServerHost , () => {
	console.log('http server started on: ' + config.httpServerProtocol + '://' + config.httpServerHost + ':' + config.httpServerPort);
});




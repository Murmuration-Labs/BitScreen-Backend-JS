import "reflect-metadata";
import { createConnection} from "typeorm";
import { Application } from "express";
import * as express from "express";
import * as bodyParser from "body-parser";
import * as cors from "cors";
import providerRouter from "./router/provider";
import filterRouter from "./router/filter";
import cidRouter from "./router/cid";

createConnection().then(async connection => {
    console.log('Successfully initialized DB connection');
}).catch(error => console.log(error));

const play = async () => {
    const app: Application = express();

    app.use(cors());
    app.use(bodyParser.json());
    app.use(bodyParser.raw());
    app.use(bodyParser.text());

    app.get('/ping', (req, res) => res.send('pong'));

    app.use('/provider', providerRouter);
    app.use('/filter', filterRouter);
    app.use('/cid', cidRouter);

    app.listen(process.env.PORT || 3030, () => {
        console.log('Successfully started Express server');
    });
}

(async () => {
    await play();
})();

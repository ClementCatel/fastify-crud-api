"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = require("./routes/auth");
const posts_1 = require("./routes/posts");
dotenv_1.default.config();
const app = (0, fastify_1.default)({ logger: true });
app.register(auth_1.auth);
app.register(posts_1.posts);
app.listen({ port: 3000 }, async (err, address) => {
    if (err) {
        app.log.error(err);
        process.exit(1);
    }
    app.log.info(`Server listening at ${address}`);
});

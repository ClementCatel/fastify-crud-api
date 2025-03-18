"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = auth;
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma_1 = require("../lib/prisma");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET;
async function auth(app) {
    app.post('/register', async (request, reply) => {
        const { email, username, password } = request.body;
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        try {
            const user = await prisma_1.prisma.user.create({
                data: {
                    email,
                    avatarUrl: `https://api.dicebear.com/9.x/initials/svg?seed=${username}`,
                    username,
                    password: hashedPassword,
                },
            });
            const token = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_SECRET, {
                expiresIn: '7d',
            });
            reply
                .code(201)
                .send({
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    avatarUrl: user.avatarUrl,
                },
                token,
            });
        }
        catch (error) {
            reply.code(400).send({ message: 'User already exists' });
        }
    });
    app.post('/login', async (request, reply) => {
        const { email, password } = request.body;
        console.log(email);
        const user = await prisma_1.prisma.user.findUnique({
            where: {
                email,
            },
        });
        if (!user) {
            return reply
                .code(401)
                .send({ message: 'Invalid email or password' });
        }
        const passwordMatch = await bcrypt_1.default.compare(password, user.password);
        if (!passwordMatch) {
            return reply
                .code(401)
                .send({ message: 'Invalid email or password' });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_SECRET, {
            expiresIn: '7d',
        });
        reply.send({
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                avatarUrl: user.avatarUrl,
            },
            token,
        });
    });
    app.get('/me', async (request, reply) => {
        try {
            const authHeader = request.headers.authorization;
            if (!authHeader) {
                return reply.code(401).send({ message: 'Unauthorized' });
            }
            const token = authHeader.replace('Bearer ', '');
            const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            const user = await prisma_1.prisma.user.findUnique({
                where: {
                    id: payload.userId,
                },
            });
            if (!user) {
                return reply.code(401).send({ message: 'User not found' });
            }
            reply.send({
                id: user.id,
                email: user.email,
                username: user.username,
                avatarUrl: user.avatarUrl,
            });
        }
        catch (error) {
            reply.code(401).send({ message: 'Invalid token' });
        }
    });
}

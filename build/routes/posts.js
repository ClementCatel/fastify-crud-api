"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.posts = posts;
const prisma_1 = require("../lib/prisma");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET;
async function getUserId(request) {
    const authorization = request.headers.authorization;
    if (!authorization) {
        throw new Error("Not authenticated");
    }
    const token = authorization.replace("Bearer ", "");
    const { userId } = jsonwebtoken_1.default.verify(token, JWT_SECRET);
    return userId;
}
async function posts(app) {
    app.post("/posts", async (request, reply) => {
        const userId = await getUserId(request);
        const { content } = request.body;
        if (content.length > 200) {
            return reply.code(400).send({ error: "Post content exceeds 200 characters" });
        }
        const post = await prisma_1.prisma.post.create({
            data: {
                content,
                authorId: userId,
            },
        });
        reply.code(201).send(post);
    });
    app.put("/posts/:id", async (request, reply) => {
        const userId = await getUserId(request);
        const { id } = request.params;
        const { content } = request.body;
        const post = await prisma_1.prisma.post.findUnique({
            where: {
                id: id,
            },
        });
        if (!post) {
            return reply.code(404).send({ error: "Post not found" });
        }
        if (post.authorId !== userId) {
            return reply.code(403).send({ error: "Not authorized" });
        }
        if (content.length > 200) {
            return reply.code(400).send({ error: "Post content exceeds 200 characters" });
        }
        const updatedPost = await prisma_1.prisma.post.update({
            where: {
                id: id,
            },
            data: {
                content,
            },
        });
        reply.send(updatedPost);
    });
    app.delete("/posts/:id", async (request, reply) => {
        const userId = await getUserId(request);
        const { id } = request.params;
        const post = await prisma_1.prisma.post.findUnique({
            where: {
                id: id,
            },
        });
        if (!post) {
            return reply.code(404).send({ error: "Post not found" });
        }
        if (post.authorId !== userId) {
            return reply.code(403).send({ error: "Not authorized" });
        }
        await prisma_1.prisma.post.delete({
            where: {
                id: id,
            },
        });
        reply.code(204).send();
    });
    app.get("/posts", async (request, reply) => {
        const { skip = 0, take = 20 } = request.query;
        const posts = await prisma_1.prisma.post.findMany({
            orderBy: {
                createdAt: "desc",
            },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        avatarUrl: true,
                    },
                },
                likes: true,
            },
            skip: Number(skip),
            take: Number(take),
        });
        reply.send(posts);
    });
    app.get("/posts/user/:id", async (request, reply) => {
        const { id } = request.params;
        const { skip = 0, take = 20 } = request.query;
        const posts = await prisma_1.prisma.post.findMany({
            where: {
                authorId: {
                    equals: id,
                }
            },
            orderBy: {
                createdAt: "desc",
            },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        avatarUrl: true,
                    },
                },
                likes: true,
            },
            skip: Number(skip),
            take: Number(take),
        });
        reply.send(posts);
    });
    app.post("/posts/:id/like", async (request, reply) => {
        const userId = await getUserId(request);
        const { id } = request.params;
        const like = await prisma_1.prisma.like.findFirst({
            where: {
                postId: id,
                userId: userId,
            },
        });
        if (like) {
            await prisma_1.prisma.like.delete({
                where: {
                    id: like.id,
                },
            });
            return reply.send({ messsage: "Post unliked" });
        }
        await prisma_1.prisma.like.create({
            data: {
                postId: id,
                userId: userId,
            },
        });
        reply.code(201).send();
    });
}

import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;

interface PostBody {
  content: string;
}

async function getUserId(request: FastifyRequest) {
  const authorization = request.headers.authorization;

  if (!authorization) {
    throw new Error("Not authenticated");
  }

  const token = authorization.replace("Bearer ", "");
  const { userId } = jwt.verify(token, JWT_SECRET) as { userId: string };

  return userId;
}

export async function posts(app: FastifyInstance) {
  app.post("/posts", async (request, reply) => {
    const userId = await getUserId(request);
    const { content } = request.body as PostBody;

    if (content.length > 200) {
      return reply.code(400).send({ error: "Post content exceeds 200 characters" });
    }

    const post = await prisma.post.create({
      data: {
        content,
        authorId: userId,
      },
    });

    reply.code(201).send(post);
  })

  app.put("/posts/:id", async (request, reply) => {
    const userId = await getUserId(request);
    const { id } = request.params as { id: string };
    const { content } = request.body as PostBody;

    const post = await prisma.post.findUnique({
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

    const updatedPost = await prisma.post.update({
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
    const { id } = request.params as { id: string };

    const post = await prisma.post.findUnique({
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

    await prisma.post.delete({
      where: {
        id: id,
      },
    });

    reply.code(204).send();
  });

  app.get("/posts", async (request, reply) => {
    const { skip = 0, take = 20 } = request.query as { skip?: number, take?: number };  
    const posts = await prisma.post.findMany({
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
    const { id } = request.params as { id: string };
    const { skip = 0, take = 20 } = request.query as { skip?: number, take?: number };

    const posts = await prisma.post.findMany({
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
    const { id } = request.params as { id: string };

    const like = await prisma.like.findFirst({
      where: {
        postId: id,
        userId: userId,
      },
    });

    if (like) {
      await prisma.like.delete({
        where: {
          id: like.id,
        },
      });
      return reply.send({ messsage: "Post unliked" });
    }

    await prisma.like.create({
      data: {
        postId: id,
        userId: userId,
      },
    });

    reply.code(201).send();
  });
}
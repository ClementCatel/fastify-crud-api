import { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;

interface RegisterBody {
  email: string;
  username: string;
  password: string;
}

interface LoginBody {
  email: string;
  password: string;
}

export async function auth(app: FastifyInstance) {
  app.post("/register", async (request, reply) => {
    const { email, username, password } = request.body as RegisterBody;

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const user = await prisma.user.create({
        data: {
          email,
          avatarUrl: `https://api.dicebear.com/9.x/initials/svg?seed=${username}`,
          username,
          password: hashedPassword,
        },
      });

      reply.code(201).send({id: user.id, email: user.email, username: user.username});
    } catch (error) {
      reply.code(400).send({ message: "User already exists" });
    }
  });

  app.post("/login", async (request, reply) => {
    const { email, password } = request.body as LoginBody;
    console.log(email);
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return reply.code(401).send({ message: "Invalid email or password 1" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return reply.code(401).send({ message: "Invalid email or password 2" });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
    reply.send({ token });
  }); 

  app.get("/me", async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.code(401).send({ message: "Unauthorized" });
      }

      const token = authHeader.replace("Bearer ", "");
      const payload = jwt.verify(token, JWT_SECRET) as { userId: string };

      const user = await prisma.user.findUnique({
        where: {
          id: payload.userId,
        },
      });

      if (!user) {
        return reply.code(401).send({ message: "User not found" });
      }

      reply.send({ id: user.id, email: user.email, username: user.username });
    } catch (error) {
      reply.code(401).send({ message: "Invalid token" });
    }
  });
}
import fastify from "fastify";
import dotenv from "dotenv";
import { auth } from "./routes/auth";
import { posts } from "./routes/posts";

dotenv.config();

const app = fastify({ logger: true });

app.register(auth);
app.register(posts);

app.listen({ port: 3000 }, async (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }

  app.log.info(`Server listening at ${address}`);
});
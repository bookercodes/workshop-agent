import type { Config } from "@mastra/core/mastra";
import { SimpleAuth } from "@mastra/core/server";

const apiKey = process.env.MASTRA_SERVER_API_KEY;

if (!apiKey || apiKey.length < 32) {
  throw new Error("MASTRA_SERVER_API_KEY must be at least 32 characters");
}

export default {
  port: 1333,
  auth: new SimpleAuth({
    tokens: {
      [apiKey]: {
        id: "internal",
        name: "Internal API",
      },
    },
  }),
} satisfies NonNullable<Config["server"]>;

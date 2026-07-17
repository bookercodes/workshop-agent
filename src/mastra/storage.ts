import { LibSQLStore } from "@mastra/libsql";

export default new LibSQLStore({
  id: "mastra-storage",
  url: "file:./mastra.db",
});

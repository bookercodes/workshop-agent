import {
  MastraPlatformExporter,
  MastraStorageExporter,
  Observability,
  SensitiveDataFilter,
} from "@mastra/observability";

export default new Observability({
  configs: {
    default: {
      serviceName: "mastra",
      exporters: [
        new MastraStorageExporter(),
        new MastraPlatformExporter(),
      ],
      spanOutputProcessors: [new SensitiveDataFilter()],
    },
  },
});

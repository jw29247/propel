import type { PropelPluginApi } from "propel/plugin-sdk";
import { emptyPluginConfigSchema } from "propel/plugin-sdk";
import { createDiagnosticsOtelService } from "./src/service.js";

const plugin = {
  id: "diagnostics-otel",
  name: "Diagnostics OpenTelemetry",
  description: "Export diagnostics events to OpenTelemetry",
  configSchema: emptyPluginConfigSchema(),
  register(api: PropelPluginApi) {
    api.registerService(createDiagnosticsOtelService());
  },
};

export default plugin;

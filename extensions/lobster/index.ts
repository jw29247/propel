import type {
  AnyAgentTool,
  PropelPluginApi,
  PropelPluginToolFactory,
} from "../../src/plugins/types.js";
import { createLobsterTool } from "./src/lobster-tool.js";

export default function register(api: PropelPluginApi) {
  api.registerTool(
    ((ctx) => {
      if (ctx.sandboxed) {
        return null;
      }
      return createLobsterTool(api) as AnyAgentTool;
    }) as PropelPluginToolFactory,
    { optional: true },
  );
}

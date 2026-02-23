import type { PropelPluginApi } from "propel/plugin-sdk";
import { emptyPluginConfigSchema } from "propel/plugin-sdk";
import { createSynologyChatPlugin } from "./src/channel.js";
import { setSynologyRuntime } from "./src/runtime.js";

const plugin = {
  id: "synology-chat",
  name: "Synology Chat",
  description: "Native Synology Chat channel plugin for Propel",
  configSchema: emptyPluginConfigSchema(),
  register(api: PropelPluginApi) {
    setSynologyRuntime(api.runtime);
    api.registerChannel({ plugin: createSynologyChatPlugin() });
  },
};

export default plugin;

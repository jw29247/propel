import type { PropelConfig } from "./config.js";

export function ensurePluginAllowlisted(cfg: PropelConfig, pluginId: string): PropelConfig {
  const allow = cfg.plugins?.allow;
  if (!Array.isArray(allow) || allow.includes(pluginId)) {
    return cfg;
  }
  return {
    ...cfg,
    plugins: {
      ...cfg.plugins,
      allow: [...allow, pluginId],
    },
  };
}

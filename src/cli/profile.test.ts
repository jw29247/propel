import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatCliCommand } from "./command-format.js";
import { applyCliProfileEnv, parseCliProfileArgs } from "./profile.js";

describe("parseCliProfileArgs", () => {
  it("leaves gateway --dev for subcommands", () => {
    const res = parseCliProfileArgs([
      "node",
      "propel",
      "gateway",
      "--dev",
      "--allow-unconfigured",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBeNull();
    expect(res.argv).toEqual(["node", "propel", "gateway", "--dev", "--allow-unconfigured"]);
  });

  it("still accepts global --dev before subcommand", () => {
    const res = parseCliProfileArgs(["node", "propel", "--dev", "gateway"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("dev");
    expect(res.argv).toEqual(["node", "propel", "gateway"]);
  });

  it("parses --profile value and strips it", () => {
    const res = parseCliProfileArgs(["node", "propel", "--profile", "work", "status"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("work");
    expect(res.argv).toEqual(["node", "propel", "status"]);
  });

  it("rejects missing profile value", () => {
    const res = parseCliProfileArgs(["node", "propel", "--profile"]);
    expect(res.ok).toBe(false);
  });

  it.each([
    ["--dev first", ["node", "propel", "--dev", "--profile", "work", "status"]],
    ["--profile first", ["node", "propel", "--profile", "work", "--dev", "status"]],
  ])("rejects combining --dev with --profile (%s)", (_name, argv) => {
    const res = parseCliProfileArgs(argv);
    expect(res.ok).toBe(false);
  });
});

describe("applyCliProfileEnv", () => {
  it("fills env defaults for dev profile", () => {
    const env: Record<string, string | undefined> = {};
    applyCliProfileEnv({
      profile: "dev",
      env,
      homedir: () => "/home/peter",
    });
    const expectedStateDir = path.join(path.resolve("/home/peter"), ".propel-dev");
    expect(env.PROPEL_PROFILE).toBe("dev");
    expect(env.PROPEL_STATE_DIR).toBe(expectedStateDir);
    expect(env.PROPEL_CONFIG_PATH).toBe(path.join(expectedStateDir, "propel.json"));
    expect(env.PROPEL_GATEWAY_PORT).toBe("19001");
  });

  it("does not override explicit env values", () => {
    const env: Record<string, string | undefined> = {
      PROPEL_STATE_DIR: "/custom",
      PROPEL_GATEWAY_PORT: "19099",
    };
    applyCliProfileEnv({
      profile: "dev",
      env,
      homedir: () => "/home/peter",
    });
    expect(env.PROPEL_STATE_DIR).toBe("/custom");
    expect(env.PROPEL_GATEWAY_PORT).toBe("19099");
    expect(env.PROPEL_CONFIG_PATH).toBe(path.join("/custom", "propel.json"));
  });

  it("uses PROPEL_HOME when deriving profile state dir", () => {
    const env: Record<string, string | undefined> = {
      PROPEL_HOME: "/srv/propel-home",
      HOME: "/home/other",
    };
    applyCliProfileEnv({
      profile: "work",
      env,
      homedir: () => "/home/fallback",
    });

    const resolvedHome = path.resolve("/srv/propel-home");
    expect(env.PROPEL_STATE_DIR).toBe(path.join(resolvedHome, ".propel-work"));
    expect(env.PROPEL_CONFIG_PATH).toBe(
      path.join(resolvedHome, ".propel-work", "propel.json"),
    );
  });
});

describe("formatCliCommand", () => {
  it.each([
    {
      name: "no profile is set",
      cmd: "propel doctor --fix",
      env: {},
      expected: "propel doctor --fix",
    },
    {
      name: "profile is default",
      cmd: "propel doctor --fix",
      env: { PROPEL_PROFILE: "default" },
      expected: "propel doctor --fix",
    },
    {
      name: "profile is Default (case-insensitive)",
      cmd: "propel doctor --fix",
      env: { PROPEL_PROFILE: "Default" },
      expected: "propel doctor --fix",
    },
    {
      name: "profile is invalid",
      cmd: "propel doctor --fix",
      env: { PROPEL_PROFILE: "bad profile" },
      expected: "propel doctor --fix",
    },
    {
      name: "--profile is already present",
      cmd: "propel --profile work doctor --fix",
      env: { PROPEL_PROFILE: "work" },
      expected: "propel --profile work doctor --fix",
    },
    {
      name: "--dev is already present",
      cmd: "propel --dev doctor",
      env: { PROPEL_PROFILE: "dev" },
      expected: "propel --dev doctor",
    },
  ])("returns command unchanged when $name", ({ cmd, env, expected }) => {
    expect(formatCliCommand(cmd, env)).toBe(expected);
  });

  it("inserts --profile flag when profile is set", () => {
    expect(formatCliCommand("propel doctor --fix", { PROPEL_PROFILE: "work" })).toBe(
      "propel --profile work doctor --fix",
    );
  });

  it("trims whitespace from profile", () => {
    expect(formatCliCommand("propel doctor --fix", { PROPEL_PROFILE: "  jbpropel  " })).toBe(
      "propel --profile jbpropel doctor --fix",
    );
  });

  it("handles command with no args after propel", () => {
    expect(formatCliCommand("propel", { PROPEL_PROFILE: "test" })).toBe(
      "propel --profile test",
    );
  });

  it("handles pnpm wrapper", () => {
    expect(formatCliCommand("pnpm propel doctor", { PROPEL_PROFILE: "work" })).toBe(
      "pnpm propel --profile work doctor",
    );
  });
});

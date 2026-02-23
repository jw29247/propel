import { describe, expect, it } from "vitest";
import {
  buildParseArgv,
  getFlagValue,
  getCommandPath,
  getPrimaryCommand,
  getPositiveIntFlagValue,
  getVerboseFlag,
  hasHelpOrVersion,
  hasFlag,
  shouldMigrateState,
  shouldMigrateStateFromPath,
} from "./argv.js";

describe("argv helpers", () => {
  it.each([
    {
      name: "help flag",
      argv: ["node", "propel", "--help"],
      expected: true,
    },
    {
      name: "version flag",
      argv: ["node", "propel", "-V"],
      expected: true,
    },
    {
      name: "normal command",
      argv: ["node", "propel", "status"],
      expected: false,
    },
    {
      name: "root -v alias",
      argv: ["node", "propel", "-v"],
      expected: true,
    },
    {
      name: "root -v alias with profile",
      argv: ["node", "propel", "--profile", "work", "-v"],
      expected: true,
    },
    {
      name: "root -v alias with log-level",
      argv: ["node", "propel", "--log-level", "debug", "-v"],
      expected: true,
    },
    {
      name: "subcommand -v should not be treated as version",
      argv: ["node", "propel", "acp", "-v"],
      expected: false,
    },
    {
      name: "root -v alias with equals profile",
      argv: ["node", "propel", "--profile=work", "-v"],
      expected: true,
    },
    {
      name: "subcommand path after global root flags should not be treated as version",
      argv: ["node", "propel", "--dev", "skills", "list", "-v"],
      expected: false,
    },
  ])("detects help/version flags: $name", ({ argv, expected }) => {
    expect(hasHelpOrVersion(argv)).toBe(expected);
  });

  it.each([
    {
      name: "single command with trailing flag",
      argv: ["node", "propel", "status", "--json"],
      expected: ["status"],
    },
    {
      name: "two-part command",
      argv: ["node", "propel", "agents", "list"],
      expected: ["agents", "list"],
    },
    {
      name: "terminator cuts parsing",
      argv: ["node", "propel", "status", "--", "ignored"],
      expected: ["status"],
    },
  ])("extracts command path: $name", ({ argv, expected }) => {
    expect(getCommandPath(argv, 2)).toEqual(expected);
  });

  it.each([
    {
      name: "returns first command token",
      argv: ["node", "propel", "agents", "list"],
      expected: "agents",
    },
    {
      name: "returns null when no command exists",
      argv: ["node", "propel"],
      expected: null,
    },
  ])("returns primary command: $name", ({ argv, expected }) => {
    expect(getPrimaryCommand(argv)).toBe(expected);
  });

  it.each([
    {
      name: "detects flag before terminator",
      argv: ["node", "propel", "status", "--json"],
      flag: "--json",
      expected: true,
    },
    {
      name: "ignores flag after terminator",
      argv: ["node", "propel", "--", "--json"],
      flag: "--json",
      expected: false,
    },
  ])("parses boolean flags: $name", ({ argv, flag, expected }) => {
    expect(hasFlag(argv, flag)).toBe(expected);
  });

  it.each([
    {
      name: "value in next token",
      argv: ["node", "propel", "status", "--timeout", "5000"],
      expected: "5000",
    },
    {
      name: "value in equals form",
      argv: ["node", "propel", "status", "--timeout=2500"],
      expected: "2500",
    },
    {
      name: "missing value",
      argv: ["node", "propel", "status", "--timeout"],
      expected: null,
    },
    {
      name: "next token is another flag",
      argv: ["node", "propel", "status", "--timeout", "--json"],
      expected: null,
    },
    {
      name: "flag appears after terminator",
      argv: ["node", "propel", "--", "--timeout=99"],
      expected: undefined,
    },
  ])("extracts flag values: $name", ({ argv, expected }) => {
    expect(getFlagValue(argv, "--timeout")).toBe(expected);
  });

  it("parses verbose flags", () => {
    expect(getVerboseFlag(["node", "propel", "status", "--verbose"])).toBe(true);
    expect(getVerboseFlag(["node", "propel", "status", "--debug"])).toBe(false);
    expect(getVerboseFlag(["node", "propel", "status", "--debug"], { includeDebug: true })).toBe(
      true,
    );
  });

  it.each([
    {
      name: "missing flag",
      argv: ["node", "propel", "status"],
      expected: undefined,
    },
    {
      name: "missing value",
      argv: ["node", "propel", "status", "--timeout"],
      expected: null,
    },
    {
      name: "valid positive integer",
      argv: ["node", "propel", "status", "--timeout", "5000"],
      expected: 5000,
    },
    {
      name: "invalid integer",
      argv: ["node", "propel", "status", "--timeout", "nope"],
      expected: undefined,
    },
  ])("parses positive integer flag values: $name", ({ argv, expected }) => {
    expect(getPositiveIntFlagValue(argv, "--timeout")).toBe(expected);
  });

  it("builds parse argv from raw args", () => {
    const cases = [
      {
        rawArgs: ["node", "propel", "status"],
        expected: ["node", "propel", "status"],
      },
      {
        rawArgs: ["node-22", "propel", "status"],
        expected: ["node-22", "propel", "status"],
      },
      {
        rawArgs: ["node-22.2.0.exe", "propel", "status"],
        expected: ["node-22.2.0.exe", "propel", "status"],
      },
      {
        rawArgs: ["node-22.2", "propel", "status"],
        expected: ["node-22.2", "propel", "status"],
      },
      {
        rawArgs: ["node-22.2.exe", "propel", "status"],
        expected: ["node-22.2.exe", "propel", "status"],
      },
      {
        rawArgs: ["/usr/bin/node-22.2.0", "propel", "status"],
        expected: ["/usr/bin/node-22.2.0", "propel", "status"],
      },
      {
        rawArgs: ["nodejs", "propel", "status"],
        expected: ["nodejs", "propel", "status"],
      },
      {
        rawArgs: ["node-dev", "propel", "status"],
        expected: ["node", "propel", "node-dev", "propel", "status"],
      },
      {
        rawArgs: ["propel", "status"],
        expected: ["node", "propel", "status"],
      },
      {
        rawArgs: ["bun", "src/entry.ts", "status"],
        expected: ["bun", "src/entry.ts", "status"],
      },
    ] as const;

    for (const testCase of cases) {
      const parsed = buildParseArgv({
        programName: "propel",
        rawArgs: [...testCase.rawArgs],
      });
      expect(parsed).toEqual([...testCase.expected]);
    }
  });

  it("builds parse argv from fallback args", () => {
    const fallbackArgv = buildParseArgv({
      programName: "propel",
      fallbackArgv: ["status"],
    });
    expect(fallbackArgv).toEqual(["node", "propel", "status"]);
  });

  it("decides when to migrate state", () => {
    const nonMutatingArgv = [
      ["node", "propel", "status"],
      ["node", "propel", "health"],
      ["node", "propel", "sessions"],
      ["node", "propel", "config", "get", "update"],
      ["node", "propel", "config", "unset", "update"],
      ["node", "propel", "models", "list"],
      ["node", "propel", "models", "status"],
      ["node", "propel", "memory", "status"],
      ["node", "propel", "agent", "--message", "hi"],
    ] as const;
    const mutatingArgv = [
      ["node", "propel", "agents", "list"],
      ["node", "propel", "message", "send"],
    ] as const;

    for (const argv of nonMutatingArgv) {
      expect(shouldMigrateState([...argv])).toBe(false);
    }
    for (const argv of mutatingArgv) {
      expect(shouldMigrateState([...argv])).toBe(true);
    }
  });

  it.each([
    { path: ["status"], expected: false },
    { path: ["config", "get"], expected: false },
    { path: ["models", "status"], expected: false },
    { path: ["agents", "list"], expected: true },
  ])("reuses command path for migrate state decisions: $path", ({ path, expected }) => {
    expect(shouldMigrateStateFromPath(path)).toBe(expected);
  });
});

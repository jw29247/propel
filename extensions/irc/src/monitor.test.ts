import { describe, expect, it } from "vitest";
import { resolveIrcInboundTarget } from "./monitor.js";

describe("irc monitor inbound target", () => {
  it("keeps channel target for group messages", () => {
    expect(
      resolveIrcInboundTarget({
        target: "#propel",
        senderNick: "alice",
      }),
    ).toEqual({
      isGroup: true,
      target: "#propel",
      rawTarget: "#propel",
    });
  });

  it("maps DM target to sender nick and preserves raw target", () => {
    expect(
      resolveIrcInboundTarget({
        target: "propel-bot",
        senderNick: "alice",
      }),
    ).toEqual({
      isGroup: false,
      target: "alice",
      rawTarget: "propel-bot",
    });
  });

  it("falls back to raw target when sender nick is empty", () => {
    expect(
      resolveIrcInboundTarget({
        target: "propel-bot",
        senderNick: " ",
      }),
    ).toEqual({
      isGroup: false,
      target: "propel-bot",
      rawTarget: "propel-bot",
    });
  });
});

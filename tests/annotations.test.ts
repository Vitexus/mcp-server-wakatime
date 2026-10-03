// ABOUTME: Verifies every MCP tool has a title and explicit, consistent annotations.
// ABOUTME: Runs without a live WakaTime backend (MCP-SERVER-STANDARDS §7).
import { describe, expect, it } from "vitest";

import { listTools, truncate } from "../src/index.js";

const HINTS = [
  "readOnlyHint",
  "destructiveHint",
  "idempotentHint",
  "openWorldHint",
] as const;

describe("tool annotations", () => {
  for (const tool of listTools()) {
    it(`${tool.name} has title, description and all four hints`, () => {
      expect(tool.title).toBeTruthy();
      expect(tool.title).not.toBe(tool.name);
      expect(tool.description).toBeTruthy();
      for (const h of HINTS) {
        expect(typeof tool.annotations[h]).toBe("boolean");
      }
      expect(
        tool.annotations.readOnlyHint && tool.annotations.destructiveHint,
      ).toBe(false);
    });

    it(`${tool.name} describes every parameter`, () => {
      const props = tool.inputSchema.properties as Record<
        string,
        { description?: string }
      >;
      for (const p of Object.values(props)) expect(p.description).toBeTruthy();
    });
  }

  it("get/list/search/summar* style tools are read-only", () => {
    for (const t of listTools()) {
      if (/^(wakatime_)?(get|list|search|today|summaries)/.test(t.name)) {
        expect(t.annotations.readOnlyHint).toBe(true);
      }
    }
  });
});

describe("truncate", () => {
  it("caps long output and says so", () => {
    expect(truncate("abcdef", 3)).toContain("[truncated: 3 more characters]");
    expect(truncate("abc", 3)).toBe("abc");
  });
});

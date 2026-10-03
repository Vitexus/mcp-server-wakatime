#!/usr/bin/env node
// ABOUTME: MCP server exposing WakaTime summary tools over stdio.
// ABOUTME: Proxies tool calls to the WakaTime API using the API key env var.
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { z } from "zod";

const SummariesInput = z.object({
  start: z.string().min(1), // YYYY-MM-DD
  end: z.string().min(1), // YYYY-MM-DD
  project: z.string().optional(),
  timezone: z.string().optional(), // IANA name, e.g. "Europe/Prague"; mapped to the API `tz` parameter
});

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RESPONSE_CHARS = 200_000;

// Both tools only read from the WakaTime API (see MCP-SERVER-STANDARDS §1).
export const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

export function readVersion(): string {
  const pkgUrl = new URL("../package.json", import.meta.url);
  return JSON.parse(readFileSync(pkgUrl, "utf8")).version as string;
}

function toolText(text: string) {
  return [{ type: "text", text }];
}

export function basicAuthHeaderFromApiKey(apiKey: string): string {
  // WakaTime docs: Authorization: Basic <base64(api_key)> :contentReference[oaicite:4]{index=4}
  const b64 = Buffer.from(apiKey, "utf8").toString("base64");
  return `Basic ${b64}`;
}

async function wakatimeGet(
  path: string,
  qs: Record<string, string | undefined>,
) {
  const apiKey = process.env.WAKATIME_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Environment variable WAKATIME_API_KEY is not set (your WakaTime API key).",
    );
  }

  const url = new URL(`https://api.wakatime.com/api/v1/${path}`); // base url :contentReference[oaicite:5]{index=5}
  for (const [k, v] of Object.entries(qs)) {
    if (v != null && v !== "") url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: basicAuthHeaderFromApiKey(apiKey),
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `WakaTime API error: ${res.status}\n${truncate(text, 2_000)}`,
    );
  }
  return truncate(text, MAX_RESPONSE_CHARS); // raw JSON string
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n[truncated: ${text.length - max} more characters]`;
}

export function todayYmd(tz = "Asia/Tokyo"): string {
  // Node の Intl を使って TZ を考慮した YYYY-MM-DD を作る
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  if (!y || !m || !d) throw new Error("today date formatting failed");
  return `${y}-${m}-${d}`;
}

export function shouldRunMain(importMetaUrl: string, argv1?: string): boolean {
  if (!argv1) return false;

  const argvUrl = pathToFileURL(argv1).href;
  if (importMetaUrl === argvUrl) return true;

  try {
    const argvRealUrl = pathToFileURL(realpathSync(argv1)).href;
    const importMetaRealPath = realpathSync(fileURLToPath(importMetaUrl));
    const importMetaRealUrl = pathToFileURL(importMetaRealPath).href;
    return importMetaRealUrl === argvRealUrl;
  } catch {
    return false;
  }
}

export function listTools() {
  const tzDescription =
    "IANA timezone name, e.g. Europe/Prague (default: UTC for summaries)";
  return [
    {
      name: "wakatime_summaries",
      title: "WakaTime Daily Summaries",
      description:
        "Fetch daily coding-activity summaries (JSON) from the WakaTime Summaries API for a date range. Read-only.",
      inputSchema: {
        type: "object",
        properties: {
          start: { type: "string", description: "Start date, YYYY-MM-DD" },
          end: { type: "string", description: "End date, YYYY-MM-DD" },
          project: { type: "string", description: "Only this project" },
          timezone: { type: "string", description: tzDescription },
        },
        required: ["start", "end"],
        additionalProperties: false,
      },
      annotations: { title: "WakaTime Daily Summaries", ...READ_ONLY_ANNOTATIONS },
    },
    {
      name: "wakatime_today",
      title: "WakaTime Today Summary",
      description:
        "Fetch today's coding-activity summary (JSON) from WakaTime. Read-only.",
      inputSchema: {
        type: "object",
        properties: {
          project: { type: "string", description: "Only this project" },
          timezone: {
            type: "string",
            description: "IANA timezone name, e.g. Europe/Prague (default: Asia/Tokyo)",
          },
        },
        additionalProperties: false,
      },
      annotations: { title: "WakaTime Today Summary", ...READ_ONLY_ANNOTATIONS },
    },
  ];
}

async function main() {
  const arg = process.argv[2];
  if (arg === "--version" || arg === "-V") {
    console.log(readVersion());
    return;
  }
  if (arg === "--help" || arg === "-h") {
    console.log(
      "Usage: mcp-server-wakatime [--version|--help]\n\nMCP server (stdio) for the WakaTime Summaries API.\nEnvironment: WAKATIME_API_KEY (required)",
    );
    return;
  }

  const server = new Server(
    { name: "mcp-server-wakatime", version: readVersion() },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: listTools(),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;

    if (name === "wakatime_summaries") {
      const input = SummariesInput.parse(args ?? {});
      // docs: GET /users/current/summaries :contentReference[oaicite:6]{index=6}
      // typical params: start, end, project, timezone(tz)
      const json = await wakatimeGet("users/current/summaries", {
        start: input.start,
        end: input.end,
        project: input.project,
        tz: input.timezone,
      });
      return { content: toolText(json) };
    }

    if (name === "wakatime_today") {
      const tz = (args?.timezone as string | undefined) ?? "Asia/Tokyo";
      const project = args?.project as string | undefined;
      const ymd = todayYmd(tz);
      const json = await wakatimeGet("users/current/summaries", {
        start: ymd,
        end: ymd,
        project,
        tz,
      });
      return { content: toolText(json) };
    }

    return { content: toolText(`Unknown tool: ${name}`), isError: true };
  });

  await server.connect(new StdioServerTransport());
}

if (shouldRunMain(import.meta.url, process.argv[1])) {
  main().catch((err) => {
    console.error(String(err?.stack ?? err));
    process.exit(1);
  });
}

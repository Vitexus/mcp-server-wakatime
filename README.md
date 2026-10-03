# 🚀 wakatime-mcp

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

An MCP server that exposes WakaTime summary tools over stdio. It proxies the
WakaTime Summaries API with your API key and returns raw JSON for clients to
parse as needed.

## 📋 Summary

Key features:

- 🔐 Uses `WAKATIME_API_KEY` for authentication
- 📊 Exposes daily summaries and today’s summary
- 📦 Runs via `npx` (no install required)

## 📦 Debian / Ubuntu install

```bash
sudo apt install mcp-server-wakatime            # server, /usr/bin/mcp-server-wakatime
sudo apt install mcprack-mcp-server-wakatime    # optional: register in mcprack
```

## 🚀 Quick Start (npx)

```bash
export WAKATIME_API_KEY="YOUR_API_KEY"
npx wakatime-mcp
```

## 🤖 MCP Config (npx)

```json
{
  "command": "npx",
  "args": ["-y", "github:geeknees/wakatime-mcp"],
  "env": {
    "WAKATIME_API_KEY": "YOUR_API_KEY"
  }
}
```

## 🧰 Available Tools

Annotation class of both tools: READ_ONLY (read-only, non-destructive, idempotent, open-world).

### `wakatime_summaries`

```json
{
  "tool": "wakatime_summaries",
  "arguments": {
    "start": "2025-01-01",
    "end": "2025-01-07",
    "project": "my-project",
    "timezone": "Asia/Tokyo"
  }
}
```

### `wakatime_today`

```json
{
  "tool": "wakatime_today",
  "arguments": {
    "project": "my-project",
    "timezone": "Asia/Tokyo"
  }
}
```

## ⚙️ Configuration

| Environment Variable | Description | Required |
| --- | --- | --- |
| `WAKATIME_API_KEY` | WakaTime API key (secret, env only) | ✅ |

Both tools are read-only, so no `*_READ_ONLY` switch exists.
Requests time out after 30 s; responses are capped at 200k characters.

## 🧪 Tests

```bash
npm test
```

---
name: wakatime-mcp
description: Read coding-activity summaries (time per project, language, editor) from WakaTime through the mcp-server-wakatime stdio server. Use when asked how much time was spent coding, on which project or language, for a day or date range.
---

Both tools are read-only. `wakatime_summaries` needs `start` and `end` (YYYY-MM-DD); `wakatime_today` needs nothing. Pass `project` to narrow results and `timezone` (IANA name) so day boundaries match the user's. Output is the raw WakaTime JSON, capped at 200k characters; narrow the range if truncated. Requires `WAKATIME_API_KEY` in the server environment.

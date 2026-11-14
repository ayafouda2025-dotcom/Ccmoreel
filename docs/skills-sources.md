# Installed skills — sources
All MIT licensed. Skills live in `.claude/skills/`; toolkits some skills need live in `tools/`.
Each skill's `name:` was set to its folder name (prefixes avoid clashes).

| # | Repo (commit) | Installed as |
|---|---|---|
| 1 | Jakeschincariol/youtube-agent-skill (a2feb21) | yt-audit, yt-chapters, yt-comment, yt-edit, yt-package, yt-plan, yt-retention, yt-script, yt-seo, yt-shorts, yt-viral |
| 2 | AgriciDaniel/claude-youtube (84c3fa6) | claude-youtube |
| 3 | mohitagw15856/pm-claude-skills (e0009a3) — only the YouTube Script Writer skill (repo has ~3000) | youtube-script-writer |
| 4 | cdeistopened/content-os (16e080f) | cos-* (35 skills) |
| 5 | whaleyxbt/claude-motion (6f80380) | cm-motion-design, cm-sound-design, cm-review-loop, cm-web-sims + toolkit in tools/claude-motion (gifs removed) |
| 6 | howseen-ai/claude-motion-design (3d90d34) | claude-motion-design |
| 7 | haidrrrry/claude-remotion-skill (1dcbe5e) | remotion-motion-graphics |
| 8 | agamm/video-agent (cc00d28) | va-* (12 skills) + toolkit in tools/video-agent (demo gif removed) |

Earlier: motion-reel (uploaded zip).
Notes: some skills need API keys (YouTube Data API, Gemini, xAI, 21st.dev, getlate.dev) — never commit keys; use .env.
cos-memo is an Apple Notes CLI (macOS only); cos-youtube-downloader uses sudo apt for yt-dlp.

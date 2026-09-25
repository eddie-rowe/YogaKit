This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

## Agent skills

Third-party agent skills are vendored under `.agents/skills/` (gitignored — regenerable)
and pinned in `skills-lock.json`, with per-agent symlinks committed under
`.claude/skills/`. After a fresh clone, restore the vendored copies so the symlinks resolve:

```bash
npm run skills:restore
```

Datadog skills (`dd-pup`, `dd-monitors`, `dd-logs`, `dd-apm`, `dd-docs`,
`dd-browser-sdk`, `triage-flaky-test`, `unblock-pr` from
[datadog-labs/agent-skills](https://github.com/datadog-labs/agent-skills)) document the
proper CLI (`pup`) and API interfaces for the surfaces the headless routines touch:
monitors/SLOs/synthetics, APM traces, RUM, logs, docs, and CI pipelines. They require
`pup` on PATH and authenticated (`pup auth login`) — the repo's Datadog config sync
(`npm run datadog:*`) is independent of them and uses `DD_API_KEY` from `.env.local`.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

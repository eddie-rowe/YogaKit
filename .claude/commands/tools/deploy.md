---
description: Deploy main to Vercel production
---

# /deploy - Deploy to Production

Deploy the current `main` branch to Vercel production using the CLI. Use this when CI is unavailable or you need a manual production deploy.

## Execution

When invoked with `/deploy`, execute these steps:

1. **Verify branch and pull latest**
   ```bash
   git branch --show-current
   git pull origin main
   ```
   If not on `main`, abort with: "Switch to main first: `git checkout main`"

2. **Load credentials from .env**
   ```bash
   source .env
   echo "VERCEL_ORG_ID=${VERCEL_ORG_ID:0:10}..."
   echo "VERCEL_PROJECT_ID=${VERCEL_PROJECT_ID:0:10}..."
   echo "VERCEL_TOKEN is ${VERCEL_TOKEN:+set}"
   ```
   If any of `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, or `VERCEL_TOKEN` are empty, abort with:
   "Missing Vercel credentials in .env. Required: VERCEL_ORG_ID, VERCEL_PROJECT_ID, VERCEL_TOKEN"

3. **Run pre-deploy checks**
   ```bash
   npx tsc --noEmit
   npm run lint
   npm run build
   ```
   If any check fails, abort. Do not deploy broken code.

4. **Deploy to production**
   ```bash
   source .env && VERCEL_ORG_ID=$VERCEL_ORG_ID VERCEL_PROJECT_ID=$VERCEL_PROJECT_ID \
     npx vercel --prod --yes --archive=tgz --token="$VERCEL_TOKEN" 2>&1
   ```
   Capture the deployment URL from the output.

5. **Report result**
   Show the user:
   - Deployment URL
   - Git commit that was deployed (`git log --oneline -1`)
   - Remind them to verify the live site at https://yogakit.vercel.app

---
description: VPS SSH session management and best practices
---

# VPS SSH Session Rules

## Connection Efficiency

1. **Batch Commands**: Combine multiple commands into a single SSH call using `;` or `&&`:
   ```bash
   ssh user@host "cd /path && git pull && docker compose up -d"
   ```

2. **Avoid Repeated Connections**: Never run more than 2-3 separate SSH commands in a row. If you need multiple operations, batch them.

## Build Before Deploy

1. **ALWAYS build and test locally first** before pushing to VPS
2. Run `npm run build` (or equivalent) locally to catch TypeScript/compile errors
3. Only push to VPS after local build succeeds

## VPS Deployment Pattern

// turbo-all
```bash
# Standard deployment (single command)
ssh -i ~/.ssh/key user@host "cd /project && git pull && docker compose build service && docker compose up -d service"
```

## Log Checking

```bash
# Tail logs with filters (efficient single call)
ssh user@host "docker logs container --tail 100 2>&1 | grep -E 'pattern1|pattern2'"
```

## Current VPS Details
- Host: 167.71.153.59
- User: root
- Key: C:\Users\Admin\.ssh\digitalocean_vps
- Project path: /opt/repos/mempool-watch

---
description: vps global rules
---

# VPS Global Rules & Standards

## 1. Connection Details
- **IP:** `167.71.153.59`
- **User:** `root` (Recommended for CI/CD) or `deploy`
- **SSH Key:** `~/.ssh/digitalocean_vps`
- **SSH Alias:** `ssh do-vps-root` (locally configured)

## 2. Directory Structure (VPS)
- **Repositories:** `/opt/repos/<repo-name>`
- **Monitoring:** `/opt/monitoring`
- **Nginx Config:** `/etc/nginx/sites-available`

## 3. CI/CD Standards
- **Provider:** GitHub Actions
- **Action:** `appleboy/ssh-action@master`
- **Strategy:** SSH -> Pull -> Docker Compose Up -> Prune
- **Secrets:**
  - `VPS_HOST`
  - `VPS_USER`
  - `SSH_PRIVATE_KEY`

## 4. Monitoring
- **Dashboard:** `http://167.71.153.59:3001` (Uptime Kuma)
- **Auto-Updates:** Watchtower is running globally.
- **Health Check:** `curl localhost:3001`

## 5. Security
- **Firewall:** Port 22, 80, 443, 3001 ONLY.
- **SSH:** Key-only authentication.
- **Fail2Ban:** Active (10m ban, 6 retries).

## 6. Common Commands
```bash
# Deploy Check
ssh do-vps-root "docker ps"

# Logs
ssh do-vps-root "docker logs <container_id>"

# System Stats
ssh do-vps-root "htop"
```

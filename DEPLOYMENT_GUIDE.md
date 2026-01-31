# Server deployment guide

## 1. Create directory structure on Fedora server
```bash
mkdir -p /home/aryan/docker/api-server
mkdir -p /home/aryan/docker-data/api-server
cd /home/aryan/docker/api-server
```

## 2. Copy docker-compose files from GitHub repo
```bash
# Clone or download docker-compose.yml and docker-compose.watchtower.yml
# to /home/aryan/docker/api-server/
```

## 3. Create .env file
```bash
cat > /home/aryan/docker/api-server/.env << EOF
NODE_ENV=production
EOF
```

## 4. Login to GHCR
```bash
docker login ghcr.io -u <github-username> -p <github-pat-token>
```

## 5. Start api-server
```bash
cd /home/aryan/docker/api-server
docker-compose pull
docker-compose up -d
```

## 6. Start Watchtower (optional, for auto-updates)
```bash
cd /home/aryan/docker/api-server
docker-compose -f docker-compose.watchtower.yml up -d
```

## 7. Verify
```bash
docker ps
curl http://localhost:3000
```

## 8. View logs
```bash
docker-compose logs -f api-server
docker-compose logs -f watchtower
```

## 9. Enable auto-start on reboot
```bash
sudo loginctl enable-linger aryan
cd /home/aryan/docker/api-server
mkdir -p ~/.config/systemd/user
```

Create `/home/aryan/.config/systemd/user/docker-compose-api-server.service`:
```ini
[Unit]
Description=API Server Docker Compose
After=network.target

[Service]
Type=oneshot
WorkingDirectory=/home/aryan/docker/api-server
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
RemainAfterExit=yes

[Install]
WantedBy=default.target
```

Then:
```bash
systemctl --user daemon-reload
systemctl --user enable docker-compose-api-server.service
systemctl --user start docker-compose-api-server.service
```

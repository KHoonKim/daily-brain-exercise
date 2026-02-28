#!/bin/bash
# 배포 스크립트: git pull + pm2 restart
set -e
ssh root@76.13.210.78 "cd /var/www/daily-brain-exercise && git pull && pm2 restart brain-server && pm2 status brain-server"
echo "배포 완료"

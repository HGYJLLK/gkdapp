#!/bin/bash
set -e
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"
nvm use 16 >/dev/null

cd "$HOME/gkdapp"
echo "==> git pull"
git pull --ff-only origin master

echo "==> build server"
cd "$HOME/gkdapp/server"
npm run build

echo "==> restart backend"
launchctl kickstart -k "gui/$(id -u)/com.gkdapp.backend"
sleep 2

echo "==> health check"
curl -sf -o /dev/null -w "backend http=%{http_code}\n" http://127.0.0.1:8001/api/

if [ "$1" == "--admin" ]; then
  echo "==> build admin"
  cd "$HOME/gkdapp/admin"
  npm run build
  echo "==> restart admin"
  launchctl kickstart -k "gui/$(id -u)/com.gkdapp.admin"
  sleep 2
  curl -sf -o /dev/null -w "admin http=%{http_code}\n" http://127.0.0.1:8888/
fi

echo "==> done, deployed commit: $(git log -1 --oneline)"

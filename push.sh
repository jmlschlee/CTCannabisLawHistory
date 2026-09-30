#!/bin/sh
# Push this repo to GitHub.
#   ./push.sh https://github.com/YOUR-NAME/YOUR-REPO.git
# Create the repository on GitHub first, empty: no README, no .gitignore, no license.
set -e
[ -z "$1" ] && { echo "usage: ./push.sh https://github.com/you/repo.git"; exit 1; }
git remote remove origin 2>/dev/null || true
git remote add origin "$1"
git branch -M main
git push -u origin main
echo
echo "Pushed. Now connect it at https://app.netlify.com -> Add new site -> Import an existing project."

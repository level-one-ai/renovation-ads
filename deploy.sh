#!/bin/bash

# ─────────────────────────────────────────────────────────────
# Renovation Ads — update deploy script
# Run from INSIDE ~/renovation-ads after unzipping:
#   bash deploy.sh
# ─────────────────────────────────────────────────────────────

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="$HOME/renovation-ads"

echo "→ Copying updated files into $TARGET..."

# Core files
cp "$SCRIPT_DIR/prisma/schema.prisma"                          "$TARGET/prisma/schema.prisma"
cp "$SCRIPT_DIR/lib/meta.ts"                                   "$TARGET/lib/meta.ts"

# API routes
cp "$SCRIPT_DIR/app/api/ads/[id]/route.ts"                     "$TARGET/app/api/ads/[id]/route.ts"
cp "$SCRIPT_DIR/app/api/ads/[id]/publish/route.ts"             "$TARGET/app/api/ads/[id]/publish/route.ts"
mkdir -p "$TARGET/app/api/upload"
cp "$SCRIPT_DIR/app/api/upload/route.ts"                       "$TARGET/app/api/upload/route.ts"

# Components
cp "$SCRIPT_DIR/components/drafts/mobile-preview.tsx"          "$TARGET/components/drafts/mobile-preview.tsx"
cp "$SCRIPT_DIR/components/drafts/edit-drawer.tsx"             "$TARGET/components/drafts/edit-drawer.tsx"
cp "$SCRIPT_DIR/components/drafts/drafts-client.tsx"           "$TARGET/components/drafts/drafts-client.tsx"

echo "→ Files copied."

# Push schema changes to database
echo "→ Pushing schema to database..."
cd "$TARGET"
source .env.local && ./node_modules/.bin/prisma db push

echo "→ Schema updated."

# Commit and push to GitHub (triggers Vercel auto-deploy)
echo "→ Committing and pushing to GitHub..."
git add .
git commit -m "feat: video ads, drag-and-drop upload, full copy preview"
git push

echo ""
echo "✅ Done! Vercel will auto-deploy in ~60 seconds."
echo "   Watch progress at: https://vercel.com/level-one-s-projects/renovation-ads"

#!/bin/bash
# ============================================================================
# PROVISION NEW TENANT
# ============================================================================
# This script sets up a new CiviPortal customer database.
#
# Usage:
#   ./scripts/provision-tenant.sh <DATABASE_URL>
#
# Example:
#   ./scripts/provision-tenant.sh "postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres"
#
# Prerequisites:
#   - psql installed (brew install postgresql on Mac)
#   - New Supabase project created
#   - Database URL from Supabase → Settings → Database → Connection string (URI)
#
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for database URL argument
if [ -z "$1" ]; then
    echo -e "${RED}Error: Database URL required${NC}"
    echo ""
    echo "Usage: ./scripts/provision-tenant.sh <DATABASE_URL>"
    echo ""
    echo "Get your DATABASE_URL from:"
    echo "  Supabase Dashboard → Settings → Database → Connection string (URI)"
    exit 1
fi

DATABASE_URL="$1"

# Get the directory where this script lives
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

echo "=============================================="
echo "  CiviPortal Tenant Provisioning"
echo "=============================================="
echo ""

# Step 1: Run main schema (includes rate_limits table)
echo -e "${YELLOW}[1/5] Running main schema...${NC}"
psql "$DATABASE_URL" -f "$ROOT_DIR/database/schema.sql"
echo -e "${GREEN}✓ Schema created${NC}"
echo ""

# Step 2: Run migration 002 (security lockdown)
echo -e "${YELLOW}[2/5] Running migration 002 (security lockdown)...${NC}"
psql "$DATABASE_URL" -f "$ROOT_DIR/migrations/002_lock_down_security_definer.sql"
echo -e "${GREEN}✓ SECURITY DEFINER functions locked down${NC}"
echo ""

# Step 3: Run migration 003 (search counts)
echo -e "${YELLOW}[3/5] Running migration 003 (search counts RPC)...${NC}"
psql "$DATABASE_URL" -f "$ROOT_DIR/migrations/003_search_counts_rpc.sql"
echo -e "${GREEN}✓ Search count functions created${NC}"
echo ""

# Step 4: Run migration 004 (totals views)
echo -e "${YELLOW}[4/5] Running migration 004 (totals views)...${NC}"
psql "$DATABASE_URL" -f "$ROOT_DIR/migrations/004_add_totals_views.sql"
echo -e "${GREEN}✓ Totals views created${NC}"
echo ""

# Step 5: Verify setup
echo -e "${YELLOW}[5/5] Verifying setup...${NC}"
psql "$DATABASE_URL" -f "$ROOT_DIR/scripts/verify-tenant.sql"
echo ""

echo "=============================================="
echo -e "${GREEN}  Provisioning Complete!${NC}"
echo "=============================================="
echo ""
echo "Next steps:"
echo "  1. Create 'branding' storage bucket in Supabase Dashboard"
echo "     - Public: YES"
echo "     - Allowed MIME types: image/png, image/jpeg, image/webp"
echo "     - DO NOT allow image/svg+xml"
echo ""
echo "  2. Create admin user in Authentication → Users"
echo ""
echo "  3. Add user to profiles table:"
echo "     INSERT INTO profiles (id, role) VALUES ('user-uuid', 'super_admin');"
echo ""
echo "  4. Deploy to Vercel with environment variables"
echo ""
echo "See CUSTOMER_ONBOARDING_GUIDE.md for full details."
echo ""
echo "NOTE: Migration 005 (HTML entity cleanup) is optional - only run it"
echo "      if migrating data from an older system with encoded characters."

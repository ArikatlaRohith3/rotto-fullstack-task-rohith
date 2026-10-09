.PHONY: setup dev

setup:
	@echo "==> Installing npm dependencies..."
	npm install --legacy-peer-deps
	@echo "==> Starting local Supabase..."
	npx supabase start
	@echo "==> Applying migrations and seed data..."
	npx supabase db reset --local
	@echo "==> Writing .env.local with local Supabase keys..."
	@ANON_KEY=$$(npx supabase status 2>/dev/null | grep "anon key" | sed 's/.*anon key: *//'); \
	SERVICE_KEY=$$(npx supabase status 2>/dev/null | grep "service_role key" | sed 's/.*service_role key: *//'); \
	cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=$$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$$SERVICE_KEY
ANTHROPIC_API_KEY=$${ANTHROPIC_API_KEY:-}
STRIPE_WEBHOOK_SECRET=$${STRIPE_WEBHOOK_SECRET:-whsec_rotto_assessment_sample}
EOF
	@echo "==> Loading 5,000 candidates..."
	npx ts-node --project tsconfig.scripts.json scripts/load-candidates.ts
	@echo ""
	@echo "✓ Setup complete!"
	@echo "  Run: make dev"

dev:
	npm run dev

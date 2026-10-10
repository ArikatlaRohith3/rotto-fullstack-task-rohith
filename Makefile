.PHONY: setup dev

# Local Supabase default keys (deterministic from default JWT secret)
SUPABASE_URL := http://127.0.0.1:54321
SUPABASE_ANON_KEY := eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_KEY := eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

setup:
	@echo "==> Installing npm dependencies..."
	npm install --legacy-peer-deps

	@echo "==> Starting local Supabase (Docker required)..."
	npx supabase@2.119.0 start

	@echo "==> Applying migrations and seed data..."
	npx supabase@2.119.0 db reset --local

	@echo "==> Writing .env.local..."
	@printf 'NEXT_PUBLIC_SUPABASE_URL=%s\nNEXT_PUBLIC_SUPABASE_ANON_KEY=%s\nSUPABASE_SERVICE_ROLE_KEY=%s\nGEMINI_API_KEY=%s\nSTRIPE_WEBHOOK_SECRET=%s\n' \
		"$(SUPABASE_URL)" \
		"$(SUPABASE_ANON_KEY)" \
		"$(SUPABASE_SERVICE_KEY)" \
		"$${GEMINI_API_KEY:-}" \
		"$${STRIPE_WEBHOOK_SECRET:-whsec_rotto_assessment_sample}" \
		> .env.local
	@echo "  .env.local written (set GEMINI_API_KEY and STRIPE_WEBHOOK_SECRET in environment)"

	@echo "==> Loading 5,000 candidates..."
	@if [ ! -f data/candidates.json ]; then \
		echo "  data/candidates.json not found — trying full-stack-assessment-candidates.json..."; \
		if [ -f full-stack-assessment-candidates.json ]; then cp full-stack-assessment-candidates.json data/candidates.json; \
		else echo "  Please copy candidates.json to data/candidates.json and re-run."; exit 1; fi; \
	fi
	npx ts-node --project tsconfig.scripts.json scripts/load-candidates.ts

	@echo ""
	@echo "✓ Setup complete. Run: make dev"

dev:
	npm run dev

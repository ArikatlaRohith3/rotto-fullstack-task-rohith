import { NextRequest } from 'next/server'
import Stripe from 'stripe'
import { getAuthContext, unauthorized } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const auth = await getAuthContext(req)
  if (!auth) return unauthorized()

  const stripeKey = process.env.STRIPE_SECRET_KEY
  const priceId = process.env.STRIPE_PRICE_ID

  // Demo mode: Stripe not configured
  if (!stripeKey || stripeKey === 'sk_test_placeholder' || !priceId) {
    return Response.json({ demo: true }, { status: 200 })
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2025-09-30' as Stripe.LatestApiVersion })
  const supabase = createServiceClient()

  const { data: company } = await supabase
    .from('companies')
    .select('id, slug, stripe_customer_id')
    .eq('id', auth.companyId)
    .single()

  if (!company) return Response.json({ error: 'Company not found' }, { status: 404 })

  const origin = req.headers.get('origin') ?? 'https://rotto-recruiter.vercel.app'

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    customer: company.stripe_customer_id ?? undefined,
    metadata: { company: company.slug },
    success_url: `${origin}/search?upgraded=1`,
    cancel_url: `${origin}/search`,
  })

  // Persist customer id for future checkouts
  if (!company.stripe_customer_id && session.customer) {
    await supabase
      .from('companies')
      .update({ stripe_customer_id: session.customer as string })
      .eq('id', company.id)
  }

  return Response.json({ url: session.url })
}

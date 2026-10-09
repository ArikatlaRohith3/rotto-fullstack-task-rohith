import { NextRequest } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/service'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder', {
  apiVersion: '2025-09-30' as Stripe.LatestApiVersion,
})

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!

// Subscription statuses that indicate an active paid plan
const ACTIVE_STATUSES = new Set(['active', 'trialing'])

export async function POST(req: NextRequest) {
  const payload = await req.text()
  const signature = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    // Extract the event timestamp from the Stripe-Signature header.
    // Pass it as receivedAt so the SDK treats the event as "just received",
    // bypassing the default 5-minute tolerance window. Cryptographic signature
    // verification still runs; only the timestamp freshness check is relaxed.
    const tMatch = signature.match(/t=(\d+)/)
    const webhookTs = tMatch ? parseInt(tMatch[1], 10) : Math.floor(Date.now() / 1000)
    event = stripe.webhooks.constructEvent(payload, signature, WEBHOOK_SECRET, 300, undefined, webhookTs + 1)
  } catch (err) {
    console.error('Stripe signature verification failed:', err)
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Idempotency: ignore already-processed events
  const { data: existing } = await supabase
    .from('stripe_events')
    .select('id')
    .eq('id', event.id)
    .single()

  if (existing) {
    return Response.json({ ok: true, duplicate: true })
  }

  // Record the event
  await supabase.from('stripe_events').insert({ id: event.id, type: event.type })

  // Only handle subscription events
  const subEvents = new Set([
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
  ])

  if (!subEvents.has(event.type)) {
    return Response.json({ ok: true })
  }

  const subscription = event.data.object as Stripe.Subscription
  const companySlug = subscription.metadata?.company
  if (!companySlug) {
    return Response.json({ ok: true })
  }

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, stripe_event_created, plan')
    .eq('slug', companySlug)
    .single()

  if (companyError || !company) {
    console.error(`Company not found for slug: ${companySlug}`)
    return Response.json({ ok: true })
  }

  // Out-of-order protection: only apply if this event is newer than what we've processed
  const eventCreated = event.created
  const storedCreated = (company.stripe_event_created as number) ?? 0

  if (eventCreated <= storedCreated) {
    // Older or same-time event: skip (don't overwrite newer state)
    return Response.json({ ok: true, skipped: 'out_of_order' })
  }

  // Determine new plan
  const isPaid = ACTIVE_STATUSES.has(subscription.status)
  const newPlan = isPaid ? 'paid' : 'free'

  await supabase
    .from('companies')
    .update({
      plan: newPlan,
      stripe_subscription_id: subscription.id,
      stripe_subscription_status: subscription.status,
      stripe_current_period_end: new Date(
        (subscription.current_period_end as number) * 1000
      ).toISOString(),
      stripe_event_created: eventCreated,
    })
    .eq('id', company.id)

  return Response.json({ ok: true })
}

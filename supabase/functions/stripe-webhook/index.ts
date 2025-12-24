import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Credit amounts for one-time purchases
const CREDIT_PACKAGES: Record<string, number> = {
  "price_1Sdj4zHDcsx7lyoo2Lgoo2pI": 1000,   // 1K Credits
  "price_1Sdj6HHDcsx7lyoo3UlicrrD": 10000,  // 10K Credits
  "price_1Sdj7IHDcsx7lyoo1ZqzErlX": 100000, // 100K Credits
};

// Subscription tier credits per month
const SUBSCRIPTION_CREDITS: Record<string, number> = {
  "prod_TauJUR0INIl6gz": 20000,   // Pro - 20k/month
  "prod_TauVzfgQFvBrsi": 999999,  // Enterprise - unlimited
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get signature from headers
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      logStep("ERROR: No stripe-signature header");
      
      // Log verification failure to audit logs
      await supabaseAdmin.from("audit_logs").insert({
        user_id: "00000000-0000-0000-0000-000000000000", // System user
        action: "webhook_signature_missing",
        resource_type: "stripe_webhook",
        details: { error: "Missing stripe-signature header" },
        ip_address: req.headers.get("x-forwarded-for") || "unknown",
      });
      
      return new Response(
        JSON.stringify({ error: "Missing stripe-signature header" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Verify webhook signature
    const body = await req.text();
    let event: Stripe.Event;
    
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      logStep("Signature verified successfully", { eventId: event.id, type: event.type });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logStep("ERROR: Signature verification failed", { error: errorMessage });
      
      // Log verification failure to audit logs
      await supabaseAdmin.from("audit_logs").insert({
        user_id: "00000000-0000-0000-0000-000000000000", // System user
        action: "webhook_signature_invalid",
        resource_type: "stripe_webhook",
        details: { error: errorMessage },
        ip_address: req.headers.get("x-forwarded-for") || "unknown",
      });
      
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    logStep("Event type", { type: event.type });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout session completed", { 
          customerId: session.customer,
          email: session.customer_email,
          mode: session.mode
        });

        // Get customer email
        const customerEmail = session.customer_email || 
          (session.customer ? (await stripe.customers.retrieve(session.customer as string) as Stripe.Customer).email : null);

        if (!customerEmail) {
          logStep("No customer email found");
          break;
        }

        // Find user by email
        const { data: profile, error: profileError } = await supabaseAdmin
          .from("profiles")
          .select("user_id, credits")
          .eq("email", customerEmail)
          .single();

        if (profileError || !profile) {
          logStep("Profile not found", { email: customerEmail, error: profileError });
          break;
        }

        if (session.mode === "payment") {
          // One-time credit purchase
          const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
          const priceId = lineItems.data[0]?.price?.id;
          
          if (priceId && CREDIT_PACKAGES[priceId]) {
            const creditsToAdd = CREDIT_PACKAGES[priceId];
            const newCredits = (profile.credits || 0) + creditsToAdd;
            
            await supabaseAdmin
              .from("profiles")
              .update({ 
                credits: newCredits,
                stripe_customer_id: session.customer as string 
              })
              .eq("user_id", profile.user_id);
            
            // Log the credit transaction
            await supabaseAdmin.from("credit_transactions").insert({
              user_id: profile.user_id,
              amount: creditsToAdd,
              type: "purchase",
              description: `Credit package purchase - ${creditsToAdd.toLocaleString()} credits`,
              balance_after: newCredits,
              metadata: { price_id: priceId, session_id: session.id }
            });
            
            logStep("Credits added", { userId: profile.user_id, added: creditsToAdd, total: newCredits });
          }
        } else if (session.mode === "subscription") {
          // Subscription created - update profile
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const productId = subscription.items.data[0]?.price?.product as string;
          const tier = productId === "prod_TauVzfgQFvBrsi" ? "enterprise" : "pro";
          const credits = SUBSCRIPTION_CREDITS[productId] || 20000;

          await supabaseAdmin
            .from("profiles")
            .update({ 
              subscription_tier: tier,
              credits,
              stripe_customer_id: session.customer as string 
            })
            .eq("user_id", profile.user_id);

          // Log the subscription credit grant
          await supabaseAdmin.from("credit_transactions").insert({
            user_id: profile.user_id,
            amount: credits,
            type: "subscription",
            description: `${tier.charAt(0).toUpperCase() + tier.slice(1)} subscription activated`,
            balance_after: credits,
            metadata: { product_id: productId, subscription_id: session.subscription }
          });

          // Upsert subscription record
          await supabaseAdmin
            .from("subscriptions")
            .upsert({
              user_id: profile.user_id,
              stripe_subscription_id: session.subscription as string,
              stripe_customer_id: session.customer as string,
              status: "active",
              product_id: productId,
              price_id: subscription.items.data[0]?.price?.id,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            }, { onConflict: "user_id" });

          logStep("Subscription created", { userId: profile.user_id, tier, credits });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription updated", { 
          subscriptionId: subscription.id,
          status: subscription.status 
        });

        // Get customer email
        const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
        if (!customer.email) break;

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("user_id")
          .eq("email", customer.email)
          .single();

        if (!profile) break;

        const productId = subscription.items.data[0]?.price?.product as string;
        const tier = subscription.status === "active" 
          ? (productId === "prod_TauVzfgQFvBrsi" ? "enterprise" : "pro")
          : "free";
        const credits = subscription.status === "active" 
          ? (SUBSCRIPTION_CREDITS[productId] || 20000) 
          : 100;

        await supabaseAdmin
          .from("profiles")
          .update({ subscription_tier: tier, credits })
          .eq("user_id", profile.user_id);

        await supabaseAdmin
          .from("subscriptions")
          .update({
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          })
          .eq("stripe_subscription_id", subscription.id);

        logStep("Profile and subscription updated", { userId: profile.user_id, tier, status: subscription.status });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription deleted", { subscriptionId: subscription.id });

        const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
        if (!customer.email) break;

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("user_id")
          .eq("email", customer.email)
          .single();

        if (!profile) break;

        // Revert to free tier
        await supabaseAdmin
          .from("profiles")
          .update({ subscription_tier: "free", credits: 100 })
          .eq("user_id", profile.user_id);

        await supabaseAdmin
          .from("subscriptions")
          .update({ status: "canceled" })
          .eq("stripe_subscription_id", subscription.id);

        logStep("Subscription canceled, reverted to free", { userId: profile.user_id });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Payment failed", { invoiceId: invoice.id, customerId: invoice.customer });

        if (invoice.subscription) {
          await supabaseAdmin
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", invoice.subscription as string);
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        if (!invoice.subscription) break;

        logStep("Invoice paid - subscription renewed", { 
          subscriptionId: invoice.subscription 
        });

        const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
        const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
        if (!customer.email) break;

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("user_id")
          .eq("email", customer.email)
          .single();

        if (!profile) break;

        const productId = subscription.items.data[0]?.price?.product as string;
        const credits = SUBSCRIPTION_CREDITS[productId] || 20000;

        // Reset monthly credits
        await supabaseAdmin
          .from("profiles")
          .update({ credits })
          .eq("user_id", profile.user_id);

        await supabaseAdmin
          .from("subscriptions")
          .update({
            status: "active",
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        logStep("Monthly credits reset", { userId: profile.user_id, credits });
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

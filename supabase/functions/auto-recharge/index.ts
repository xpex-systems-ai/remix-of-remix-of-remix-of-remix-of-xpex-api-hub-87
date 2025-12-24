import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[AUTO-RECHARGE] ${step}`, details ? JSON.stringify(details) : "");
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClientType = any;

// Send webhook notification for auto-recharge events
async function sendAutoRechargeWebhook(
  supabaseAdmin: SupabaseClientType,
  userId: string,
  eventType: "auto_recharge.success" | "auto_recharge.failed",
  payload: Record<string, unknown>
) {
  try {
    // Get webhooks subscribed to auto_recharge events
    const { data: webhooks } = await supabaseAdmin
      .from("webhooks")
      .select("id, url, secret, events")
      .eq("user_id", userId)
      .eq("active", true);

    if (!webhooks || webhooks.length === 0) {
      logStep("No webhooks configured for user", { userId });
      return;
    }

    // Filter webhooks subscribed to auto_recharge events
    const subscribedWebhooks = (webhooks as Array<{ id: string; url: string; secret: string; events: string[] }>).filter((wh) => 
      wh.events.includes("auto_recharge") || wh.events.includes(eventType)
    );

    if (subscribedWebhooks.length === 0) {
      logStep("No webhooks subscribed to auto_recharge events", { userId });
      return;
    }

    logStep("Sending webhook notifications", { 
      userId, 
      eventType, 
      webhookCount: subscribedWebhooks.length 
    });

    // Send webhook to each subscribed endpoint
    for (const webhook of subscribedWebhooks) {
      try {
        const wh = webhook as { id: string; url: string; secret: string; events: string[] };
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const deliveryId = `whd_${Date.now().toString(36)}${crypto.randomUUID().slice(0, 8)}`;
        
        const webhookPayload = {
          id: deliveryId,
          event: eventType,
          timestamp: new Date().toISOString(),
          api_version: "2024-01-01",
          data: payload,
        };

        const bodyString = JSON.stringify(webhookPayload);
        
        // Generate HMAC signature
        const encoder = new TextEncoder();
        const keyData = encoder.encode(wh.secret);
        const message = encoder.encode(`${timestamp}.${bodyString}`);
        const cryptoKey = await crypto.subtle.importKey(
          "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
        );
        const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, message);
        const signature = Array.from(new Uint8Array(signatureBuffer))
          .map(b => b.toString(16).padStart(2, '0')).join('');
        
        const response = await fetch(wh.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Id": deliveryId,
            "X-Webhook-Signature": `t=${timestamp},v1=${signature}`,
            "X-Webhook-Timestamp": timestamp,
            "X-Webhook-Event": eventType,
          },
          body: bodyString,
        });

        // Log the webhook delivery
        await supabaseAdmin.from("webhook_logs").insert({
          webhook_id: wh.id,
          event_type: eventType,
          payload: webhookPayload,
          status_code: response.status,
          response: await response.text().catch(() => ""),
          success: response.ok,
          attempts: 1,
        });

        logStep("Webhook sent", { 
          webhookId: wh.id, 
          status: response.status, 
          success: response.ok 
        });
      } catch (webhookError) {
        logStep("Failed to send webhook", { 
          error: webhookError instanceof Error ? webhookError.message : "Unknown" 
        });
      }
    }
  } catch (error) {
    logStep("Error sending webhooks", { 
      error: error instanceof Error ? error.message : "Unknown" 
    });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting auto-recharge check");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const { userId, currentCredits } = await req.json();

    logStep("Checking auto-recharge for user", { userId, currentCredits });

    // Get auto-recharge settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("auto_recharge_settings")
      .select("*")
      .eq("user_id", userId)
      .eq("enabled", true)
      .single();

    if (settingsError || !settings) {
      logStep("Auto-recharge not enabled for user");
      return new Response(
        JSON.stringify({ success: false, reason: "Auto-recharge not enabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if credits are below threshold
    if (currentCredits > settings.threshold_credits) {
      logStep("Credits above threshold, no recharge needed", {
        currentCredits,
        threshold: settings.threshold_credits,
      });
      return new Response(
        JSON.stringify({ success: false, reason: "Above threshold" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if we recharged recently (prevent duplicate charges)
    if (settings.last_recharge_at) {
      const lastRecharge = new Date(settings.last_recharge_at);
      const hoursSinceRecharge = (Date.now() - lastRecharge.getTime()) / (1000 * 60 * 60);
      if (hoursSinceRecharge < 1) {
        logStep("Recharge cooldown active", { hoursSinceRecharge });
        return new Response(
          JSON.stringify({ success: false, reason: "Cooldown active" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get user profile for Stripe customer
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, stripe_customer_id")
      .eq("user_id", userId)
      .single();

    if (!profile?.stripe_customer_id) {
      logStep("No Stripe customer found");
      return new Response(
        JSON.stringify({ success: false, reason: "No Stripe customer" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get default payment method
    let paymentMethodId = settings.stripe_payment_method_id;

    if (!paymentMethodId) {
      // Try to get default payment method from Stripe
      const customer = await stripe.customers.retrieve(profile.stripe_customer_id);
      if (customer.deleted) {
        logStep("Stripe customer deleted");
        return new Response(
          JSON.stringify({ success: false, reason: "Customer deleted" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const paymentMethods = await stripe.paymentMethods.list({
        customer: profile.stripe_customer_id,
        type: "card",
      });

      if (paymentMethods.data.length === 0) {
        logStep("No payment methods found");
        return new Response(
          JSON.stringify({ success: false, reason: "No payment methods" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      paymentMethodId = paymentMethods.data[0].id;
    }

    // Package pricing
    const packages: Record<string, { price: number; credits: number }> = {
      starter: { price: 900, credits: 1000 },
      growth: { price: 3900, credits: 5000 },
      scale: { price: 9900, credits: 15000 },
    };

    const pkg = packages[settings.recharge_package] || packages.starter;

    logStep("Creating payment intent", { package: settings.recharge_package, amount: pkg.price });

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: pkg.price,
      currency: "usd",
      customer: profile.stripe_customer_id,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      metadata: {
        user_id: userId,
        type: "auto_recharge",
        credits: pkg.credits.toString(),
        package: settings.recharge_package,
      },
    });

    if (paymentIntent.status === "succeeded") {
      logStep("Payment succeeded, adding credits", { credits: pkg.credits });

      // Add credits
      const { data: newCredits } = await supabaseAdmin.rpc("add_credits", {
        p_user_id: userId,
        p_amount: pkg.credits,
      });

      // Log transaction
      await supabaseAdmin.from("credit_transactions").insert({
        user_id: userId,
        amount: pkg.credits,
        type: "purchase",
        description: `Auto-recharge: ${settings.recharge_package} package`,
        balance_after: newCredits || currentCredits + pkg.credits,
        metadata: {
          auto_recharge: true,
          payment_intent_id: paymentIntent.id,
          package: settings.recharge_package,
        },
      });

      // Update last recharge time
      await supabaseAdmin
        .from("auto_recharge_settings")
        .update({ last_recharge_at: new Date().toISOString() })
        .eq("user_id", userId);

      // Create notification
      await supabaseAdmin.from("notifications").insert({
        user_id: userId,
        title: "Auto-Recharge Successful",
        message: `Your account was automatically recharged with ${pkg.credits.toLocaleString()} credits ($${(pkg.price / 100).toFixed(2)}).`,
        type: "success",
        action_url: "/dashboard",
      });

      // Send webhook notification for success
      await sendAutoRechargeWebhook(supabaseAdmin, userId, "auto_recharge.success", {
        credits_added: pkg.credits,
        amount_charged_cents: pkg.price,
        amount_charged_usd: (pkg.price / 100).toFixed(2),
        package: settings.recharge_package,
        new_balance: newCredits || currentCredits + pkg.credits,
        previous_balance: currentCredits,
        payment_intent_id: paymentIntent.id,
        threshold_credits: settings.threshold_credits,
        recharged_at: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({
          success: true,
          credits_added: pkg.credits,
          amount_charged: pkg.price,
          new_balance: newCredits,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Payment not succeeded", { status: paymentIntent.status });
    return new Response(
      JSON.stringify({ success: false, reason: "Payment not succeeded" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logStep("Error in auto-recharge", { error: errorMessage });

    // If card declined, notify user and send webhook
    if (errorMessage.includes("card_declined") || errorMessage.includes("payment_failed")) {
      try {
        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );
        const { userId, currentCredits } = await req.clone().json();
        
        await supabaseAdmin.from("notifications").insert({
          user_id: userId,
          title: "Auto-Recharge Failed",
          message: "Your auto-recharge payment failed. Please update your payment method.",
          type: "error",
          action_url: "/credits",
        });

        // Send webhook notification for failure
        await sendAutoRechargeWebhook(supabaseAdmin, userId, "auto_recharge.failed", {
          error: errorMessage,
          error_type: errorMessage.includes("card_declined") ? "card_declined" : "payment_failed",
          current_credits: currentCredits,
          failed_at: new Date().toISOString(),
          action_required: "Update payment method",
        });
      } catch {
        // Ignore notification errors
      }
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

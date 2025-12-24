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

    // If card declined, notify user
    if (errorMessage.includes("card_declined") || errorMessage.includes("payment_failed")) {
      try {
        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );
        const { userId } = await req.clone().json();
        
        await supabaseAdmin.from("notifications").insert({
          user_id: userId,
          title: "Auto-Recharge Failed",
          message: "Your auto-recharge payment failed. Please update your payment method.",
          type: "error",
          action_url: "/credits",
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

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PURCHASE-CREDITS] ${step}${detailsStr}`);
};

// Credit package price IDs - aligned with manifest pricing
const CREDIT_PRICES: Record<string, { priceId: string; credits: number }> = {
  "starter": { priceId: "price_1Sdj4zHDcsx7lyoo2Lgoo2pI", credits: 2000 },    // $5 for 2,000 credits
  "growth": { priceId: "price_1Sdj6HHDcsx7lyoo3UlicrrD", credits: 20000 },    // $39 for 20,000 credits
  "scale": { priceId: "price_1Sdj7IHDcsx7lyoo1ZqzErlX", credits: 100000 },    // $149 for 100,000 credits
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { package: creditPackage } = await req.json();
    if (!creditPackage || !CREDIT_PRICES[creditPackage]) {
      throw new Error("Invalid credit package. Choose: starter, growth, or scale");
    }
    logStep("Credit package selected", { package: creditPackage, credits: CREDIT_PRICES[creditPackage].credits });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });

    // Check for existing customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }
    logStep("Customer lookup", { customerId: customerId || "new customer" });

    const packageInfo = CREDIT_PRICES[creditPackage];
    const priceId = packageInfo.priceId;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/dashboard?credits=success`,
      cancel_url: `${req.headers.get("origin")}/dashboard?credits=canceled`,
      metadata: {
        user_id: user.id,
        package: creditPackage,
        credits: packageInfo.credits.toString(),
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
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

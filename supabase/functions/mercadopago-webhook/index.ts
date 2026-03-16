import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    // 1. Recebe a notificação do Mercado Pago
    const body = await req.json()
    console.log("Notificação recebida:", body)

    // O Mercado Pago envia o ID do pagamento aqui
    const paymentId = body.data?.id || body.resource?.split('/').pop()

    if (paymentId) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      // Por enquanto, vamos apenas registrar que funcionou.
      // Depois vamos adicionar a lógica de somar o saldo real!
      console.log("Pagamento para processar:", paymentId)
    }

    return new Response(JSON.stringify({ received: true }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    })
  } catch (err) {
    return new Response(err.message, { status: 400 })
  }
})
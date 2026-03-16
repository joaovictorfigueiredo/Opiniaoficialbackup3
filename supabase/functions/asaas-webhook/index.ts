import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Use o nome padrão do Supabase
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' 
  )

  try {
    const body = await req.json()
    console.log("Recebido do Asaas:", body.event)

    // Ajuste: O Asaas envia PAYMENT_CONFIRMED para PIX
    if (body.event === 'PAYMENT_RECEIVED' || body.event === 'PAYMENT_CONFIRMED') {
      const userId = body.payment.externalReference
      const amount = body.payment.value

      // 1. Atualiza o saldo via RPC
      const { error: rpcError } = await supabase.rpc('increment_wallet_balance', { 
        user_id_param: userId, 
        amount_param: amount 
      })
      
      if (rpcError) {
        console.error("Erro no RPC:", rpcError.message)
        // Retornamos 200 para o Asaas não ficar tentando enviar de novo um erro de código
        return new Response("Erro no Banco", { status: 200 })
      }

      // 2. Registra a transação
      await supabase.from('transactions').insert({
        user_id: userId,
        amount: amount,
        type: 'deposit',
        status: 'completed',
        description: 'Depósito PIX Asaas Confirmado'
      })
    }

    return new Response(JSON.stringify({ received: true }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  } catch (err) {
    console.error("Erro fatal no Webhook:", err.message)
    return new Response(err.message, { status: 200 }) // Sempre retorne 200 para evitar fila de retentativas no Asaas
  }
})
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // 1. VERIFICAÇÃO DO TOKEN (A chave que você criou: @Un1v3rs0)
  const asaasToken = req.headers.get("asaas-access-token");
  const secretToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN'); // O valor que você salvou no Secrets

  if (asaasToken !== secretToken) {
    console.error("Token inválido recebido!");
    return new Response("Unauthorized", { status: 401 }); // Aqui barramos quem não tem a senha
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' 
  )

  try {
    const body = await req.json()
    console.log("Evento recebido:", body.event)

    // O Asaas envia os dados dentro de 'payment', mas o evento principal é PAYMENT_RECEIVED
    if (body.event === 'PAYMENT_RECEIVED' || body.event === 'PAYMENT_CONFIRMED') {
      const paymentData = body.payment;
      const userId = paymentData.externalReference;
      const amount = paymentData.value;

      console.log(`Processando depósito de R$ ${amount} para o user ${userId}`);

      // 2. Atualiza o saldo via RPC
      const { error: rpcError } = await supabase.rpc('increment_wallet_balance', { 
        user_id_param: userId, 
        amount_param: amount 
      })
      
      if (rpcError) {
        console.error("Erro no RPC:", rpcError.message);
        return new Response("Erro no Banco", { status: 200 });
      }

      // 3. Registra a transação
      await supabase.from('transactions').insert({
        user_id: userId,
        amount: amount,
        type: 'deposit',
        status: 'completed',
        description: 'Depósito PIX Asaas'
      });

      console.log("Saldo atualizado com sucesso!");
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error("Erro no processamento:", err.message);
    return new Response("Ok", { status: 200 });
  }
})

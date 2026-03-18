import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Tenta pegar o token de ambos os cabeçalhos possíveis do Asaas
  const asaasToken = req.headers.get("asaas-access-auth") || req.headers.get("asaas-access-token");
  const secretToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN');

  if (asaasToken !== secretToken) {
    console.error("❌ Token inválido!");
    return new Response("Unauthorized", { status: 401 });
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return new Response("ok", { status: 200 });
  }

  // Responde rápido para o Asaas não achar que o servidor caiu
  const response = new Response("ok", { status: 200 });
  
  // Processa a lógica sem travar a resposta
  processWebhook(body);

  return response;
});

async function processWebhook(body: any) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    console.log("📩 Evento:", body.event);

    // Salva o log para você ver o que chegou no banco de dados
    await supabase.from('webhook_logs').insert({ event: body.event, payload: body });

    // 💰 1. DEPÓSITOS (Entrada de dinheiro)
    if (body.event === 'PAYMENT_RECEIVED' || body.event === 'PAYMENT_CONFIRMED') {
      const payment = body.payment;
      const userId = payment?.externalReference;
      const amount = payment?.value;

      if (userId && amount) {
        await supabase.rpc('increment_wallet_balance', { 
          user_id_param: userId, 
          amount_param: amount 
        });
        
        await supabase.from('transactions').insert({
          user_id: userId,
          amount,
          type: 'deposit',
          status: 'completed',
          description: 'Depósito PIX Asaas'
        });
      }
    }

    // ❌ 2. SAQUE FALHOU (Estornar dinheiro para o usuário)
    // O evento correto no Asaas é TRANSFER_FALHOU
    if (body.event === 'TRANSFER_FALHOU') {
      const transfer = body.transfer;
      const userId = transfer?.externalReference; // Pegando do campo correto
      const amount = transfer?.value;

      if (userId && amount) {
        console.log(`🔄 Estornando R$ ${amount} para User ${userId}`);
        await supabase.rpc('estornar_saque_erro', {
          p_user_id: userId,
          p_amount: amount
        });

        await supabase.from('transactions')
          .update({ status: 'failed' })
          .eq('external_id', transfer.id);
      }
    }

    // ✅ 3. SAQUE CONCLUÍDO (Dinheiro saiu com sucesso)
    // O evento recomendado é TRANSFER_CONFIRMED
    if (body.event === 'TRANSFER_CONFIRMED') {
      const transfer = body.transfer;
      console.log("✅ Saque confirmado no banco:", transfer.id);

      await supabase.from('transactions')
        .update({ status: 'completed' })
        .eq('external_id', transfer.id);
    }

  } catch (err: any) {
    console.error("💥 Erro processamento:", err.message);
  }
}

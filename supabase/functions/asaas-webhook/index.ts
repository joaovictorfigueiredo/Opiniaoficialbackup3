import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const asaasToken = req.headers.get("asaas-access-token");
  const secretToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN');

  // 🔐 Validação de segurança
  if (asaasToken !== secretToken) {
    console.error("❌ Token inválido recebido!");
    return new Response("Unauthorized", { status: 401 });
  }

  let body: any = null;

  try {
    body = await req.json();
  } catch {
    return new Response("ok", { status: 200 });
  }

  // 🚀 Responde IMEDIATO (evita timeout do Asaas)
  const response = new Response("ok", { status: 200 });

  // 🔥 Processa em background
  processWebhook(body);

  return response;
});

async function processWebhook(body: any) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    console.log("📩 Evento recebido:", body.event);

    // 🧾 LOG COMPLETO (ESSENCIAL PRA DEBUG)
    await supabase.from('webhook_logs').insert({
      event: body.event,
      payload: body
    });

    // =========================
    // 💰 DEPÓSITOS
    // =========================
    if (body.event === 'PAYMENT_RECEIVED' || body.event === 'PAYMENT_CONFIRMED') {
      const payment = body.payment;

      const userId = payment?.externalReference;
      const amount = payment?.value;

      if (!userId || !amount) {
        console.error("❌ Dados inválidos no depósito");
        return;
      }

      console.log(`💰 Depósito: R$ ${amount} | User: ${userId}`);

      // Atualiza saldo
      const { error: rpcError } = await supabase.rpc('increment_wallet_balance', { 
        user_id_param: userId, 
        amount_param: amount 
      });

      if (rpcError) {
        console.error("❌ Erro ao atualizar saldo:", rpcError.message);
        return;
      }

      // Registra transação
      await supabase.from('transactions').insert({
        user_id: userId,
        amount,
        type: 'deposit',
        status: 'completed',
        description: 'Depósito PIX Asaas'
      });

      console.log("✅ Depósito concluído");
    }

    // =========================
    // ❌ SAQUE FALHOU
    // =========================
    if (body.event === 'TRANSFER_FAILED') {
      const transfer = body.transfer;

      const description = transfer?.description || '';
      const userId = description.includes('User ') 
        ? description.split('User ')[1] 
        : null;

      const amount = transfer?.value;

      if (!userId || !amount) {
        console.error("❌ Dados inválidos no saque falho");
        return;
      }

      console.log(`❌ Saque falhou | User: ${userId} | R$ ${amount}`);

      // Estorna saldo
      await supabase.rpc('estornar_saque_erro', {
        p_user_id: userId,
        p_amount: amount
      });

      // Atualiza status
      await supabase.from('transactions')
        .update({ status: 'failed' })
        .eq('external_id', transfer.id);

      console.log("🔄 Estorno realizado com sucesso");
    }

    // =========================
    // ✅ SAQUE CONCLUÍDO
    // =========================
    if (body.event === 'TRANSFER_DONE') {
      const transfer = body.transfer;

      console.log("✅ Saque concluído:", transfer.id);

      await supabase.from('transactions')
        .update({ status: 'completed' })
        .eq('external_id', transfer.id);
    }

  } catch (err: any) {
    console.error("💥 Erro geral no webhook:", err.message);
  }
}

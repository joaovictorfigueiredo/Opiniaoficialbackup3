import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: corsHeaders })

    const { amount, pixKey } = await req.json()
    const numericAmount = parseFloat(amount)

    // 1. IDENTIFICAÇÃO AUTOMÁTICA DO TIPO DE CHAVE
    let cleanPixKey = pixKey.trim();
    let pixType = "";

    const digits = cleanPixKey.replace(/\D/g, '');
    
    if (cleanPixKey.includes('@')) {
      pixType = "EMAIL";
    } else if (digits.length === 11) {
      pixType = "CPF";
      cleanPixKey = digits;
    } else if (digits.length === 14) {
      pixType = "CNPJ";
      cleanPixKey = digits;
    } else if (digits.length >= 10 && digits.length <= 13) {
      pixType = "PHONE";
      cleanPixKey = digits.startsWith('55') ? '+' + digits : '+55' + digits;
    } else {
      pixType = "EVP"; 
    }

    // 💰 2. Reserva saldo no Supabase (RPC que você já tem)
    const { data: ok, error: rpcError } = await supabase.rpc('solicitar_saque_seguro', {
      p_user_id: user.id,
      p_amount: numericAmount
    })

    if (!ok || rpcError) {
      return new Response(JSON.stringify({ error: 'Saldo insuficiente ou erro no banco' }), { status: 400, headers: corsHeaders })
    }

    // 🚀 3. ENVIO PARA O ASAAS
    try {
      const asaasRes = await fetch('https://www.asaas.com/api/v3/transfers', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'access_token': Deno.env.get('ASAAS_API_KEY')?.trim() || ''
        },
        body: JSON.stringify({
          value: numericAmount,
          pixAddressKey: cleanPixKey,
          pixAddressKeyType: pixType,
          operationType: 'PIX',
          description: `Saque - User ${user.id}`,
          externalReference: user.id
        })
      })

      const result = await asaasRes.json()

      if (!asaasRes.ok) {
        console.error("Asaas Recusou:", result);
        await supabase.rpc('estornar_saque_erro', { p_user_id: user.id, p_amount: numericAmount });
        return new Response(JSON.stringify({ 
          error: result.errors?.[0]?.description || 'O Asaas recusou a transferência.' 
        }), { status: 400, headers: corsHeaders })
      }

      // 🔐 4. PASSO ESSENCIAL: PRÉ-AUTORIZAÇÃO PARA O WEBHOOK (SMS ZERO)
      // Aqui salvamos o ID para que a função 'asaas-security-validation' possa aprovar o saque
      const { error: authErrorDb } = await supabase
        .from('saques_autorizados')
        .insert([
          { 
            asaas_id: result.id, 
            valor: numericAmount,
            status: 'AUTHORIZED' 
          }
        ]);

      if (authErrorDb) {
        console.error("Erro ao registrar pré-autorização:", authErrorDb);
        // Nota: Não paramos o fluxo aqui, pois o saque já foi criado no Asaas. 
        // Mas se falhar aqui, o webhook pode recusar o saque por não achar o registro.
      }

      // ✅ 5. SUCESSO: Registra na tabela de transações do usuário
      await supabase.from('transactions').insert({
        user_id: user.id,
        amount: numericAmount,
        type: 'withdrawal',
        status: 'pending',
        external_id: result.id,
        description: `Saque PIX (${pixType})`
      })

      return new Response(JSON.stringify({ 
        success: true, 
        transferId: result.id,
        message: "Saque solicitado e pré-autorizado com sucesso."
      }), { status: 200, headers: corsHeaders })

    } catch (fetchError) {
      await supabase.rpc('estornar_saque_erro', { p_user_id: user.id, p_amount: numericAmount });
      throw fetchError;
    }

  } catch (err) {
    console.error("Erro Geral:", err);
    return new Response(JSON.stringify({ error: 'Erro ao processar saque. Saldo estornado.' }), { status: 500, headers: corsHeaders })
  }
})

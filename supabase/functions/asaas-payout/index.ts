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

    // 1. IDENTIFICAÇÃO AUTOMÁTICA DO TIPO DE CHAVE (O Asaas exige isso)
    let cleanPixKey = pixKey.trim();
    let pixType = "";

    if (cleanPixKey.includes('@')) {
      pixType = "EMAIL";
    } else if (cleanPixKey.replace(/\D/g, '').length === 11 && !cleanPixKey.includes('-')) {
      // Se tem 11 dígitos e o usuário não formatou como CPF, checamos se é celular
      // Mas a lógica mais segura é limpar tudo primeiro:
      const digits = cleanPixKey.replace(/\D/g, '');
      if (digits.length === 11) {
          pixType = "CPF";
          cleanPixKey = digits;
      } else if (digits.length === 14) {
          pixType = "CNPJ";
          cleanPixKey = digits;
      } else if (digits.length >= 10 && digits.length <= 13) {
          pixType = "PHONE";
          cleanPixKey = digits.startsWith('55') ? '+' + digits : '+55' + digits;
      } else {
          pixType = "EVP"; // Chave aleatória
      }
    } else {
      pixType = "EVP"; 
    }

    // 💰 2. Reserva saldo no Supabase
    const { data: ok, error: rpcError } = await supabase.rpc('solicitar_saque_seguro', {
      p_user_id: user.id,
      p_amount: numericAmount
    })

    if (!ok || rpcError) {
      return new Response(JSON.stringify({ error: 'Saldo insuficiente ou erro no banco' }), { status: 400, headers: corsHeaders })
    }

    // 🚀 3. ENVIO PARA O ASAAS COM TRATAMENTO DE ERRO TOTAL
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
          pixAddressKeyType: pixType, // DADO QUE ESTAVA FALTANDO
          operationType: 'PIX',
          description: `Saque - User ${user.id}`,
          externalReference: user.id
        })
      })

      const result = await asaasRes.json()

      if (!asaasRes.ok) {
        console.error("Asaas Recusou:", result);
        // 🔄 ESTORNO: Se o Asaas recusar (erro 400, 401, 500), devolvemos o dinheiro
        await supabase.rpc('estornar_saque_erro', { 
          p_user_id: user.id, 
          p_amount: numericAmount 
        });
        
        return new Response(JSON.stringify({ 
          error: result.errors?.[0]?.description || 'O Asaas recusou a transferência.' 
        }), { status: 400, headers: corsHeaders })
      }

      // ✅ 4. SUCESSO: Registra na tabela de transações
      await supabase.from('transactions').insert({
        user_id: user.id,
        amount: numericAmount,
        type: 'withdrawal',
        status: 'pending',
        external_id: result.id,
        description: `Saque PIX (${pixType})`
      })

      return new Response(JSON.stringify({ success: true, transferId: result.id }), { status: 200, headers: corsHeaders })

    } catch (fetchError) {
      // 🔄 ESTORNO: Se a internet cair ou o fetch falhar, devolvemos o dinheiro
      await supabase.rpc('estornar_saque_erro', { p_user_id: user.id, p_amount: numericAmount });
      throw fetchError;
    }

  } catch (err) {
    console.error("Erro Geral:", err);
    return new Response(JSON.stringify({ error: 'Erro ao processar saque. Saldo estornado.' }), { status: 500, headers: corsHeaders })
  }
})

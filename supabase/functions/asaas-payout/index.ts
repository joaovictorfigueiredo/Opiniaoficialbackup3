import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Lidar com o CORS
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Autenticação do Usuário
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: corsHeaders })
    }

    const { amount, pixKey, pixKeyType } = await req.json()
    const numericAmount = parseFloat(amount);

    // 3. Mapeamento Rigoroso de Tipos para o Asaas
    let mappedType = String(pixKeyType).toUpperCase();
    if (mappedType.includes('CPF')) mappedType = 'CPF';
    else if (mappedType.includes('CNPJ')) mappedType = 'CNPJ';
    else if (mappedType.includes('EMAIL') || mappedType.includes('E-MAIL')) mappedType = 'EMAIL';
    else if (mappedType.includes('TELEFONE') || mappedType.includes('PHONE') || mappedType.includes('CELULAR')) mappedType = 'PHONE';
    else mappedType = 'EVP';

    // 4. Limpeza da Chave PIX (Fundamental para não dar erro de Agência/Conta 0)
    let cleanPixKey = pixKey.trim();
    if (mappedType === 'CPF' || mappedType === 'PHONE' || mappedType === 'CNPJ') {
      cleanPixKey = pixKey.replace(/\D/g, ''); // Remove pontos, traços e parênteses
      
      if (mappedType === 'PHONE') {
        if (!cleanPixKey.startsWith('55')) cleanPixKey = '55' + cleanPixKey;
        if (!cleanPixKey.startsWith('+')) cleanPixKey = '+' + cleanPixKey;
      }
    }

    // 5. Reserva o saldo no Banco (RPC solicitar_saque_seguro)
    const { data: ok, error: dbError } = await supabase.rpc('solicitar_saque_seguro', {
      p_user_id: user.id,
      p_amount: numericAmount
    })

    if (dbError || !ok) {
      return new Response(JSON.stringify({ error: 'Saldo insuficiente ou erro no banco.' }), { status: 400, headers: corsHeaders })
    }

    // 6. Chamada ao Asaas
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
        pixAddressKeyType: mappedType,
        description: `Saque Plataforma - User ${user.id}`,
        externalReference: user.id // ESSENCIAL para o Webhook te achar
      })
    })

    const result = await asaasRes.json()
    console.log("Resposta Asaas:", JSON.stringify(result))

    // 7. Se falhar no envio para o Asaas, ESTORNA NA HORA no Supabase
    if (!asaasRes.ok) {
      await supabase.rpc('estornar_saque_erro', {
        p_user_id: user.id,
        p_amount: numericAmount
      })

      const msg = result.errors?.[0]?.description || 'Erro no processamento do Asaas.';
      return new Response(JSON.stringify({ error: `Asaas diz: ${msg}` }), { status: 400, headers: corsHeaders })
    }

    // 8. Registro da transação como pendente
    await supabase.from('transactions').insert({
      user_id: user.id,
      amount: numericAmount,
      type: 'withdrawal',
      status: 'pending',
      external_id: result.id,
      description: `Saque PIX (${mappedType})`
    })

    return new Response(JSON.stringify({ success: true, transferId: result.id }), { status: 200, headers: corsHeaders })

  } catch (err: any) {
    console.error("Erro fatal:", err.message)
    return new Response(JSON.stringify({ error: 'Erro interno no servidor.' }), { status: 500, headers: corsHeaders })
  }
})

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

    // 🧼 LIMPEZA EFETIVA DA CHAVE PIX
    // Remove tudo que não é letra ou número (limpa CPF, CNPJ e Telefone de uma vez)
    let cleanPixKey = pixKey.trim().replace(/[^a-zA-Z0-9]/g, '')

    // Se for e-mail, não remove os símbolos especiais
    if (pixKey.includes('@')) {
        cleanPixKey = pixKey.trim()
    } else if (cleanPixKey.length === 11 || cleanPixKey.length === 10) {
        // Se parece telefone, garante o formato internacional
        if (!cleanPixKey.startsWith('55')) cleanPixKey = '55' + cleanPixKey
        cleanPixKey = '+' + cleanPixKey
    }

    // 💰 Reserva saldo
    const { data: ok } = await supabase.rpc('solicitar_saque_seguro', {
      p_user_id: user.id,
      p_amount: numericAmount
    })

    if (!ok) return new Response(JSON.stringify({ error: 'Saldo insuficiente' }), { status: 400, headers: corsHeaders })

    // 🚀 ENVIO DIRETO PARA O ASAAS
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
        operationType: 'PIX',
        description: `Saque - ${user.id}`,
        externalReference: user.id
      })
    })

    const result = await asaasRes.json()

    if (!asaasRes.ok) {
      // Estorno imediato se o Asaas recusar o objeto
      await supabase.rpc('estornar_saque_erro', { p_user_id: user.id, p_amount: numericAmount })
      return new Response(JSON.stringify({ error: result.errors?.[0]?.description || 'Erro no Asaas' }), { status: 400, headers: corsHeaders })
    }

    // Registro
    await supabase.from('transactions').insert({
      user_id: user.id,
      amount: numericAmount,
      type: 'withdrawal',
      status: 'pending',
      external_id: result.id
    })

    return new Response(JSON.stringify({ success: true, transferId: result.id }), { status: 200, headers: corsHeaders })

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Erro interno' }), { status: 500, headers: corsHeaders })
  }
})

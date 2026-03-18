import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
console.log("🔥 INICIOU SAQUE");
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 🔐 Autenticação
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: corsHeaders
      })
    }

    const body = await req.json()
    const amount = parseFloat(body.amount)
    const pixKey = body.pixKey

    // ✅ VALIDAÇÕES
    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: 'Valor inválido' }), {
        status: 400,
        headers: corsHeaders
      })
    }

    if (!pixKey || pixKey.trim().length < 5) {
      return new Response(JSON.stringify({ error: 'Chave PIX inválida' }), {
        status: 400,
        headers: corsHeaders
      })
    }

    // 🧼 Limpeza da chave PIX
    let cleanPixKey = pixKey.trim()

    // Remove máscara se for número
    if (/^\d+$/.test(cleanPixKey)) {
      cleanPixKey = cleanPixKey.replace(/\D/g, '')
    }

    // Telefone → adiciona +55
    if (cleanPixKey.length >= 10 && cleanPixKey.length <= 13) {
      if (!cleanPixKey.startsWith('55')) {
        cleanPixKey = '55' + cleanPixKey
      }
      cleanPixKey = '+' + cleanPixKey
    }

    console.log(`💸 Solicitação de saque | User: ${user.id} | Valor: ${amount}`)

    // 💰 Reserva saldo
    const { data: ok, error: dbError } = await supabase.rpc('solicitar_saque_seguro', {
      p_user_id: user.id,
      p_amount: amount
    })

    if (dbError || !ok) {
      console.error("❌ Erro ao reservar saldo:", dbError)
      return new Response(JSON.stringify({ error: 'Saldo insuficiente' }), {
        status: 400,
        headers: corsHeaders
      })
    }

    // 🚀 Envia para Asaas
    const asaasRes = await fetch('https://www.asaas.com/api/v3/transfers', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'access_token': Deno.env.get('ASAAS_API_KEY')?.trim() || ''
      },
      body: JSON.stringify({
        value: amount,
        pixAddressKey: cleanPixKey,
        operationType: 'PIX',
        description: `Saque Plataforma - User ${user.id}`,
        externalReference: user.id
      })
    })

    const result = await asaasRes.json()
    console.log("📤 Resposta Asaas:", result)

    // ❌ ERRO NO ASAAS → ESTORNA
    if (!asaasRes.ok) {
      console.error("❌ Erro Asaas:", result)

      await supabase.rpc('estornar_saque_erro', {
        p_user_id: user.id,
        p_amount: amount
      })

      const msg = result.errors?.[0]?.description || 'Erro no saque'
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: corsHeaders
      })
    }

    // 🧾 REGISTRA TRANSAÇÃO
    await supabase.from('transactions').insert({
      user_id: user.id,
      amount,
      type: 'withdrawal',
      status: 'pending',
      external_id: result.id,
      description: 'Saque PIX'
    })

    return new Response(JSON.stringify({
      success: true,
      transferId: result.id
    }), {
      status: 200,
      headers: corsHeaders
    })

  } catch (err: any) {
    console.error("💥 Erro geral:", err.message)

    return new Response(JSON.stringify({
      error: 'Erro interno'
    }), {
      status: 500,
      headers: corsHeaders
    })
  }
})

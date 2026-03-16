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

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: corsHeaders })
    }

    const { amount, pixKey, pixKeyType } = await req.json()

    // 1. Mapeamento Rigoroso (Asaas exige: CPF, CNPJ, EMAIL, PHONE, EVP)
    let mappedType = String(pixKeyType).toUpperCase();
    if (mappedType.includes('CPF')) mappedType = 'CPF';
    else if (mappedType.includes('CNPJ')) mappedType = 'CNPJ';
    else if (mappedType.includes('EMAIL') || mappedType.includes('E-MAIL')) mappedType = 'EMAIL';
    else if (mappedType.includes('TELEFONE') || mappedType.includes('PHONE') || mappedType.includes('CELULAR')) mappedType = 'PHONE';
    else mappedType = 'EVP'; // Chave Aleatória no Asaas é EVP

    // 2. Limpeza total da chave (Remove espaços e símbolos se for CPF/PHONE)
    const cleanPixKey = (mappedType === 'CPF' || mappedType === 'PHONE') 
      ? pixKey.replace(/\D/g, '') 
      : pixKey.trim();

    // 3. Reserva o saldo (Rollback pronto caso falhe)
    const { data: ok, error: dbError } = await supabase.rpc('solicitar_saque_seguro', {
      p_user_id: user.id,
      p_amount: amount
    })

    if (dbError || !ok) {
      return new Response(JSON.stringify({ error: 'Saldo insuficiente ou erro no banco' }), { status: 400, headers: corsHeaders })
    }

    // 4. Chamada ao Asaas (Sem operationType para evitar conflitos no Sandbox)
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
        pixAddressKeyType: mappedType,
        description: `Saque Plataforma - User ${user.id}`
      })
    })

    const result = await asaasRes.json()
    console.log("Resposta detalhada Asaas:", JSON.stringify(result))

    if (!asaasRes.ok) {
      // ESTORNO AUTOMÁTICO (O dinheiro volta na hora)
      await supabase.rpc('estornar_saque_erro', {
        p_user_id: user.id,
        p_amount: amount
      })

      const msg = result.errors?.[0]?.description || 'Erro no processamento do Asaas.';
      return new Response(JSON.stringify({ error: `Asaas: ${msg}` }), { status: 400, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ success: true, result }), { status: 200, headers: corsHeaders })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Erro interno.' }), { status: 500, headers: corsHeaders })
  }
})
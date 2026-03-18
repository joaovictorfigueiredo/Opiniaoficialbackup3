import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Lidar com o CORS preflight
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Autenticação do Usuário Logado
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.error("Erro de autenticação:", authError)
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: corsHeaders })
    }

    const { amount, pixKey, pixKeyType } = await req.json()

    // 3. Mapeamento de Tipos (CPF, CNPJ, EMAIL, PHONE, EVP)
    let mappedType = String(pixKeyType).toUpperCase();
    if (mappedType.includes('CPF')) mappedType = 'CPF';
    else if (mappedType.includes('CNPJ')) mappedType = 'CNPJ';
    else if (mappedType.includes('EMAIL') || mappedType.includes('E-MAIL')) mappedType = 'EMAIL';
    else if (mappedType.includes('TELEFONE') || mappedType.includes('PHONE') || mappedType.includes('CELULAR')) mappedType = 'PHONE';
    else mappedType = 'EVP';

    // 4. Limpeza e Formatação RIGOROSA da chave PIX
    let cleanPixKey = pixKey.trim();
    if (mappedType === 'CPF' || mappedType === 'PHONE' || mappedType === 'CNPJ') {
      cleanPixKey = pixKey.replace(/\D/g, ''); // Remove símbolos
      
      if (mappedType === 'PHONE') {
        // Asaas exige +55 no telefone
        if (!cleanPixKey.startsWith('55')) cleanPixKey = '55' + cleanPixKey;
        if (!cleanPixKey.startsWith('+')) cleanPixKey = '+' + cleanPixKey;
      }
    }

    // 5. Reserva o saldo no Banco ANTES de chamar o Asaas
    const { data: ok, error: dbError } = await supabase.rpc('solicitar_saque_seguro', {
      p_user_id: user.id,
      p_amount: amount
    })

    if (dbError || !ok) {
      console.error("Erro no saldo:", dbError);
      return new Response(JSON.stringify({ error: 'Saldo insuficiente ou erro no banco.' }), { status: 400, headers: corsHeaders })
    }

    // 6. Chamada ao Asaas (URL de Produção)
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY')?.trim() || '';
    
    const asaasRes = await fetch('https://www.asaas.com/api/v3/transfers', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'access_token': asaasApiKey
      },
      body: JSON.stringify({
        value: Number(amount),
        pixAddressKey: cleanPixKey,
        pixAddressKeyType: mappedType,
        description: `Saque Plataforma - User ${user.id}`,
        externalReference: user.id // CRÍTICO: Para o Webhook reconhecer o usuário depois
      })
    })

    const result = await asaasRes.json()
    console.log("Log Detalhado Asaas:", JSON.stringify(result))

    // 7. Se o Asaas recusar, fazemos o ESTORNO
    if (!asaasRes.ok) {
      await supabase.rpc('estornar_saque_erro', {
        p_user_id: user.id,
        p_amount: amount
      })

      const errorMsg = result.errors?.[0]?.description || 'Erro no processamento do Asaas.';
      return new Response(JSON.stringify({ error: `Asaas: ${errorMsg}` }), { status: 400, headers: corsHeaders })
    }

    // 8. Sucesso! Retorna o ID da transferência para o Front-end
    return new Response(JSON.stringify({ success: true, transferId: result.id }), { status: 200, headers: corsHeaders })

  } catch (err: any) {
    console.error("ERRO FATAL NA FUNCTION:", err.message)
    return new Response(JSON.stringify({ error: 'Ocorreu um erro interno. Tente novamente.' }), { status: 500, headers: corsHeaders })
  }
})

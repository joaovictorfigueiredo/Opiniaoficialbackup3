import { serve } from "https://deno.land/std@0.131.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  // 1. Pega o token que o Asaas enviou no cabeçalho
  const asaasTokenEnviado = req.headers.get("asaas-access-token");
  
  // 2. Pega o token que você salvou no Segredos do Supabase
  const tokenEsperado = Deno.env.get("ASAAS_SECURITY_TOKEN");

  // Validação de segurança
  if (asaasTokenEnviado !== tokenEsperado) {
    console.error("Tentativa de acesso com token inválido");
    return new Response(JSON.stringify({ 
      status: "REFUSED", 
      refuseReason: "Segurança: Token de autenticação inválido." 
    }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  try {
    const body = await req.json();
    // Extrai o ID do saque (pode vir em diferentes campos dependendo do tipo)
    const transferId = body.transfer?.id || body.pixRefund?.id || body.bill?.id || body.pixQrCode?.id;

    if (!transferId) {
      return new Response(JSON.stringify({ status: "REFUSED", refuseReason: "ID da transação não encontrado no corpo da requisição." }), { status: 400 });
    }

    // 3. Conecta no seu banco para ver se você autorizou esse ID
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data, error } = await supabase
      .from('saques_autorizados')
      .select('asaas_id')
      .eq('asaas_id', transferId)
      .single();

    if (data && !error) {
      console.log(`Saque ${transferId} aprovado com sucesso!`);
      return new Response(JSON.stringify({ status: "APPROVED" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    console.warn(`Saque ${transferId} recusado: Não encontrado na tabela saques_autorizados.`);
    return new Response(JSON.stringify({ 
      status: "REFUSED", 
      refuseReason: "Este saque não foi pré-autorizado pelo sistema." 
    }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ status: "REFUSED", refuseReason: "Erro interno no servidor de validação." }), { status: 500 });
  }
})

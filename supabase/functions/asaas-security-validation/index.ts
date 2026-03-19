import { serve } from "std/http/server.ts"
import { createClient } from "@supabase/supabase-js"

serve(async (req) => {
  // 1. Validação de segurança do Header (Token que você definirá no painel do Asaas)
  const asaasToken = req.headers.get("asaas-access-token");
  if (asaasToken !== Deno.env.get("ASAAS_SECURITY_TOKEN")) {
    return new Response(JSON.stringify({ status: "REFUSED", refuseReason: "Token de segurança inválido" }), { status: 401 });
  }

  const body = await req.json();
  // O Asaas envia o ID dentro de body.transfer.id ou body.pixRefund.id
  const transferId = body.transfer?.id || body.pixRefund?.id || body.bill?.id;

  if (!transferId) {
    return new Response(JSON.stringify({ status: "REFUSED", refuseReason: "ID da transação não encontrado" }), { status: 400 });
  }

  // 2. Conectar ao seu Supabase
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // 3. Verificar se esse saque foi registrado pelo seu sistema
  const { data, error } = await supabase
    .from('saques_autorizados')
    .select('asaas_id')
    .eq('asaas_id', transferId)
    .single();

  if (data && !error) {
    return new Response(JSON.stringify({ status: "APPROVED" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ status: "REFUSED", refuseReason: "Saque não reconhecido pelo servidor" }), {
    headers: { "Content-Type": "application/json" },
  });
})

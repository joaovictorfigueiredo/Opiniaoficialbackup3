import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { amount, name, cpf, userId } = await req.json()
    
    // Pegando as chaves que você salvou no Supabase
    const PUBLIC_KEY = Deno.env.get('PAGOU_PUBLIC_KEY')?.trim();
    const SECRET_KEY = Deno.env.get('PAGOU_SECRET_KEY')?.trim();

    if (!SECRET_KEY || !PUBLIC_KEY) {
      throw new Error("As chaves da Pagou.ai não foram configuradas no Supabase.");
    }

    // Autenticação Basic Auth (Padrão Pagou.ai)
    const auth = btoa(`${SECRET_KEY}:x`);

    // Lógica para garantir nome e sobrenome
    let nomeFinal = name ? name.trim() : "Cliente";
    if (!nomeFinal.includes(' ')) {
      nomeFinal = `${nomeFinal} Silva`;
    }

    const response = await fetch("https://api.conta.pagou.ai/v1/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${auth}`
      },
      body: JSON.stringify({
        amount: Math.round(Number(amount) * 100), // Converte R$ para centavos
        api_key: PUBLIC_KEY,
        payment_method: "pix",
        postback_url: "https://fqbgxvwcknkxomsvsawv.supabase.co/functions/v1/asaas-webhook",
        metadata: {
          external_id: userId // Para seu banco de dados saber quem pagou
        },
        customer: {
          name: nomeFinal,
          document: {
            number: cpf.replace(/\D/g, ''),
            type: "cpf"
          },
          email: `${userId}@seu-site.com` // Email fictício baseado no ID se não tiver
        }
      })
    });

    const data = await response.json();

    if (data.errors || data.status === 'failed') {
      throw new Error(data.errors?.[0]?.description || "Erro ao gerar Pix na Pagou.ai");
    }

    // Retorna os dados no formato que seu site já espera
    return new Response(JSON.stringify({
      id: data.id,
      paymentCode: data.pix_qr_code, // Código copia e cola
      qrcodeBase64: data.pix_qr_code_url // Link da imagem do QR Code
    }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200 
    });

  } catch (error: any) {
    console.error("Erro na Function Pagou.ai:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 400, 
      headers: corsHeaders 
    });
  }
})

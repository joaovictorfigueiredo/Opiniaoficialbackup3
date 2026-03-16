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
    const ASAAS_KEY = Deno.env.get('ASAAS_API_KEY')?.trim()

    if (!ASAAS_KEY) {
      throw new Error("A chave ASAAS_API_KEY não foi configurada.")
    }

    // --- LIMPEZA PARA PRODUÇÃO ---
    // Remove pontos/traços do CPF e garante nome com sobrenome
    const cleanCpf = cpf.replace(/\D/g, ''); 
    let nomeParaAsaas = name ? name.trim() : "Usuario Cliente";
    if (!nomeParaAsaas.includes(' ')) {
      nomeParaAsaas = `${nomeParaAsaas} Silva`;
    }

    // URL OFICIAL (MUDOU AQUI)
    const BASE_URL = 'https://www.asaas.com/api/v3';

    // 1. BUSCAR CLIENTE
    let customerId;
    const searchRes = await fetch(`${BASE_URL}/customers?cpfCnpj=${cleanCpf}`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json', 
        'access_token': ASAAS_KEY 
      }
    });
    
    const searchData = await searchRes.json();

    if (searchData.data && searchData.data.length > 0) {
      customerId = searchData.data[0].id;
    } else {
      // CRIAR CLIENTE SE NÃO EXISTIR
      const customerRes = await fetch(`${BASE_URL}/customers`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'access_token': ASAAS_KEY 
        },
        body: JSON.stringify({ 
          name: nomeParaAsaas, 
          cpfCnpj: cleanCpf 
        })
      });
      
      const newCustomer = await customerRes.json();
      if (newCustomer.errors) {
        throw new Error(`Erro ao criar cliente: ${newCustomer.errors[0].description}`);
      }
      customerId = newCustomer.id;
    }

    // 2. GERAR COBRANÇA PIX
    const paymentRes = await fetch(`${BASE_URL}/payments`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'access_token': ASAAS_KEY 
      },
      body: JSON.stringify({
        billingType: 'PIX',
        value: amount,
        customer: customerId,
        dueDate: new Date().toISOString().split('T')[0],
        externalReference: userId, 
        description: `Deposito via Site - User: ${userId}`
      })
    });

    const payment = await paymentRes.json();
    if (payment.errors) {
      throw new Error(`Erro ao gerar pagamento: ${payment.errors[0].description}`);
    }

    // 3. BUSCAR QR CODE
    const qrRes = await fetch(`${BASE_URL}/payments/${payment.id}/pixQrCode`, {
      method: 'GET',
      headers: { 
        'access_token': ASAAS_KEY 
      }
    });
    
    const qrData = await qrRes.json();

    return new Response(JSON.stringify(qrData), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });

  } catch (error: any) {
    console.error("Erro na Edge Function Deposito:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 400, 
      headers: corsHeaders 
    });
  }
})
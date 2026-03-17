import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { ModalPerfil } from './components/ModalPerfil';
import { RankingSide } from './RankingSide/RankingSide';
import './App.css';
import { motion, AnimatePresence } from 'framer-motion';
import { BetTicket } from './components/BetTicket';
import { Shield, Scale, Trophy, Skull, Users } from 'lucide-react';
import { getDeviceFingerprint } from "./utils/device";
import { calcularTempoRestante } from "./utils/time";
import { NavegacaoPools } from "./components/NavegacaoPools";
import ContadorRegressivo from "./components/ContadorRegressivo";
import { FunctionsHttpError } from '@supabase/supabase-js';
import { Turnstile } from '@marsidev/react-turnstile';



// --- TIPOS ---
type AbaType = 'explorar' | 'minhas_apostas' | 'criadas_por_mim';








function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [user, setUser] = useState<any>(null)
  const [perfil, setPerfil] = useState<any>(null)
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [tempNickname, setTempNickname] = useState('');

  const [titulo, setTitulo] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [tema, setTema] = useState('⚽ Esportes')
  const [pools, setPools] = useState<any[]>([])
  const [filtroAtivo, setFiltroAtivo] = useState('Todos')

const [chavePix, setChavePix] = useState('');
const [tipoChavePix, setTipoChavePix] = useState('CPF');

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isModalTransacaoOpen, setIsModalTransacaoOpen] = useState<'deposito' | 'saque' | null>(null)
  
  const [selectedOption, setSelectedOption] = useState<any>(null)
  const [selectedPool, setSelectedPool] = useState<any>(null)
  const [valorAposta, setValorAposta] = useState('')
  const [historico, setHistorico] = useState<any[]>([]);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const requestId = crypto.randomUUID();
  const [valorPendente, setValorPendente] = useState(0);
  const [temContestacao, setTemContestacao] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('ativas');
  const [perfilAberto, setPerfilAberto] = useState<any>(null);
  const [poolsDoCriador, setPoolsDoCriador] = useState<any[]>([]);
  const [ranking, setRanking] = useState([]);
  const [justificativa, setJustificativa] = useState('');
  const [confirmacaoEncerramento, setConfirmacaoEncerramento] = useState<any>({
    aberto: false,
    poolId: '',
    optionId: '',
    textoOpcao: '',
    ownerId: ''
  });

  const [sucessoPublicacao, setSucessoPublicacao] = useState<any>({ aberto: false, mensagem: '', tipo: 'sucesso' });
  const [minutosExpiracao, setMinutosExpiracao] = useState<number>(0);
  const [agora, setAgora] = useState(new Date());
  // --- NOVOS ESTADOS PARA MÚLTIPLAS OPÇÕES ---
const [tipoPool, setTipoPool] = useState<'sim_nao' | 'multipla'>('sim_nao');
const [opcoesCustom, setOpcoesCustom] = useState<string[]>(['', '']);
  // Estados para o Ticket de Resultado
  const [isApostaConcluida, setIsApostaConcluida] = useState(false);
  const [dadosTicket, setDadosTicket] = useState<{
    poolTitle: string;
    optionLabel: string;
    amount: number;
    multiplier: number;
    status: 'win' | 'lose';
    qtdGanhadores?: number;
    valorTotalPote?: number;
    lucro: number;
    recebido: number;
    stats: { fav: number; contra: number };
    justificativa?: string; // <--- Certifique-se que esta linha está aqui
  } | null>(null);

const [valorTransacao, setValorTransacao] = useState('');
const [loadingTransacao, setLoadingTransacao] = useState(false);
const [cpfUsuario, setCpfUsuario] = useState(''); 
// Substitua o seu por este:
const [dadosPix, setDadosPix] = useState<{imagem: string, payload: string} | null>(null);

//captcha de acesso
const [captchaToken, setCaptchaToken] = useState(null);
const [modo, setModo] = useState<'login' | 'recuperar'>('login');


const [isModalRankingOpen, setIsModalRankingOpen] = useState(false);
const [isCarteiraMobileAberta, setIsCarteiraMobileAberta] = useState(false);


const [denunciaInfo, setDenunciaInfo] = useState<{aberto: boolean, poolId: string} | null>(null);
const dispararDenuncia = (poolId: string) => {
  // Copia o ID para o seu clipboard automaticamente
  navigator.clipboard.writeText(poolId);
  setDenunciaInfo({ aberto: true, poolId });
};
const [textoDenuncia, setTextoDenuncia] = useState('');

  // Isso vai fazer o React "acordar" a cada segundo e re-checar os botões
  useEffect(() => {
    const interval = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);


  // Adicione esse estado no App.tsx
const [usuarioDestaque, setUsuarioDestaque] = useState<{id: string, nickname: string} | null>(null);
const handleVerPoolsAtivas = (id: string, nick: string) => {
  // Aqui você usa o nome novo do estado
  setUsuarioDestaque({ id, nickname: nick });
}

// Este é o "Gatilho"
useEffect(() => {
  buscarPools();
}, [usuarioDestaque, abaAtiva]); 
// Toda vez que o filtro de usuário mudar ou você trocar de aba, ele busca de novo.



  /*ticket*/
  useEffect(() => {
    if (!user?.id) return;

    const canal = supabase
      .channel('debug-resultado')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pools' },
        async (payload) => {
          console.log("RECEBI MUDANÇA NA POOL!", payload.new.status);

          // Certifique-se de que o status bate com o que o seu banco envia ('closed' ou 'finished')
          if (payload.new.status === 'closed' || payload.new.status === 'finished') {

            const { data: minhaAposta, error } = await supabase
              .from('bets')
              .select('*')
              .eq('pool_id', payload.new.id)
              .eq('user_id', user.id)
              .maybeSingle();

            if (error) {
              console.error("Erro na busca da bet:", error);
              return;
            }

            if (!minhaAposta) {
              console.warn("VOCÊ NÃO TEM APOSTA NESSA POOL.");
              return;
            }

            // --- LÓGICA DE CÁLCULO ---
            const ganhou = minhaAposta.option_id === payload.new.winner_id;
            const multiplicador = payload.new.final_multiplier || 1.0;

            // O "amount" é o valor que o usuário apostou (ex: R$ 60,00)
            const valorApostado = minhaAposta.amount;

            // O "recebido" é o total bruto (Aposta * Multiplicador)
            const valorTotalRecebido = ganhou ? (valorApostado * multiplicador) : 0;

            // O "lucro" é o que ele ganhou ALÉM do que ele já tinha
            const lucroLiquido = ganhou ? (valorTotalRecebido - valorApostado) : 0;

            console.log("Cálculo realizado:", { valorApostado, valorTotalRecebido, lucroLiquido });

            setDadosTicket({
              poolTitle: payload.new.title,
              optionLabel: minhaAposta.option_label || (ganhou ? "VENCEDOR" : "CONTRA"),
              amount: valorApostado, // <--- Aqui garante que o valor apostado apareça
              lucro: lucroLiquido,   // <--- Nova propriedade para o lucro
              recebido: valorTotalRecebido, // <--- Valor total bruto
              multiplier: multiplicador,
              status: ganhou ? 'win' : 'lose',
              stats: { fav: 50, contra: 50 }, // Se tiver essas colunas no payload, use payload.new.fav_percent
              qtdGanhadores: payload.new.total_winners || 0,
              valorTotalPote: payload.new.total_pool_sum || 0,
              justificativa: payload.new.justificativa || "Sem justificativa oficial."
            });

            setIsApostaConcluida(true);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(canal); };
  }, [user?.id]);
  /*ticket*/

  useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      buscarPerfil(session.user.id); // Busca o perfil e o cofre
    } else {
      setPerfil(null);
    }
  });

  return () => subscription.unsubscribe();
}, []);

  useEffect(() => {
    console.log("Iniciando escuta da tabela pools...");

    const canalTeste = supabase
      .channel('qualquer-nome')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pools' },
        (payload) => {
          console.log("RECEBI UM UPDATE!", payload);


          // Aqui dentro vai a lógica do Ticket que te mandei antes
          if (payload.new.status === 'finished') {
            // ... lógica do minhaAposta
          }
        }
      )
      .subscribe((status) => {
        console.log("Status da conexão:", status);
      });

    return () => { supabase.removeChannel(canalTeste); };
  }, []);

  useEffect(() => {
    // Configura o canal para escutar a tabela de apostas
    const canalApostas = supabase
      .channel('atualizacao-pote-total')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bets' }, // Certifique-se que o nome na tabela é 'apostas'
        () => {
          console.log("Nova aposta detectada! Atualizando pote total...");
          buscarPools(); // <-- Isso faz o valor de R$ 20.00 subir para R$ 21.00 sozinho
        }
      )
      .subscribe();

    // Limpa a conexão ao sair da página para não gastar memória
    return () => {
      supabase.removeChannel(canalApostas);
    };
  }, []);

  const temasDisponiveis = [
    '⚽ Esportes', '🎮 Games', '🗳️ Política', '📺 Entretenimento',
    '📱 Internet', '💰 Economia', '🚀 Lançamentos', '⚙️ Geral'
  ]


const gerenciarSaldoReal = async () => {
  // 1. Validações Iniciais
  if (!valorTransacao || Number(valorTransacao) <= 0) {
    return alert("Insira um valor válido");
  }
  
  if (isModalTransacaoOpen === 'deposito' && (!cpfUsuario || cpfUsuario.length < 11)) {
    return alert("Por favor, insira um CPF válido para continuar.");
  }

  setLoadingTransacao(true);

  try {
    if (isModalTransacaoOpen === 'deposito') {
      // Limpa o CPF para enviar apenas números
      const cpfLimpo = cpfUsuario.replace(/\D/g, '');

      // 2. ATUALIZA O CPF NO BANCO DE DADOS
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ cpf: cpfLimpo })
        .eq('id', perfil.id);

      if (updateError) {
        console.warn("Aviso: Não foi possível salvar o CPF no perfil, mas tentaremos gerar o PIX.", updateError);
      }

      // 3. CHAMA A EDGE FUNCTION PARA GERAR O PIX NO ASAAS
const { data, error: functionError } = await supabase.functions.invoke('criar-pix', {
  body: { 
    amount: Number(valorTransacao), 
    userId: perfil.id,
    name: perfil.nome_completo || 'Usuario',
    cpf: cpfLimpo
  },
  // ADICIONE ISSO AQUI: Garante que a função receba o token de login correto
  headers: {
    Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
  }
});

      // --- INÍCIO DO AJUSTE PARA DESCOBRIR O ERRO ---
      if (functionError) {
        // Se for o erro de "non-2xx" que a imagem do GitHub explicou
        if (functionError instanceof FunctionsHttpError) {
          const errorContext = await functionError.context.json();
          console.error('Erro detalhado do Asaas:', errorContext);
          alert(`O Asaas recusou: ${JSON.stringify(errorContext)}`);
        } else {
          alert(`Erro na comunicação: ${functionError.message}`);
        }
        setLoadingTransacao(false);
        return; // Para a execução aqui se deu erro
      }
      // --- FIM DO AJUSTE ---

      // 4. SE TUDO DEU CERTO, SALVA OS DADOS PARA ABRIR O MODAL INTERNO
if (data && data.encodedImage) {
  setDadosPix({
    imagem: data.encodedImage,
    payload: data.payload
  });
  
  // Fecha o modal de digitar valor e limpa o loading
  setLoadingTransacao(false);
  setIsModalTransacaoOpen(null); 
} else {
  setLoadingTransacao(false);
  alert("O pedido de depósito foi enviado, mas o QR Code não pôde ser gerado. Verifique seu painel.");
}
      
    } else {
      // --- Lógica de Saque (Retirada) ---
    const valor = Number(valorTransacao);

    // 1. Validação de valor mínimo
    if (valor < 30) {
      alert("O valor mínimo para retirada é R$ 30,00");
      setLoadingTransacao(false);
      return;
    }

    // 2. Validação de campos PIX (Certifique-se de ter esses states)
    if (!chavePix || !tipoChavePix) {
      alert("Por favor, preencha a chave PIX e o tipo da chave.");
      setLoadingTransacao(false);
      return;
    }

    // 3. Chamada para a Edge Function que você fez deploy
    const { data: saqueData, error: saqueError } = await supabase.functions.invoke('asaas-payout', {
      body: { 
        amount: valor, 
        pixKey: chavePix, 
        pixKeyType: tipoChavePix 
      },
      headers: {
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      }
    });
// --- NOVO TRATAMENTO DE ERRO (Substituir linha 409 em diante) ---
    if (saqueError) {
      // Se for o erro de "non-2xx", tentamos ler a mensagem real do Asaas
      try {
        const errorDetail = await saqueError.context?.json();
        console.error("Erro detalhado do Asaas:", errorDetail);
        alert(`Falha no Saque: ${errorDetail?.error || "Verifique os dados ou saldo."}`);
      } catch (e) {
        // Caso não consiga ler o JSON, mostra a mensagem padrão
        alert(`Erro na transação: ${saqueError.message}`);
      }
      setLoadingTransacao(false);
      return; // Interrompe a execução para não mostrar o alerta de sucesso
    }

    alert("Saque realizado com sucesso! O valor cairá na sua conta em breve.");
    
    // Atualiza o perfil para mostrar o saldo novo na tela
    if (typeof buscarPerfil === 'function') buscarPerfil(perfil.id);
    }

    // Limpa os campos após o sucesso
    setIsModalTransacaoOpen(null);
    setValorTransacao('');

  } catch (err: any) {
    console.error("Erro completo na transação:", err);
    alert("Erro na transação: " + (err.message || "Erro desconhecido"));
  } finally {
    setLoadingTransacao(false);
  }
};

  const buscarRanking = async () => {
    const { data, error } = await supabase
      .from('ranking_global')
      .select('*')
      .limit(5);

    if (!error && data) {
      setRanking(data as any); // Use apenas 'as any' sem os colchetes para testar
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        buscarPerfil(session.user.id)
        buscarHistorico(session.user.id)
        buscarSaldosPendentes(session.user.id) // <-- NOVO: Busca inicial ao logar
        buscarRanking()
      }
    })

    buscarPools()
    buscarRanking()

    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bets' }, () => {
        buscarPools()
        if (user) {
          buscarPerfil(user.id)
          buscarHistorico(user.id)
          buscarSaldosPendentes(user.id) // <-- NOVO: Atualiza se houver nova aposta
          buscarRanking()
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => {
        if (user) buscarPerfil(user.id)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pools' }, () => {
        buscarPools()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        if (user) buscarHistorico(user.id)
      })
      // ABAIXO O BLOCO NOVO PARA O COFRE:
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pending_payouts' }, () => {
        if (user) {
          buscarSaldosPendentes(user.id) // <-- NOVO: Atualiza o cofre em tempo real
          buscarPerfil(user.id)         // <-- NOVO: Garante que o saldo atualize quando o prêmio cair
        }
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
      supabase.removeChannel(channel)
    }
  }, [user?.id, abaAtiva])

  async function buscarHistorico(userId: string) {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistorico(data || []);
    } catch (error) {
      console.error("Erro ao buscar histórico:", error);
    }
  }

  async function handleSignUp() {
  if (!email || !password) return alert("Preencha e-mail e senha!");
  if (!captchaToken) return alert("Por favor, resolva o desafio de segurança (Captcha).");

  // 1. Cadastro no Auth do Supabase com Captcha
  const { data, error } = await supabase.auth.signUp({ 
    email, 
    password,
    options: { captchaToken } 
  });

  if (error) return alert("Erro no cadastro: " + error.message);

  if (data.user) {
    const fingerprint = getDeviceFingerprint();

    // 2. Criação do perfil (Se o e-mail confirmation estiver ON, isso roda após confirmar)
    await supabase.from('profiles').insert([
      {
        id: data.user.id,
        email: email,
        last_device_id: fingerprint,
        balance: 0
      }
    ]);

    alert("Cadastro realizado! Verifique seu e-mail.");
    setUser(data.user);
  }
}

async function handleLogin() {
  if (!captchaToken) return alert("Por favor, resolva o desafio de segurança (Captcha).");

  const { data, error } = await supabase.auth.signInWithPassword({ 
    email, 
    password,
    options: { captchaToken }
  });

  if (error) return alert("Erro: " + error.message);

  if (data.user) {
    const fingerprint = getDeviceFingerprint();

    // 3. Vincula o login atual ao aparelho
    await supabase
      .from('profiles')
      .update({
        last_device_id: fingerprint,
        last_login: new Date().toISOString()
      })
      .eq('id', data.user.id);

    setUser(data.user);
  }
}

async function handleResetPassword() {
  if (!email) return alert("Digite seu e-mail para receber o link de recuperação.");
  if (!captchaToken) return alert("Resolva o captcha para solicitar a nova senha.");

 const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: 'https://opiniaoficial.com.br/atualizar-senha',
  captchaToken: captchaToken,
} as any);

  if (error) return alert("Erro: " + error.message);
  
  alert("Link de recuperação enviado! Verifique sua caixa de entrada.");
}


  async function atualizarNickname() {
    if (!tempNickname.trim() || !user) {
      setIsEditingNickname(false);
      return;
    }
    const { error } = await supabase.from('profiles').update({ nickname: tempNickname }).eq('id', user.id);
    if (error) {
      if (error.code === '23505') alert("Este nickname já está em uso. Tente outro!");
      else alert("Erro ao salvar: " + error.message);
    } else {
      setPerfil({ ...perfil, nickname: tempNickname });
      setIsEditingNickname(false);
    }
  }

  async function buscarPerfil(userId: string) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (error && error.code === 'PGRST116') {
      const { data: newProfile } = await supabase.from('profiles').insert([{ id: userId, balance: 50, reputation: 60 }]).select().single()
      if (newProfile) setPerfil(newProfile)
      return
    }
    if (data) {
      const { data: bets } = await supabase.from('bets').select('amount').eq('user_id', userId)
      const totalMovimentado = bets?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0
      setPerfil({ ...data, totalMovimentado })
    }
  }
  //configuração de pagamento pendente
  async function buscarSaldosPendentes(userId: string) {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('pending_payouts')
        .select('amount, is_contested, release_at')
        .eq('user_id', userId)
        .in('status', ['pending', 'contested']);

      if (error) throw error;

      if (data) {
        const total = data.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        setValorPendente(total);
        setTemContestacao(data.some(p => p.is_contested));
      }
    } catch (error) {
      console.error("Erro ao buscar saldos pendentes:", error);
    }
  }

  async function buscarPools() {
  // 1. Base da query idêntica à sua
  let query = supabase
    .from('pools')
    .select(`*, profiles:user_id (reputation, nickname), pool_options (*, bets (amount, user_id))`)
    .order('created_at', { ascending: false });

  // 2. LOGICA DE FILTRO (Prioridade para o Perfil Visitado)
  if (usuarioDestaque) {
    // Quando estamos olhando o perfil de alguém, filtramos apenas as pools dele que estão abertas
    query = query.eq('user_id', usuarioDestaque.id).eq('status', 'open');
  } 
  else {
    // 3. Sua lógica original de abas (só entra aqui se NÃO estiver filtrando um perfil)
    if (abaAtiva === 'minhas_apostas' && user) {
      const { data: minhasBets } = await supabase
        .from('bets')
        .select('pool_id')
        .eq('user_id', user.id);
      
      const idsRelacionados = minhasBets?.map(b => b.pool_id) || [];
      query = query.in('id', idsRelacionados);
    } 
    else if (abaAtiva === 'criadas_por_mim' && user) {
      query = query.eq('user_id', user.id);
    }

    // Seus filtros de status das abas originais
    if (abaAtiva === 'ativas') {
      query = query.eq('status', 'open');
    } else if (abaAtiva === 'finalizadas') {
      query = query.eq('status', 'closed');
    }
  }

  const { data, error } = await query;
  
  if (error) {
    console.error("Erro na busca:", error.message);
    return;
  }
  
  if (data) setPools(data);
}
  async function gerenciarSaldo() {
    const valor = parseFloat(valorTransacao);
    if (isNaN(valor) || valor <= 0) return alert("Valor inválido");

    // 1. Ativa o bloqueio (isActionLoading vira true)
    setIsActionLoading(true);

    try {
      let novoSaldo = perfil?.balance || 0;
      if (isModalTransacaoOpen === 'deposito') {
        novoSaldo += valor;
      } else {
        if (valor > novoSaldo) {
          alert("Saldo insuficiente para saque!");
          // O finally vai rodar e liberar o botão automaticamente
          return;
        }
        novoSaldo -= valor;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ balance: novoSaldo })
        .eq('id', user.id);

      if (error) throw error;

      // Se tudo der certo, limpa os campos e fecha o modal
      setIsModalTransacaoOpen(null);
      setValorTransacao('');
      buscarPerfil(user.id);

    } catch (error: any) {
      alert("Erro na transação: " + error.message);
    } finally {
      // 2. Libera o botão (isActionLoading vira false)
      // Isso roda mesmo se der erro ou se der sucesso!
      setIsActionLoading(false);
    }
  }

  async function criarPool() {
  if (!titulo || !user) {
    setSucessoPublicacao({
      aberto: true,
      mensagem: "Por favor, preencha o título antes de continuar!",
      tipo: 'erro'
    });
    return;
  }

  setIsActionLoading(true);

  try {
    let expiresAt = null;
    if (minutosExpiracao > 0) {
      const agora = new Date();
      expiresAt = new Date(agora.getTime() + minutosExpiracao * 60000).toISOString();
    }

    const slug = `${titulo.toLowerCase().replace(/ /g, '-')}-${Date.now()}`;

    // 2. Insere a Pool principal
    const { data: newPool, error: poolError } = await supabase
      .from('pools')
      .insert([{
        title: titulo,
        slug: slug,
        is_public: true, // Mantemos público por padrão como você queria
        user_id: user.id,
        category: tema,
        status: 'open',
        expires_at: expiresAt
      }])
      .select()
      .single();

    if (poolError) throw poolError;

    // --- 🚀 A MUDANÇA ESTÁ AQUI ---
    // 3. Define quais labels inserir
    const labelsParaInserir = tipoPool === 'sim_nao' 
      ? ['👍 Favorável', '👎 Contra'] 
      : opcoesCustom.filter(opt => opt.trim() !== ''); // Remove campos vazios se o usuário não preencher todos

    // Mapeia os textos para o formato que o banco espera
    const optionsData = labelsParaInserir.map(label => ({
      pool_id: newPool.id,
      label: label
    }));

    const { error: optionsError } = await supabase
      .from('pool_options')
      .insert(optionsData);

    if (optionsError) throw optionsError;
    // ---------------------------------

    // 4. Limpeza e Sucesso
    setTitulo('');
    setMinutosExpiracao(0);
    setOpcoesCustom(['', '']); // Reseta os campos de texto
    setTipoPool('sim_nao');   // Volta para o modo padrão
    
    buscarPools();

    setSucessoPublicacao({
      aberto: true,
      mensagem: "Pool criada com sucesso! Já pode começar os palpites.",
      tipo: 'sucesso'
    });

  } catch (error: any) {
    setSucessoPublicacao({
      aberto: true,
      mensagem: "Erro ao criar pool: " + error.message,
      tipo: 'erro'
    });
  } finally {
    setIsActionLoading(false);
  }
}
  //hitorico de criador
  async function buscarHistoricoCriador(userId: string) {
    const { data } = await supabase
      .from('pools')
      .select('*, profiles:user_id (nickname, reputation)')
      .eq('user_id', userId)
      .limit(5);
    if (data) setPoolsDoCriador(data);
  }
  //hitorico de criador fim 

  async function confirmarAposta() {
    const valor = parseFloat(valorAposta);
    
    // 1. Validação Básica Inicial
    if (!user?.id || isNaN(valor) || valor <= 0) {
        return alert("Por favor, insira um valor válido para apostar.");
    }

    setIsActionLoading(true);

    try {
        // 2. Coleta de dados de segurança (IP e Fingerprint)
        const res = await fetch('https://api.ipify.org?format=json');
        const { ip } = await res.json();
        const fingerprint = getDeviceFingerprint();
        const requestId = crypto.randomUUID();

        console.log("DEBUG - Iniciando RPC:", { 
            user: user.id, 
            pool: selectedPool?.id, 
            opcao: selectedOption?.id, 
            valor 
        });

        // 3. Verificação de seleção (Evita erro de variável nula)
        if (!selectedPool?.id || !selectedOption?.id) {
            throw new Error("Seleção da aposta incompleta.");
        }

        // 4. A CHAMADA QUE DESCONTA O SALDO
        // Enviamos o IP dentro do p_request_id ou adicionamos um parâmetro se necessário
        const { error: rpcError } = await supabase.rpc('processar_aposta_ledger', {
            p_user_id: user.id,
            p_pool_id: selectedPool.id,
            p_option_id: selectedOption.id,
            p_amount: valor,
            p_request_id: `IP:${ip} | Req:${requestId}`, 
            p_device_id: fingerprint 
        });

        if (rpcError) throw new Error(rpcError.message);

        // 5. Sucesso: Fecha modal e limpa campos
        setIsModalOpen(false);
        setValorAposta('');
        alert("Aposta realizada com sucesso!");

        // 6. Atualização Global
        await Promise.all([
            buscarPerfil(user.id),
            buscarPools(),
            buscarHistorico(user.id)
        ]);

    } catch (error: any) { // Mudamos para 'any' ou fazemos a verificação abaixo
    console.error("Erro detalhado:", error);
    
    // Tratamento seguro para pegar a mensagem
    const mensagemErro = error instanceof Error ? error.message : "Erro desconhecido";
    alert("Erro ao processar: " + mensagemErro);
} finally {
        setIsActionLoading(false);
    }
}
  async function encerrarPool(poolId: string, optionId: string, ownerId: string, justificativa: string) {
    // Segurança básica
    if (user?.id !== ownerId) return;

    try {
      // 1. DISTRIBUIÇÃO (RPC)
      // Chamamos a função no banco que gera os ganhadores
      const { error: rpcError } = await supabase.rpc('distribuir_premios', {
        p_pool_id: poolId,
        p_opcao_vencedora_id: optionId
      });

      if (rpcError) throw rpcError;

      // A nova função para dar o bônus ao criador
      await supabase.rpc('pagar_criador_pool', { p_pool_id: poolId });

      // --- PAUSA DE SINCRONIA ---
      // Aguarda 500ms para o banco processar as tabelas antes de lermos os dados
      await new Promise(resolve => setTimeout(resolve, 500));

      // 2. BUSCA DE DADOS REAIS
      // Busca o volume total (usando Promise.all para ser mais rápido)
      const [betsRes, winnersRes] = await Promise.all([
        supabase.from('bets').select('amount').eq('pool_id', poolId),
        supabase.from('pending_payouts').select('*', { count: 'exact', head: true }).eq('pool_id', poolId)
      ]);

      if (betsRes.error) throw betsRes.error;

      // Cálculo garantindo que o valor seja numérico (resolve Pote R$ 0.00)
      const poteCalculado = betsRes.data?.reduce((acc, b) => acc + Number(b.amount || 0), 0) || 0;
      const totalGanhadores = winnersRes.count || 0;

      // 3. UPDATE FINAL ÚNICO
      // Salva tudo de uma vez para o Realtime do App.tsx ler os dados completos
      const { error: updateError } = await supabase
        .from('pools')
        .update({
          status: 'closed',
          winner_id: optionId,
          justificativa: justificativa,
          total_winners: totalGanhadores,
          total_pool_sum: poteCalculado
        })
        .eq('id', poolId);

      if (updateError) throw updateError;

      // Atualiza a lista local
      buscarPools();

   } catch (error: any) {
  console.error("Erro no encerramento:", error);
  // Se aparecer "new row violates row-level security", é o RLS!
  alert("Erro ao fechar: " + (error.details || error.message)); 
}
  }

  const contestarResultado = async (poolId: string) => {
    try {
      const { error } = await supabase.rpc('disparar_contestacao', {
        p_pool_id: poolId
      });

      if (error) throw error;

      alert("Contestação enviada! O prazo de liberação foi estendido para 3 horas para análise.");
    } catch (error) {
      console.error("Erro ao contestar:", error);
    }
  };

  const calcularDadosPool = (pool: any) => {
    const opcoes = pool.pool_options || []
    const totalPote = opcoes.reduce((acc: number, opt: any) => acc + (opt.bets?.reduce((sum: number, b: any) => sum + (b.amount || 0), 0) || 0), 0)
    return { totalPote, opcoes }
  }

  const obterGanhoEstimado = () => {
    if (!selectedOption || !selectedPool || !valorAposta) return 0
    const { totalPote } = calcularDadosPool(selectedPool)
    const totalOpcao = (selectedOption.bets || []).reduce((s: number, b: any) => s + (b.amount || 0), 0)
    const valorNum = parseFloat(valorAposta)
    const multiplicador = (totalOpcao + valorNum) > 0 ? ((totalPote + valorNum) / (totalOpcao + valorNum)) : 1
    return valorNum * multiplicador
  }

  const poolsFiltradas = filtroAtivo === 'Todos'
    ? [...pools].sort((a, b) => calcularDadosPool(b).totalPote - calcularDadosPool(a).totalPote)
    : pools.filter(p => p.category === filtroAtivo)

 if (!user) {
  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#1e293b] p-8 rounded-3xl border border-gray-800 shadow-2xl">
        <h1 className="text-4xl font-black mb-8 text-center text-[#10b981]">Opinia</h1>
        
        <div className="space-y-4">
          {/* Campo de e-mail comum a todos os modos */}
          <input 
            type="email" 
            placeholder="E-mail" 
            className="w-full p-4 rounded-xl bg-[#0f172a] border border-gray-700 outline-none focus:border-[#10b981] text-white" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
          />

          {modo === 'login' ? (
            /* --- VISUAL DE LOGIN --- */
            <>
              <input 
                type="password" 
                placeholder="Senha" 
                className="w-full p-4 rounded-xl bg-[#0f172a] border border-gray-700 outline-none focus:border-[#10b981] text-white" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
              
              {/* Captcha para Login com container de altura mínima para evitar saltos de layout */}
             <div style={{ minHeight: '65px', marginTop: '10px', marginBottom: '10px' }} className="flex justify-center">
  <Turnstile 
  key={modo}
  siteKey="0x4AAAAAACryFNkeF0I1cWKu"
  onSuccess={(token: any) => setCaptchaToken(token)} 
  options={{ 
    theme: 'dark'
  }}
/>
</div>

              <button 
                onClick={handleLogin} 
                className="w-full bg-[#10b981] p-4 rounded-xl font-black text-[#0f172a] hover:opacity-90 transition-all"
              >
                ENTRAR NO PAINEL
              </button>
              
              <button 
                onClick={handleSignUp} 
                className="w-full border border-gray-700 p-4 rounded-xl font-black text-gray-400 hover:text-white hover:border-[#10b981] transition-all"
              >
                CRIAR CONTA
              </button>

              <div className="flex justify-end mt-2">
                <button 
                  type="button" 
                  onClick={() => setModo('recuperar')} 
                  className="text-xs text-gray-400 hover:text-orange-500 transition-colors underline"
                >
                  Esqueceu a senha?
                </button>
              </div>
            </>
          ) : (
            /* --- VISUAL DE RECUPERAÇÃO --- */
            <>
              <p className="text-sm text-gray-400 text-center mb-2">
                Digite seu e-mail acima para receber o link de recuperação.
              </p>

              {/* Captcha para Recuperação */}
              <div style={{ minHeight: '65px', marginTop: '10px', marginBottom: '10px' }} className="flex justify-center">
   <Turnstile 
  key={modo}
  siteKey="0x4AAAAAACryFNkeF0I1cWKu"
  onSuccess={(token: any) => setCaptchaToken(token)} 
  options={{ 
    theme: 'dark'
  }}
/>
</div>

              <button 
                onClick={handleResetPassword} 
                className="w-full bg-orange-500 p-4 rounded-xl font-black text-white hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
              >
                ENVIAR LINK DE ACESSO
              </button>

              <button 
                type="button"
                onClick={() => setModo('login')} 
                className="w-full border border-transparent p-2 text-sm font-bold text-gray-500 hover:text-white transition-all mt-2"
              >
                ← Voltar para o login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-4 md:p-8 font-sans">
      <div className=" mx-auto flex flex-col lg:flex-row gap-10">

        {/* 1. COLUNA ESQUERDA (RANKING) */}
        <aside className="hidden lg:block w-[280px]">
          <RankingSide ranking={ranking} />
        </aside>

        {/* COLUNA PRINCIPAL */}
<div className="flex-1 space-y-10">
  <div className="flex justify-between items-center">
    <h1 className="text-3xl font-black text-[#10b981] italic tracking-tighter uppercase">OPINIA.</h1>
    
    <div className="flex items-center gap-2">
      {/* NOVO: BOTÃO DE PERFIL/CARTEIRA RÁPIDO (SÓ APARECE NO CELULAR) */}
      <button 
        onClick={() => setIsCarteiraMobileAberta(true)} 
        className="lg:hidden flex items-center gap-2 bg-[#1e293b] border border-gray-800 px-3 py-1.5 rounded-full active:scale-95 transition-all"
      >
        <div className="w-6 h-6 bg-[#10b981] rounded-full flex items-center justify-center text-[10px] font-black text-[#0f172a]">
          {(perfil?.nickname || 'U').substring(0, 1).toUpperCase()}
        </div>
        <span className="text-[#10b981] font-black text-[11px] tracking-tighter">
          R$ {perfil?.balance?.toFixed(2)}
        </span>
      </button>

      <button 
        onClick={() => { supabase.auth.signOut(); setUser(null); }} 
        className="text-gray-500 font-bold text-[10px] bg-gray-900/50 px-4 py-2 rounded-full uppercase hover:text-white transition-all"
      >
        Sair
      </button>
    </div>
  </div>

  <div><NavegacaoPools abaAtiva={abaAtiva} setAbaAtiva={setAbaAtiva} /></div>

  

  <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
    <button onClick={() => setFiltroAtivo('Todos')} className={`px-6 py-2.5 rounded-full text-[11px] font-black transition-all border whitespace-nowrap ${filtroAtivo === 'Todos' ? 'bg-[#10b981] text-[#0f172a] border-[#10b981]' : 'border-gray-800 text-gray-500 hover:border-gray-600'}`}>🔥 TODOS</button>
    {temasDisponiveis.map(t => (
      <button key={t} onClick={() => setFiltroAtivo(t)} className={`px-6 py-2.5 rounded-full text-[11px] font-black transition-all border whitespace-nowrap ${filtroAtivo === t ? 'bg-[#10b981] text-[#0f172a] border-[#10b981]' : 'border-gray-800 text-gray-500 hover:border-gray-600'}`}>{t.toUpperCase()}</button>
    ))}
  </div>

          {/* BOTÕES DE ACESSO RÁPIDO - EXCLUSIVO CELULAR */}
<div className="flex md:hidden gap-3 mb-8 px-2 overflow-x-auto no-scrollbar">
  
  <button 
    onClick={() => setIsModalRankingOpen(true)} // Abre o Modal de Ranking
    className="flex-1 min-w-[130px] bg-[#1e293b] border border-gray-800 p-4 rounded-[25px] flex items-center gap-3 active:scale-95 transition-transform"
  >
    <div className="w-10 h-10 bg-amber-500/10 rounded-2xl flex items-center justify-center text-xl">🏆</div>
    <div className="flex flex-col items-start">
      <span className="text-[9px] text-gray-500 font-black uppercase leading-none">Global</span>
      <span className="text-[11px] text-white font-black uppercase italic tracking-tighter">Ranking</span>
    </div>
  </button>
</div>

          <div className="mb-6 w-full max-w-4xl mx-auto">
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 flex items-start gap-4 backdrop-blur-sm">
              <div className="bg-blue-500/20 p-2 rounded-xl">
                <Shield size={20} className="text-blue-400" />
              </div>

              <div className="flex-1">
                <h4 className="text-blue-400 text-sm font-bold uppercase tracking-wider mb-1">
                  Regra da Comunidade
                </h4>
                <p className="text-gray-400 text-xs leading-relaxed">
                  É proibido criar pools cujos resultados não possam ser <span className="text-white font-medium">verificados publicamente</span>.
                  Uma vez confirmadas, as apostas são <span className="text-white font-medium">definitivas</span> para garantir a justiça do pote e evitar manipulações.<span>
                    Criação de pools proibidas resultarão em banimento imediato e permanente da conta. RESPEITE AS REGRAS
                  </span>
                </p>
              </div>

              {/* Opcional: Um selo de "Auditado" ou "Seguro" no canto */}
              <div className="hidden md:block opacity-20 transform rotate-12">
                <Scale size={40} className="text-white" />
              </div>
            </div>
          </div>
          <div className="bg-[#1e293b] p-10 rounded-[40px] border border-gray-800 shadow-2xl">
            <input className="w-full p-0 bg-transparent mb-8 text-3xl font-black outline-none placeholder-green-700" placeholder="Qual sua previsão?" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <select className="bg-[#0f172a] p-4 rounded-2xl border border-gray-800 text-xs text-[#10b981] font-bold outline-none" value={tema} onChange={(e) => setTema(e.target.value)}>
                {temasDisponiveis.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {/* SELETOR DE MODO DE JOGO - Substituindo o Pública/Privada */}
<div className="flex bg-[#0f172a] p-1.5 rounded-2xl border border-gray-800">
  <button 
    onClick={() => setTipoPool('sim_nao')} 
    className={`flex-1 p-3 rounded-xl text-[10px] font-black transition-all ${tipoPool === 'sim_nao' ? 'bg-[#10b981] text-[#0f172a]' : 'text-gray-500'}`}
  >
    SIM / NÃO
  </button>
  <button 
    onClick={() => setTipoPool('multipla')} 
    className={`flex-1 p-3 rounded-xl text-[10px] font-black transition-all ${tipoPool === 'multipla' ? 'bg-[#10b981] text-[#0f172a]' : 'text-gray-500'}`}
  >
    MÚLTIPLA
  </button>
</div>
</div>

{/* CAMPOS DINÂMICOS PARA MÚLTIPLA ESCOLHA */}
{tipoPool === 'multipla' && (
  <div className="space-y-3 mb-8 animate-in fade-in slide-in-from-top-2 duration-300">
    {opcoesCustom.map((opt, idx) => (
      <input
        key={idx}
        placeholder={`Opção ${idx + 1} (ex: 2 gols)`}
        className="w-full p-4 rounded-xl bg-[#0f172a] border border-gray-800 outline-none focus:border-[#10b981] text-sm font-bold text-white transition-all"
        value={opt}
        onChange={(e) => {
          const novas = [...opcoesCustom];
          novas[idx] = e.target.value;
          setOpcoesCustom(novas);
        }}
      />
    ))}
    {opcoesCustom.length < 5 && (
      <button 
        type="button"
        onClick={() => setOpcoesCustom([...opcoesCustom, ''])}
        className="text-[#10b981] text-[10px] font-black uppercase tracking-widest hover:opacity-70 ml-2"
      >
        + Adicionar Opção
      </button>
    )}
  </div>
)}

<div className="mb-6">
  <label className="text-[10px] font-black text-gray-500 uppercase tracking-[2px] mb-3 block">
    Duração da Pool (Minutos) opcional
  </label>
  <input
    type="number"
    min="0"
    value={minutosExpiracao || ''}
    onChange={(e) => setMinutosExpiracao(Math.max(0, Number(e.target.value)))}
    placeholder="Ex: 60 (para 1 hora)"
    className="w-full bg-[#0f172a] border border-gray-800 p-4 rounded-2xl text-white font-bold outline-none focus:border-[#10b981] transition-all"
  />
  <p className="text-[9px] text-gray-600 mt-2 font-bold italic uppercase">
    {minutosExpiracao > 0 ? `Fecha em ${minutosExpiracao} minutos` : "Fechamento manual"}
  </p>
</div>

<button
  onClick={criarPool}
  disabled={isActionLoading}
  className={`w-full p-5 rounded-2xl font-black text-[#0f172a] text-lg transition-all ${
    isActionLoading ? 'bg-gray-600 cursor-not-allowed opacity-50' : 'bg-[#10b981] hover:opacity-90'
  }`}
>
  {isActionLoading ? 'PUBLICANDO...' : 'PUBLICAR AGORA'}
</button>
          </div>

          <div className="space-y-10">

            {poolsFiltradas.map((pool: any) => {
  const { totalPote, opcoes } = calcularDadosPool(pool)
  return (
    <div key={pool.id} className="p-10 bg-[#1e293b] rounded-[40px] border border-gray-800 relative shadow-xl overflow-hidden group">
      <div className="flex items-center gap-3 mb-6">
        {/* AVATAR */}
        <div
          onClick={() => {
            const dadosPerfil = {
              ...pool.profiles,
              id: pool.user_id 
            };
            setPerfilAberto(dadosPerfil);
            buscarHistoricoCriador(pool.user_id);
          }}
          className="w-8 h-8 bg-[#10b981] rounded-full flex items-center justify-center font-black text-[#0f172a] text-[10px] cursor-pointer relative z-50"
        >
          {(pool.profiles?.nickname || 'U').substring(0, 2).toUpperCase()}
        </div>

        {/* INFO DO CRIADOR, DENÚNCIA E ID */}
<div className="flex flex-col">
  <p className="text-[10px] text-gray-500 font-bold uppercase">
    @{pool.profiles?.nickname || 'usuario'}
  </p>
  
  <div className="flex items-center gap-3 mt-0.5">
    <button 
      onClick={(e) => {
        e.stopPropagation(); // Impede de abrir o perfil ao clicar em denunciar
        navigator.clipboard.writeText(pool.id);
        setDenunciaInfo({ aberto: true, poolId: pool.id });
      }}
      className="relative z-[100] flex items-center gap-1 text-[8px] font-black text-gray-700 hover:text-red-500 transition-all uppercase tracking-tighter cursor-pointer"
    >
      <span className="w-1 h-1 bg-red-500/30 rounded-full"></span>
      Denunciar
    </button>
    
    <span className="text-[7px] text-gray-800 font-mono uppercase tracking-widest opacity-50">
      #{pool.id.slice(0, 8)}
    </span>
  </div>
</div>

        {/* CRONÔMETRO ALINHADO À DIREITA */}
        {pool.expires_at && pool.status === 'open' && (
          <div className="ml-auto">
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
              <span className="text-amber-500 text-[10px] font-black uppercase italic tracking-wider">
                <ContadorRegressivo dataFinal={pool.expires_at} />
              </span>
            </div>
          </div>
        )}
      </div>
                  <div className="poolsresultados flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                    {/* --- AVISO DE DENÚNCIA APENAS PARA PARTICIPANTES --- */}
{(() => {
  // 1. Verifica se o usuário logado participou desta pool
  const participou = pool.opcoes?.some((opt: any) => 
    opt.bets?.some((bet: any) => bet.user_id === user?.id)
  );

  // 2. Verifica se existe denúncia no seu banco de dados para esta pool
  // (Assumindo que sua query traz 'denuncias' ou você marcou 'status_denuncia')
  if (participou && pool.status_denuncia === 'denunciado') {
    return (
      <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-[24px] p-5 animate-in fade-in slide-in-from-top-2 duration-500">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">📩</span>
          <p className="text-[10px] text-red-500 font-black uppercase italic tracking-tighter">
            Notificação de Contestação
          </p>
        </div>
        <p className="text-[11px] text-gray-300 font-medium leading-relaxed italic border-l-2 border-red-500/50 pl-3">
          "Uma denúncia foi registrada: {pool.motivo_denuncia}"
        </p>
        <p className="text-[8px] text-gray-500 font-bold uppercase mt-3 tracking-widest">
          O prêmio será processado após a análise da nossa equipe.
        </p>
      </div>
    );
  }
  return null;
})()}
                    <h3 className="textoaposta text-2xl font-black">{pool.title}</h3>
                    <div className="poteclass bg-[#0f172a] p-4 rounded-3xl border border-gray-800 min-w-[140px] text-center">
                      <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Pote Total</p>
                      <div className="relative flex justify-center">
                        <AnimatePresence mode="popLayout">
                          <motion.p
                            key={totalPote} // O gatilho: anima sempre que o valor total mudar
                            initial={{ y: 20, opacity: 0 }} // Começa em baixo e invisível
                            animate={{
                              y: [20, -5, 0], // Sobe, passa ligeiramente e estabiliza (slot machine)
                              opacity: 1, // Torna-se visível
                              color: ['#10b981', '#ffffff', '#10b981'], // Pisca em verde-esmeralda/branco/verde-esmeralda
                              transition: {
                                type: "spring", // Usa um efeito de mola para um movimento mais orgânico
                                stiffness: 150, // "Rigidez" da mola
                                damping: 10, // "Amortecimento"
                              }
                            }}
                            exit={{ y: -20, opacity: 0 }} // Quando o valor antigo sai, ele sobe e desaparece
                            className="text-[#10b981] font-black text-2xl tracking-tighter leading-none italic"
                          >
                            R$ {totalPote.toFixed(2)}
                          </motion.p>
                        </AnimatePresence>
                      </div>
                    </div>

                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {usuarioDestaque && poolsFiltradas.length > 0 && (
    <div className="flex justify-between items-center bg-[#10b981]/10 p-4 rounded-[20px] border border-[#10b981]/20 mb-4">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse" />
        <span className="text-[#10b981] font-bold text-[11px] uppercase tracking-wider">
          ⚡ Vendo pools de @{usuarioDestaque.nickname}
        </span>
      </div>
      <button 
        onClick={() => setUsuarioDestaque(null)} 
        className="bg-[#10b981] text-black px-3 py-1 rounded-lg text-[9px] font-black uppercase hover:scale-105 transition-all"
      >
        Limpar Filtro ✕
      </button>
    </div>
  )}
  
                    {opcoes.map((option: any) => {
                      // 1. Calculamos a trava aqui dentro para cada opção
                      const tempoExpirou = pool.expires_at && new Date(pool.expires_at) < agora;
                      const estaBloqueado = pool.status === 'closed' || pool.status === 'finished' || tempoExpirou;

                      // 2. Cálculos do pote que você já tinha
                      const totalOpcao = (option.bets || []).reduce((s: number, b: any) => s + (b.amount || 0), 0);
                      const multiplicador = totalOpcao > 0 ? (totalPote / totalOpcao) : 1;

                      return (
                        <div key={option.id} className="p-6 bg-[#0f172a] rounded-[32px] border border-gray-800 hover:border-[#10b981] transition-all">
                          {/* Verificamos se a pool está aberta no banco e se não expirou no tempo */}
                          {pool.status !== 'closed' && pool.status !== 'finished' ? (
                            <button
                              disabled={estaBloqueado}
                              onClick={() => {
                                setSelectedOption(option);
                                setSelectedPool(pool);
                                setIsModalOpen(true);
                              }}
                              className={`w-full p-4 rounded-xl transition-all font-black text-xs mb-4 uppercase ${estaBloqueado
                                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'
                                  : 'bg-[#1e293b] hover:bg-[#10b981] hover:text-[#0f172a]'
                                }`}
                            >
                              {tempoExpirou ? '⏳ Tempo Esgotado' : option.label}
                            </button>
                          ) : (
                            /* Quando a pool fecha ou termina, mostra o ganhador */
                            <div className={`w-full p-4 rounded-xl font-black text-xs mb-4 uppercase text-center ${pool.winner_id === option.id ? 'bg-[#10b981] text-[#0f172a]' : 'bg-gray-800 text-gray-500'
                              }`}>
                              {option.label} {pool.winner_id === option.id && '🏆'}
                            </div>
                          )}

                          <div className="flex justify-between items-center text-[11px] font-bold uppercase">
                            <motion.span
                              key={totalOpcao} // Isso dispara a animação sempre que o valor muda
                              initial={{ scale: 1 }}
                              animate={{
                                scale: [1, 1.2, 1],
                                color: ["#6b7280", "#10b981", "#6b7280"] // Pisca em verde e volta ao cinza
                              }}
                              transition={{ duration: 0.4 }}
                              className="text-gray-500"
                            >
                              Pote: R$ {totalOpcao.toFixed(2)}
                            </motion.span>
                            <span className="text-[#10b981]">x{multiplicador.toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {user.id === pool.user_id && pool.status !== 'closed' && (
                    <div className="mt-8 pt-8 border-t border-gray-800 flex gap-4">
                      {opcoes.map((opt: any) => (
                        <button
                          key={opt.id}
                          onClick={() => setConfirmacaoEncerramento({
                            aberto: true,
                            poolId: pool.id,
                            optionId: opt.id,
                            textoOpcao: opt.label,
                            ownerId: pool.user_id // Adicionamos isso para o modal funcionar 100%
                          })}
                          className="flex-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 py-3 rounded-xl text-[9px] font-black uppercase hover:bg-amber-500 hover:text-white transition-all"
                        >
                          Confirmar {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* BARRA LATERAL (FIXADA) */}
        <div className="w-full lg:w-[320px] space-y-8">
          <div className="bg-[#1e293b] p-8 rounded-[35px] border border-gray-800 shadow-2xl sticky top-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-[#10b981] rounded-2xl flex items-center justify-center font-black text-[#0f172a]">
                {(perfil?.nickname || 'U').substring(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col flex-1">
                {isEditingNickname ? (
                  <input autoFocus className="bg-[#0f172a] border border-[#10b981] text-white text-xs p-2 rounded-lg outline-none w-full" value={tempNickname} onChange={(e) => setTempNickname(e.target.value)} onBlur={atualizarNickname} onKeyDown={(e) => e.key === 'Enter' && atualizarNickname()} />
                ) : (
                  <h2 onClick={() => { setIsEditingNickname(true); setTempNickname(perfil?.nickname || ''); }} className="text-sm font-black text-white uppercase truncate cursor-pointer hover:text-[#10b981]">
                    @{perfil?.nickname || 'definir_nome'} ✎
                  </h2>
                )}
                <div className="flex gap-0.5 mt-1">
                  {[1, 2, 3, 4, 5].map(i => <span key={i} className={`text-[12px] ${i <= (perfil?.reputation || 60) / 20 ? 'text-amber-400' : 'text-gray-700'}`}>★</span>)}
                </div>
              </div>
            </div>
            <div>
              {/* INSERIR AQUI - PAINEL DE CREDIBILIDADE */}
              <div className="grid grid-cols-2 gap-2 bg-black/20 p-2 rounded-xl border border-gray-800/50 mb-6">
                <div className="text-center border-r border-gray-800">
                  <div className="text-[#10b981] text-[10px] font-black">
                    👍 {perfil?.total_top || 0}
                  </div>
                  <div className="text-[6px] text-gray-500 uppercase font-bold tracking-tighter">TOP</div>
                </div>
                <div className="text-center">
                  <div className="text-red-500 text-[10px] font-black">
                    👎 {perfil?.total_bad || 0}
                  </div>
                  <div className="text-[6px] text-gray-500 uppercase font-bold tracking-tighter">BAD</div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="mt-4">
  <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Saldo Real (Saque)</p>
  <p className="text-white font-black text-3xl italic">
    R$ {perfil?.balance?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
  </p>
</div>
              <div>
                {valorPendente > 0 && (
                  <div className={`mt-3 p-3 rounded-2xl border ${temContestacao ? 'border-red-500/50 bg-red-500/10' : 'border-[#10b981]/30 bg-[#10b981]/10'}`}>
                    <div className="flex justify-between items-start">
                      <p className={`text-[9px] font-black uppercase ${temContestacao ? 'text-red-400' : 'text-[#10b981]'}`}>
                        {temContestacao ? '⚠️ Em Análise' : '⏳ Recebendo'}
                      </p>

                      {/* Contador Simples */}
                      {!temContestacao && (
                        <span className="text-[9px] text-gray-400 font-bold">
                          ~10 min
                        </span>
                      )}
                    </div>

                    <p className="text-lg font-black text-white leading-none mt-1">
                      + R$ {valorPendente.toFixed(2)}
                    </p>

                    {!temContestacao && (
                      <p className="text-[10px] text-gray-400 mt-2 leading-tight">
                        Seu prêmio está sendo processado e cairá em breve.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <button onClick={() => setIsModalTransacaoOpen('deposito')} className="w-full bg-[#10b981] text-[#0f172a] text-[10px] font-black py-3 rounded-xl uppercase">Depositar</button>
                <button onClick={() => setIsModalTransacaoOpen('saque')} className="w-full bg-gray-800 text-white text-[10px] font-black py-3 rounded-xl uppercase">Sacar</button>
              </div>

              <div className="pt-6 border-t border-gray-800 space-y-3">
                <div className="flex justify-between text-[10px] font-black uppercase"><span className="text-gray-500">Acertos</span><span className="text-[#10b981]">{perfil?.acertos || 0}</span></div>
                <div className="flex justify-between text-[10px] font-black uppercase"><span className="text-gray-500">Erros</span><span className="text-red-500">{perfil?.erros || 0}</span></div>
              </div>

              <div className="pt-6 border-t border-gray-800">
                <p className="text-[10px] text-gray-500 font-black uppercase mb-4">Histórico</p>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 no-scrollbar">
                  {historico.length === 0 && <p className="text-[9px] text-gray-700 uppercase font-black">Nenhuma transação</p>}
                  {historico.map((item) => (
                    <div key={item.id} className="p-3 bg-[#0f172a] rounded-xl flex justify-between items-center border border-gray-800">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-white uppercase">{item.type === 'bet_win' ? 'Vitória' : item.type === 'bet' ? 'Aposta' : 'Recarga'}</span>
                        <span className="text-[7px] text-gray-600">{new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                      <span className={`text-[10px] font-black ${item.amount > 0 ? 'text-[#10b981]' : 'text-red-500'}`}>
                        {item.amount > 0 ? '+' : ''}{Number(item.amount).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================= */}
      {/* MODAIS - ORGANIZADOS */}
      {/* ============================= */}

      {/* ----------------------------- */}
      {/* MODAL DE PERFIL DO CRIADOR */}
      {/* ----------------------------- */}
      {perfilAberto && (
  <ModalPerfil
    perfil={perfilAberto}
    pools={poolsDoCriador}
    usuarioLogado={perfil}
    onClose={() => {
      setPerfilAberto(null);
      buscarPools();
    }}
    // ADICIONE ESTA LINHA ABAIXO PARA O ERRO SUMIR:
    onVerPoolsAtivas={(id, nick) => {
      setUsuarioDestaque({ id, nickname: nick });
      setPerfilAberto(null);
      setAbaAtiva('explorar');
    }}
  />
)}

      {/* ----------------------------- */}
      {/* MODAL DE CONFIRMAÇÃO DE ENCERRAMENTO */}
      {/* ----------------------------- */}
      {confirmacaoEncerramento.aberto && (
        <div className="fixed inset-0 bg-[#0f172a]/95 backdrop-blur-xl flex items-center justify-center p-6 z-[100]">
          <div className="bg-[#1e293b] p-10 rounded-[40px] max-w-sm w-full border border-gray-800 shadow-2xl text-center">
            <h2 className="text-3xl font-black mb-6 italic text-[#10b981]">FINALIZAR?</h2>

            <p className="text-gray-400 mb-8 font-bold uppercase text-[10px] tracking-[3px] leading-relaxed">
              Você confirma que o resultado <br /> oficial deste evento foi: <br />
              <span className="text-white text-lg block mt-2 italic">
                "{confirmacaoEncerramento.textoOpcao}"
              </span>
            </p>

            <div className="mt-6 p-5 bg-white/5 border border-white/10 rounded-[32px]">
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-3 block">
                Mensagem para os Apostadores (Opcional)
              </label>
              <textarea
                placeholder="Explique o resultado... Ex: O time X venceu por 2x1."
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                maxLength={150}
                className="w-full bg-[#0b121f] border border-white/10 rounded-2xl p-4 text-xs text-white placeholder:text-gray-700 focus:border-blue-500/50 outline-none resize-none h-24 transition-all"
              />
            </div>

            <div className="flex flex-col gap-3 mt-6">
              <button
                onClick={() => {
                  encerrarPool(
                    confirmacaoEncerramento.poolId,
                    confirmacaoEncerramento.optionId,
                    confirmacaoEncerramento.ownerId,
                    justificativa,
                  );
                  setConfirmacaoEncerramento({ ...confirmacaoEncerramento, aberto: false });
                  setJustificativa('');
                }}
                className="w-full bg-[#10b981] p-5 rounded-2xl font-black text-[#0f172a] text-lg hover:scale-105 transition-all shadow-lg"
              >
                SIM, CONFIRMAR
              </button>
              <button
                onClick={() => setConfirmacaoEncerramento({ ...confirmacaoEncerramento, aberto: false })}
                className="w-full text-gray-500 font-bold text-[10px] uppercase hover:text-white mt-2 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------- */}
      {/* MODAL DE SUCESSO/ERRO DE PUBLICAÇÃO */}
      {/* ----------------------------- */}
      {sucessoPublicacao.aberto && (
        <div className="fixed inset-0 bg-[#0f172a]/95 backdrop-blur-xl flex items-center justify-center p-6 z-[150]">
          <div className="bg-[#1e293b] p-10 rounded-[40px] max-w-sm w-full border border-gray-800 shadow-2xl text-center">

            {/* Ícone Dinâmico */}
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border ${sucessoPublicacao.tipo === 'sucesso'
                ? 'bg-[#10b981]/10 border-[#10b981]/20 text-[#10b981]'
                : 'bg-red-500/10 border-red-500/20 text-red-500'
              }`}>
              <span className="text-4xl">{sucessoPublicacao.tipo === 'sucesso' ? '✓' : '✕'}</span>
            </div>

            <h2 className={`text-3xl font-black mb-4 italic uppercase ${sucessoPublicacao.tipo === 'sucesso' ? 'text-[#10b981]' : 'text-red-500'
              }`}>
              {sucessoPublicacao.tipo === 'sucesso' ? 'PUBLICADO!' : 'ERRO!'}
            </h2>

            <p className="text-gray-400 mb-6 font-bold uppercase text-[10px] tracking-[3px] leading-relaxed">
              {sucessoPublicacao.mensagem}
            </p>

            {/* Justificativa opcional */}
            <div className="mb-6 text-left">
              <label className="text-[9px] font-black uppercase text-gray-500 tracking-widest mb-2 block text-center">
                Justificativa do Resultado
              </label>
              <textarea
                placeholder="Explique o motivo do resultado (ex: Placar final 2x1)..."
                className="w-full bg-[#0b121f] border border-gray-700 rounded-2xl p-4 text-xs text-white focus:border-[#10b981] outline-none resize-none h-24 transition-all"
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
              />
            </div>

            <button
              onClick={() => setSucessoPublicacao({ ...sucessoPublicacao, aberto: false })}
              className={`w-full p-5 rounded-2xl font-black text-[#0f172a] text-lg hover:scale-105 transition-all ${sucessoPublicacao.tipo === 'sucesso' ? 'bg-[#10b981]' : 'bg-red-500'
                }`}
            >
              ENTENDIDO
            </button>
          </div>
        </div>
      )}

      {/* ----------------------------- */}
      {/* MODAL GLOBAL DO TICKET DE RESULTADO */}
      {/* ----------------------------- */}
      {isApostaConcluida && dadosTicket && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0f172a]/95 backdrop-blur-xl p-4">
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <button
              onClick={() => setIsApostaConcluida(false)}
              className="mb-6 text-gray-400 hover:text-white font-black text-[10px] uppercase tracking-widest transition-all"
            >
              [ FECHAR RESULTADO X ]
            </button>

            <BetTicket
              poolTitle={dadosTicket.poolTitle}
              optionLabel={dadosTicket.optionLabel}
              amount={dadosTicket.amount}
              multiplier={dadosTicket.multiplier}
              status={dadosTicket.status}
              stats={dadosTicket.stats}
              justificativa={dadosTicket.justificativa}
            />
          </div>
        </div>
      )}

      {/* ----------------------------- */}
      {/* MODAL DE CONFIRMAÇÃO DE APOSTA */}
      {/* ----------------------------- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#0f172a]/95 backdrop-blur-xl flex items-center justify-center p-6 z-50">
          <div className="bg-[#1e293b] p-10 rounded-[40px] max-w-sm w-full border border-gray-800 shadow-2xl">
            <h2 className="text-3xl font-black mb-6 text-center italic text-[#10b981]">CONFIRMAR</h2>
            <input
              autoFocus
              type="number"
              className="w-full bg-[#0f172a] p-6 rounded-2xl text-3xl font-black outline-none border-2 border-transparent focus:border-[#10b981] mb-6"
              placeholder="0,00"
              value={valorAposta}
              onChange={(e) => setValorAposta(e.target.value)}
            />
            <div className="bg-[#0f172a] p-4 rounded-2xl mb-8 flex justify-between items-center">
              <span className="text-[10px] font-black text-gray-500 uppercase">Ganhos:</span>
              <span className="text-[#10b981] font-black text-xl">R$ {obterGanhoEstimado().toFixed(2)}</span>
            </div>
            <button onClick={confirmarAposta} className="w-full bg-[#10b981] p-5 rounded-2xl font-black text-[#0f172a] text-lg mb-4">APOSTAR AGORA</button>
            <button onClick={() => setIsModalOpen(false)} className="w-full text-gray-500 font-bold text-[10px] uppercase">Cancelar</button>
          </div>
        </div>
      )}

      {/* ----------------------------- */}
      {/* MODAL DE TRANSAÇÃO (DEPÓSITO / RETIRADA) */}
      {/* ----------------------------- */}
      {isModalTransacaoOpen && (
  <div className="fixed inset-0 bg-[#0f172a]/95 backdrop-blur-xl flex items-center justify-center p-6 z-50">
    <div className="bg-[#1e293b] p-10 rounded-[40px] max-w-sm w-full border border-gray-800">
      <h2 className="text-3xl font-black mb-8 text-center uppercase text-[#10b981]">
        {isModalTransacaoOpen === 'deposito' ? 'Adicionar' : 'Retirar'}
      </h2>

      {/* INPUT DE VALOR */}
      <p className="text-[10px] text-gray-500 font-bold uppercase mb-2 ml-2">Valor (R$)</p>
      <input
        autoFocus
        type="number"
        className="w-full bg-[#0f172a] p-6 rounded-2xl text-3xl font-black outline-none border-2 border-transparent focus:border-[#10b981] mb-6"
        placeholder="0,00"
        value={valorTransacao}
        onChange={(e) => setValorTransacao(e.target.value)}
      />

      {/* INPUT DE CPF (Aparece apenas se o perfil não tiver CPF salvo) */}
      <div className="mb-4">
  <p className="text-[10px] text-gray-500 font-bold uppercase mb-2 ml-2">
    CPF (Somente números)
  </p>
  <input
    type="text"
    className="w-full bg-[#0f172a] p-4 rounded-xl text-lg font-bold outline-none border-2 border-transparent focus:border-[#10b981]"
    placeholder="Digite seu CPF"
    value={cpfUsuario}
    onChange={(e) => setCpfUsuario(e.target.value)}
  />
</div>
{/* CAMPOS DE SAQUE (Aparecem apenas se for Retirada) */}
{isModalTransacaoOpen === 'saque' && (
  <div className="mb-4 space-y-4 text-left">
    <div>
      <p className="text-[10px] text-gray-500 font-bold uppercase mb-2 ml-2">Tipo de Chave PIX</p>
      <select 
        value={tipoChavePix}
        onChange={(e) => setTipoChavePix(e.target.value)}
        className="w-full bg-[#0f172a] p-4 rounded-xl text-sm font-bold text-white outline-none border-2 border-transparent focus:border-[#10b981]"
      >
        <option value="CPF">CPF / CNPJ</option>
        <option value="EMAIL">E-mail</option>
        <option value="PHONE">Telefone (Celular)</option>
        <option value="RANDOM">Chave Aleatória (EVP)</option>
      </select>
    </div>

    <div>
      <p className="text-[10px] text-gray-500 font-bold uppercase mb-2 ml-2">Sua Chave PIX</p>
      <input 
        type="text"
        placeholder="Digite sua chave"
        value={chavePix}
        onChange={(e) => setChavePix(e.target.value)}
        className="w-full bg-[#0f172a] p-4 rounded-xl text-lg font-bold text-white outline-none border-2 border-transparent focus:border-[#10b981]"
      />
    </div>

    
  </div>
)}

      {/* BOTÕES DE AÇÃO */}
      <button 
        onClick={gerenciarSaldoReal} // Vamos mudar o nome da função para diferenciar
        disabled={loadingTransacao}
        className="w-full bg-[#10b981] p-5 rounded-2xl font-black text-[#0f172a] text-lg mb-4 hover:scale-105 transition-transform disabled:opacity-50"
      >
        {loadingTransacao ? 'PROCESSANDO...' : 'CONFIRMAR'}
      </button>

      <button 
        onClick={() => setIsModalTransacaoOpen(null)} 
        className="w-full text-gray-500 font-bold text-[10px] uppercase"
      >
        Fechar
      </button>
    </div>
  </div>
)}
{denunciaInfo?.aberto && (
  <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center p-6" style={{ zIndex: 9999 }}>
    <div className="max-w-xs w-full bg-[#1e293b] border border-red-500/30 p-8 rounded-[40px] shadow-2xl text-center">
      <div className="w-16 h-16 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
        <span className="text-3xl text-red-500">⚠️</span>
      </div>

      <h3 className="text-white font-black uppercase italic text-xl mb-2 tracking-tighter">Denunciar Irregularidade</h3>
      
      <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 mb-6">
        <p className="text-[9px] text-red-400 font-black uppercase leading-tight italic">
          🛑 AVISO DE MÁ FÉ:
        </p>
        <p className="text-[8px] text-gray-400 font-bold uppercase mt-1 leading-relaxed">
          Denúncias sem fundamento para travar pagamentos honestos resultam em <span className="text-red-500">BANIMENTO IMEDIATO</span> e perda total do seu Score.
        </p>
      </div>
      
      <div className="my-6 text-left">
        <label className="text-[9px] font-black uppercase text-gray-500 mb-2 block ml-2">O que aconteceu? se possivel cole um link que comprove</label>
        <textarea
          value={textoDenuncia}
          onChange={(e) => setTextoDenuncia(e.target.value)}
          placeholder="Ex: Resultado oficial foi 2x1, mas o criador marcou 1x1..."
          className="w-full bg-[#0b121f] border border-gray-700 rounded-2xl p-4 text-xs text-white focus:border-red-500 outline-none resize-none h-24 transition-all"
        />
      </div>

      <div className="flex flex-col gap-3">
        {/* BOTÃO DE CONFIRMAÇÃO (QUE ESTAVA FALTANDO) */}
        <button 
          onClick={async () => {
            if (textoDenuncia.length < 10) return alert("Descreva melhor o motivo.");

            try {
              // 1. Registra a denúncia na tabela de log
              await supabase.from('denuncias').insert([{ 
                pool_id: denunciaInfo.poolId, 
                denunciante_id: perfil?.id,
                motivo: textoDenuncia
              }]);

              // 2. ATUALIZA A POOL para avisar os apostadores
              await supabase.from('pools').update({ 
                status: 'em_analise',
                motivo_denuncia: textoDenuncia,
                status_denuncia: 'denunciado'
              }).eq('id', denunciaInfo.poolId);

              setSucessoPublicacao({
                aberto: true,
                mensagem: "DENÚNCIA REGISTRADA! Os apostadores serão notificados no card.",
                tipo: 'sucesso'
              });
              
              setTextoDenuncia('');
              setDenunciaInfo(null);
              buscarPools();
            } catch (err) {
              console.error(err);
              alert("Erro ao enviar denúncia.");
            }
          }}
          className="w-full bg-red-500 p-4 rounded-2xl font-black text-[#0f172a] text-[10px] uppercase hover:opacity-90 transition-all shadow-[0_0_20px_rgba(239,68,68,0.2)]"
        >
          Confirmar Denúncia
        </button>

        {/* BOTÃO VOLTAR (AGORA SÓ COM A FUNÇÃO DE FECHAR) */}
        <button 
          onClick={() => {
            setDenunciaInfo(null);
            setTextoDenuncia('');
          }}
          className="w-full text-gray-500 font-black text-[9px] uppercase hover:text-white transition-colors py-2"
        >
          Voltar
        </button>
      </div>
    </div>
  </div>
)}

{/* MODAL DE RANKING PARA CELULAR */}
{isModalRankingOpen && (
  <div className="fixed inset-0 bg-black/95 z-[9999] p-6 flex flex-col">
    <div className="flex justify-between items-center mb-8">
      <h2 className="text-white font-black italic text-2xl uppercase italic tracking-tighter text-[#10b981]">Ranking Global</h2>
      <button onClick={() => setIsModalRankingOpen(false)} className="text-gray-500 font-bold uppercase text-[10px]">Fechar ✕</button>
    </div>
    
    <div className="bg-[#1e293b] rounded-[40px] p-6 border border-gray-800 overflow-y-auto">
      <RankingSide ranking={ranking} /> {/* Reaproveita o componente que você já tem! */}
    </div>
  </div>
)}


{/* GAVETA DE PERFIL MOBILE */}
{isCarteiraMobileAberta && (
  <div className="fixed inset-0 z-[100] flex items-end justify-center lg:hidden">
    {/* Fundo escuro com blur */}
    <div 
      className="absolute inset-0 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={() => setIsCarteiraMobileAberta(false)}
    />
    
    {/* A Gaveta (Drawer) */}
    <div className="relative w-full max-h-[92vh] bg-[#0f172a] rounded-t-[40px] border-t border-gray-800 shadow-2xl overflow-y-auto p-6 animate-in slide-in-from-bottom-full duration-500">
      
      {/* Indicador de puxar */}
      <div className="w-12 h-1 bg-gray-800 rounded-full mx-auto mb-6" />

      <div className="flex justify-between items-center mb-8">
        <h2 className="text-[#10b981] font-black italic text-xl uppercase tracking-tighter">Minha Carteira</h2>
        <button 
          onClick={() => setIsCarteiraMobileAberta(false)}
          className="bg-gray-800 text-gray-400 w-8 h-8 rounded-full font-bold flex items-center justify-center hover:text-white"
        >
          ✕
        </button>
      </div>

      {/* REPRODUÇÃO DA SUA BARRA LATERAL AQUI DENTRO */}
      <div className="space-y-8">
        
        {/* Parte do Avatar e Nickname */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#10b981] rounded-2xl flex items-center justify-center font-black text-[#0f172a] text-xl">
            {(perfil?.nickname || 'U').substring(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <h3 className="text-white font-black uppercase text-lg">@{perfil?.nickname}</h3>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <span key={i} className={`text-sm ${i <= (perfil?.reputation || 60) / 20 ? 'text-amber-400' : 'text-gray-800'}`}>★</span>
              ))}
            </div>
          </div>
        </div>

        {/* Saldo Centralizado */}
        <div className="bg-black/20 p-6 rounded-3xl border border-gray-800/50 text-center">
          <p className="text-[10px] text-gray-500 font-black uppercase mb-1">Saldo Disponível</p>
          <p className="text-white font-black text-4xl italic">
            R$ {perfil?.balance?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Botões de Ação - Note que eles fecham a gaveta ao abrir o modal de transação */}
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => { setIsModalTransacaoOpen('deposito'); setIsCarteiraMobileAberta(false); }}
            className="bg-[#10b981] text-[#0f172a] font-black py-4 rounded-2xl uppercase text-[11px] active:scale-95 transition-all"
          >
            Depositar
          </button>
          <button 
            onClick={() => { setIsModalTransacaoOpen('saque'); setIsCarteiraMobileAberta(false); }}
            className="bg-gray-800 text-white font-black py-4 rounded-2xl uppercase text-[11px] active:scale-95 transition-all"
          >
            Sacar
          </button>
        </div>

        {/* Histórico Simples */}
        <div className="pt-4">
          <p className="text-[10px] text-gray-500 font-black uppercase mb-4">Últimas Movimentações</p>
          <div className="space-y-2">
            {historico.slice(0, 4).map((item) => (
              <div key={item.id} className="p-4 bg-[#1e293b]/50 rounded-2xl flex justify-between items-center border border-gray-800/50">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-white uppercase">
                    {item.type === 'bet_win' ? 'Vitória' : item.type === 'bet' ? 'Aposta' : 'Recarga'}
                  </span>
                  <span className="text-[8px] text-gray-600">{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
                <span className={`text-[11px] font-black ${item.amount > 0 ? 'text-[#10b981]' : 'text-red-500'}`}>
                  {item.amount > 0 ? '+' : ''}{Number(item.amount).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  </div>
)}


{/* MODAL DE QR CODE PIX (ASAAS) */}
{dadosPix && (
  <div className="fixed inset-0 bg-[#0f172a]/95 backdrop-blur-xl flex items-center justify-center p-4 z-[999]">
    <div className="bg-[#1e293b] p-6 rounded-[35px] w-full max-w-[380px] border border-gray-800 text-center shadow-2xl animate-in fade-in zoom-in duration-300">
      
      <h2 className="text-[#38bdf8] font-black text-2xl uppercase mb-2 italic tracking-tighter">Escaneie o PIX</h2>
      <p className="text-[#94a3b8] text-[11px] mb-6 leading-tight">O saldo será creditado automaticamente<br/>após o pagamento.</p>
      
      {/* QR CODE */}
      <div className="bg-white p-3 rounded-2xl inline-block mb-6 shadow-lg shadow-black/20">
        <img 
          src={`data:image/png;base64,${dadosPix.imagem}`} 
          className="w-52 h-52 md:w-60 md:h-60 block mx-auto" 
          alt="QR Code PIX" 
        />
      </div>

      {/* COPIA E COLA */}
      <div className="bg-[#0f172a] p-4 rounded-2xl border border-gray-800 mb-6">
        <textarea 
          readOnly 
          className="w-full h-12 bg-transparent color-[#38bdf8] border-none font-mono text-[11px] resize-none outline-none text-center break-all text-blue-400"
          value={dadosPix.payload}
        />
        <button 
          onClick={() => {
            navigator.clipboard.writeText(dadosPix.payload);
            alert('Código copiado com sucesso!');
          }}
          className="w-full bg-gray-700/50 hover:bg-gray-700 text-white text-[10px] font-bold py-2 rounded-lg mt-2 uppercase transition-all"
        >
          Copiar Código PIX
        </button>
      </div>

      {/* BOTÃO FECHAR */}
      <button 
        onClick={() => setDadosPix(null)}
        className="w-full bg-[#38bdf8] hover:bg-[#0ea5e9] text-[#0f172a] font-black py-4 rounded-2xl uppercase text-base shadow-lg shadow-[#38bdf8]/20 transition-all active:scale-95"
      >
        Já paguei / Fechar
      </button>
    </div>
  </div>
)}




    </div>
  )
}

export default App


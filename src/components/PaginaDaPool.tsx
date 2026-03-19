import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ContadorRegressivo from "./ContadorRegressivo";
import { supabase } from './lib/supabase

type Props = {
  pool: any
  agora: Date
  calcularDadosPool: (pool: any) => { totalPote: number, opcoes: any[] }
  aoClicarEmApostar: (option: any, pool: any) => void // Nova função para o fluxo de Login/Depósito
  voltarParaOFeed: () => void // Função para o botão "Ver Mais"
}

export default function PaginaDaPool({
  pool,
  agora,
  calcularDadosPool,
  aoClicarEmApostar,
  voltarParaOFeed
}: Props) {
  const { totalPote, opcoes } = calcularDadosPool(pool)

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4">
      
      {/* HEADER DA PÁGINA (LOGO) */}
      <div className="mb-8 text-center">
        <h1 className="text-[#10b981] font-black text-3xl italic tracking-tighter">
          OPINIÃO OFICIAL
        </h1>
        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em]">
          Plataforma Social de Predições
        </p>
      </div>

      {/* CARD DA POOL EM DESTAQUE ÚNICO */}
      <div className="w-full max-w-xl bg-[#1e293b] rounded-[40px] border-2 border-[#10b981]/30 p-8 shadow-2xl relative overflow-hidden">
        
        {/* INFO DO CRIADOR */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-[#10b981] rounded-full flex items-center justify-center font-black text-[#0f172a]">
            {(pool.profiles?.nickname || 'U').substring(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase">Criado por</p>
            <p className="text-white font-black italic">@{pool.profiles?.nickname || 'usuario'}</p>
          </div>

          {pool.expires_at && pool.status === 'open' && (
            <div className="ml-auto flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-full">
              <span className="text-amber-500 text-[10px] font-black uppercase italic">
                FECHA EM: <ContadorRegressivo dataFinal={pool.expires_at} />
              </span>
            </div>
          )}
        </div>

        {/* PERGUNTA PRINCIPAL */}
        <h3 className="text-3xl md:text-4xl font-black text-white italic uppercase mb-8 leading-none">
          {pool.title}
        </h3>

        {/* POTE TOTAL EM DESTAQUE */}
        <div className="bg-[#0f172a] p-6 rounded-[32px] border border-gray-800 mb-10 flex flex-col items-center">
          <p className="text-[11px] text-gray-500 font-bold uppercase mb-2">Pote acumulado para este desafio</p>
          <p className="text-[#10b981] font-black text-4xl tracking-tighter italic">
             R$ {totalPote.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* OPÇÕES DE APOSTA (BOTÕES GRANDES) */}
        <div className="flex flex-col gap-4">
          {opcoes.map((option: any) => {
            const tempoExpirou = pool.expires_at && new Date(pool.expires_at) < agora;
            const estaBloqueado = pool.status === 'closed' || pool.status === 'finished' || tempoExpirou;
            const totalOpcao = (option.bets || []).reduce((s: number, b: any) => s + (b.amount || 0), 0);
            const multiplicador = totalOpcao > 0 ? (totalPote / totalOpcao) : 1;

            return (
              <button
                key={option.id}
                disabled={estaBloqueado}
                onClick={() => aoClicarEmApostar(option, pool)}
                className={`w-full p-6 rounded-2xl flex justify-between items-center transition-all group ${
                  estaBloqueado 
                  ? 'bg-gray-800/50 cursor-not-allowed' 
                  : 'bg-[#10b981] hover:bg-[#14d394] active:scale-[0.98]'
                }`}
              >
                <div className="text-left">
                  <span className={`block font-black text-xl uppercase italic ${estaBloqueado ? 'text-gray-500' : 'text-[#0f172a]'}`}>
                    {tempoExpirou ? 'Tempo Esgotado' : option.label}
                  </span>
                  <span className={`text-[10px] font-bold uppercase ${estaBloqueado ? 'text-gray-600' : 'text-[#0f172a]/70'}`}>
                    Pote: R$ {totalOpcao.toFixed(2)}
                  </span>
                </div>
                <div className={`text-2xl font-black italic ${estaBloqueado ? 'text-gray-600' : 'text-[#0f172a]'}`}>
                  x{multiplicador.toFixed(2)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* BOTÃO PARA VOLTAR AO FEED (RETENÇÃO) */}
      <button 
        onClick={voltarParaOFeed}
        className="mt-12 text-gray-500 font-black uppercase text-xs tracking-widest hover:text-[#10b981] transition-colors"
      >
        ← Explorar outros desafios da comunidade
      </button>

    </div>
  )
}

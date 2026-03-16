import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ContadorRegressivo from "./ContadorRegressivo"; // Certifique-se de que o nome está correto

type Props = {
  pool: any
  agora: Date
  calcularDadosPool: (pool: any) => { totalPote: number, opcoes: any[] }
  setPerfilAberto: (perfil: any) => void
  buscarHistoricoCriador: (id: string) => void
  setSelectedOption: (opt: any) => void
  setSelectedPool: (pool: any) => void
  setIsModalOpen: (open: boolean) => void
}

export function PoolCard({
  pool,
  agora,
  calcularDadosPool,
  setPerfilAberto,
  buscarHistoricoCriador,
  setSelectedOption,
  setSelectedPool,
  setIsModalOpen
}: Props) {
  const { totalPote, opcoes } = calcularDadosPool(pool)

  return (
    <div className="p-10 bg-[#1e293b] rounded-[40px] border border-gray-800 relative shadow-xl overflow-hidden group mb-10">
      
      {/* HEADER DO CARD: PERFIL E CRONÔMETRO */}
      <div className="flex items-center gap-3 mb-6">
        <div
          onClick={() => {
            const dadosPerfil = {
              ...pool.profiles,
              id: pool.user_id
            };
            setPerfilAberto(dadosPerfil);
            buscarHistoricoCriador(pool.user_id);
          }}
          className="w-8 h-8 bg-[#10b981] rounded-full flex items-center justify-center font-black text-[#0f172a] text-[10px] cursor-pointer relative z-50 hover:scale-110 transition-transform"
        >
          {(pool.profiles?.nickname || 'U').substring(0, 2).toUpperCase()}
        </div>
        <p className="text-[10px] text-gray-500 font-bold uppercase">@{pool.profiles?.nickname || 'usuario'}</p>

        {pool.expires_at && pool.status === 'open' && (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full ml-auto">
            <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
            <span className="text-amber-500 text-[10px] font-black uppercase italic tracking-wider">
              FECHA EM: <ContadorRegressivo dataFinal={pool.expires_at} />
            </span>
          </div>
        )}
      </div>

      {/* TÍTULO E POTE TOTAL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <h3 className="text-2xl font-black text-white italic uppercase">{pool.title}</h3>
        
        <div className="bg-[#0f172a] p-4 rounded-3xl border border-gray-800 min-w-[140px] text-center">
          <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Pote Total</p>
          <div className="relative flex justify-center">
            <AnimatePresence mode="popLayout">
              <motion.p
                key={totalPote}
                initial={{ y: 20, opacity: 0 }}
                animate={{
                  y: [20, -5, 0],
                  opacity: 1,
                  color: ['#10b981', '#ffffff', '#10b981'],
                  transition: { type: "spring", stiffness: 150, damping: 10 }
                }}
                exit={{ y: -20, opacity: 0 }}
                className="text-[#10b981] font-black text-2xl tracking-tighter leading-none italic"
              >
                R$ {totalPote.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* GRID DE OPÇÕES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {opcoes.map((option: any) => {
          const tempoExpirou = pool.expires_at && new Date(pool.expires_at) < agora;
          const estaBloqueado = pool.status === 'closed' || pool.status === 'finished' || tempoExpirou;
          const totalOpcao = (option.bets || []).reduce((s: number, b: any) => s + (b.amount || 0), 0);
          const multiplicador = totalOpcao > 0 ? (totalPote / totalOpcao) : 1;

          return (
            <div key={option.id} className="p-6 bg-[#0f172a] rounded-[32px] border border-gray-800 hover:border-[#10b981] transition-all group/option">
              {pool.status !== 'closed' && pool.status !== 'finished' ? (
                <button
                  disabled={estaBloqueado}
                  onClick={() => {
                    setSelectedOption(option);
                    setSelectedPool(pool);
                    setIsModalOpen(true);
                  }}
                  className={`w-full p-4 rounded-xl transition-all font-black text-xs mb-4 uppercase ${
                    estaBloqueado
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'
                      : 'bg-[#1e293b] text-white hover:bg-[#10b981] hover:text-[#0f172a]'
                  }`}
                >
                  {tempoExpirou ? '⏳ Tempo Esgotado' : option.label}
                </button>
              ) : (
                <div className={`w-full p-4 rounded-xl font-black text-xs mb-4 uppercase text-center ${
                  pool.winner_id === option.id ? 'bg-[#10b981] text-[#0f172a]' : 'bg-gray-800 text-gray-500'
                }`}>
                  {option.label} {pool.winner_id === option.id && '🏆'}
                </div>
              )}

              <div className="flex justify-between items-center text-[11px] font-bold uppercase">
                <motion.span
                  key={totalOpcao}
                  animate={{
                    scale: [1, 1.1, 1],
                    color: ["#6b7280", "#10b981", "#6b7280"]
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
    </div>
  )
}
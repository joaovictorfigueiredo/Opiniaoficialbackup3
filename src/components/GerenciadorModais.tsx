import React from 'react';
import { ModalPerfil } from './ModalPerfil';
import { BetTicket } from './BetTicket';

type Props = {
  // Perfil do Criador
  perfilAberto: any;
  setPerfilAberto: (v: any) => void;
  poolsDoCriador: any[];
  perfilLogado: any;
  buscarPools: () => void;
  
  // Encerramento
  confirmacaoEncerramento: any;
  setConfirmacaoEncerramento: (v: any) => void;
  justificativa: string;
  setJustificativa: (v: string) => void;
  encerrarPool: (p: any, o: any, ow: any, j: any) => void;

  // Sucesso/Erro
  sucessoPublicacao: any;
  setSucessoPublicacao: (v: any) => void;

  // Aposta
  isApostaConcluida: boolean;
  setIsApostaConcluida: (v: boolean) => void;
  dadosTicket: any;

  // Modal Aposta (Valor)
  isModalOpen: boolean;
  setIsModalOpen: (v: boolean) => void;
  valorAposta: string;
  setValorAposta: (v: string) => void;
  obterGanhoEstimado: () => number;
  confirmarAposta: () => void;

  // Transações
  isModalTransacaoOpen: any;
  setIsModalTransacaoOpen: (v: any) => void;
  valorTransacao: string;
  setValorTransacao: (v: string) => void;
  gerenciarSaldo: () => void;
}

export function GerenciadorModais({
  perfilAberto, setPerfilAberto, poolsDoCriador, perfilLogado, buscarPools,
  confirmacaoEncerramento, setConfirmacaoEncerramento, justificativa, setJustificativa, encerrarPool,
  sucessoPublicacao, setSucessoPublicacao,
  isApostaConcluida, setIsApostaConcluida, dadosTicket,
  isModalOpen, setIsModalOpen, valorAposta, setValorAposta, obterGanhoEstimado, confirmarAposta,
  isModalTransacaoOpen, setIsModalTransacaoOpen, valorTransacao, setValorTransacao, gerenciarSaldo
}: Props) {
  return (
    <>
      {/* 1. MODAL DE PERFIL DO CRIADOR */}
      {perfilAberto && (
        <ModalPerfil
          perfil={perfilAberto}
          pools={poolsDoCriador}
          usuarioLogado={perfilLogado}
          onClose={() => { setPerfilAberto(null); buscarPools(); }}
        />
      )}

      {/* 2. MODAL DE CONFIRMAÇÃO DE ENCERRAMENTO */}
      {confirmacaoEncerramento.aberto && (
        <div className="fixed inset-0 bg-[#0f172a]/95 backdrop-blur-xl flex items-center justify-center p-6 z-[100]">
          <div className="bg-[#1e293b] p-10 rounded-[40px] max-w-sm w-full border border-gray-800 shadow-2xl text-center">
            <h2 className="text-3xl font-black mb-6 italic text-[#10b981]">FINALIZAR?</h2>
            <p className="text-gray-400 mb-8 font-bold uppercase text-[10px] tracking-[3px] leading-relaxed">
              Você confirma que o resultado oficial deste evento foi: <br />
              <span className="text-white text-lg block mt-2 italic">"{confirmacaoEncerramento.textoOpcao}"</span>
            </p>
            <div className="mt-6 p-5 bg-white/5 border border-white/10 rounded-[32px]">
              <textarea
                placeholder="Explique o resultado..."
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                className="w-full bg-[#0b121f] border border-white/10 rounded-2xl p-4 text-xs text-white outline-none resize-none h-24"
              />
            </div>
            <div className="flex flex-col gap-3 mt-6">
              <button onClick={() => {
                encerrarPool(confirmacaoEncerramento.poolId, confirmacaoEncerramento.optionId, confirmacaoEncerramento.ownerId, justificativa);
                setConfirmacaoEncerramento({ ...confirmacaoEncerramento, aberto: false });
                setJustificativa('');
              }} className="w-full bg-[#10b981] p-5 rounded-2xl font-black text-[#0f172a]">CONFIRMAR</button>
              <button onClick={() => setConfirmacaoEncerramento({ ...confirmacaoEncerramento, aberto: false })} className="text-gray-500 text-[10px] uppercase font-bold">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. MODAL DE SUCESSO/ERRO */}
      {sucessoPublicacao.aberto && (
        <div className="fixed inset-0 bg-[#0f172a]/95 backdrop-blur-xl flex items-center justify-center p-6 z-[150]">
          <div className="bg-[#1e293b] p-10 rounded-[40px] max-w-sm w-full border border-gray-800 shadow-2xl text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border ${sucessoPublicacao.tipo === 'sucesso' ? 'bg-[#10b981]/10 border-[#10b981]/20 text-[#10b981]' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
              <span className="text-4xl">{sucessoPublicacao.tipo === 'sucesso' ? '✓' : '✕'}</span>
            </div>
            <h2 className={`text-3xl font-black mb-4 italic ${sucessoPublicacao.tipo === 'sucesso' ? 'text-[#10b981]' : 'text-red-500'}`}>
              {sucessoPublicacao.tipo === 'sucesso' ? 'PUBLICADO!' : 'ERRO!'}
            </h2>
            <p className="text-gray-400 mb-6 font-bold uppercase text-[10px] tracking-[3px]">{sucessoPublicacao.mensagem}</p>
            <button onClick={() => setSucessoPublicacao({ ...sucessoPublicacao, aberto: false })} className={`w-full p-5 rounded-2xl font-black text-[#0f172a] ${sucessoPublicacao.tipo === 'sucesso' ? 'bg-[#10b981]' : 'bg-red-500'}`}>ENTENDIDO</button>
          </div>
        </div>
      )}

      {/* 4. MODAL TICKET (RESULTADO) */}
      {isApostaConcluida && dadosTicket && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0f172a]/95 backdrop-blur-xl p-4">
          <div className="flex flex-col items-center">
            <button onClick={() => setIsApostaConcluida(false)} className="mb-6 text-gray-400 font-black text-[10px] uppercase tracking-widest">[ FECHAR X ]</button>
            <BetTicket {...dadosTicket} />
          </div>
        </div>
      )}

      {/* 5. MODAL APOSTA E TRANSAÇÃO (Agrupados pela similaridade) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#0f172a]/95 backdrop-blur-xl flex items-center justify-center p-6 z-50">
          <div className="bg-[#1e293b] p-10 rounded-[40px] max-w-sm w-full border border-gray-800 shadow-2xl">
            <h2 className="text-3xl font-black mb-6 text-center italic text-[#10b981]">CONFIRMAR</h2>
            <input autoFocus type="number" className="w-full bg-[#0f172a] p-6 rounded-2xl text-3xl font-black text-white outline-none border-2 border-transparent focus:border-[#10b981] mb-6" placeholder="0,00" value={valorAposta} onChange={(e) => setValorAposta(e.target.value)} />
            <div className="bg-[#0f172a] p-4 rounded-2xl mb-8 flex justify-between items-center">
              <span className="text-[10px] font-black text-gray-500 uppercase">Ganhos:</span>
              <span className="text-[#10b981] font-black text-xl">R$ {obterGanhoEstimado().toFixed(2)}</span>
            </div>
            <button onClick={confirmarAposta} className="w-full bg-[#10b981] p-5 rounded-2xl font-black text-[#0f172a] text-lg mb-4">APOSTAR AGORA</button>
            <button onClick={() => setIsModalOpen(false)} className="w-full text-gray-500 font-bold text-[10px] uppercase">Cancelar</button>
          </div>
        </div>
      )}

      {isModalTransacaoOpen && (
        <div className="fixed inset-0 bg-[#0f172a]/95 backdrop-blur-xl flex items-center justify-center p-6 z-50">
          <div className="bg-[#1e293b] p-10 rounded-[40px] max-w-sm w-full border border-gray-800">
            <h2 className="text-3xl font-black mb-8 text-center uppercase text-[#10b981]">{isModalTransacaoOpen === 'deposito' ? 'Adicionar' : 'Retirar'}</h2>
            <input autoFocus type="number" className="w-full bg-[#0f172a] p-6 rounded-2xl text-3xl font-black text-white outline-none focus:border-[#10b981] mb-8" placeholder="0,00" value={valorTransacao} onChange={(e) => setValorTransacao(e.target.value)} />
            <button onClick={gerenciarSaldo} className="w-full bg-[#10b981] p-5 rounded-2xl font-black text-[#0f172a] text-lg mb-4">CONFIRMAR</button>
            <button onClick={() => setIsModalTransacaoOpen(null)} className="w-full text-gray-500 font-bold text-[10px] uppercase">Fechar</button>
          </div>
        </div>
      )}
    </>
  );
}
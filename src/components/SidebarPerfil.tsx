type Props = {
  perfil: any
  historico: any[]
  valorPendente: number
  temContestacao: boolean
  isEditingNickname: boolean
  tempNickname: string
  setTempNickname: (v: string) => void
  setIsEditingNickname: (v: boolean) => void
  atualizarNickname: () => void
  setIsModalTransacaoOpen: (v: any) => void
}

export function SidebarPerfil({
  perfil,
  historico,
  valorPendente,
  temContestacao,
  isEditingNickname,
  tempNickname,
  setTempNickname,
  setIsEditingNickname,
  atualizarNickname,
  setIsModalTransacaoOpen
}: Props) {

  if (!perfil) return null

  return (
    <div className="w-full lg:w-[320px] space-y-8">
      <div className="bg-[#1e293b] p-8 rounded-[35px] border border-gray-800 shadow-2xl sticky top-8">

        {/* PERFIL */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-[#10b981] rounded-2xl flex items-center justify-center font-black text-[#0f172a]">
            {(perfil?.nickname || 'U').substring(0, 2).toUpperCase()}
          </div>

          <div className="flex flex-col flex-1">

            {isEditingNickname ? (
              <input
                autoFocus
                className="bg-[#0f172a] border border-[#10b981] text-white text-xs p-2 rounded-lg outline-none w-full"
                value={tempNickname}
                onChange={(e) => setTempNickname(e.target.value)}
                onBlur={atualizarNickname}
                onKeyDown={(e) => e.key === 'Enter' && atualizarNickname()}
              />
            ) : (
              <h2
                onClick={() => {
                  setIsEditingNickname(true)
                  setTempNickname(perfil?.nickname || '')
                }}
                className="text-sm font-black text-white uppercase truncate cursor-pointer hover:text-[#10b981]"
              >
                @{perfil?.nickname || 'definir_nome'} ✎
              </h2>
            )}

            <div className="flex gap-0.5 mt-1">
              {[1,2,3,4,5].map(i => (
                <span
                  key={i}
                  className={`text-[12px] ${
                    i <= (perfil?.reputation || 60) / 20
                      ? 'text-amber-400'
                      : 'text-gray-700'
                  }`}
                >
                  ★
                </span>
              ))}
            </div>

          </div>
        </div>


        {/* CREDIBILIDADE */}
        <div className="grid grid-cols-2 gap-2 bg-black/20 p-2 rounded-xl border border-gray-800/50 mb-6">

          <div className="text-center border-r border-gray-800">
            <div className="text-[#10b981] text-[10px] font-black">
              👍 {perfil?.total_top || 0}
            </div>
            <div className="text-[6px] text-gray-500 uppercase font-bold tracking-tighter">
              TOP
            </div>
          </div>

          <div className="text-center">
            <div className="text-red-500 text-[10px] font-black">
              👎 {perfil?.total_bad || 0}
            </div>
            <div className="text-[6px] text-gray-500 uppercase font-bold tracking-tighter">
              BAD
            </div>
          </div>

        </div>


        <div className="space-y-6">

          {/* SALDO */}
          <div>
            <p className="text-[10px] text-gray-500 font-black uppercase mb-1">
              Saldo Atual
            </p>

            <p className="text-3xl font-black text-white tracking-tighter">
              R$ {(perfil?.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>


          {/* PENDENTE */}
          {valorPendente > 0 && (
            <div className={`mt-3 p-3 rounded-2xl border ${
              temContestacao
                ? 'border-red-500/50 bg-red-500/10'
                : 'border-[#10b981]/30 bg-[#10b981]/10'
            }`}>

              <div className="flex justify-between items-start">
                <p className={`text-[9px] font-black uppercase ${
                  temContestacao ? 'text-red-400' : 'text-[#10b981]'
                }`}>
                  {temContestacao ? '⚠️ Em Análise' : '⏳ Recebendo'}
                </p>

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


          {/* BOTÕES */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setIsModalTransacaoOpen('deposito')}
              className="w-full bg-[#10b981] text-[#0f172a] text-[10px] font-black py-3 rounded-xl uppercase"
            >
              Depositar
            </button>

            <button
              onClick={() => setIsModalTransacaoOpen('saque')}
              className="w-full bg-gray-800 text-white text-[10px] font-black py-3 rounded-xl uppercase"
            >
              Sacar
            </button>
          </div>


          {/* ESTATÍSTICAS */}
          <div className="pt-6 border-t border-gray-800 space-y-3">

            <div className="flex justify-between text-[10px] font-black uppercase">
              <span className="text-gray-500">Acertos</span>
              <span className="text-[#10b981]">{perfil?.acertos || 0}</span>
            </div>

            <div className="flex justify-between text-[10px] font-black uppercase">
              <span className="text-gray-500">Erros</span>
              <span className="text-red-500">{perfil?.erros || 0}</span>
            </div>

          </div>


          {/* HISTÓRICO */}
          <div className="pt-6 border-t border-gray-800">

            <p className="text-[10px] text-gray-500 font-black uppercase mb-4">
              Histórico
            </p>

            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 no-scrollbar">

              {!historico?.length && (
                <p className="text-[9px] text-gray-700 uppercase font-black">
                  Nenhuma transação
                </p>
              )}

              {historico?.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-[#0f172a] rounded-xl flex justify-between items-center border border-gray-800"
                >

                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-white uppercase">
                      {item.type === 'bet_win'
                        ? 'Vitória'
                        : item.type === 'bet'
                        ? 'Aposta'
                        : 'Recarga'}
                    </span>

                    <span className="text-[7px] text-gray-600">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <span className={`text-[10px] font-black ${
                    item.amount > 0
                      ? 'text-[#10b981]'
                      : 'text-red-500'
                  }`}>
                    {item.amount > 0 ? '+' : ''}
                    {Number(item.amount).toFixed(2)}
                  </span>

                </div>
              ))}

            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
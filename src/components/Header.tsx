import React from 'react';

type Props = {
  perfil: any;
}

export function Header({ perfil }: Props) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
      <div>
        <h1 className="text-5xl font-black text-white italic tracking-tighter mb-2">
          POOL<span className="text-[#10b981]">MASTER</span>
        </h1>
        <p className="text-gray-500 font-bold uppercase text-[10px] tracking-[4px]">
          Previsões P2P em Tempo Real
        </p>
      </div>

      <div className="flex items-center gap-4 bg-[#1e293b] p-4 rounded-[25px] border border-gray-800">
        <div className="text-right">
          <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Bem-vindo</p>
          <p className="text-sm font-black text-white italic">@{perfil?.nickname || 'usuário'}</p>
        </div>
        <div className="w-10 h-10 bg-[#10b981] rounded-xl flex items-center justify-center font-black text-[#0f172a]">
          {(perfil?.nickname || 'U').substring(0, 2).toUpperCase()}
        </div>
      </div>
    </div>
  );
}
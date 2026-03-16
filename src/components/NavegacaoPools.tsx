type Props = {
  abaAtiva: string;
  setAbaAtiva: (valor: string) => void;
};

export function NavegacaoPools({ abaAtiva, setAbaAtiva }: Props) {
  const abas = [
    { id: 'explorar', label: 'Explorar', icon: '🔥' },
    { id: 'minhas_apostas', label: 'Onde Apostei', icon: '💰' },
    { id: 'criadas_por_mim', label: 'Minhas Criações', icon: '🛠️' },
    { id: 'ativas', label: 'Ativas', icon: '🟢' },
     { id: 'finalizadas', label: 'Finalizadas', icon: '🏁' },
  ];

  return (
    <div className="flex gap-6 mb-8 border-b border-gray-800 overflow-x-auto no-scrollbar">
      {abas.map((aba) => (
        <button
          key={aba.id}
          onClick={() => setAbaAtiva(aba.id)}
          className={`flex items-center gap-2 whitespace-nowrap pb-4 transition-all duration-200 font-black text-[11px] uppercase tracking-wider ${
            abaAtiva === aba.id 
              ? 'border-b-2 border-[#10b981] text-[#10b981]' 
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <span>{aba.icon}</span>
          {aba.label}
        </button>
      ))}
    </div>
  );
}


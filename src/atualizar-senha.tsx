import { useState } from 'react';
import { supabase } from './lib/supabase'; // Ajuste o caminho se necessário

export default function AtualizarSenha() {
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (novaSenha.length < 6) {
      return alert("A senha deve ter pelo menos 6 caracteres.");
    }

    if (novaSenha !== confirmarSenha) {
      return alert("As senhas não coincidem!");
    }

    setLoading(true);

    // O Supabase identifica o usuário automaticamente pelo token na URL
    const { error } = await supabase.auth.updateUser({
      password: novaSenha
    });

    if (error) {
      alert("Erro ao atualizar: " + error.message);
    } else {
      alert("Senha alterada com sucesso! Agora você pode fazer login.");
      window.location.href = "/"; // Redireciona para a home/login
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f1116] text-white p-4">
      <div className="bg-[#1a1d24] p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-800">
        <h1 className="text-2xl font-bold mb-2 text-center text-orange-500">Nova Senha</h1>
        <p className="text-gray-400 text-sm text-center mb-6">
          Digite e confirme sua nova senha abaixo.
        </p>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 uppercase font-bold">Nova Senha</label>
            <input
              type="password"
              placeholder="******"
              className="w-full p-3 mt-1 bg-[#0f1116] border border-gray-700 rounded-lg focus:border-orange-500 outline-none transition-all"
              onChange={(e) => setNovaSenha(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase font-bold">Confirmar Senha</label>
            <input
              type="password"
              placeholder="******"
              className="w-full p-3 mt-1 bg-[#0f1116] border border-gray-700 rounded-lg focus:border-orange-500 outline-none transition-all"
              onChange={(e) => setConfirmarSenha(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50"
          >
            {loading ? "Salvando..." : "ATUALIZAR SENHA"}
          </button>
        </form>
      </div>
    </div>
  );
}
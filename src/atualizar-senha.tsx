import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

export default function AtualizarSenha() {
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // 🔥 CAPTURA O TOKEN DO EMAIL E CRIA A SESSÃO
  useEffect(() => {
    const handleSession = async () => {
      try {
        const hash = window.location.hash;

        if (!hash) {
          setErro("Link inválido ou expirado.");
          setSessionReady(true);
          return;
        }

        const params = new URLSearchParams(hash.replace("#", "?"));

        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (!access_token || !refresh_token) {
          setErro("Token inválido.");
          setSessionReady(true);
          return;
        }

        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (error) {
          setErro("Sessão inválida ou expirada.");
        }

        setSessionReady(true);
      } catch (err) {
        console.error(err);
        setErro("Erro ao processar o link.");
        setSessionReady(true);
      }
    };

    handleSession();
  }, []);

  // 🔥 ATUALIZA A SENHA
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (novaSenha.length < 6) {
      return alert("A senha deve ter pelo menos 6 caracteres.");
    }

    if (novaSenha !== confirmarSenha) {
      return alert("As senhas não coincidem!");
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: novaSenha,
    });

    if (error) {
      alert("Erro ao atualizar: " + error.message);
    } else {
      alert("Senha alterada com sucesso!");
      window.location.href = "/";
    }

    setLoading(false);
  };

  // ⏳ CARREGANDO
  if (!sessionReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f1116] text-white">
        Carregando...
      </div>
    );
  }

  // ❌ ERRO DE TOKEN
  if (erro) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f1116] text-white">
        <div className="bg-[#1a1d24] p-6 rounded-xl border border-red-500 text-center">
          <h1 className="text-xl font-bold text-red-500 mb-2">Erro</h1>
          <p>{erro}</p>
        </div>
      </div>
    );
  }

  // ✅ FORMULÁRIO
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f1116] text-white p-4">
      <div className="bg-[#1a1d24] p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-800">
        <h1 className="text-2xl font-bold mb-2 text-center text-orange-500">
          Nova Senha
        </h1>

        <p className="text-gray-400 text-sm text-center mb-6">
          Digite e confirme sua nova senha abaixo.
        </p>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 uppercase font-bold">
              Nova Senha
            </label>
            <input
              type="password"
              placeholder="******"
              className="w-full p-3 mt-1 bg-[#0f1116] border border-gray-700 rounded-lg focus:border-orange-500 outline-none"
              onChange={(e) => setNovaSenha(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase font-bold">
              Confirmar Senha
            </label>
            <input
              type="password"
              placeholder="******"
              className="w-full p-3 mt-1 bg-[#0f1116] border border-gray-700 rounded-lg focus:border-orange-500 outline-none"
              onChange={(e) => setConfirmarSenha(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50"
          >
            {loading ? "Salvando..." : "ATUALIZAR SENHA"}
          </button>
        </form>
      </div>
    </div>
  );
}

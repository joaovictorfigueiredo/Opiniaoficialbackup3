import { useState } from 'react';
import { supabase } from './supabaseClient'; // Verifique o caminho do seu cliente

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState('');

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // IMPORTANTE: URL de onde o usuário vai digitar a nova senha
      redirectTo: 'https://seu-dominio.vercel.app/atualizar-senha',
    });

    if (error) {
      setMensagem("Erro: " + error.message);
    } else {
      setMensagem("Verifique seu e-mail! Enviamos o link de recuperação.");
    }
    setLoading(false);
  };

  return (
    <div className="reset-container">
      <h2>Recuperar Senha</h2>
      <form onSubmit={handleReset}>
        <input
          type="email"
          placeholder="Seu e-mail cadastrado"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
        </button>
      </form>
      {mensagem && <p>{mensagem}</p>}
    </div>
  );
}

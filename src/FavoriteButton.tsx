import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; // Ajuste o caminho do seu cliente supabase

export default function FavoriteButton({ targetProfileId }) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);

  // 1. Verifica se já está nos favoritos ao carregar o componente
  useEffect(() => {
    checkIfFavorite();
  }, [targetProfileId]);

  async function checkIfFavorite() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('favorite_profile_id', targetProfileId)
      .single();

    if (data) setIsFavorite(true);
    setLoading(false);
  }

  // 2. Lógica de Adicionar/Remover
  async function toggleFavorite() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      alert("Você precisa estar logado!");
      return;
    }

    if (isFavorite) {
      // Remover
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('favorite_profile_id', targetProfileId);
      
      setIsFavorite(false);
    } else {
      // Adicionar
      const { error } = await supabase
        .from('favorites')
        .insert([
          { user_id: user.id, favorite_profile_id: targetProfileId }
        ]);

      if (!error) setIsFavorite(true);
    }
  }

  if (loading) return <span>...</span>;

  return (
    <button 
      onClick={toggleFavorite}
      style={{
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontSize: '20px',
        color: isFavorite ? '#FFD700' : '#ccc' // Amarelo se for favorito, cinza se não
      }}
    >
      {isFavorite ? '★ Favorito' : '☆ Favoritar'}
    </button>
  );
}

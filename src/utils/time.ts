export const calcularTempoRestante = (releaseAt: string) => {

  if (!releaseAt) return "00:00";

  const agora = new Date().getTime();
  const destino = new Date(releaseAt).getTime();
  const diferenca = destino - agora;

  if (diferenca <= 0) return "LIBERADO";

  const minutos = Math.floor((diferenca % (1000 * 60 * 60)) / (1000 * 60));
  const segundos = Math.floor((diferenca % (1000 * 60)) / 1000);

  return `${minutos.toString().padStart(2,"0")}:${segundos.toString().padStart(2,"0")}`;
};

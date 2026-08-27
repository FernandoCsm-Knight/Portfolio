/* Intervalo mínimo entre dois envios do mesmo visitante, guardado no
   localStorage. Não é segurança — quem quiser burlar limpa o armazenamento —,
   é só para evitar o duplo clique e o envio repetido sem querer. O limite real
   contra abuso são os CHECKs e as policies no Postgres. */

function readLastSentAt(key) {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}

export function writeLastSentAt(key, timestamp) {
  try {
    localStorage.setItem(key, String(timestamp));
  } catch {
    /* A mensagem já foi salva; armazenamento local indisponível não deve
       transformar um envio bem-sucedido em erro para o visitante. */
  }
}

/** Segundos que faltam para liberar um novo envio (0 quando já pode enviar). */
export function remainingCooldown(key, windowMs, now = Date.now()) {
  const remaining = windowMs - (now - readLastSentAt(key));
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

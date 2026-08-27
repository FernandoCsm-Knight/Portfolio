import { useState } from 'react';
import { FaArrowDown, FaArrowUp, FaPen, FaPlus, FaTrash } from 'react-icons/fa';
import { formatAmount, MERCADO_PADRAO } from '../../services/pricing';
import {
  createRate,
  deleteRate,
  listRatesForAdmin,
  swapRatePositions,
  updateRate,
} from '../../services/pricingAdmin';
import { useAdminList } from '../../hooks/useAdminList';

const IDIOMAS = [
  { value: 'pt', label: 'PT' },
  { value: 'en', label: 'EN' },
  { value: 'es', label: 'ES' },
];

const CAMPOS_VAZIOS = {
  title_pt: '', title_en: '', title_es: '',
  description_pt: '', description_en: '', description_es: '',
  marketsText: MERCADO_PADRAO,
  currency: 'BRL',
  amount: '',
  featured: false,
  active: false,
};

function tarifaParaCampos(tarifa) {
  return {
    title_pt: tarifa.title_pt, title_en: tarifa.title_en, title_es: tarifa.title_es,
    description_pt: tarifa.description_pt,
    description_en: tarifa.description_en,
    description_es: tarifa.description_es,
    marketsText: (tarifa.markets ?? []).join(', '),
    currency: tarifa.currency,
    amount: String(tarifa.amount),
    featured: tarifa.featured,
    active: tarifa.active,
  };
}

/* Mesma validação do CHECK em supabase/hourly_rates.sql: código ISO de duas
   letras ou o curinga. Conferir aqui evita um 400 opaco vindo do PostgREST. */
function normalizarMercados(texto) {
  const itens = texto.split(',').map((item) => item.trim().toUpperCase()).filter(Boolean);
  const invalido = itens.find((item) => !/^([A-Z]{2}|\*)$/.test(item));
  return { itens: [...new Set(itens)], invalido };
}

function RateForm({ tarifa, onSalvar, onCancelar }) {
  const [idioma, setIdioma] = useState('pt');
  const [campos, setCampos] = useState(() => (tarifa ? tarifaParaCampos(tarifa) : CAMPOS_VAZIOS));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  function atualizarCampo(nome, valor) {
    setCampos((atual) => ({ ...atual, [nome]: valor }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (salvando) return;
    setErro('');

    /* Só a aba de idioma ativa fica no DOM, então o "obrigatório" das outras
       duas é conferido aqui — e a aba com problema vira a visível. */
    const idiomaComProblema = IDIOMAS.find((item) => (
      !campos[`title_${item.value}`].trim() || !campos[`description_${item.value}`].trim()
    ));
    if (idiomaComProblema) {
      setIdioma(idiomaComProblema.value);
      setErro(`Preencha título e descrição em ${idiomaComProblema.label}.`);
      return;
    }

    const { itens: markets, invalido } = normalizarMercados(campos.marketsText);
    if (markets.length === 0) {
      setErro(`Informe ao menos um mercado — use ${MERCADO_PADRAO} para a tarifa padrão.`);
      return;
    }
    if (invalido) {
      setErro(`"${invalido}" não é um país válido. Use a sigla de 2 letras (BR, PT, US) ou ${MERCADO_PADRAO}.`);
      return;
    }

    const currency = campos.currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      setErro('A moeda precisa ser um código de 3 letras (BRL, USD, EUR).');
      return;
    }

    const amount = Number(campos.amount.replace(',', '.'));
    if (!Number.isFinite(amount) || amount < 0) {
      setErro('Informe um valor por hora válido.');
      return;
    }

    setSalvando(true);
    try {
      const fields = {
        title_pt: campos.title_pt.trim(),
        title_en: campos.title_en.trim(),
        title_es: campos.title_es.trim(),
        description_pt: campos.description_pt.trim(),
        description_en: campos.description_en.trim(),
        description_es: campos.description_es.trim(),
        markets,
        currency,
        amount,
        featured: campos.featured,
        active: campos.active,
      };
      onSalvar(tarifa ? await updateRate(tarifa.id, fields) : await createRate(fields));
    } catch {
      setErro('Não foi possível salvar o valor. Confira os campos e tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form className="admin-projeto-form glass-card" onSubmit={handleSubmit}>
      <h2>{tarifa ? 'Editar valor' : 'Novo valor'}</h2>

      <nav className="admin-filters admin-projeto-idiomas" aria-label="Idioma do conteúdo">
        {IDIOMAS.map((item) => (
          <button
            key={item.value}
            type="button"
            className={idioma === item.value ? 'active' : ''}
            onClick={() => setIdioma(item.value)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {IDIOMAS.filter((item) => item.value === idioma).map((item) => (
        <div key={item.value} className="admin-projeto-campos">
          <label htmlFor={`preco-titulo-${item.value}`}>Modalidade ({item.label})</label>
          <input
            id={`preco-titulo-${item.value}`}
            value={campos[`title_${item.value}`]}
            onChange={(e) => atualizarCampo(`title_${item.value}`, e.target.value)}
            maxLength={60}
          />
          <label htmlFor={`preco-descricao-${item.value}`}>Descrição ({item.label})</label>
          <textarea
            id={`preco-descricao-${item.value}`}
            value={campos[`description_${item.value}`]}
            onChange={(e) => atualizarCampo(`description_${item.value}`, e.target.value)}
            maxLength={400}
          />
        </div>
      ))}

      <label htmlFor="preco-mercados">
        Mercados (siglas de 2 letras, separadas por vírgula — {MERCADO_PADRAO} = padrão)
      </label>
      <input
        id="preco-mercados"
        value={campos.marketsText}
        onChange={(e) => atualizarCampo('marketsText', e.target.value)}
        placeholder={`BR, PT   ou   ${MERCADO_PADRAO}`}
        required
      />

      <div className="admin-preco-linha">
        <div className="admin-preco-campo">
          <label htmlFor="preco-moeda">Moeda</label>
          <input
            id="preco-moeda"
            value={campos.currency}
            onChange={(e) => atualizarCampo('currency', e.target.value)}
            placeholder="BRL"
            maxLength={3}
            required
          />
        </div>
        <div className="admin-preco-campo">
          <label htmlFor="preco-valor">Valor por hora</label>
          <input
            id="preco-valor"
            inputMode="decimal"
            value={campos.amount}
            onChange={(e) => atualizarCampo('amount', e.target.value)}
            placeholder="150"
            required
          />
        </div>
      </div>

      <div className="admin-preco-opcoes">
        <label htmlFor="preco-destaque">
          <input
            id="preco-destaque"
            type="checkbox"
            checked={campos.featured}
            onChange={(e) => atualizarCampo('featured', e.target.checked)}
          />
          Destacar este card
        </label>
        <label htmlFor="preco-ativo">
          <input
            id="preco-ativo"
            type="checkbox"
            checked={campos.active}
            onChange={(e) => atualizarCampo('active', e.target.checked)}
          />
          Publicar em /pricing
        </label>
      </div>

      {erro && <p className="admin-status" role="alert">{erro}</p>}

      <div className="admin-projeto-form-acoes">
        <button type="button" onClick={onCancelar} disabled={salvando}>Cancelar</button>
        <button type="submit" className="approve" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar valor'}
        </button>
      </div>
    </form>
  );
}

export default function PricingPanel() {
  const [editando, setEditando] = useState(null);
  const [reordenandoId, setReordenandoId] = useState(null);
  const {
    items: tarifas, setItems: setTarifas, loading, message, setMessage, reload: carregar,
  } = useAdminList(listRatesForAdmin, undefined, 'Não foi possível carregar os valores.');

  function handleSalvar() {
    setEditando(null);
    carregar();
  }

  async function handleExcluir(tarifa) {
    if (!window.confirm(`Excluir "${tarifa.title_pt}"? Essa ação não pode ser desfeita.`)) return;
    setMessage('');
    try {
      await deleteRate(tarifa.id);
      setTarifas((atual) => atual.filter((item) => item.id !== tarifa.id));
    } catch {
      setMessage('Não foi possível excluir o valor.');
    }
  }

  /* Atalho para publicar/despublicar sem abrir o formulário: é a única coisa
     que muda com frequência depois que a tabela está montada. */
  async function handleAlternarAtivo(tarifa) {
    setMessage('');
    try {
      const salvo = await updateRate(tarifa.id, { active: !tarifa.active });
      setTarifas((atual) => atual.map((item) => (item.id === salvo.id ? salvo : item)));
    } catch {
      setMessage('Não foi possível alterar a publicação do valor.');
    }
  }

  async function handleMover(tarifa, direcao) {
    const indice = tarifas.findIndex((item) => item.id === tarifa.id);
    const vizinho = tarifas[indice + direcao];
    if (!vizinho) return;
    setReordenandoId(tarifa.id);
    setMessage('');
    try {
      await swapRatePositions(tarifa, vizinho);
      await carregar();
    } catch {
      setMessage('Não foi possível reordenar os valores.');
    } finally {
      setReordenandoId(null);
    }
  }

  if (editando !== null) {
    return (
      <RateForm
        tarifa={editando === 'novo' ? null : editando}
        onSalvar={handleSalvar}
        onCancelar={() => setEditando(null)}
      />
    );
  }

  return (
    <>
      <div className="admin-projeto-header">
        <button type="button" className="approve" onClick={() => setEditando('novo')}>
          <FaPlus aria-hidden="true" /> Novo valor
        </button>
      </div>

      {message && <p className="admin-status" role="status">{message}</p>}
      {loading && <p className="admin-empty">Carregando valores…</p>}
      {!loading && tarifas.length === 0 && (
        <p className="admin-empty">Nenhum valor cadastrado ainda.</p>
      )}

      <div className="admin-projetos">
        {tarifas.map((tarifa, index) => (
          <article className="admin-projeto glass-card" key={tarifa.id}>
            <div className="admin-preco-cifra">
              <strong>{formatAmount(tarifa.amount, tarifa.currency, 'pt-BR')}</strong>
              <span>por hora</span>
            </div>
            <div className="admin-projeto-info">
              <strong>{tarifa.title_pt}</strong>
              <span className="admin-projeto-tags">
                {(tarifa.markets ?? []).join(' · ')}
                {tarifa.featured && ' · destaque'}
              </span>
              <span className={tarifa.active ? 'admin-preco-ativo' : 'admin-preco-rascunho'}>
                {tarifa.active ? 'Publicado em /pricing' : 'Rascunho — não aparece no site'}
              </span>
            </div>
            <div className="admin-projeto-acoes">
              <button
                type="button"
                disabled={index === 0 || reordenandoId === tarifa.id}
                onClick={() => handleMover(tarifa, -1)}
                aria-label="Mover para cima"
              >
                <FaArrowUp aria-hidden="true" />
              </button>
              <button
                type="button"
                disabled={index === tarifas.length - 1 || reordenandoId === tarifa.id}
                onClick={() => handleMover(tarifa, 1)}
                aria-label="Mover para baixo"
              >
                <FaArrowDown aria-hidden="true" />
              </button>
              <button
                type="button"
                className={`admin-preco-publicar${tarifa.active ? '' : ' approve'}`}
                onClick={() => handleAlternarAtivo(tarifa)}
              >
                {tarifa.active ? 'Despublicar' : 'Publicar'}
              </button>
              <button type="button" onClick={() => setEditando(tarifa)} aria-label="Editar valor">
                <FaPen aria-hidden="true" />
              </button>
              <button
                className="archive"
                type="button"
                onClick={() => handleExcluir(tarifa)}
                aria-label="Excluir valor"
              >
                <FaTrash aria-hidden="true" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

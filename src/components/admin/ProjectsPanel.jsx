import { useCallback, useEffect, useRef, useState } from 'react';
import { FaArrowDown, FaArrowUp, FaPen, FaPlus, FaTrash } from 'react-icons/fa';
import { getProjectImageUrl } from '../../services/projects';
import {
  createProject,
  deleteProject,
  listProjectsForAdmin,
  removeProjectImage,
  swapProjectPositions,
  updateProject,
  uploadProjectImage,
} from '../../services/projectsAdmin';

const IDIOMAS = [
  { value: 'pt', label: 'PT' },
  { value: 'en', label: 'EN' },
  { value: 'es', label: 'ES' },
];

const CAMPOS_VAZIOS = {
  title_pt: '', title_en: '', title_es: '',
  description_pt: '', description_en: '', description_es: '',
  tagsText: '',
  href: '',
};

function projetoParaCampos(projeto) {
  return {
    title_pt: projeto.title_pt, title_en: projeto.title_en, title_es: projeto.title_es,
    description_pt: projeto.description_pt, description_en: projeto.description_en, description_es: projeto.description_es,
    tagsText: (projeto.tags ?? []).join(', '),
    href: projeto.href,
  };
}

function ProjectForm({ projeto, onSalvar, onCancelar }) {
  const [idioma, setIdioma] = useState('pt');
  const [campos, setCampos] = useState(() => (projeto ? projetoParaCampos(projeto) : CAMPOS_VAZIOS));
  const [imagemArquivo, setImagemArquivo] = useState(null);
  const [imagemRemovida, setImagemRemovida] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(() => (projeto ? getProjectImageUrl(projeto.image_path) : null));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const objectUrlRef = useRef(null);

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  function atualizarCampo(nome, valor) {
    setCampos((atual) => ({ ...atual, [nome]: valor }));
  }

  function escolherImagem(event) {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(arquivo);
    objectUrlRef.current = url;
    setImagemArquivo(arquivo);
    setImagemRemovida(false);
    setPreviewUrl(url);
  }

  function removerImagem() {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    setImagemArquivo(null);
    setImagemRemovida(true);
    setPreviewUrl(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (salvando) return;
    setErro('');

    /* Só a aba ativa fica no DOM (evita que `hidden` seja driblado pelo CSS
       de layout do campo), então a validação de "obrigatório" das outras
       duas precisa ser feita aqui, trocando para a primeira aba com problema. */
    const idiomaComProblema = IDIOMAS.find((item) => (
      !campos[`title_${item.value}`].trim() || !campos[`description_${item.value}`].trim()
    ));
    if (idiomaComProblema) {
      setIdioma(idiomaComProblema.value);
      setErro(`Preencha título e descrição em ${idiomaComProblema.label}.`);
      return;
    }

    const tags = campos.tagsText.split(',').map((tag) => tag.trim().toUpperCase()).filter(Boolean);
    const href = campos.href.trim();
    if (!/^https?:\/\//.test(href)) {
      setErro('O link precisa começar com http:// ou https://');
      return;
    }

    const fields = {
      title_pt: campos.title_pt.trim(),
      title_en: campos.title_en.trim(),
      title_es: campos.title_es.trim(),
      description_pt: campos.description_pt.trim(),
      description_en: campos.description_en.trim(),
      description_es: campos.description_es.trim(),
      tags,
      href,
    };

    setSalvando(true);
    try {
      let salvo;
      if (projeto) {
        const imagePathAnterior = projeto.image_path;
        if (imagemArquivo) {
          fields.image_path = await uploadProjectImage(projeto.id, imagemArquivo);
        } else if (imagemRemovida) {
          fields.image_path = null;
        }
        salvo = await updateProject(projeto.id, fields);
        if ((imagemArquivo || imagemRemovida) && imagePathAnterior) {
          removeProjectImage(imagePathAnterior).catch(() => { /* limpeza best-effort */ });
        }
      } else {
        const criado = await createProject(fields);
        if (imagemArquivo) {
          const path = await uploadProjectImage(criado.id, imagemArquivo);
          salvo = await updateProject(criado.id, { image_path: path });
        } else {
          salvo = criado;
        }
      }
      onSalvar(salvo);
    } catch {
      setErro('Não foi possível salvar o projeto. Confira os campos e tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form className="admin-projeto-form glass-card" onSubmit={handleSubmit}>
      <h2>{projeto ? 'Editar projeto' : 'Novo projeto'}</h2>

      <div className="admin-projeto-imagem">
        {previewUrl
          ? <img src={previewUrl} alt="Prévia da capa do projeto" />
          : <span>Sem imagem</span>}
        <div className="admin-projeto-imagem-acoes">
          <label className="admin-projeto-upload">
            Escolher imagem
            <input type="file" accept="image/*" onChange={escolherImagem} />
          </label>
          {previewUrl && (
            <button type="button" onClick={removerImagem}>Remover imagem</button>
          )}
        </div>
      </div>

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
          <label htmlFor={`titulo-${item.value}`}>Título ({item.label})</label>
          <input
            id={`titulo-${item.value}`}
            value={campos[`title_${item.value}`]}
            onChange={(e) => atualizarCampo(`title_${item.value}`, e.target.value)}
            maxLength={80}
          />
          <label htmlFor={`descricao-${item.value}`}>Descrição ({item.label})</label>
          <textarea
            id={`descricao-${item.value}`}
            value={campos[`description_${item.value}`]}
            onChange={(e) => atualizarCampo(`description_${item.value}`, e.target.value)}
            maxLength={600}
          />
        </div>
      ))}

      <label htmlFor="projeto-tags">Tags (separadas por vírgula)</label>
      <input
        id="projeto-tags"
        value={campos.tagsText}
        onChange={(e) => atualizarCampo('tagsText', e.target.value)}
        placeholder="TYPESCRIPT, REACT, ALGORITMOS"
      />

      <label htmlFor="projeto-href">Link do projeto</label>
      <input
        id="projeto-href"
        type="url"
        value={campos.href}
        onChange={(e) => atualizarCampo('href', e.target.value)}
        placeholder="https://github.com/usuario/projeto"
        required
      />

      {erro && <p className="admin-status" role="alert">{erro}</p>}

      <div className="admin-projeto-form-acoes">
        <button type="button" onClick={onCancelar} disabled={salvando}>Cancelar</button>
        <button type="submit" className="approve" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar projeto'}
        </button>
      </div>
    </form>
  );
}

export default function ProjectsPanel() {
  const [projetos, setProjetos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [editando, setEditando] = useState(null);
  const [reordenandoId, setReordenandoId] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      setProjetos(await listProjectsForAdmin());
    } catch {
      setProjetos([]);
      setMessage('Não foi possível carregar os projetos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function handleSalvar() {
    setEditando(null);
    carregar();
  }

  async function handleExcluir(projeto) {
    if (!window.confirm(`Excluir "${projeto.title_pt}"? Essa ação não pode ser desfeita.`)) return;
    setMessage('');
    try {
      await deleteProject(projeto.id);
      if (projeto.image_path) removeProjectImage(projeto.image_path).catch(() => {});
      setProjetos((atual) => atual.filter((item) => item.id !== projeto.id));
    } catch {
      setMessage('Não foi possível excluir o projeto.');
    }
  }

  async function handleMover(projeto, direcao) {
    const indice = projetos.findIndex((item) => item.id === projeto.id);
    const vizinho = projetos[indice + direcao];
    if (!vizinho) return;
    setReordenandoId(projeto.id);
    setMessage('');
    try {
      await swapProjectPositions(projeto, vizinho);
      await carregar();
    } catch {
      setMessage('Não foi possível reordenar os projetos.');
    } finally {
      setReordenandoId(null);
    }
  }

  if (editando !== null) {
    return (
      <ProjectForm
        projeto={editando === 'novo' ? null : editando}
        onSalvar={handleSalvar}
        onCancelar={() => setEditando(null)}
      />
    );
  }

  return (
    <>
      <div className="admin-projeto-header">
        <button type="button" className="approve" onClick={() => setEditando('novo')}>
          <FaPlus aria-hidden="true" /> Novo projeto
        </button>
      </div>

      {message && <p className="admin-status" role="status">{message}</p>}
      {loading && <p className="admin-empty">Carregando projetos…</p>}
      {!loading && projetos.length === 0 && (
        <p className="admin-empty">Nenhum projeto cadastrado ainda.</p>
      )}

      <div className="admin-projetos">
        {projetos.map((projeto, index) => (
          <article className="admin-projeto glass-card" key={projeto.id}>
            <div className="admin-projeto-thumb">
              {projeto.image_path
                ? <img src={getProjectImageUrl(projeto.image_path)} alt="" />
                : <span>Sem imagem</span>}
            </div>
            <div className="admin-projeto-info">
              <strong>{projeto.title_pt}</strong>
              <span className="admin-projeto-tags">{(projeto.tags ?? []).join(' · ')}</span>
              <a href={projeto.href} target="_blank" rel="noreferrer">{projeto.href}</a>
            </div>
            <div className="admin-projeto-acoes">
              <button
                type="button"
                disabled={index === 0 || reordenandoId === projeto.id}
                onClick={() => handleMover(projeto, -1)}
                aria-label="Mover para cima"
              >
                <FaArrowUp aria-hidden="true" />
              </button>
              <button
                type="button"
                disabled={index === projetos.length - 1 || reordenandoId === projeto.id}
                onClick={() => handleMover(projeto, 1)}
                aria-label="Mover para baixo"
              >
                <FaArrowDown aria-hidden="true" />
              </button>
              <button type="button" onClick={() => setEditando(projeto)} aria-label="Editar projeto">
                <FaPen aria-hidden="true" />
              </button>
              <button
                className="archive"
                type="button"
                onClick={() => handleExcluir(projeto)}
                aria-label="Excluir projeto"
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

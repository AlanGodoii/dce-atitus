import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, errosPorCampo, mensagemDeErro } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Carregando from '../components/Carregando';
import AvisoEmailNaoVerificado from '../components/AvisoEmailNaoVerificado';
import './Painel.css';

const NIVEIS = [
  { valor: 'graduacao', rotulo: 'Graduação' },
  { valor: 'pos_graduacao', rotulo: 'Pós-Graduação' },
  { valor: 'mestrado', rotulo: 'Mestrado' },
  { valor: 'doutorado', rotulo: 'Doutorado' },
  { valor: 'tecnico', rotulo: 'Técnico' },
];

const VAZIO = {
  nome: '',
  cpf: '',
  dataNascimento: '',
  matricula: '',
  curso: '',
  nivel: 'graduacao',
  whatsapp: '',
};

function mascararCpf(valor) {
  const d = valor.replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

function mascararTelefone(valor) {
  const d = valor.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export default function MeuPerfil() {
  const { usuario, recarregar } = useAuth();
  const navegar = useNavigate();
  const inputFoto = useRef(null);

  const [form, setForm] = useState(VAZIO);
  const [fotoUrl, setFotoUrl] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [erro, setErro] = useState('');
  const [erros, setErros] = useState({});
  const [sucesso, setSucesso] = useState('');
  const [jaTinhaPerfil, setJaTinhaPerfil] = useState(false);

  useEffect(() => {
    let ativo = true;
    api
      .get('/perfil')
      .then(({ data }) => {
        if (!ativo) return;
        if (data.perfil) {
          setJaTinhaPerfil(true);
          setFotoUrl(data.perfil.fotoUrl);
          setForm({
            nome: data.perfil.nome ?? '',
            cpf: mascararCpf(data.perfil.cpf ?? ''),
            dataNascimento: data.perfil.dataNascimento ?? '',
            matricula: data.perfil.matricula ?? '',
            curso: data.perfil.curso ?? '',
            nivel: data.perfil.nivel ?? 'graduacao',
            whatsapp: mascararTelefone(data.perfil.whatsapp ?? ''),
          });
        } else {
          setForm((atual) => ({ ...atual, nome: usuario?.nome ?? '' }));
        }
      })
      .catch((e) => setErro(mensagemDeErro(e)))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [usuario?.nome]);

  function alterar(campo, mascara) {
    return (e) => {
      const valor = mascara ? mascara(e.target.value) : e.target.value;
      setForm((atual) => ({ ...atual, [campo]: valor }));
      setErros((atual) => ({ ...atual, [campo]: undefined }));
      setSucesso('');
    };
  }

  async function salvar(evento) {
    evento.preventDefault();
    setErro('');
    setErros({});
    setSucesso('');
    setSalvando(true);
    try {
      await api.post('/perfil', {
        ...form,
        cpf: form.cpf.replace(/\D/g, ''),
        whatsapp: form.whatsapp.replace(/\D/g, ''),
      });
      setJaTinhaPerfil(true);
      setSucesso('Dados salvos.');
      await recarregar();
      if (!fotoUrl) {
        setSucesso('Dados salvos. Agora envie a sua foto 3x4 para concluir.');
      }
    } catch (e) {
      setErros(errosPorCampo(e));
      setErro(mensagemDeErro(e, 'Não foi possível salvar o perfil.'));
    } finally {
      setSalvando(false);
    }
  }

  async function enviarFoto(evento) {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;

    setErro('');
    setSucesso('');
    setEnviandoFoto(true);
    const dados = new FormData();
    dados.append('foto', arquivo);

    try {
      const { data } = await api.post('/perfil/foto', dados);
      setFotoUrl(data.fotoUrl);
      setSucesso('Foto atualizada.');
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível enviar a foto.'));
    } finally {
      setEnviandoFoto(false);
      if (inputFoto.current) inputFoto.current.value = '';
    }
  }

  if (carregando) return <Carregando texto="Carregando seu perfil..." />;

  const completo = jaTinhaPerfil && Boolean(fotoUrl);

  return (
    <div className="pagina__conteudo">
      <header className="pagina__cabecalho">
        <div>
          <h1 className="pagina__titulo">Meu Perfil</h1>
          <p className="pagina__sub">
            Estes dados vão impressos na frente da sua carteirinha. Confira com atenção.
          </p>
        </div>
        {completo ? (
          <button type="button" className="btn btn-primario btn-sm" onClick={() => navegar('/carteirinha')}>
            Ir para a carteirinha
          </button>
        ) : null}
      </header>

      <AvisoEmailNaoVerificado />

      {erro ? (
        <div className="aviso aviso-erro" role="alert">
          {erro}
        </div>
      ) : null}
      {sucesso ? (
        <div className="aviso aviso-ok" role="status">
          {sucesso}
        </div>
      ) : null}

      <div className="colunas">
        <section className="cartao">
          <div className="cartao-corpo">
            <h2 className="bloco-titulo">Dados do estudante</h2>
            <p className="bloco-sub">Preencha exatamente como consta no seu documento.</p>

            <form onSubmit={salvar} noValidate>
              <div className="campo">
                <label htmlFor="nome">
                  Nome completo <span className="obrigatorio">*</span>
                </label>
                <input
                  id="nome"
                  value={form.nome}
                  onChange={alterar('nome')}
                  aria-invalid={Boolean(erros.nome)}
                  required
                />
                {erros.nome ? <p className="erro">{erros.nome}</p> : null}
              </div>

              <div className="grade-form">
                <div className="campo">
                  <label htmlFor="cpf">
                    CPF <span className="obrigatorio">*</span>
                  </label>
                  <input
                    id="cpf"
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    value={form.cpf}
                    onChange={alterar('cpf', mascararCpf)}
                    aria-invalid={Boolean(erros.cpf)}
                    required
                  />
                  {erros.cpf ? <p className="erro">{erros.cpf}</p> : null}
                </div>

                <div className="campo">
                  <label htmlFor="dataNascimento">
                    Data de nascimento <span className="obrigatorio">*</span>
                  </label>
                  <input
                    id="dataNascimento"
                    type="date"
                    value={form.dataNascimento}
                    onChange={alterar('dataNascimento')}
                    aria-invalid={Boolean(erros.dataNascimento)}
                    required
                  />
                  {erros.dataNascimento ? <p className="erro">{erros.dataNascimento}</p> : null}
                </div>

                <div className="campo">
                  <label htmlFor="matricula">
                    Matrícula <span className="obrigatorio">*</span>
                  </label>
                  <input
                    id="matricula"
                    value={form.matricula}
                    onChange={alterar('matricula')}
                    aria-invalid={Boolean(erros.matricula)}
                    required
                  />
                  {erros.matricula ? <p className="erro">{erros.matricula}</p> : null}
                </div>

                <div className="campo">
                  <label htmlFor="nivel">
                    Nível <span className="obrigatorio">*</span>
                  </label>
                  <select id="nivel" value={form.nivel} onChange={alterar('nivel')} required>
                    {NIVEIS.map((n) => (
                      <option key={n.valor} value={n.valor}>
                        {n.rotulo}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="campo">
                <label htmlFor="curso">
                  Curso <span className="obrigatorio">*</span>
                </label>
                <input
                  id="curso"
                  placeholder="Ex.: Arquitetura e Urbanismo"
                  value={form.curso}
                  onChange={alterar('curso')}
                  aria-invalid={Boolean(erros.curso)}
                  required
                />
                {erros.curso ? <p className="erro">{erros.curso}</p> : null}
              </div>

              <div className="campo">
                <label htmlFor="whatsapp">
                  WhatsApp <span className="obrigatorio">*</span>
                </label>
                <input
                  id="whatsapp"
                  inputMode="tel"
                  placeholder="(54) 99999-9999"
                  value={form.whatsapp}
                  onChange={alterar('whatsapp', mascararTelefone)}
                  aria-invalid={Boolean(erros.whatsapp)}
                  required
                />
                {erros.whatsapp ? (
                  <p className="erro">{erros.whatsapp}</p>
                ) : (
                  <p className="ajuda">É por onde o DCE fala com você sobre o comprovante.</p>
                )}
              </div>

              <button type="submit" className="btn btn-primario" disabled={salvando}>
                {salvando ? <span className="spinner spinner-sm" /> : null}
                {salvando ? 'Salvando...' : 'Salvar dados'}
              </button>
            </form>
          </div>
        </section>

        <section className="cartao">
          <div className="cartao-corpo">
            <h2 className="bloco-titulo">Foto 3x4</h2>
            <p className="bloco-sub">É a foto que aparece na carteirinha.</p>

            <div className="foto-area">
              {fotoUrl ? (
                <img className="foto-previa" src={fotoUrl} alt="Sua foto atual" />
              ) : (
                <div className="foto-previa foto-previa--vazia">Nenhuma foto enviada</div>
              )}

              <div className="foto-acoes">
                <p>
                  Rosto centralizado, fundo claro e boa iluminação. JPG, PNG ou WEBP de até 8 MB. O
                  sistema recorta automaticamente em 3x4.
                </p>

                <input
                  ref={inputFoto}
                  id="foto"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={enviarFoto}
                  className="apenas-leitor"
                  disabled={!jaTinhaPerfil || enviandoFoto}
                />
                <label
                  htmlFor="foto"
                  className={`btn ${fotoUrl ? 'btn-contorno' : 'btn-primario'} ${
                    !jaTinhaPerfil || enviandoFoto ? 'btn-desabilitado' : ''
                  }`}
                  style={
                    !jaTinhaPerfil || enviandoFoto
                      ? { opacity: 0.55, cursor: 'not-allowed', pointerEvents: 'none' }
                      : { cursor: 'pointer' }
                  }
                >
                  {enviandoFoto ? 'Enviando...' : fotoUrl ? 'Trocar foto' : 'Enviar foto'}
                </label>

                {!jaTinhaPerfil ? (
                  <p className="ajuda" style={{ marginTop: 10 }}>
                    Salve os dados acima antes de enviar a foto.
                  </p>
                ) : null}
              </div>
            </div>

            {completo ? (
              <>
                <div className="separador" />
                <div className="aviso aviso-ok" style={{ marginBottom: 0 }}>
                  Perfil completo. Vá para <strong>Carteira Digital</strong> para fazer o pagamento.
                </div>
              </>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

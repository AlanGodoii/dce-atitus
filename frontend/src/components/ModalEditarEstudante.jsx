import { useEffect, useRef, useState } from 'react';
import { api, errosPorCampo, mensagemDeErro } from '../services/api';
import './ModalEditarEstudante.css';

const NIVEIS = [
  { valor: 'graduacao', rotulo: 'Graduação' },
  { valor: 'pos_graduacao', rotulo: 'Pós-Graduação' },
  { valor: 'mestrado', rotulo: 'Mestrado' },
  { valor: 'doutorado', rotulo: 'Doutorado' },
  { valor: 'tecnico', rotulo: 'Técnico' },
];

const soDigitos = (v) => String(v ?? '').replace(/\D/g, '');

function mascararCpf(valor) {
  const d = soDigitos(valor).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

function mascararTelefone(valor) {
  let bruto = soDigitos(valor);
  if (bruto.length >= 12 && bruto.startsWith('55')) bruto = bruto.slice(2);
  const d = bruto.slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/**
 * Correção de dados pelo DCE. Quando o estudante já tem carteirinha emitida, o
 * salvamento também regenera o documento — por isso o aviso é explícito: o admin
 * precisa saber que a ação dispara um e-mail para o aluno.
 */
export default function ModalEditarEstudante({ estudante, aoFechar, aoSalvar }) {
  const dialogo = useRef(null);
  const [form, setForm] = useState({
    nome: estudante.nome ?? '',
    cpf: mascararCpf(estudante.cpfFormatado ?? ''),
    dataNascimento: estudante.dataNascimento ?? '',
    matricula: estudante.matricula ?? '',
    curso: estudante.curso ?? '',
    nivel: estudante.nivel ?? 'graduacao',
    querFisica: estudante.querFisica ?? true,
    whatsapp: mascararTelefone(estudante.whatsappFormatado ?? ''),
  });
  const [erro, setErro] = useState('');
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);

  const emitida = estudante.carteirinha?.status === 'aprovada';

  useEffect(() => {
    dialogo.current?.showModal();
  }, []);

  function alterar(campo, mascara) {
    return (e) => {
      const valor = mascara ? mascara(e.target.value) : e.target.value;
      setForm((atual) => ({ ...atual, [campo]: valor }));
      setErros((atual) => ({ ...atual, [campo]: undefined }));
    };
  }

  async function salvar(evento) {
    evento.preventDefault();
    setErro('');
    setErros({});
    setSalvando(true);
    try {
      const { data } = await api.patch(`/admin/estudantes/${estudante.perfilId}`, {
        ...form,
        cpf: soDigitos(form.cpf),
        whatsapp: soDigitos(form.whatsapp),
      });
      aoSalvar(data);
    } catch (e) {
      setErros(errosPorCampo(e));
      setErro(mensagemDeErro(e, 'Não foi possível salvar.'));
      setSalvando(false);
    }
  }

  return (
    <dialog ref={dialogo} className="modal" onCancel={aoFechar} onClose={aoFechar}>
      <form onSubmit={salvar} noValidate>
        <header className="modal__topo">
          <div>
            <h2>Corrigir dados</h2>
            <p>{estudante.email}</p>
          </div>
          <button type="button" className="modal__fechar" onClick={aoFechar} aria-label="Fechar">
            &times;
          </button>
        </header>

        <div className="modal__corpo">
          {emitida ? (
            <div className="aviso aviso-atencao">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                <path d="M12 3.5l9.5 16.5h-19z" />
                <path d="M12 10v4.5M12 17.5v.1" />
              </svg>
              <span>
                <strong>Esta carteirinha já foi emitida.</strong> Ao salvar, ela será reemitida com
                os dados corrigidos e reenviada por e-mail. O QR Code continua o mesmo, então o
                documento antigo não deixa de funcionar — mas passa a mostrar os dados novos na
                validação.
              </span>
            </div>
          ) : null}

          {erro ? (
            <div className="aviso aviso-erro" role="alert">
              <span>{erro}</span>
            </div>
          ) : null}

          <div className="campo">
            <label htmlFor="ed-nome">Nome completo</label>
            <input id="ed-nome" value={form.nome} onChange={alterar('nome')} aria-invalid={Boolean(erros.nome)} />
            {erros.nome ? <p className="erro">{erros.nome}</p> : null}
          </div>

          <div className="grade-form">
            <div className="campo">
              <label htmlFor="ed-cpf">CPF</label>
              <input id="ed-cpf" inputMode="numeric" value={form.cpf} onChange={alterar('cpf', mascararCpf)} aria-invalid={Boolean(erros.cpf)} />
              {erros.cpf ? <p className="erro">{erros.cpf}</p> : null}
            </div>

            <div className="campo">
              <label htmlFor="ed-nasc">Data de nascimento</label>
              <input id="ed-nasc" type="date" value={form.dataNascimento} onChange={alterar('dataNascimento')} aria-invalid={Boolean(erros.dataNascimento)} />
              {erros.dataNascimento ? <p className="erro">{erros.dataNascimento}</p> : null}
            </div>

            <div className="campo">
              <label htmlFor="ed-mat">Matrícula</label>
              <input id="ed-mat" value={form.matricula} onChange={alterar('matricula')} aria-invalid={Boolean(erros.matricula)} />
              {erros.matricula ? <p className="erro">{erros.matricula}</p> : null}
            </div>

            <div className="campo">
              <label htmlFor="ed-nivel">Nível</label>
              <select id="ed-nivel" value={form.nivel} onChange={alterar('nivel')}>
                {NIVEIS.map((n) => (
                  <option key={n.valor} value={n.valor}>
                    {n.rotulo}
                  </option>
                ))}
              </select>
            </div>

          </div>

          <div className="campo">
            <label htmlFor="ed-curso">Curso</label>
            <input id="ed-curso" value={form.curso} onChange={alterar('curso')} aria-invalid={Boolean(erros.curso)} />
            {erros.curso ? <p className="erro">{erros.curso}</p> : null}
          </div>

          <div className="campo">
            <label htmlFor="ed-fisica">Carteirinha física</label>
            <select
              id="ed-fisica"
              value={form.querFisica ? 'sim' : 'nao'}
              onChange={(e) => setForm((atual) => ({ ...atual, querFisica: e.target.value === 'sim' }))}
            >
              <option value="sim">Sim, retira no DCE</option>
              <option value="nao">Não, só a digital</option>
            </select>
            <p className="ajuda">Não sai impresso no cartão, então mudar aqui não reemite nada.</p>
          </div>

          <div className="campo">
            <label htmlFor="ed-whats">WhatsApp</label>
            <input id="ed-whats" inputMode="tel" value={form.whatsapp} onChange={alterar('whatsapp', mascararTelefone)} aria-invalid={Boolean(erros.whatsapp)} />
            {erros.whatsapp ? <p className="erro">{erros.whatsapp}</p> : null}
          </div>
        </div>

        <footer className="modal__rodape">
          <button type="button" className="btn btn-contorno" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primario" disabled={salvando}>
            {salvando ? <span className="spinner spinner-sm" /> : null}
            {salvando ? (emitida ? 'Reemitindo...' : 'Salvando...') : emitida ? 'Salvar e reemitir' : 'Salvar'}
          </button>
        </footer>
      </form>
    </dialog>
  );
}

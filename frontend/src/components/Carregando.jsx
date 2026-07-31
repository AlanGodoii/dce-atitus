export default function Carregando({ texto = 'Carregando...' }) {
  return (
    <div className="carregando-tela">
      <div className="spinner" />
      <p>{texto}</p>
    </div>
  );
}

import { useEffect, useState } from 'react';
import './HeroFundo.css';

/**
 * Fotos de fundo do hero, em transição suave.
 *
 * Basta soltar as imagens em `src/assets/hero/` — elas entram em ordem
 * alfabética, sem precisar mexer em código. Sem nenhuma imagem, o hero fica
 * com o verde sólido de antes, então nada quebra se a pasta estiver vazia.
 */
const arquivos = import.meta.glob('../assets/hero/*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
  import: 'default',
});

const IMAGENS = Object.keys(arquivos)
  .sort((a, b) => a.localeCompare(b))
  .map((chave) => arquivos[chave]);

const INTERVALO_MS = 6000;

export default function HeroFundo() {
  const [atual, setAtual] = useState(0);

  useEffect(() => {
    if (IMAGENS.length < 2) return undefined;

    // Quem pediu menos animação no sistema fica com uma imagem estática.
    const menosMovimento = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (menosMovimento) return undefined;

    const id = setInterval(() => {
      setAtual((i) => (i + 1) % IMAGENS.length);
    }, INTERVALO_MS);

    return () => clearInterval(id);
  }, []);

  return (
    <div className="hero-fundo" aria-hidden="true">
      {IMAGENS.map((src, i) => (
        <div
          key={src}
          className={`hero-fundo__foto ${i === atual ? 'hero-fundo__foto--ativa' : ''}`}
          style={{ backgroundImage: `url(${src})` }}
        />
      ))}

      {/* Véu verde: garante contraste do texto por cima de qualquer foto. */}
      <div className="hero-fundo__veu" />

      {/* Traços geométricos da identidade, os mesmos da carteirinha. */}
      <svg className="hero-fundo__tracos" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice">
        <path d="M-100 700 L400 100 L900 700 M300 700 L800 100 L1300 700" />
        <path d="M700 -50 L1250 400 M1250 -50 L700 400" />
      </svg>
    </div>
  );
}

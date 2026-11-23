import { useEffect, useState } from "react";
import { buildWhatsAppLink, generalWhatsAppMessage } from "@/lib/whatsapp";

const AUTO_ADVANCE_MS = 5000;

export interface HeroCarouselSlide {
  image: { src: string; width: number; height: number };
  alt: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
}

interface Props {
  slides: HeroCarouselSlide[];
}

export default function HeroCarousel({ slides }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = slides.length;

  function goTo(next: number) {
    setIndex(((next % total) + total) % total);
  }
  const prev = () => goTo(index - 1);
  const next = () => goTo(index + 1);

  // Auto-avance cada 5s, en pausa mientras el mouse esta encima (o el
  // carousel tiene foco por teclado). El efecto se reinicia cada vez que
  // cambia `index` (manual o automatico), asi que despues de un click en
  // una flecha/punto siempre vuelve a esperar los 5s completos, no "salta"
  // antes de tiempo.
  useEffect(() => {
    if (total <= 1 || paused) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % total);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [total, paused, index]);

  const slide = slides[index];

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") prev();
        if (e.key === "ArrowRight") next();
      }}
    >
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div aria-live="polite">
          <h1 className="text-4xl font-extrabold tracking-tight text-ink-900 sm:text-5xl">
            {slide.title}
          </h1>
          <p className="mt-4 max-w-md text-base text-ink-700 sm:text-lg">
            {slide.description}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={slide.ctaHref} className="btn-primary">
              {slide.ctaLabel}
            </a>
            <a
              href={buildWhatsAppLink(generalWhatsAppMessage())}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" />
              </svg>
              Escribir por WhatsApp
            </a>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-3xl shadow-lg shadow-brand-900/10 lg:max-w-none">
          <img
            src={slide.image.src}
            width={slide.image.width}
            height={slide.image.height}
            alt={slide.alt}
            loading="eager"
            // @ts-expect-error -- fetchpriority no esta tipado en React/JSX todavia
            fetchpriority="high"
            decoding="async"
            className="aspect-3/2 h-full w-full object-cover"
          />

          {total > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="Slide anterior"
                className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-ink-900 shadow-sm transition hover:bg-white"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              <button
                type="button"
                onClick={next}
                aria-label="Slide siguiente"
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-ink-900 shadow-sm transition hover:bg-white"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <polyline points="9 6 15 12 9 18" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {total > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Ir al slide ${i + 1}`}
              aria-current={i === index}
              className={
                "h-2 rounded-full transition-all " +
                (i === index ? "w-6 bg-brand-500" : "w-2 bg-black/15 hover:bg-black/30")
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

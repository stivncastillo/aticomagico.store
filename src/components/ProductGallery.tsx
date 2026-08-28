import { useState } from "react";

interface Props {
  images: string[];
  alt: string;
}

export default function ProductGallery({ images, alt }: Props) {
  const [index, setIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Sin fotos extra: mostramos una sola imagen fija, sin controles de carousel.
  if (images.length <= 1) {
    return (
      <div className="aspect-square overflow-hidden rounded-3xl bg-black/5">
        <img src={images[0]} alt={alt} className="h-full w-full object-cover" />
      </div>
    );
  }

  const total = images.length;
  const goTo = (next: number) => setIndex(((next % total) + total) % total);
  const prev = () => goTo(index - 1);
  const next = () => goTo(index + 1);

  function onTouchStart(e: React.TouchEvent) {
    setTouchStartX(e.touches[0].clientX);
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX;
    const SWIPE_THRESHOLD = 40;
    if (delta > SWIPE_THRESHOLD) prev();
    else if (delta < -SWIPE_THRESHOLD) next();
    setTouchStartX(null);
  }

  return (
    <div>
      <div
        className="group relative aspect-square overflow-hidden rounded-3xl bg-black/5 outline-none"
        tabIndex={0}
        role="group"
        aria-label={`Fotos de ${alt}`}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") prev();
          if (e.key === "ArrowRight") next();
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <img
          src={images[index]}
          alt={`${alt} - foto ${index + 1} de ${total}`}
          className="h-full w-full object-cover"
        />

        <button
          type="button"
          onClick={prev}
          aria-label="Foto anterior"
          className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-ink-900 shadow-sm transition hover:bg-white sm:opacity-0 sm:group-hover:opacity-100"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <button
          type="button"
          onClick={next}
          aria-label="Foto siguiente"
          className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-ink-900 shadow-sm transition hover:bg-white sm:opacity-0 sm:group-hover:opacity-100"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <polyline points="9 6 15 12 9 18" />
          </svg>
        </button>

        <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
          {index + 1} / {total}
        </span>
      </div>

      <div className="mt-3 flex justify-center gap-2">
        {images.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Ir a la foto ${i + 1}`}
            aria-current={i === index}
            className={
              "h-2 rounded-full transition-all " +
              (i === index ? "w-6 bg-brand-500" : "w-2 bg-black/15 hover:bg-black/30")
            }
          />
        ))}
      </div>
    </div>
  );
}

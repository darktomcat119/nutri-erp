'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

/* ═══ Canvas Animation: Flowing particles + gradient mesh ═══ */

function HeroCanvas(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    interface Orb {
      x: number; y: number;
      vx: number; vy: number;
      radius: number;
      hue: number;
      opacity: number;
    }

    const orbs: Orb[] = [];
    const ORB_COUNT = 5;

    const resize = () => {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      ctx.scale(2, 2);
    };

    const initOrbs = () => {
      orbs.length = 0;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      for (let i = 0; i < ORB_COUNT; i++) {
        orbs.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          radius: 80 + Math.random() * 120,
          hue: 200 + Math.random() * 40, // blue-violet range
          opacity: 0.08 + Math.random() * 0.06,
        });
      }
    };

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      ctx.clearRect(0, 0, w, h);

      // Draw soft gradient orbs
      for (const orb of orbs) {
        orb.x += orb.vx;
        orb.y += orb.vy;

        // Bounce softly
        if (orb.x < -orb.radius) orb.x = w + orb.radius;
        if (orb.x > w + orb.radius) orb.x = -orb.radius;
        if (orb.y < -orb.radius) orb.y = h + orb.radius;
        if (orb.y > h + orb.radius) orb.y = -orb.radius;

        const pulse = Math.sin(time * 0.005 + orb.hue) * 0.02;
        const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius);
        grad.addColorStop(0, `hsla(${orb.hue}, 80%, 60%, ${orb.opacity + pulse})`);
        grad.addColorStop(0.5, `hsla(${orb.hue + 20}, 70%, 50%, ${(orb.opacity + pulse) * 0.5})`);
        grad.addColorStop(1, `hsla(${orb.hue}, 80%, 50%, 0)`);

        ctx.fillStyle = grad;
        ctx.fillRect(orb.x - orb.radius, orb.y - orb.radius, orb.radius * 2, orb.radius * 2);
      }

      // Floating micro particles
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      for (let i = 0; i < 30; i++) {
        const px = (Math.sin(time * 0.002 + i * 1.7) * 0.5 + 0.5) * w;
        const py = (Math.cos(time * 0.0015 + i * 2.3) * 0.5 + 0.5) * h;
        const r = 0.5 + Math.sin(time * 0.003 + i) * 0.3;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Subtle horizontal light sweep
      const sweepX = ((time * 0.3) % (w + 400)) - 200;
      const sweepGrad = ctx.createLinearGradient(sweepX - 100, 0, sweepX + 100, 0);
      sweepGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      sweepGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.02)');
      sweepGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = sweepGrad;
      ctx.fillRect(0, 0, w, h);

      time++;
      animId = requestAnimationFrame(draw);
    };

    resize();
    initOrbs();
    draw();

    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 2 }}
    />
  );
}

/* ═══ Slide Data ═══ */

interface Slide {
  image: string;
  title: string;
  subtitle: string;
  gradient: string;
}

const slides: Slide[] = [
  {
    image: '/assets/images/hero-food.jpg',
    title: 'Sistema de Compras',
    subtitle: 'Gestion integral del ciclo semanal de compras para tu cafeteria',
    gradient: 'from-blue-900/95 via-slate-900/80 to-transparent',
  },
  {
    image: '/assets/images/produce.jpg',
    title: 'Control de Inventario',
    subtitle: 'Seguimiento completo de productos, insumos y proveedores',
    gradient: 'from-emerald-900/95 via-slate-900/80 to-transparent',
  },
  {
    image: '/assets/images/delivery.jpg',
    title: 'Entregas y Recepciones',
    subtitle: 'Trazabilidad total desde la orden de compra hasta la recepcion',
    gradient: 'from-violet-900/95 via-slate-900/80 to-transparent',
  },
  {
    image: '/assets/images/dining.jpg',
    title: 'Control Financiero',
    subtitle: 'Presupuestos, gastos reales y reportes por sucursal',
    gradient: 'from-amber-900/95 via-slate-900/80 to-transparent',
  },
];

/* ═══ Main Component ═══ */

interface HeroCarouselProps {
  userName: string;
  roleLabel: string;
  semana: string;
}

export function HeroCarousel({ userName, roleLabel, semana }: HeroCarouselProps): JSX.Element {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback((index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrent(index);
    setTimeout(() => setIsTransitioning(false), 700);
  }, [isTransitioning]);

  const next = useCallback(() => goTo((current + 1) % slides.length), [current, goTo]);
  const prev = useCallback(() => goTo((current - 1 + slides.length) % slides.length), [current, goTo]);

  // Auto-advance
  useEffect(() => {
    intervalRef.current = setInterval(next, 6000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [next]);

  // Pause on hover
  const pause = () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  const resume = () => { intervalRef.current = setInterval(next, 6000); };

  return (
    <div
      className="relative overflow-hidden rounded-2xl h-[180px] sm:h-[210px] group"
      onMouseEnter={pause}
      onMouseLeave={resume}
    >
      {/* Slides */}
      {slides.map((slide, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-all duration-700 ease-in-out ${
            i === current ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
          }`}
        >
          <Image
            src={slide.image}
            alt=""
            fill
            className="object-cover"
            priority={i === 0}
          />
          <div className={`absolute inset-0 bg-gradient-to-r ${slide.gradient}`} />
        </div>
      ))}

      {/* Canvas Animation Overlay */}
      <HeroCanvas />

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-center h-full px-5 sm:px-8">
        <div className="flex items-center gap-2 mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/images/logo.png"
            alt="Nutri Cafeteria"
            className="h-8 w-auto drop-shadow-lg"
          />
          <Badge className="bg-white/10 text-white/70 border-white/10 text-[10px] px-2 py-0.5 backdrop-blur-sm">
            <Calendar className="h-2.5 w-2.5 mr-1" />
            {semana}
          </Badge>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">
          Bienvenido, {userName}
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm mt-0.5 mb-1">
          {roleLabel}
        </p>

        {/* Slide subtitle with fade */}
        <p className={`text-white/50 text-[11px] sm:text-xs max-w-md transition-all duration-500 ${
          isTransitioning ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
        }`}>
          {slides[current].subtitle}
        </p>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prev}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        onClick={next}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`transition-all duration-300 rounded-full ${
              i === current
                ? 'w-6 h-1.5 bg-white/80'
                : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/50'
            }`}
          />
        ))}
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 h-[2px] bg-white/5">
        <div
          className="h-full bg-white/30 transition-all duration-[6000ms] ease-linear"
          style={{ width: isTransitioning ? '0%' : '100%' }}
          key={current}
        />
      </div>
    </div>
  );
}

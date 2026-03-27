'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
}

export function ParticleCanvas(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let particles: Particle[] = [];
    const PARTICLE_COUNT = 60;
    const CONNECTION_DISTANCE = 150;
    const MOUSE = { x: -1000, y: -1000 };
    const MOUSE_RADIUS = 200;

    const resize = (): void => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticles = (): void => {
      particles = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          radius: Math.random() * 2 + 1,
          opacity: Math.random() * 0.4 + 0.1,
        });
      }
    };

    const draw = (): void => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < CONNECTION_DISTANCE) {
            const opacity = (1 - dist / CONNECTION_DISTANCE) * 0.15;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(100, 116, 139, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles and update positions
      for (const p of particles) {
        // Mouse interaction — gentle push
        const mdx = p.x - MOUSE.x;
        const mdy = p.y - MOUSE.y;
        const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mDist < MOUSE_RADIUS && mDist > 0) {
          const force = (MOUSE_RADIUS - mDist) / MOUSE_RADIUS * 0.02;
          p.vx += (mdx / mDist) * force;
          p.vy += (mdy / mDist) * force;
        }

        // Damping
        p.vx *= 0.99;
        p.vy *= 0.99;

        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Draw dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100, 116, 139, ${p.opacity})`;
        ctx.fill();
      }

      // Mouse glow
      if (MOUSE.x > 0 && MOUSE.y > 0) {
        const gradient = ctx.createRadialGradient(
          MOUSE.x, MOUSE.y, 0,
          MOUSE.x, MOUSE.y, MOUSE_RADIUS
        );
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.04)');
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(
          MOUSE.x - MOUSE_RADIUS,
          MOUSE.y - MOUSE_RADIUS,
          MOUSE_RADIUS * 2,
          MOUSE_RADIUS * 2
        );
      }

      animationId = requestAnimationFrame(draw);
    };

    const handleMouseMove = (e: MouseEvent): void => {
      MOUSE.x = e.clientX;
      MOUSE.y = e.clientY;
    };

    const handleMouseLeave = (): void => {
      MOUSE.x = -1000;
      MOUSE.y = -1000;
    };

    resize();
    createParticles();
    draw();

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

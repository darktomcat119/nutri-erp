'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { ParticleCanvas } from './ParticleCanvas';

const loginSchema = z.object({
  email: z.string().email('Ingresa un correo valido'),
  password: z.string().min(6, 'La contrasena debe tener al menos 6 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm(): JSX.Element {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData): Promise<void> => {
    setError('');
    setLoading(true);
    try {
      await login(data.email, data.password);
      toast.success('Bienvenido al sistema');
      router.push('/');
    } catch (err) {
      let message = 'Ocurrio un error inesperado. Intenta mas tarde.';
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 401) message = 'Correo o contrasena incorrectos.';
        else if (status === 403) message = 'Tu cuenta esta desactivada. Contacta al administrador.';
        else if (!err.response) message = 'No se pudo conectar con el servidor.';
      }
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <Image
          src="/assets/images/dark-abstract.jpg"
          alt=""
          fill
          className="object-cover scale-110"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-blue-950/80" />
      </div>

      <ParticleCanvas />

      {/* Content */}
      <div className="relative z-10 w-full max-w-[400px] px-5">
        {/* Logo */}
        <div className="mb-10 text-center">
          <div className="inline-block mb-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/images/logo.png"
              alt="Nutri Cafeteria"
              className="h-14 w-auto drop-shadow-2xl mx-auto"
            />
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-blue-400/30" />
            <p className="text-[11px] text-blue-300/50 tracking-[0.2em] uppercase font-medium">
              Sistema de Compras
            </p>
            <div className="h-px w-8 bg-gradient-to-l from-transparent to-blue-400/30" />
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-2xl shadow-2xl shadow-black/20 p-7 sm:p-8">
          <div className="mb-7">
            <h2 className="text-lg font-semibold text-white tracking-tight">Iniciar Sesion</h2>
            <p className="text-[13px] text-slate-500 mt-1">Ingresa tus credenciales para acceder</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2.5 rounded-xl bg-red-500/10 border border-red-500/15 p-3">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                <p className="text-[13px] text-red-300">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[13px] text-slate-400 font-medium">
                Correo electronico
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="tu.correo@nutri.com"
                autoComplete="email"
                autoFocus
                className={`h-11 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-600 shadow-none hover:border-white/[0.15] focus-visible:ring-blue-500/30 focus-visible:border-blue-400/40 ${
                  errors.email ? 'border-red-400/40' : ''
                }`}
                {...register('email')}
              />
              {errors.email && <p className="text-[11px] text-red-400">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[13px] text-slate-400 font-medium">
                Contrasena
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={`h-11 pr-10 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-600 shadow-none hover:border-white/[0.15] focus-visible:ring-blue-500/30 focus-visible:border-blue-400/40 ${
                    errors.password ? 'border-red-400/40' : ''
                  }`}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] text-red-400">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 transition-all duration-300 group"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Iniciando sesion...
                </>
              ) : (
                <>
                  Iniciar Sesion
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-7 pt-5 border-t border-white/[0.06]">
            <p className="text-[11px] text-slate-600 text-center leading-relaxed">
              ¿Olvidaste tu contrasena? Contacta al administrador del sistema para restablecerla.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-[11px] text-slate-700 text-center">
          Nutri Cafeteria S.A. de C.V. — {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

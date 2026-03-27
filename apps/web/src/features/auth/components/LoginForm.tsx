'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Eye, EyeOff, ShoppingCart, AlertCircle, Loader2 } from 'lucide-react';
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
        if (status === 401) {
          message = 'Correo o contrasena incorrectos.';
        } else if (status === 403) {
          message = 'Tu cuenta esta desactivada. Contacta al administrador.';
        } else if (!err.response) {
          message = 'No se pudo conectar con el servidor. Verifica tu conexion.';
        }
      }

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 overflow-hidden">
      {/* Animated Background */}
      <ParticleCanvas />

      {/* Logo / Brand */}
      <div className="relative z-10 mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 text-white mb-4 shadow-lg backdrop-blur-sm border border-white/10">
          <ShoppingCart className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Nutri Cafeteria
        </h1>
        <p className="text-slate-400 mt-1">Sistema de Compras</p>
      </div>

      {/* Login Card */}
      <Card className="relative z-10 w-full max-w-sm shadow-2xl border-white/10 bg-white/95 backdrop-blur-md">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-xl text-center">Iniciar Sesion</CardTitle>
          <CardDescription className="text-center">
            Ingresa tus credenciales para acceder al sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Error Banner */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Correo electronico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu.correo@nutri.com"
                autoComplete="email"
                autoFocus
                className={errors.email ? 'border-red-400 focus-visible:ring-red-400' : ''}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Contrasena</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={`pr-10 ${errors.password ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-10 bg-slate-900 hover:bg-slate-800"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Iniciando sesion...
                </>
              ) : (
                'Iniciar Sesion'
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 pt-0">
          <div className="w-full border-t border-slate-100" />
          <p className="text-xs text-slate-400 text-center leading-relaxed pt-1">
            ¿Olvidaste tu contrasena? Contacta al administrador
            <br />
            del sistema para restablecerla.
          </p>
        </CardFooter>
      </Card>

      {/* Footer */}
      <p className="relative z-10 mt-8 text-xs text-slate-500">
        Nutri Cafeteria S.A. de C.V. — {new Date().getFullYear()}
      </p>
    </div>
  );
}

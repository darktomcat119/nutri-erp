'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Mail,
  Shield,
  Building2,
  Save,
  KeyRound,
  Loader2,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

const rolLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  SUPERVISOR: 'Supervisor',
  ENCARGADO: 'Encargado de Sucursal',
  CHOFER: 'Chofer',
};

const rolColors: Record<string, string> = {
  ADMIN: 'bg-blue-100 text-blue-700',
  SUPERVISOR: 'bg-violet-100 text-violet-700',
  ENCARGADO: 'bg-emerald-100 text-emerald-700',
  CHOFER: 'bg-amber-100 text-amber-700',
};

export function PerfilPage(): JSX.Element {
  const { user, loadUser } = useAuthStore();

  // Profile form
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    if (user) {
      setNombre(user.nombre);
      setEmail(user.email);
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!nombre.trim() || nombre.length < 2) {
      toast.error('El nombre debe tener al menos 2 caracteres');
      return;
    }
    setSavingProfile(true);
    try {
      await api.patch('/auth/update-profile', { nombre, email });
      toast.success('Perfil actualizado');
      loadUser();
    } catch {
      toast.error('Error al actualizar perfil');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error('La nueva contrasena debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Las contrasenas no coinciden');
      return;
    }
    if (!currentPassword) {
      toast.error('Ingresa tu contrasena actual');
      return;
    }
    setSavingPassword(true);
    try {
      await api.patch('/auth/change-password', { currentPassword, newPassword });
      toast.success('Contrasena actualizada exitosamente');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (msg?.includes('incorrecta')) {
        toast.error('La contrasena actual es incorrecta');
      } else {
        toast.error('Error al cambiar contrasena');
      }
    } finally {
      setSavingPassword(false);
    }
  };

  if (!user) return <></>;

  return (
    <div className="max-w-2xl space-y-6">
      {/* Profile Header */}
      <Card className="overflow-hidden">
        <div className="relative h-28 bg-gradient-to-r from-blue-600 via-blue-500 to-violet-500">
          <Image
            src="/assets/images/dark-abstract.jpg"
            alt=""
            fill
            className="object-cover opacity-30 mix-blend-overlay"
          />
        </div>
        <CardContent className="relative pt-0 pb-6 px-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-3xl font-bold shadow-lg border-4 border-white shrink-0">
              {user.nombre.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <h2 className="text-xl font-bold text-slate-900 truncate">{user.nombre}</h2>
              <p className="text-sm text-slate-500">{user.email}</p>
            </div>
            <div className="flex flex-wrap gap-2 pb-1">
              <Badge className={`${rolColors[user.role] || 'bg-slate-100 text-slate-700'} text-sm px-3 py-1`}>
                <Shield className="h-3.5 w-3.5 mr-1.5" />
                {rolLabels[user.role] || user.role}
              </Badge>
              {user.sucursal && (
                <Badge variant="outline" className="text-sm px-3 py-1">
                  <Building2 className="h-3.5 w-3.5 mr-1.5" />
                  {user.sucursal.codigo} — {user.sucursal.nombre}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Update Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-5 w-5 text-slate-500" />
            Informacion Personal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre" className="text-sm">Nombre completo</Label>
              <Input
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre"
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">Correo electronico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@nutri.com"
                  className="min-h-[44px] pl-10"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleUpdateProfile}
              disabled={savingProfile}
              className="w-full sm:w-auto min-h-[44px]"
            >
              {savingProfile ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar Cambios
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-slate-500" />
            Cambiar Contrasena
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword" className="text-sm">Contrasena actual</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="min-h-[44px] pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                tabIndex={-1}
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-sm">Nueva contrasena</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimo 6 caracteres"
                  className="min-h-[44px] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm">Confirmar nueva contrasena</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showNew ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repetir contrasena"
                  className={`min-h-[44px] pr-10 ${confirmPassword && confirmPassword === newPassword ? 'border-emerald-400' : confirmPassword ? 'border-red-400' : ''}`}
                />
                {confirmPassword && confirmPassword === newPassword && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                )}
              </div>
            </div>
          </div>

          {newPassword && newPassword.length < 6 && (
            <p className="text-xs text-amber-600">La contrasena debe tener al menos 6 caracteres</p>
          )}

          <div className="flex justify-end">
            <Button
              onClick={handleChangePassword}
              disabled={savingPassword || !currentPassword || newPassword.length < 6 || newPassword !== confirmPassword}
              variant="outline"
              className="w-full sm:w-auto min-h-[44px] border-amber-200 text-amber-700 hover:bg-amber-50"
            >
              {savingPassword ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <KeyRound className="h-4 w-4 mr-2" />
              )}
              Cambiar Contrasena
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

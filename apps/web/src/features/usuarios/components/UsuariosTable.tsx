'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import type { User } from '@/types/auth.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Plus, Search, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Sucursal {
  id: string;
  codigo: string;
  nombre: string;
}

const userSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'Minimo 6 caracteres').optional().or(z.literal('')),
  nombre: z.string().min(2, 'Minimo 2 caracteres'),
  role: z.enum(['ADMIN', 'SUPERVISOR', 'ENCARGADO', 'CHOFER']),
  sucursalId: z.string().optional().or(z.literal('')),
});

type UserFormData = z.infer<typeof userSchema>;

export function UsuariosTable(): JSX.Element {
  const [users, setUsers] = useState<User[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [filter, setFilter] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
  });

  const loadData = useCallback(async (): Promise<void> => {
    try {
      const [usersRes, sucRes] = await Promise.all([
        api.get('/usuarios'),
        api.get('/sucursales'),
      ]);
      setUsers(usersRes.data.data);
      setSucursales(sucRes.data.data);
    } catch {
      toast.error('Error al cargar datos');
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const openCreate = (): void => {
    setEditing(null);
    reset({ email: '', password: '', nombre: '', role: 'ENCARGADO', sucursalId: '' });
    setOpen(true);
  };

  const openEdit = (user: User): void => {
    setEditing(user);
    reset({
      email: user.email,
      password: '',
      nombre: user.nombre,
      role: user.role,
      sucursalId: user.sucursalId || '',
    });
    setOpen(true);
  };

  const onSubmit = async (data: UserFormData): Promise<void> => {
    try {
      const payload: Record<string, unknown> = {
        email: data.email,
        nombre: data.nombre,
        role: data.role,
        sucursalId: data.sucursalId || null,
      };
      if (data.password) payload.password = data.password;

      if (editing) {
        await api.patch(`/usuarios/${editing.id}`, payload);
        toast.success('Usuario actualizado');
      } else {
        if (!data.password) {
          toast.error('La contrasena es requerida');
          return;
        }
        payload.password = data.password;
        await api.post('/usuarios', payload);
        toast.success('Usuario creado');
      }
      setOpen(false);
      loadData();
    } catch {
      toast.error('Error al guardar usuario');
    }
  };

  const handleResetPassword = async (): Promise<void> => {
    if (!resetUser) return;
    if (newPassword.length < 6) { toast.error('La contrasena debe tener al menos 6 caracteres'); return; }
    try {
      await api.patch(`/usuarios/${resetUser.id}`, { password: newPassword });
      toast.success(`Contrasena de ${resetUser.nombre} restablecida`);
    } catch {
      toast.error('Error al restablecer contrasena');
    } finally {
      setResetUser(null);
      setNewPassword('');
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteId) return;
    try {
      await api.delete(`/usuarios/${deleteId}`);
      toast.success('Usuario desactivado');
      loadData();
    } catch {
      toast.error('Error al desactivar');
    } finally {
      setDeleteId(null);
    }
  };

  const columns: ColumnDef<User>[] = [
    { accessorKey: 'nombre', header: 'Nombre' },
    { accessorKey: 'email', header: 'Email' },
    {
      accessorKey: 'role',
      header: 'Rol',
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.role}</Badge>
      ),
    },
    {
      accessorKey: 'sucursal',
      header: 'Sucursal',
      cell: ({ row }) => row.original.sucursal?.codigo || '—',
    },
    {
      accessorKey: 'activo',
      header: 'Activo',
      cell: ({ row }) => (
        <Badge variant={row.original.activo ? 'default' : 'secondary'}>
          {row.original.activo ? 'Si' : 'No'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)} title="Editar">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setResetUser(row.original)} title="Restablecer contrasena">
            <KeyRound className="h-4 w-4 text-amber-600" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.original.id)} title="Desactivar">
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { globalFilter: filter },
    onGlobalFilterChange: setFilter,
  });

  const selectedRole = watch('role');

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar usuarios..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" /> Nuevo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input {...register('nombre')} />
                {errors.nombre && <p className="text-xs text-red-600">{errors.nombre.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" {...register('email')} />
                {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>{editing ? 'Nueva Contrasena (dejar vacio para no cambiar)' : 'Contrasena'}</Label>
                <Input type="password" {...register('password')} />
                {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={selectedRole} onValueChange={(v) => setValue('role', v as UserFormData['role'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                    <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                    <SelectItem value="ENCARGADO">Encargado de Sucursal</SelectItem>
                    <SelectItem value="CHOFER">Chofer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(selectedRole === 'ENCARGADO') && (
                <div className="space-y-2">
                  <Label>Sucursal</Label>
                  <Select
                    value={watch('sucursalId') || ''}
                    onValueChange={(v) => setValue('sucursalId', v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Seleccionar sucursal" /></SelectTrigger>
                    <SelectContent>
                      {sucursales.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.codigo} — {s.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button type="submit" className="w-full">
                {editing ? 'Actualizar' : 'Crear'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-slate-500">
                  No hay usuarios registrados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-slate-500">{users.length} usuarios</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Siguiente
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        onConfirm={handleDelete}
        title="Desactivar usuario"
        description="Este usuario sera desactivado y no podra iniciar sesion. Puedes reactivarlo despues."
        confirmLabel="Desactivar"
      />

      <AlertDialog open={!!resetUser} onOpenChange={(open) => { if (!open) { setResetUser(null); setNewPassword(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restablecer contrasena</AlertDialogTitle>
            <AlertDialogDescription>
              Ingresa la nueva contrasena para {resetUser?.nombre}. Minimo 6 caracteres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            type="password"
            placeholder="Nueva contrasena"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleResetPassword}
              disabled={newPassword.length < 6}
            >
              Restablecer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

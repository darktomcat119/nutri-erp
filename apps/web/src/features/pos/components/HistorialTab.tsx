'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { PosUpload } from './types';

export function HistorialTab(): JSX.Element {
  const [uploads, setUploads] = useState<PosUpload[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/pos/uploads')
      .then((r) => {
        const arr = Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : [];
        setUploads(arr);
      })
      .catch(() => toast.error('Error al cargar historial'))
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = (upload: PosUpload): void => {
    window.open(upload.archivoUrl, '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Historial de Cargas POS
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : uploads.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">
            No hay cargas POS generadas aun.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Semana</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Total Piezas</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploads.map((upload) => (
                  <TableRow key={upload.id}>
                    <TableCell className="font-medium">
                      {upload.sucursal.codigo} - {upload.sucursal.nombre}
                    </TableCell>
                    <TableCell>{upload.semana}</TableCell>
                    <TableCell className="text-right">{upload.totalItems}</TableCell>
                    <TableCell className="text-right">{upload.totalPiezas}</TableCell>
                    <TableCell>
                      {new Date(upload.createdAt).toLocaleDateString('es-MX', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(upload)}
                        className="w-full sm:w-auto min-h-[44px]"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Descargar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

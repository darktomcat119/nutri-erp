'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { OrdenEntrega, GenerarResult } from './types';
import { useTableSort } from '@/lib/useTableSort';
import { SortableTh } from '@/components/ui/sortable-th';

export function GenerarCargaTab(): JSX.Element {
  const [ordenes, setOrdenes] = useState<OrdenEntrega[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const { sorted, sortKey, sortDir, toggleSort } = useTableSort(ordenes, {
    defaultKey: 'sucursal.codigo',
    defaultDir: 'asc',
  });

  const loadOrdenes = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/ordenes-entrega');
      const arr = Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : [];
      setOrdenes(arr);
    } catch {
      toast.error('Error al cargar ordenes de entrega');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrdenes();
  }, [loadOrdenes]);

  const handleGenerar = async (ordenId: string): Promise<void> => {
    setGeneratingId(ordenId);
    try {
      const r = await api.post(`/pos/generar-carga/${ordenId}`);
      const data = (r.data?.data ?? r.data) as GenerarResult;
      toast.success(
        `Carga POS generada: ${data.totalItems} items, ${data.totalPiezas} piezas. El archivo esta listo para descarga en Historial.`,
      );
      // Refresh list
      await loadOrdenes();
    } catch {
      toast.error('Error al generar carga POS');
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Generar Carga POS desde Ordenes de Entrega
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : ordenes.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">
            No hay ordenes de entrega disponibles para generar carga POS.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <SortableTh
                      sortKey="sucursal.codigo"
                      activeKey={sortKey}
                      dir={sortDir}
                      onToggle={toggleSort}
                    >
                      Sucursal
                    </SortableTh>
                  </TableHead>
                  <TableHead>
                    <SortableTh
                      sortKey="semana"
                      activeKey={sortKey}
                      dir={sortDir}
                      onToggle={toggleSort}
                    >
                      Semana
                    </SortableTh>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortableTh
                      sortKey="_count.items"
                      activeKey={sortKey}
                      dir={sortDir}
                      onToggle={toggleSort}
                      align="right"
                    >
                      Items
                    </SortableTh>
                  </TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((orden) => (
                  <TableRow key={orden.id}>
                    <TableCell className="font-medium">
                      {orden.sucursal.codigo} - {orden.sucursal.nombre}
                    </TableCell>
                    <TableCell>{orden.semana}</TableCell>
                    <TableCell className="text-right">{orden._count.items}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => handleGenerar(orden.id)}
                        disabled={generatingId === orden.id}
                        className="w-full sm:w-auto min-h-[44px]"
                      >
                        {generatingId === orden.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <FileSpreadsheet className="mr-2 h-4 w-4" />
                        )}
                        Generar Excel
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

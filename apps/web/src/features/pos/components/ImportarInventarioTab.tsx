'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { SelectEmpty } from '@/components/ui/select-empty';
import { Upload, Package, Loader2, AlertTriangle, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Sucursal, ImportResult, InventarioRow } from './types';

export function ImportarInventarioTab(): JSX.Element {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [selectedSucursal, setSelectedSucursal] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [inventario, setInventario] = useState<InventarioRow[]>([]);
  const [loadingInv, setLoadingInv] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load sucursales
  useEffect(() => {
    api
      .get('/sucursales')
      .then((r) => {
        const arr = Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : [];
        setSucursales(arr);
      })
      .catch(() => {
        toast.error('Error al cargar sucursales');
      });
  }, []);

  // Load inventory when branch changes
  const loadInventario = useCallback(async (sucursalId: string) => {
    if (!sucursalId) {
      setInventario([]);
      return;
    }
    setLoadingInv(true);
    try {
      const r = await api.get(`/pos/inventario/${sucursalId}`);
      const arr = Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : [];
      setInventario(arr);
    } catch {
      toast.error('Error al cargar inventario');
    } finally {
      setLoadingInv(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSucursal) {
      loadInventario(selectedSucursal);
    }
  }, [selectedSucursal, loadInventario]);

  const handleUpload = async (): Promise<void> => {
    if (!file || !selectedSucursal) {
      toast.error('Selecciona una sucursal y un archivo');
      return;
    }

    setUploading(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sucursalId', selectedSucursal);

      const r = await api.post('/pos/importar-inventario', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = (r.data?.data ?? r.data) as ImportResult;

      setImportResult(data);
      toast.success(`Importacion completada: ${data.matched} productos vinculados`);

      // Refresh inventory
      await loadInventario(selectedSucursal);

      // Reset file
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch {
      toast.error('Error al importar inventario');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Inventario desde Excel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="w-full sm:w-64">
              <Label htmlFor="sucursal-select">Sucursal</Label>
              <Select value={selectedSucursal} onValueChange={setSelectedSucursal}>
                <SelectTrigger id="sucursal-select" className="min-h-[44px]">
                  <SelectValue placeholder="Seleccionar sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {sucursales.length === 0 ? (
                    <SelectEmpty
                      icon={Building2}
                      label="No hay sucursales activas"
                      hint="Crea una sucursal en Catalogos > Sucursales."
                    />
                  ) : (
                    sucursales.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.codigo} - {s.nombre}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-auto flex-1">
              <Label htmlFor="file-upload">Archivo Excel</Label>
              <Input
                id="file-upload"
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="min-h-[44px]"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <Button
              onClick={handleUpload}
              disabled={uploading || !file || !selectedSucursal}
              className="w-full sm:w-auto min-h-[44px]"
            >
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {uploading ? 'Importando...' : 'Importar'}
            </Button>
          </div>

          {/* Import result */}
          {importResult && (
            <div className="space-y-3 pt-4 border-t">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Badge variant="outline" className="w-fit">
                  Total filas: {importResult.totalRows}
                </Badge>
                <Badge className="bg-emerald-100 text-emerald-700 w-fit">
                  Vinculados: {importResult.matched}
                </Badge>
                {importResult.unmatched > 0 && (
                  <Badge className="bg-amber-100 text-amber-700 w-fit">
                    Sin vincular: {importResult.unmatched}
                  </Badge>
                )}
              </div>

              {importResult.unmatched > 0 && importResult.unmatchedNames.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-800">
                      Productos no encontrados en el catalogo
                    </span>
                  </div>
                  <ul className="list-disc list-inside text-sm text-amber-700 space-y-1 max-h-40 overflow-y-auto">
                    {importResult.unmatchedNames.map((name, i) => (
                      <li key={i}>{name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inventory table */}
      {selectedSucursal && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Inventario Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingInv ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : inventario.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">
                No hay datos de inventario para esta sucursal.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Inventario Total</TableHead>
                      <TableHead className="text-right">Reservado</TableHead>
                      <TableHead className="text-right">Disponible</TableHead>
                      <TableHead className="text-right">Limite Diario</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventario.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.producto.nombre}</TableCell>
                        <TableCell className="text-right">{row.inventarioTotal}</TableCell>
                        <TableCell className="text-right">{row.reservado}</TableCell>
                        <TableCell className="text-right">{row.disponible}</TableCell>
                        <TableCell className="text-right">{row.limiteDiario}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

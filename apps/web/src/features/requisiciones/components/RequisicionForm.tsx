'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Save, Send } from 'lucide-react';
import { toast } from 'sonner';

interface Producto { id: string; codigo: string; nombre: string; costoDisplay: string; pzXDisplay: number; proveedor: { nombre: string }; }
interface Insumo { id: string; codigo: string; nombre: string; unidad: string; costoUnitario: string; proveedor: { nombre: string }; }

interface ReqItem {
  area: 'MOS' | 'INS';
  productoId?: string;
  insumoId?: string;
  nombre: string;
  cantidadSolicitada: number;
  costoRef: number;
  unidad: string;
  notas?: string;
}

interface ExistingReq {
  id: string;
  semana: string;
  estado: string;
  notas: string | null;
  items: Array<{
    area: string;
    productoId: string | null;
    insumoId: string | null;
    cantidadSolicitada: string;
    producto: { id: string; nombre: string; costoDisplay: string } | null;
    insumo: { id: string; nombre: string; costoUnitario: string; unidad: string } | null;
  }>;
}

function getCurrentWeek(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 604800000;
  const weekNum = Math.ceil((diff / oneWeek) + start.getDay() / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export function RequisicionForm(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [items, setItems] = useState<ReqItem[]>([]);
  const [semana, setSemana] = useState(getCurrentWeek());
  const [existingId, setExistingId] = useState<string | null>(null);
  const [estado, setEstado] = useState('BORRADOR');
  const [notas, setNotas] = useState('');
  const [selectedProducto, setSelectedProducto] = useState('');
  const [selectedInsumo, setSelectedInsumo] = useState('');
  const [cantMos, setCantMos] = useState(1);
  const [cantIns, setCantIns] = useState(1);
  const [loading, setLoading] = useState(false);

  const loadCatalogs = useCallback(async (): Promise<void> => {
    try {
      const [p, i] = await Promise.all([api.get('/productos'), api.get('/insumos')]);
      setProductos(p.data.data);
      setInsumos(i.data.data);
    } catch { toast.error('Error al cargar catalogos'); }
  }, []);

  const loadExisting = useCallback(async (): Promise<void> => {
    if (!user?.sucursalId) return;
    try {
      const r = await api.get('/requisiciones/mi-sucursal');
      const reqs: ExistingReq[] = r.data.data;
      const found = reqs.find((req) => req.semana === semana);
      if (found) {
        const detail = await api.get(`/requisiciones/${found.id}`);
        const req: ExistingReq = detail.data.data;
        setExistingId(req.id);
        setEstado(req.estado);
        setNotas(req.notas || '');
        setItems(req.items.map((it) => ({
          area: it.area as 'MOS' | 'INS',
          productoId: it.productoId || undefined,
          insumoId: it.insumoId || undefined,
          nombre: it.producto?.nombre || it.insumo?.nombre || '',
          cantidadSolicitada: Number(it.cantidadSolicitada),
          costoRef: it.producto ? Number(it.producto.costoDisplay) : it.insumo ? Number(it.insumo.costoUnitario) : 0,
          unidad: it.area === 'MOS' ? 'displays' : (it.insumo?.unidad || ''),
        })));
      } else {
        setExistingId(null);
        setEstado('BORRADOR');
        setItems([]);
        setNotas('');
      }
    } catch { /* no existing */ }
  }, [semana, user?.sucursalId]);

  useEffect(() => { loadCatalogs(); }, [loadCatalogs]);
  useEffect(() => { loadExisting(); }, [loadExisting]);

  const addMos = (): void => {
    if (!selectedProducto) return;
    const prod = productos.find((p) => p.id === selectedProducto);
    if (!prod) return;
    if (items.find((i) => i.productoId === prod.id)) { toast.error('Producto ya agregado'); return; }
    setItems([...items, {
      area: 'MOS', productoId: prod.id, nombre: prod.nombre,
      cantidadSolicitada: cantMos, costoRef: Number(prod.costoDisplay), unidad: 'displays',
    }]);
    setSelectedProducto('');
    setCantMos(1);
  };

  const addIns = (): void => {
    if (!selectedInsumo) return;
    const ins = insumos.find((i) => i.id === selectedInsumo);
    if (!ins) return;
    if (items.find((i) => i.insumoId === ins.id)) { toast.error('Insumo ya agregado'); return; }
    setItems([...items, {
      area: 'INS', insumoId: ins.id, nombre: ins.nombre,
      cantidadSolicitada: cantIns, costoRef: Number(ins.costoUnitario), unidad: ins.unidad,
    }]);
    setSelectedInsumo('');
    setCantIns(1);
  };

  const updateQty = (index: number, qty: number): void => {
    const updated = [...items];
    updated[index].cantidadSolicitada = qty;
    setItems(updated);
  };

  const removeItem = (index: number): void => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalMos = items.filter((i) => i.area === 'MOS').reduce((sum, i) => sum + i.cantidadSolicitada * i.costoRef, 0);
  const totalIns = items.filter((i) => i.area === 'INS').reduce((sum, i) => sum + i.cantidadSolicitada * i.costoRef, 0);

  const save = async (submit: boolean): Promise<void> => {
    if (items.length === 0) { toast.error('Agrega al menos un item'); return; }
    setLoading(true);
    try {
      const payload = {
        semana,
        notas: notas || undefined,
        items: items.map((i) => ({
          area: i.area,
          productoId: i.productoId || undefined,
          insumoId: i.insumoId || undefined,
          cantidadSolicitada: i.cantidadSolicitada,
        })),
      };

      if (existingId) {
        await api.patch(`/requisiciones/${existingId}`, { notas: payload.notas, items: payload.items });
        if (submit) await api.post(`/requisiciones/${existingId}/enviar`);
      } else {
        const r = await api.post('/requisiciones', payload);
        const newId = r.data.data.id;
        setExistingId(newId);
        if (submit) await api.post(`/requisiciones/${newId}/enviar`);
      }

      toast.success(submit ? 'Requisicion enviada para aprobacion' : 'Requisicion guardada como borrador');
      if (submit) { setEstado('ENVIADA'); }
    } catch { toast.error('Error al guardar'); }
    finally { setLoading(false); }
  };

  const isReadOnly = estado !== 'BORRADOR' && estado !== 'RECHAZADA';
  const mosItems = items.filter((i) => i.area === 'MOS');
  const insItems = items.filter((i) => i.area === 'INS');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Requisicion — {user?.sucursal?.codigo || 'Mi Sucursal'}</CardTitle>
              <p className="text-sm text-slate-500 mt-1">{user?.sucursal?.nombre}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Semana</Label>
                <Input value={semana} onChange={(e) => setSemana(e.target.value)} className="w-32" disabled={isReadOnly} />
              </div>
              <Badge className={
                estado === 'BORRADOR' ? 'bg-slate-100 text-slate-700' :
                estado === 'ENVIADA' ? 'bg-amber-100 text-amber-700' :
                estado === 'APROBADA' ? 'bg-emerald-100 text-emerald-700' :
                'bg-red-100 text-red-700'
              }>{estado}</Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="MOS">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="MOS">Mostrador ({mosItems.length})</TabsTrigger>
          <TabsTrigger value="INS">Insumos ({insItems.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="MOS" className="space-y-4">
          {!isReadOnly && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex gap-3 items-end">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Producto</Label>
                    <Select value={selectedProducto} onValueChange={setSelectedProducto}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar producto..." /></SelectTrigger>
                      <SelectContent>
                        {productos.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.codigo} — {p.nombre} (${Number(p.costoDisplay).toFixed(2)})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24 space-y-1">
                    <Label className="text-xs">Displays</Label>
                    <Input type="number" min={1} value={cantMos} onChange={(e) => setCantMos(Number(e.target.value))} />
                  </div>
                  <Button onClick={addMos}>Agregar</Button>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="rounded-md border">
            <Table>
              <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead className="w-24">Displays</TableHead><TableHead className="w-28">Subtotal</TableHead>{!isReadOnly && <TableHead className="w-16"></TableHead>}</TableRow></TableHeader>
              <TableBody>
                {mosItems.length ? mosItems.map((item) => {
                  const realIdx = items.indexOf(item);
                  return (
                    <TableRow key={realIdx}>
                      <TableCell>{item.nombre}</TableCell>
                      <TableCell>
                        {isReadOnly ? item.cantidadSolicitada :
                          <Input type="number" min={1} value={item.cantidadSolicitada} onChange={(e) => updateQty(realIdx, Number(e.target.value))} className="w-20 h-8" />}
                      </TableCell>
                      <TableCell>${(item.cantidadSolicitada * item.costoRef).toFixed(2)}</TableCell>
                      {!isReadOnly && <TableCell><Button variant="ghost" size="icon" onClick={() => removeItem(realIdx)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell>}
                    </TableRow>
                  );
                }) : <TableRow><TableCell colSpan={4} className="h-16 text-center text-slate-500">Sin productos MOS</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
          <div className="text-right"><p className="text-sm font-medium">Total MOS: <span className="text-lg font-bold">${totalMos.toFixed(2)}</span></p></div>
        </TabsContent>

        <TabsContent value="INS" className="space-y-4">
          {!isReadOnly && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex gap-3 items-end">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Insumo</Label>
                    <Select value={selectedInsumo} onValueChange={setSelectedInsumo}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar insumo..." /></SelectTrigger>
                      <SelectContent>
                        {insumos.map((i) => (
                          <SelectItem key={i.id} value={i.id}>{i.codigo} — {i.nombre} ({i.unidad}) — ${Number(i.costoUnitario).toFixed(2)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24 space-y-1">
                    <Label className="text-xs">Cantidad</Label>
                    <Input type="number" min={0.1} step={0.1} value={cantIns} onChange={(e) => setCantIns(Number(e.target.value))} />
                  </div>
                  <Button onClick={addIns}>Agregar</Button>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="rounded-md border">
            <Table>
              <TableHeader><TableRow><TableHead>Insumo</TableHead><TableHead className="w-24">Cantidad</TableHead><TableHead className="w-20">Unidad</TableHead><TableHead className="w-28">Subtotal</TableHead>{!isReadOnly && <TableHead className="w-16"></TableHead>}</TableRow></TableHeader>
              <TableBody>
                {insItems.length ? insItems.map((item) => {
                  const realIdx = items.indexOf(item);
                  return (
                    <TableRow key={realIdx}>
                      <TableCell>{item.nombre}</TableCell>
                      <TableCell>
                        {isReadOnly ? item.cantidadSolicitada :
                          <Input type="number" min={0.1} step={0.1} value={item.cantidadSolicitada} onChange={(e) => updateQty(realIdx, Number(e.target.value))} className="w-20 h-8" />}
                      </TableCell>
                      <TableCell>{item.unidad}</TableCell>
                      <TableCell>${(item.cantidadSolicitada * item.costoRef).toFixed(2)}</TableCell>
                      {!isReadOnly && <TableCell><Button variant="ghost" size="icon" onClick={() => removeItem(realIdx)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell>}
                    </TableRow>
                  );
                }) : <TableRow><TableCell colSpan={5} className="h-16 text-center text-slate-500">Sin insumos</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
          <div className="text-right"><p className="text-sm font-medium">Total INS: <span className="text-lg font-bold">${totalIns.toFixed(2)}</span></p></div>
        </TabsContent>
      </Tabs>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold">Total: ${(totalMos + totalIns).toFixed(2)}</p>
              <p className="text-xs text-slate-500">{items.length} items ({mosItems.length} MOS + {insItems.length} INS)</p>
            </div>
            {!isReadOnly && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => save(false)} disabled={loading}>
                  <Save className="h-4 w-4 mr-2" /> Guardar Borrador
                </Button>
                <Button onClick={() => save(true)} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                  <Send className="h-4 w-4 mr-2" /> Enviar para Aprobacion
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

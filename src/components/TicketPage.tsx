import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PlusCircle, Activity, Search, RefreshCw, Trash2, Edit, ArrowUpDown, Copy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

// --- Types ---
interface Ticket {
  ticketId: string;
  nama: string;
  kontak: string;
  lokasi: string;
  masalah: string;
  status: 'Pending' | 'In Progress' | 'Done';
  pic: string;
  tanggal: string;
  row?: number;
}

type SubPage = 'create' | 'monitoring';

// --- Helpers ---
function generateTicketId(tickets: Ticket[]): string {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const todayCount = tickets.filter(t => t.ticketId.includes(dateStr)).length;
  return `TKT-${dateStr}-${String(todayCount + 1).padStart(3, '0')}`;
}

function statusColor(s: string) {
  if (s === 'Done') return 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30';
  if (s === 'In Progress') return 'bg-amber-500/15 text-amber-700 border-amber-500/30';
  return 'bg-red-500/15 text-red-700 border-red-500/30';
}

interface TicketPageProps {
  initialPage?: SubPage;
}

const TicketPage: React.FC<TicketPageProps> = ({ initialPage = 'create' }) => {
  const [subPage, setSubPage] = useState<SubPage>(initialPage);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [gasUrl, setGasUrl] = useState('');
  const [gasUrlInput, setGasUrlInput] = useState('');
  const [configOpen, setConfigOpen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { setSubPage(initialPage); }, [initialPage]);

  // Create form
  const [nama, setNama] = useState('');
  const [kontak, setKontak] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [masalah, setMasalah] = useState('');
  const [status, setStatus] = useState<'Pending' | 'In Progress' | 'Done'>('Pending');
  const [pic, setPic] = useState('');
  const [searchCreate, setSearchCreate] = useState('');

  // Monitoring filters
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPic, setFilterPic] = useState('all');
  const [searchMonitor, setSearchMonitor] = useState('');

  // Modals
  const [statusModal, setStatusModal] = useState<Ticket | null>(null);
  const [editModal, setEditModal] = useState<Ticket | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Ticket | null>(null);
  const [modalStatus, setModalStatus] = useState<'Pending' | 'In Progress' | 'Done'>('Pending');
  const [editForm, setEditForm] = useState({ nama: '', kontak: '', lokasi: '', masalah: '', status: 'Pending' as Ticket['status'], pic: '' });

  // --- Load from localStorage on mount ---
  useEffect(() => {
    const saved = localStorage.getItem('tickets');
    if (saved) setTickets(JSON.parse(saved));
    const url = localStorage.getItem('gasUrl');
    if (url) { setGasUrl(url); setGasUrlInput(url); }
  }, []);

  // Save tickets to localStorage
  useEffect(() => {
    localStorage.setItem('tickets', JSON.stringify(tickets));
  }, [tickets]);

  // --- Fetch from GAS ---
  const fetchTickets = useCallback(async () => {
    if (!gasUrl) return;
    try {
      const res = await fetch(`${gasUrl}?action=list`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const mapped: Ticket[] = data.map((r: any, i: number) => ({
            ticketId: r.ticketId || r.ticket_id || `TKT-${i}`,
            nama: r.nama || '', kontak: r.kontak || '', lokasi: r.lokasi || '',
            masalah: r.masalah || '', status: r.status || 'Pending', pic: r.pic || '',
            tanggal: r.tanggal || '', row: r.row ?? i + 2,
          }));
          setTickets(mapped);
          return;
        }
      }
    } catch { /* fallback */ }
  }, [gasUrl]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  // Auto reload every 30s
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchTickets, 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchTickets]);

  // --- Save GAS URL ---
  const saveGasUrl = () => {
    setGasUrl(gasUrlInput);
    localStorage.setItem('gasUrl', gasUrlInput);
    toast.success('URL Apps Script berhasil disimpan');
  };

  // --- Create Ticket ---
  const handleCreate = async () => {
    if (!nama.trim()) { toast.error('Nama Pelanggan wajib diisi'); return; }
    if (!masalah.trim()) { toast.error('Masalah / Gangguan wajib diisi'); return; }

    const ticketId = generateTicketId(tickets);
    const tanggal = new Date().toISOString().split('T')[0];
    const newTicket: Ticket = { ticketId, nama, kontak, lokasi, masalah, status, pic, tanggal };
    const body = { action: 'create', nama, kontak, lokasi, masalah, status, pic };

    let sent = false;
    if (gasUrl) {
      try {
        await fetch(gasUrl, { method: 'POST', body: JSON.stringify(body), mode: 'no-cors' });
        sent = true;
      } catch {
        try {
          const params = new URLSearchParams(body as any);
          await fetch(`${gasUrl}?${params.toString()}`);
          sent = true;
        } catch { /* fallback */ }
      }
    }

    if (!sent) {
      const clipText = `${nama}\t${kontak}\t${lokasi}\t${masalah}\t${status}\t${pic}`;
      navigator.clipboard.writeText(clipText).catch(() => {});
      toast.warning('GAS gagal, data disimpan lokal & di-copy ke clipboard');
    } else {
      toast.success('Ticket berhasil dibuat!');
    }

    setTickets(prev => [newTicket, ...prev]);
    setNama(''); setKontak(''); setLokasi(''); setMasalah(''); setStatus('Pending'); setPic('');
  };

  // --- Update / Edit ---
  const handleUpdateStatus = async () => {
    if (!statusModal) return;
    const body = { action: 'update', row: statusModal.row, nama: statusModal.nama, kontak: statusModal.kontak, lokasi: statusModal.lokasi, masalah: statusModal.masalah, status: modalStatus, pic: statusModal.pic };
    if (gasUrl) { try { await fetch(gasUrl, { method: 'POST', body: JSON.stringify(body), mode: 'no-cors' }); } catch {} }
    setTickets(prev => prev.map(t => t.ticketId === statusModal.ticketId ? { ...t, status: modalStatus } : t));
    setStatusModal(null);
    toast.success('Status diupdate');
    setTimeout(fetchTickets, 2000);
  };

  const handleEdit = async () => {
    if (!editModal) return;
    const body = { action: 'update', row: editModal.row, ...editForm };
    if (gasUrl) { try { await fetch(gasUrl, { method: 'POST', body: JSON.stringify(body), mode: 'no-cors' }); } catch {} }
    setTickets(prev => prev.map(t => t.ticketId === editModal.ticketId ? { ...t, ...editForm } : t));
    setEditModal(null);
    toast.success('Ticket diupdate');
    setTimeout(fetchTickets, 2000);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const body = { action: 'delete', row: deleteConfirm.row };
    if (gasUrl) { try { await fetch(gasUrl, { method: 'POST', body: JSON.stringify(body), mode: 'no-cors' }); } catch {} }
    setTickets(prev => prev.filter(t => t.ticketId !== deleteConfirm.ticketId));
    setDeleteConfirm(null);
    toast.success('Ticket dihapus');
    setTimeout(fetchTickets, 2000);
  };

  // --- Derived data ---
  const stats = useMemo(() => ({
    total: tickets.length,
    done: tickets.filter(t => t.status === 'Done').length,
    pending: tickets.filter(t => t.status === 'Pending').length,
    inProgress: tickets.filter(t => t.status === 'In Progress').length,
  }), [tickets]);

  const picList = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach(t => t.pic.split(',').forEach(p => { const trimmed = p.trim(); if (trimmed) set.add(trimmed); }));
    return Array.from(set).sort();
  }, [tickets]);

  const filteredCreate = useMemo(() => {
    if (!searchCreate) return tickets;
    const q = searchCreate.toLowerCase();
    return tickets.filter(t => t.ticketId.toLowerCase().includes(q) || t.nama.toLowerCase().includes(q) || t.masalah.toLowerCase().includes(q));
  }, [tickets, searchCreate]);

  const filteredMonitor = useMemo(() => {
    let result = tickets;
    if (filterStatus !== 'all') result = result.filter(t => t.status === filterStatus);
    if (filterPic !== 'all') result = result.filter(t => t.pic.split(',').map(p => p.trim()).includes(filterPic));
    if (searchMonitor) {
      const q = searchMonitor.toLowerCase();
      result = result.filter(t =>
        t.ticketId.toLowerCase().includes(q) || t.nama.toLowerCase().includes(q) ||
        t.lokasi.toLowerCase().includes(q) || t.masalah.toLowerCase().includes(q) || t.pic.toLowerCase().includes(q)
      );
    }
    return result;
  }, [tickets, filterStatus, filterPic, searchMonitor]);

  return (
    <div className="space-y-4">
      {subPage === 'create' ? (
        <div className="space-y-4">
          {/* GAS Config */}
          <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full px-4 py-2.5 bg-card border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors">
                <span>⚙️ Konfigurasi Apps Script</span>
                <span className={`text-xs transition-transform ${configOpen ? 'rotate-180' : ''}`}>▼</span>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 p-4 bg-card border border-border rounded-xl space-y-3">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Google Apps Script URL</Label>
                <Input value={gasUrlInput} onChange={e => setGasUrlInput(e.target.value)} placeholder="https://script.google.com/macros/s/xxxxx/exec" className="text-xs" />
                <p className="text-[10px] text-muted-foreground mt-1">Paste URL deployment Apps Script kamu</p>
              </div>
              <Button onClick={saveGasUrl} className="w-full text-xs h-8">Simpan URL</Button>
            </CollapsibleContent>
          </Collapsible>

          {/* Create + Recent */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Create form */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-bold text-foreground">Create Ticket Baru</h3>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1 block">Nama Pelanggan <span className="text-destructive">*</span></Label>
                <Input value={nama} onChange={e => setNama(e.target.value)} placeholder="Nama pelanggan" className="text-xs h-8" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1 block">Kontak</Label>
                  <Input value={kontak} onChange={e => setKontak(e.target.value)} placeholder="No. HP" className="text-xs h-8" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1 block">Lokasi</Label>
                  <Input value={lokasi} onChange={e => setLokasi(e.target.value)} placeholder="Lokasi" className="text-xs h-8" />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1 block">Masalah / Gangguan <span className="text-destructive">*</span></Label>
                <Textarea value={masalah} onChange={e => setMasalah(e.target.value)} placeholder="Deskripsi masalah..." className="text-xs min-h-[60px]" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1 block">Status</Label>
                  <Select value={status} onValueChange={v => setStatus(v as Ticket['status'])}>
                    <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1 block">PIC / Teknisi</Label>
                  <Input value={pic} onChange={e => setPic(e.target.value)} placeholder="Nama PIC (pisah dengan koma)" className="text-xs h-8" />
                </div>
              </div>
              <Button onClick={handleCreate} className="w-full text-xs h-9 font-bold">
                <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Create Ticket
              </Button>
            </div>

            {/* Recent tickets */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">Recent Tickets</h3>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchTickets}>
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input value={searchCreate} onChange={e => setSearchCreate(e.target.value)} placeholder="Search tickets..." className="text-xs h-8 pl-8" />
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {filteredCreate.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">Belum ada ticket.</p>
                ) : filteredCreate.slice(0, 20).map(t => (
                  <div key={t.ticketId} className="p-3 border border-border rounded-lg bg-background hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-mono font-bold text-foreground">{t.ticketId}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusColor(t.status)}`}>{t.status}</span>
                    </div>
                    <p className="text-xs font-semibold text-foreground">{t.nama}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">{t.masalah}</p>
                    <div className="flex gap-3 mt-1.5 text-[10px] text-muted-foreground">
                      {t.lokasi && <span>📍 {t.lokasi}</span>}
                      {t.pic && <span>👤 {t.pic}</span>}
                      {t.tanggal && <span>📅 {t.tanggal}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total Ticket', value: stats.total, color: 'text-primary' },
              { label: 'Done', value: stats.done, color: 'text-emerald-600' },
              { label: 'Pending', value: stats.pending, color: 'text-red-600' },
              { label: 'In Progress', value: stats.inProgress, color: 'text-amber-600' },
            ].map(s => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* === MONITORING CRM === */
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center bg-card border border-border rounded-xl p-3">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px] text-xs h-8"><SelectValue placeholder="Semua Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Done">Done</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPic} onValueChange={setFilterPic}>
              <SelectTrigger className="w-[150px] text-xs h-8"><SelectValue placeholder="Semua PIC" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua PIC</SelectItem>
                {picList.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input value={searchMonitor} onChange={e => setSearchMonitor(e.target.value)} placeholder="Cari ticket ID, nama customer..." className="text-xs h-8 pl-8" />
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={fetchTickets}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
            </Button>
          </div>

          {/* Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-[11px] font-bold">Ticket ID</TableHead>
                    <TableHead className="text-[11px] font-bold">Tanggal</TableHead>
                    <TableHead className="text-[11px] font-bold">Customer</TableHead>
                    <TableHead className="text-[11px] font-bold">Kontak</TableHead>
                    <TableHead className="text-[11px] font-bold">Lokasi</TableHead>
                    <TableHead className="text-[11px] font-bold">Masalah</TableHead>
                    <TableHead className="text-[11px] font-bold">Status</TableHead>
                    <TableHead className="text-[11px] font-bold">PIC</TableHead>
                    <TableHead className="text-[11px] font-bold text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMonitor.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center text-xs text-muted-foreground py-8">Tidak ada data ticket.</TableCell></TableRow>
                  ) : filteredMonitor.map(t => (
                    <TableRow key={t.ticketId} className="hover:bg-muted/30">
                      <TableCell className="text-[11px] font-mono font-bold">{t.ticketId}</TableCell>
                      <TableCell className="text-[11px]">{t.tanggal}</TableCell>
                      <TableCell className="text-[11px] font-medium">{t.nama}</TableCell>
                      <TableCell className="text-[11px]">{t.kontak}</TableCell>
                      <TableCell className="text-[11px]">{t.lokasi}</TableCell>
                      <TableCell className="text-[11px] max-w-[150px]">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block truncate cursor-default">{t.masalah}</span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs text-xs">{t.masalah}</TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusColor(t.status)}`}>{t.status}</span>
                      </TableCell>
                      <TableCell className="text-[11px]">{t.pic}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6"
                                onClick={() => { setStatusModal(t); setModalStatus(t.status); }}>
                                <ArrowUpDown className="w-3 h-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Update Status</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6"
                                onClick={() => { setEditModal(t); setEditForm({ nama: t.nama, kontak: t.kontak, lokasi: t.lokasi, masalah: t.masalah, status: t.status, pic: t.pic }); }}>
                                <Edit className="w-3 h-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={() => setDeleteConfirm(t)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total Tickets', value: stats.total, color: 'text-primary' },
              { label: 'Pending', value: stats.pending, color: 'text-red-600' },
              { label: 'In Progress', value: stats.inProgress, color: 'text-amber-600' },
              { label: 'Done', value: stats.done, color: 'text-emerald-600' },
            ].map(s => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Status Modal */}
      <Dialog open={!!statusModal} onOpenChange={open => !open && setStatusModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Update Status</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {statusModal?.ticketId} — {statusModal?.nama}
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <Label className="text-xs font-semibold mb-1.5 block">Status</Label>
            <Select value={modalStatus} onValueChange={v => setModalStatus(v as Ticket['status'])}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdateStatus} className="text-xs h-8 w-full">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editModal} onOpenChange={open => !open && setEditModal(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">Edit Ticket — {editModal?.ticketId}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">Edit semua field ticket</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-semibold mb-1 block">Nama</Label>
              <Input value={editForm.nama} onChange={e => setEditForm(f => ({ ...f, nama: e.target.value }))} className="text-xs h-8" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-semibold mb-1 block">Kontak</Label>
                <Input value={editForm.kontak} onChange={e => setEditForm(f => ({ ...f, kontak: e.target.value }))} className="text-xs h-8" />
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1 block">Lokasi</Label>
                <Input value={editForm.lokasi} onChange={e => setEditForm(f => ({ ...f, lokasi: e.target.value }))} className="text-xs h-8" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1 block">Masalah</Label>
              <Textarea value={editForm.masalah} onChange={e => setEditForm(f => ({ ...f, masalah: e.target.value }))} className="text-xs min-h-[60px]" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-semibold mb-1 block">Status</Label>
                <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v as Ticket['status'] }))}>
                  <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1 block">PIC</Label>
                <Input value={editForm.pic} onChange={e => setEditForm(f => ({ ...f, pic: e.target.value }))} className="text-xs h-8" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleEdit} className="text-xs h-8 w-full">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={open => !open && setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Konfirmasi Hapus</DialogTitle>
            <DialogDescription className="text-xs">Yakin hapus ticket <strong>{deleteConfirm?.ticketId}</strong>?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="text-xs h-8 flex-1">Batal</Button>
            <Button variant="destructive" onClick={handleDelete} className="text-xs h-8 flex-1">Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TicketPage;

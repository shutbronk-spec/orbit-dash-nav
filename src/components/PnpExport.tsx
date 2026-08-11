import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Download, Upload, RefreshCw, AlertTriangle, ChevronRight, Zap, ArrowRightLeft, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

// --- Types ---
type Mode = 'TETAP' | 'RAPIKAN' | 'SISIP';
type Preset = 'JAMBAN' | 'CIBATU' | 'TUNGGILIS' | 'LPM';

interface RawRow {
  username: string;
  sn: string;
  originalKode: string;
}

interface ProcessedRow {
  no: number;
  idPelanggan: string;
  usernameHasil: string;
  sn: string;
  onuIdLama: number;
  onuIdBaru: number;
  keterangan: string;
}

const MODE_DESC: Record<Mode, string> = {
  TETAP: 'ONU ID tidak diubah. Kode port tetap diganti sesuai input.',
  RAPIKAN: 'Sort by ID Pelanggan, ONU ID diberi nomor urut dari angka Start From.',
  SISIP: 'Upload 2 file — Tambahkan + Tujuan. Sistem cari lubang kosong lalu sisipkan.',
};

const MODE_ICONS: Record<Mode, React.ElementType> = {
  TETAP: Layers,
  RAPIKAN: ArrowRightLeft,
  SISIP: Zap,
};

const PRESETS: Preset[] = ['JAMBAN', 'CIBATU', 'TUNGGILIS', 'LPM'];

// --- Helpers ---
// Kode port = segmen kedua-terakhir dalam username.
// Bisa berupa: huruf+angka (J7, AB76, PT6), HANYA huruf (J, PT), atau HANYA angka (5, 12).
function extractKodePort(username: string): { kode: string; segments: string[] } {
  const parts = username.split('-');
  if (parts.length < 2) return { kode: '', segments: parts };
  const seg = parts[parts.length - 2] || '';
  // Match: letters+digits, OR letters only, OR digits only
  const m = seg.match(/^([A-Za-z]+\d+|[A-Za-z]+|\d+)$/);
  return { kode: m ? m[0].toUpperCase() : '', segments: parts };
}

function extractOnuId(username: string): number {
  const parts = username.split('-');
  const last = parts[parts.length - 1];
  return parseInt(last, 10) || 0;
}

function extractIdPelanggan(username: string): string {
  const parts = username.split('-');
  // First segment that is a pure number or code
  return parts[0] || username;
}

function sortByIdPelanggan(a: RawRow, b: RawRow): number {
  const idA = extractIdPelanggan(a.username);
  const idB = extractIdPelanggan(b.username);
  const numA = parseInt(idA, 10);
  const numB = parseInt(idB, 10);
  if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
  return idA.localeCompare(idB);
}

// Replace kode di segmen kedua-terakhir.
// - kodeLama bisa berupa huruf+angka ("J7"), huruf saja ("J"), atau angka saja ("5").
// - kodeBaru bisa berupa "PT6" (full), "PT" (huruf saja → port lama dipertahankan),
//   atau "6" (angka saja → huruf lama dipertahankan).
function replaceKodeInUsername(username: string, kodeLama: string, kodeBaru: string): string {
  if (!kodeLama || !kodeBaru) return username;
  const parts = username.split('-');
  if (parts.length < 2) return username;
  const idx = parts.length - 2;
  if (parts[idx].toUpperCase() !== kodeLama.toUpperCase()) return username;

  const segMatch = parts[idx].match(/^([A-Za-z]*)(\d*)$/);
  const oldLetters = segMatch?.[1] || '';
  const oldDigits = segMatch?.[2] || '';

  const baruMatch = kodeBaru.match(/^([A-Za-z]*)(\d*)$/);
  const newLetters = baruMatch?.[1] || '';
  const newDigits = baruMatch?.[2] || '';

  // Jika kodeBaru punya huruf+angka atau angka saja → replace penuh (jangan bawa huruf lama).
  // Jika kodeBaru huruf saja → pertahankan angka port lama.
  let replaced: string;
  if (newLetters && newDigits) replaced = newLetters.toUpperCase() + newDigits;
  else if (newDigits) replaced = newDigits;
  else if (newLetters) replaced = newLetters.toUpperCase() + oldDigits;
  else replaced = oldLetters + oldDigits;
  parts[idx] = replaced || kodeBaru.toUpperCase();
  return parts.join('-');
}

function replaceOnuId(username: string, newOnuId: number): string {
  const parts = username.split('-');
  parts[parts.length - 1] = String(newOnuId);
  return parts.join('-');
}

function detectMajorityKode(rows: RawRow[]): string {
  const freq: Record<string, number> = {};
  for (const r of rows) {
    const { kode } = extractKodePort(r.username);
    if (kode) freq[kode] = (freq[kode] || 0) + 1;
  }
  let maxK = '';
  let maxV = 0;
  for (const [k, v] of Object.entries(freq)) {
    if (v > maxV) { maxK = k; maxV = v; }
  }
  return maxK;
}

// --- Component ---
const PnpExport: React.FC = () => {
  const [mode, setMode] = useState<Mode>('TETAP');
  const [startFrom, setStartFrom] = useState(1);
  const [rawRows, setRawRows] = useState<RawRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [fileTujuanName, setFileTujuanName] = useState('');
  const [occupiedIds, setOccupiedIds] = useState<Set<number>>(new Set());
  const [kodeLama, setKodeLama] = useState('');
  const [kodeBaru, setKodeBaru] = useState('');
  const [preset, setPreset] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);
  const fileTujuanRef = useRef<HTMLInputElement>(null);

  // --- Parse main file (Kolom D=username, Kolom J=sn) ---
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      const rows: RawRow[] = [];
      for (let r = range.s.r + 1; r <= range.e.r; r++) {
        const cellD = ws[XLSX.utils.encode_cell({ r, c: 3 })];
        const cellJ = ws[XLSX.utils.encode_cell({ r, c: 9 })];
        const username = String(cellD?.v ?? '').trim();
        const sn = String(cellJ?.v ?? '').trim() || 'ZTEG12345678';
        if (!username) continue;
        const { kode } = extractKodePort(username);
        rows.push({ username, sn, originalKode: kode });
      }
      setRawRows(rows);
      // Auto-detect kode
      const majority = detectMajorityKode(rows);
      setKodeLama(majority);
      toast.success(`${rows.length} baris berhasil dimuat dari ${file.name}`);
    };
    reader.readAsArrayBuffer(file);
  }, []);

  // --- Parse tujuan file (mode SISIP) ---
  // Robust: cari ONU ID dari kolom C (angka), atau dari username (segmen terakhir) di kolom manapun.
  const handleFileTujuan = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileTujuanName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      const ids = new Set<number>();
      for (let r = range.s.r; r <= range.e.r; r++) {
        let found = false;
        // 1) username bergaya "xxx-xxx-KODE-ID"
        for (let c = range.s.c; c <= range.e.c && !found; c++) {
          const raw = String(ws[XLSX.utils.encode_cell({ r, c })]?.v ?? '').trim();
          if (raw.includes('-')) {
            const id = extractOnuId(raw);
            if (id >= 1 && id <= 128) { ids.add(id); found = true; }
          }
        }
        // 2) fallback: kolom C berisi ONU ID langsung
        if (!found) {
          const val = parseInt(String(ws[XLSX.utils.encode_cell({ r, c: 2 })]?.v ?? ''), 10);
          if (!isNaN(val) && val >= 1 && val <= 128) ids.add(val);
        }
      }
      setOccupiedIds(ids);
      if (ids.size === 0) toast.error('Tidak ada ONU ID terdeteksi di file tujuan.');
      else toast.success(`File tujuan: ${ids.size} terisi, ${128 - ids.size} kosong`);
    };
    reader.readAsArrayBuffer(file);
  }, []);

  // --- Load from GAS ---
  const handleLoadGas = useCallback(async () => {
    const gasUrl = localStorage.getItem('gasUrl');
    if (!gasUrl) { toast.error('URL Apps Script belum diset. Atur di menu Ticket.'); return; }
    try {
      const res = await fetch(`${gasUrl}?action=loadOlt`);
      const json = await res.json();
      if (json.status === 'success' && Array.isArray(json.data)) {
        const rows: RawRow[] = json.data
          .filter((d: { username?: string }) => d.username)
          .map((d: { username: string; sn?: string }) => {
            const { kode } = extractKodePort(d.username);
            return { username: d.username, sn: d.sn || 'ZTEG12345678', originalKode: kode };
          });
        setRawRows(rows);
        const majority = detectMajorityKode(rows);
        setKodeLama(majority);
        toast.success(`${rows.length} baris dimuat dari Google Sheet`);
      }
    } catch {
      toast.error('Gagal load dari Google Sheet');
    }
  }, []);

  const handleLoadGasTujuan = useCallback(async () => {
    const gasUrl = localStorage.getItem('gasUrl');
    if (!gasUrl) { toast.error('URL Apps Script belum diset.'); return; }
    try {
      const res = await fetch(`${gasUrl}?action=loadOltTujuan`);
      const json = await res.json();
      const ids = new Set<number>();
      if (Array.isArray(json?.onuIds)) {
        json.onuIds.forEach((n: unknown) => {
          const v = parseInt(String(n), 10);
          if (v >= 1 && v <= 128) ids.add(v);
        });
      }
      if (ids.size === 0 && Array.isArray(json?.data)) {
        json.data.forEach((d: { username?: string; onuId?: number | string }) => {
          const v = d.onuId !== undefined ? parseInt(String(d.onuId), 10) : (d.username ? extractOnuId(d.username) : NaN);
          if (v >= 1 && v <= 128) ids.add(v);
        });
      }
      if (ids.size === 0) { toast.error('Tujuan: tidak ada ONU ID terdeteksi.'); return; }
      setOccupiedIds(ids);
      toast.success(`Tujuan: ${ids.size} terisi, ${128 - ids.size} kosong`);
    } catch {
      toast.error('Gagal load tujuan dari Google Sheet');
    }
  }, []);


  // --- Auto-koreksi info ---
  const majorityKode = useMemo(() => detectMajorityKode(rawRows), [rawRows]);
  const typoCount = useMemo(() => {
    if (!majorityKode) return 0;
    return rawRows.filter(r => {
      const { kode } = extractKodePort(r.username);
      return kode && kode !== majorityKode;
    }).length;
  }, [rawRows, majorityKode]);

  // --- Lubang kosong (SISIP) ---
  const lubangKosong = useMemo(() => {
    const slots: number[] = [];
    for (let i = 1; i <= 128; i++) {
      if (!occupiedIds.has(i)) slots.push(i);
    }
    return slots;
  }, [occupiedIds]);

  // --- Process rows ---
  const processedRows = useMemo((): ProcessedRow[] => {
    if (rawRows.length === 0) return [];

    const sorted = [...rawRows].sort(sortByIdPelanggan);
    const result: ProcessedRow[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const r = sorted[i];
      const onuIdLama = extractOnuId(r.username);
      let username = r.username;
      let keterangan = '';

      // Auto-koreksi typo: ganti seluruh segmen jadi majorityKode
      if (majorityKode) {
        const { kode } = extractKodePort(username);
        if (kode && kode !== majorityKode) {
          const parts = username.split('-');
          const idx = parts.length - 2;
          parts[idx] = majorityKode;
          username = parts.join('-');
          keterangan = `dikoreksi (${kode})`;
        }
      }

      // Ganti kode port manual
      if (kodeLama && kodeBaru) {
        username = replaceKodeInUsername(username, kodeLama, kodeBaru);
      }

      let onuIdBaru = onuIdLama;

      if (mode === 'RAPIKAN') {
        onuIdBaru = startFrom + i;
        username = replaceOnuId(username, onuIdBaru);
      } else if (mode === 'SISIP') {
        if (i < lubangKosong.length) {
          onuIdBaru = lubangKosong[i];
          username = replaceOnuId(username, onuIdBaru);
        } else {
          keterangan = 'slot penuh';
          onuIdBaru = 0;
        }
      }

      result.push({
        no: i + 1,
        idPelanggan: extractIdPelanggan(r.username),
        usernameHasil: username,
        sn: r.sn,
        onuIdLama,
        onuIdBaru,
        keterangan,
      });
    }

    return result;
  }, [rawRows, mode, startFrom, kodeLama, kodeBaru, majorityKode, lubangKosong]);

  // --- Download template ---
  const handleDownload = () => {
    if (processedRows.length === 0) { toast.error('Tidak ada data untuk diunduh.'); return; }
    const wsData = processedRows.map(r => ({ Username: r.usernameHasil, SN: r.sn }));
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const fn = `import_olt_${kodeLama || 'X'}-ke-${kodeBaru || 'Y'}_${mode}.xlsx`;
    XLSX.writeFile(wb, fn);
    toast.success(`File ${fn} berhasil diunduh`);
  };

  // --- Generate config (navigate to batch) ---
  const handleGenerate = () => {
    if (!preset) { toast.error('Pilih preset terlebih dahulu!'); return; }
    if (processedRows.length === 0) { toast.error('Tidak ada data.'); return; }
    // Store processed data + preset for BatchConfig to consume
    const exportData = processedRows.map(r => ({
      Username: r.usernameHasil,
      SN: r.sn,
    }));
    localStorage.setItem('pnp_export_data', JSON.stringify(exportData));
    localStorage.setItem('pnp_export_preset', preset);
    localStorage.setItem('pnp_export_count', String(processedRows.length));
    toast.success(`${processedRows.length} config siap! Pindah ke Batch Config...`);
    // Dispatch custom event for navigation
    window.dispatchEvent(new CustomEvent('navigate', { detail: 'batch-config' }));
  };

  // --- Reset ---
  const handleReset = () => {
    setMode('TETAP');
    setStartFrom(1);
    setRawRows([]);
    setFileName('');
    setFileTujuanName('');
    setOccupiedIds(new Set());
    setKodeLama('');
    setKodeBaru('');
    setPreset('');
    if (fileRef.current) fileRef.current.value = '';
    if (fileTujuanRef.current) fileTujuanRef.current.value = '';
    toast.info('Form direset.');
  };

  const displayRows = processedRows.slice(0, 25);
  const remaining = processedRows.length - 25;

  return (
    <div className="space-y-4">
      {/* STEP 1 — Mode */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">1</div>
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Pilih Mode</h3>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {(['TETAP', 'RAPIKAN', 'SISIP'] as Mode[]).map(m => {
            const Icon = MODE_ICONS[m];
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all
                  ${mode === m
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
              >
                <Icon className="w-4 h-4" />
                {m}
              </button>
            );
          })}
        </div>
        <div className="px-3 py-2 bg-muted/50 rounded-lg text-xs text-muted-foreground border border-border">
          {MODE_DESC[mode]}
        </div>
        {mode === 'RAPIKAN' && (
          <div className="mt-3">
            <Label className="text-xs text-muted-foreground mb-1 block">Start From</Label>
            <Input
              type="number"
              value={startFrom}
              onChange={e => setStartFrom(parseInt(e.target.value, 10) || 1)}
              className="w-32 h-8 text-sm bg-background"
              min={1}
            />
          </div>
        )}
      </div>

      {/* STEP 2 — Upload */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">2</div>
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Upload File Export OLT</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Data diambil dari Kolom D (Username) dan Kolom J (SN).</p>
        <div className="flex gap-2">
          <div
            onClick={() => fileRef.current?.click()}
            className="flex-1 border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
          >
            <Upload className="w-6 h-6 text-muted-foreground mb-1" />
            <span className="text-xs font-medium text-muted-foreground">{fileName || 'Pilih file .xlsx / .xls'}</span>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
          </div>
          <Button variant="outline" size="sm" className="self-center" onClick={handleLoadGas}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Load Sheet1
          </Button>
        </div>

        {mode === 'SISIP' && (
          <div className="mt-3 space-y-2">
            <Label className="text-xs font-medium text-foreground">File Tujuan (OLT yang akan diisi)</Label>
            <div className="flex gap-2">
              <div
                onClick={() => fileTujuanRef.current?.click()}
                className="flex-1 border-2 border-dashed border-border rounded-lg p-3 flex items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
              >
                <Upload className="w-4 h-4 text-muted-foreground mr-2" />
                <span className="text-xs text-muted-foreground">{fileTujuanName || 'Pilih file tujuan'}</span>
                <input ref={fileTujuanRef} type="file" accept=".xlsx,.xls" onChange={handleFileTujuan} className="hidden" />
              </div>
              <Button variant="outline" size="sm" className="self-center" onClick={handleLoadGasTujuan}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Load
              </Button>
            </div>
            {occupiedIds.size > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{occupiedIds.size}</span> terisi, <span className="font-medium text-foreground">{128 - occupiedIds.size}</span> kosong
                </p>
                <p className="text-xs text-muted-foreground">
                  Lubang: {lubangKosong.slice(0, 10).join(', ')}{lubangKosong.length > 10 ? ` ... (+${lubangKosong.length - 10})` : ''}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* STEP 3 — Ganti Kode Port */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">3</div>
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Ganti Kode Port</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              Kode Lama <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0">Auto-Detect</Badge>
            </Label>
            <Input
              value={kodeLama}
              onChange={e => setKodeLama(e.target.value.toUpperCase())}
              placeholder="Contoh: LG1"
              className="h-8 text-sm bg-background"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Kode Baru</Label>
            <Input
              value={kodeBaru}
              onChange={e => setKodeBaru(e.target.value.toUpperCase())}
              placeholder="Contoh: PL2"
              className="h-8 text-sm bg-background"
            />
          </div>
        </div>
        {typoCount > 0 && (
          <div className="mt-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="text-xs text-amber-700">
              Auto-koreksi: {typoCount} username kode berbeda → {majorityKode}
            </span>
          </div>
        )}
      </div>

      {/* Preview Table */}
      {rawRows.length > 0 && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Preview</h3>
              <Badge variant="secondary" className="text-xs">{processedRows.length} data</Badge>
              {processedRows.length > 128 && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1" /> &gt;128
                </Badge>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs w-10">No</TableHead>
                  <TableHead className="text-xs">ID Pelanggan</TableHead>
                  <TableHead className="text-xs">Username Hasil</TableHead>
                  <TableHead className="text-xs">SN</TableHead>
                  <TableHead className="text-xs">ONU ID</TableHead>
                  <TableHead className="text-xs">Keterangan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayRows.map(row => {
                  const changed = row.onuIdLama !== row.onuIdBaru;
                  return (
                    <TableRow key={row.no} className="text-xs">
                      <TableCell className="py-1.5 text-muted-foreground">{row.no}</TableCell>
                      <TableCell className="py-1.5 font-mono">{row.idPelanggan}</TableCell>
                      <TableCell className="py-1.5 font-mono font-medium text-foreground">{row.usernameHasil}</TableCell>
                      <TableCell className="py-1.5 font-mono text-muted-foreground">{row.sn}</TableCell>
                      <TableCell className="py-1.5 font-mono">
                        {changed ? (
                          <span>
                            <span className="text-muted-foreground line-through mr-1">{row.onuIdLama}</span>
                            <ChevronRight className="w-3 h-3 inline text-muted-foreground" />
                            <span className="text-primary font-semibold ml-1">{row.onuIdBaru}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{row.onuIdLama}</span>
                        )}
                      </TableCell>
                      <TableCell className="py-1.5">
                        {row.keterangan === 'slot penuh' ? (
                          <Badge variant="destructive" className="text-[10px]">slot penuh</Badge>
                        ) : row.keterangan ? (
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">{row.keterangan}</Badge>
                            </TooltipTrigger>
                            <TooltipContent>{row.keterangan}</TooltipContent>
                          </Tooltip>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {remaining > 0 && (
            <div className="px-4 py-2 border-t border-border text-center text-xs text-muted-foreground">
              ... dan {remaining} baris lainnya
            </div>
          )}
        </div>
      )}

      {/* STEP 4 — Download / Generate */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">4</div>
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Download / Generate</h3>
        </div>
        <div className="mb-3">
          <Label className="text-xs text-muted-foreground mb-1 block">Preset Lokasi</Label>
          <Select value={preset} onValueChange={setPreset}>
            <SelectTrigger className="h-8 text-sm bg-background">
              <SelectValue placeholder="-- Pilih Preset --" />
            </SelectTrigger>
            <SelectContent>
              {PRESETS.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={processedRows.length === 0}
            className="h-9 text-sm"
          >
            <Download className="w-4 h-4 mr-1.5" /> Download Template Excel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={processedRows.length === 0}
            className="h-9 text-sm bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Zap className="w-4 h-4 mr-1.5" /> Generate Config Langsung
          </Button>
        </div>
        <Button
          variant="ghost"
          onClick={handleReset}
          className="w-full h-8 text-xs text-muted-foreground hover:text-destructive"
        >
          Reset
        </Button>
      </div>
    </div>
  );
};

export default PnpExport;

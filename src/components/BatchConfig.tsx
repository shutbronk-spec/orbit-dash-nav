import React, { useState, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { Copy, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import * as XLSX from 'xlsx';

const TABS = ['JAMBAN', 'CIBATU', 'TUNGGILIS', 'LPM'] as const;
type Tab = typeof TABS[number];

interface BatchSettings {
  vlanPppoe: string;
  vlanHs: string;
  tcont: string;
  gemport: string;
  password: string;
}

const TAB_PRESETS: Record<Tab, BatchSettings> = {
  JAMBAN:    { vlanPppoe: '1000', vlanHs: '200', tcont: 'UP-50M',  gemport: 'DOWN-50M', password: 'korinanet79' },
  CIBATU:    { vlanPppoe: '1001', vlanHs: '200', tcont: 'UP-50M',  gemport: 'DOWN-50M', password: 'korinanet79' },
  TUNGGILIS: { vlanPppoe: '2110', vlanHs: '200', tcont: 'UP-50M',  gemport: 'DOWN-50M', password: 'kalipucang' },
  LPM:       { vlanPppoe: '1002', vlanHs: '200', tcont: 'UP-50M',  gemport: 'DOWN-50M', password: 'korinanet79' },
};

const VLANS_PPPOE = ['1000', '1001', '1002', '2110'];
const VLANS_HS = ['200'];
const TCONTS = ['UP-30M', 'UP-50M', 'UP-100M'];
const GEMPORTS = ['DOWN-30M', 'DOWN-50M', 'DOWN-100M'];
const PASSWORDS = ['korinanet79', 'kalipucang'];

const SLOT_MAP: Record<string, number> = {
  J: 7, T: 4, P: 3, M: 2, F: 5, S: 6,
  LG: 1, PD: 1, PH: 2, L: 2, C: 1, B: 1,
  BM: 1, CH: 2, BR: 2, JT: 2, PT: 1, BT: 2, PL: 1, PS: 2,
  PW: 2,
};

const CODE_MAP: Record<string, number> = {
  D: 2, T: 3, E: 4, K: 5, G: 6, J: 7, P: 8, B: 13, N: 15, Z: 17,
  Q: 18, Y: 19, M: 22, V: 26, U: 27, W: 21, F: 14, X: 16, C: 23,
  A: 28, L: 24, H: 25, S: 11, AA: 29, AB: 31, AC: 32, AD: 33,
  AE: 34, AF: 35, AG: 36, AH: 37, AI: 38, AJ: 39, CA: 41, CB: 42, CC: 43, CD: 44, CE: 45,
  DA: 51, DB: 52, DC: 53, DD: 54, EA: 61, EB: 62, EC: 63,
  ED: 64, EE: 65, EF: 66, EG: 67, EH: 68, EI: 69,
  FA: 71, FB: 72, FC: 73, FD: 74, FE: 75, FF: 76, FG: 77, FH: 78, FI: 79,
};

interface ParsedRow {
  username: string;
  id: string;
  sn: string;
  rack: number;
  slot: number;
  port: number;
  ponId: number;
  ip: string;
}

const TAB_SLOT: Record<Tab, number> = {
  JAMBAN: 2, CIBATU: 3, TUNGGILIS: 2, LPM: 2,
};

function parseRackSlotPort(username: string, tab: Tab): { rack: number; slot: number; port: number; ponId: number } {
  const parts = username.split('-');
  const defaultSlot = TAB_SLOT[tab] ?? 2;
  if (parts.length < 2) return { rack: 1, slot: defaultSlot, port: 1, ponId: 1 };

  const ponId = parseInt(parts[parts.length - 1], 10) || 1;

  // Port = segmen kedua-terakhir.
  const portSeg = parts[parts.length - 2] || '';
  let port = 1;
  if (/^\d+$/.test(portSeg)) {
    port = parseInt(portSeg, 10);
  } else {
    const m = portSeg.match(/^([A-Za-z]+)(\d+)$/);
    if (m) port = parseInt(m[2], 10) || 1;
  }

  // Slot detection — strict:
  //  - HANYA pure-letters (no digit) dengan panjang <= 2 yang exact-match SLOT_MAP
  //  - skip segmen letter+digit (itu kode IP / CODE_MAP, bukan slot)
  //  - skip nama customer (letters > 2 char)
  //  - kalau tidak ada match -> pakai default per tab
  let slot = defaultSlot;
  let slotFound = false;
  for (let i = 0; i < parts.length - 2; i++) {
    const pure = parts[i].match(/^([A-Za-z]+)$/);
    if (!pure) continue; // skip angka murni & letter+digit
    const letters = pure[1].toUpperCase();
    if (letters.length <= 2 && SLOT_MAP[letters] !== undefined) {
      slot = SLOT_MAP[letters];
      slotFound = true;
      break;
    }
  }
  // Kompat lama: kalau portSeg berbentuk huruf+angka (mis. "J7") dan belum ada match
  if (!slotFound) {
    const m = portSeg.match(/^([A-Za-z]+)\d+$/);
    if (m) {
      const letters = m[1].toUpperCase();
      if (letters.length <= 2 && SLOT_MAP[letters] !== undefined) slot = SLOT_MAP[letters];
    }
  }

  return { rack: 1, slot, port, ponId };
}


function calcIpStatic(idOrUsername: string, tab: Tab): string {
  const parts = idOrUsername.split('-');
  const skipIdx = parts.length - 2;

  // 1. Check CODE_MAP first (letter+number like "AB76")
  for (let i = 0; i < parts.length; i++) {
    if (i === skipIdx) continue;
    const seg = parts[i];
    const m = seg.match(/^([A-Za-z]+)(\d+)$/);
    if (m) {
      const code = m[1].toUpperCase();
      const n = parseInt(m[2], 10);
      const mapped = CODE_MAP[code];
      if (mapped !== undefined) return `10.250.${mapped}.${n}`;
    }
  }

  // 2. Then check pure numbers
  for (let i = 0; i < parts.length; i++) {
    if (i === skipIdx) continue;
    const num = parseInt(parts[i], 10);
    if (!isNaN(num) && /^\d+$/.test(parts[i])) {
      if (num >= 1 && num <= 250) {
        if (tab === 'TUNGGILIS') return `10.250.9.${num}`;
        if (tab === 'CIBATU') return `10.250.12.${num}`;
        return `10.250.0.${num}`;
      }
      if (num >= 251 && num <= 500) {
        const sub = parseInt(parts[i + 1], 10);
        if (!isNaN(sub)) return `10.250.1.${sub}`;
        return `10.250.1.${num - 250}`;
      }
    }
  }

  return '10.250.99.99';
}

function parseExcelRows(data: Record<string, unknown>[], tab: Tab): ParsedRow[] {
  const rows: ParsedRow[] = [];
  for (const row of data) {
    const username = String(row['Username'] || row['username'] || '').trim();
    const rawId = String(row['ID'] || row['Id'] || row['No'] || '').trim();
    const id = rawId || username;
    const sn = String(row['SN'] || row['Sn'] || row['serial'] || 'ZTEG12345678').trim();

    if (!username && !rawId) continue;

    const { rack, slot, port, ponId } = parseRackSlotPort(username, tab);
    const ip = calcIpStatic(id || username, tab);

    rows.push({ username: username || id, id, sn: sn || 'ZTEG12345678', rack, slot, port, ponId, ip });
  }
  return rows;
}

function generateBatchScript(rows: ParsedRow[], settings: BatchSettings): string {
  if (rows.length === 0) return '# Upload an Excel file to generate batch CLI script...\n';

  const lines: string[] = ['conf t'];
  for (const r of rows) {
    const olt = `${r.rack}/${r.slot}/${r.port}`;
    const onu = `${olt}:${r.ponId}`;
    lines.push(
      `interface gpon-olt_${olt}`,
      `no onu ${r.ponId}`,
      `onu ${r.ponId} type ZTEG-F609 sn ${r.sn}`,
      `exit`,
      `interface gpon-onu_${onu}`,
      `name ${r.username}`,
      `tcont 1 profile ${settings.tcont}`,
      `tcont 2 profile ${settings.tcont}`,
      `gemport 1 tcont 1`,
      `gemport 1 traffic-limit downstream ${settings.gemport}`,
      `gemport 2 tcont 2`,
      `gemport 2 traffic-limit downstream ${settings.gemport}`,
      `service-port 1 vport 1 user-vlan ${settings.vlanPppoe} vlan ${settings.vlanPppoe}`,
      `service-port 2 vport 1 user-vlan ${settings.vlanHs} vlan ${settings.vlanHs}`,
      `pppoe-intermediate-agent enable vport 1`,
      `exit`,
      `pon-onu-mng gpon-onu_${onu}`,
      `service pppoe gemport 1 vlan ${settings.vlanPppoe}`,
      `service hs gemport 1 vlan ${settings.vlanHs}`,
      `wan-ip 1 mode pppoe username ${r.username} password ${settings.password} vlan-profile PPPOE${settings.vlanPppoe} host 1`,
      `wan-ip 2 mode static ip-profile static ip-address ${r.ip} mask 255.255.0.0 vlan-profile STATIC200 host 2`,
      `security-mgmt 1 state enable mode forward protocol web`,
      `!`,
    );
  }
  lines.push('end', 'wr', '');
  return lines.join('\n');
}

const BatchConfig: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('JAMBAN');
  const [settings, setSettings] = useState<BatchSettings>(TAB_PRESETS['JAMBAN']);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [copied, setCopied] = useState(false);
  const [pnpScript, setPnpScript] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  // --- Load PnP Export data on mount ---
  React.useEffect(() => {
    const raw = localStorage.getItem('pnp_export_data');
    const presetName = localStorage.getItem('pnp_export_preset');
    const count = localStorage.getItem('pnp_export_count');
    if (!raw || !presetName) return;

    try {
      const exportData = JSON.parse(raw) as { Username: string; SN: string }[];
      const preset = presetName as Tab;
      const presetSettings = TAB_PRESETS[preset];
      if (!presetSettings || exportData.length === 0) return;

      // Apply preset
      setActiveTab(preset);
      setSettings(presetSettings);

      // Parse rows using same logic
      const parsed = parseExcelRows(
        exportData.map(d => ({ Username: d.Username, SN: d.SN })),
        preset
      );
      setRows(parsed);

      // Generate script directly
      const script = generateBatchScript(parsed, presetSettings);
      setPnpScript(script);
      setFileName(`PnP Export (${count || exportData.length} rows)`);

      // Clear localStorage
      localStorage.removeItem('pnp_export_data');
      localStorage.removeItem('pnp_export_preset');
      localStorage.removeItem('pnp_export_count');

      // Show success toast
      setTimeout(() => {
        toast.success(`${count || exportData.length} config berhasil di-generate!`);
      }, 300);
    } catch {
      // ignore parse errors
    }
  }, []);

  const updateSetting = (key: keyof BatchSettings, value: string) =>
    setSettings(prev => ({ ...prev, [key]: value }));

  const handleTabSwitch = (tab: Tab) => {
    setActiveTab(tab);
    setSettings(TAB_PRESETS[tab]);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];
      setRows(parseExcelRows(json, activeTab));
    };
    reader.readAsArrayBuffer(file);
  };

  const output = useMemo(() => generateBatchScript(rows, settings), [rows, settings]);

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleClear = () => {
    setRows([]);
    setFileName('');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="w-full">
      {/* Tabs */}
      <div className="flex gap-1 mb-3">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => handleTabSwitch(tab)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-t-lg border border-b-0 transition-colors
              ${activeTab === tab
                ? 'bg-card text-foreground border-border'
                : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Two column layout */}
      <div className="flex gap-3 min-h-[420px]">
        {/* Left: Form */}
        <div className="w-[340px] shrink-0 bg-card border border-border rounded-lg p-4 flex flex-col">
          {/* File Upload */}
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Choose Excel File</p>
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/40 hover:bg-muted/30 transition-colors mb-3"
          >
            <Upload className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-xs font-semibold text-foreground">{fileName || 'CHOOSE EXCEL FILE'}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Format: Username, ID/No, SN</p>
            {rows.length > 0 && (
              <p className="text-[10px] text-primary mt-1 font-medium">{rows.length} rows parsed</p>
            )}
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
          </div>

          {/* Batch Settings */}
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Batch Settings</p>
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">VLAN PPPoE</Label>
                <Select value={settings.vlanPppoe} onValueChange={v => updateSetting('vlanPppoe', v)}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VLANS_PPPOE.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">VLAN HS</Label>
                <Select value={settings.vlanHs} onValueChange={v => updateSetting('vlanHs', v)}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VLANS_HS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">TCONT</Label>
                <Select value={settings.tcont} onValueChange={v => updateSetting('tcont', v)}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TCONTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">GEMPORT</Label>
                <Select value={settings.gemport} onValueChange={v => updateSetting('gemport', v)}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GEMPORTS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Password</Label>
              <Select value={settings.password} onValueChange={v => updateSetting('password', v)}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PASSWORDS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-auto pt-4">
            <Button className="w-full h-9 text-xs font-semibold" onClick={() => {}}>
              Generate Batch
            </Button>
          </div>
        </div>

        {/* Right: Terminal */}
        <div className="flex-1 bg-[hsl(240,20%,10%)] border border-border rounded-lg flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[hsl(0,0%,100%,0.06)]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[hsl(0,0%,100%,0.5)]">Batch Output</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6 text-[hsl(0,0%,100%,0.4)] hover:text-[hsl(0,0%,100%,0.8)] hover:bg-[hsl(0,0%,100%,0.05)]" onClick={handleCopy}>
                <Copy className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-[hsl(0,0%,100%,0.4)] hover:text-destructive hover:bg-[hsl(0,0%,100%,0.05)]" onClick={handleClear}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <div className="flex gap-1.5 px-3 py-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[hsl(0,70%,50%)]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[hsl(45,90%,55%)]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[hsl(120,60%,45%)]" />
          </div>
          <div className="flex-1 px-3 pb-3 overflow-auto">
            <pre className="text-[11px] leading-relaxed font-mono text-[hsl(120,60%,70%)] whitespace-pre-wrap">{output}</pre>
            {copied && <span className="text-[10px] text-primary animate-pulse">Copied to clipboard!</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchConfig;

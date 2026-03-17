import React, { useState, useMemo, useEffect } from 'react';
import { Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const TABS = ['JAMBAN', 'CIBATU', 'TUNGGILIS', 'LPM'] as const;
type Tab = typeof TABS[number];

const TAB_PRESETS: Record<Tab, { vlan: string; tcont: string; gemport: string; password: string }> = {
  JAMBAN:    { vlan: '1000', tcont: 'UP-50M',  gemport: 'DOWN-50M', password: 'korinanet79' },
  CIBATU:    { vlan: '1001', tcont: 'UP-50M',  gemport: 'DOWN-50M', password: 'korinanet79' },
  TUNGGILIS: { vlan: '2110', tcont: 'UP-50M',  gemport: 'DOWN-50M', password: 'kalipucang' },
  LPM:       { vlan: '1002', tcont: 'UP-50M',  gemport: 'DOWN-50M', password: 'korinanet79' },
};

interface FormState {
  userPppoe: string; serialNumber: string; mode: string;
  rack: string; slot: string; port: string; ponId: string;
  ipStatic: string; vlan: string; password: string; tcont: string; gemport: string;
}

const INITIAL_FORM: FormState = {
  userPppoe: '', serialNumber: '', mode: 'pppoe-only', rack: '0', slot: '1', port: '1', ponId: '',
  ipStatic: '', vlan: '1000', password: 'korinanet79', tcont: 'UP-50M', gemport: 'DOWN-50M',
};

const VLANS = ['1000', '1001', '1002', '2110'];
const TCONTS = ['UP-30M', 'UP-50M', 'UP-100M'];
const GEMPORTS = ['DOWN-30M', 'DOWN-50M', 'DOWN-100M'];
const SLOTS = Array.from({ length: 16 }, (_, i) => String(i + 1));

const generateScript = (tab: Tab, f: FormState): string => {
  if (!f.userPppoe && !f.serialNumber) return '# Fill in the form to generate CLI script...\n';
  return [
    `! --- ${tab} Single Config Script ---`,
    `!`,
    `configure terminal`,
    f.serialNumber ? `onu add sn ${f.serialNumber} mode ${f.mode}` : '',
    `interface gpon ${f.rack}/${f.slot}/${f.port}`,
    f.ponId ? `  onu ${f.ponId} profile line auto` : '',
    f.vlan ? `  vlan ${f.vlan}` : '',
    f.userPppoe ? `  pppoe user ${f.userPppoe}` : '',
    f.password ? `  password ${f.password}` : '',
    f.tcont ? `  tcont ${f.tcont}` : '',
    f.gemport ? `  gemport ${f.gemport}` : '',
    f.ipStatic ? `  ip address ${f.ipStatic} auto` : '',
    `  exit`,
    `!`,
    `end`,
    `write memory`,
    '',
  ].filter(Boolean).join('\n');
};

const SingleConfig: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('JAMBAN');
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [copied, setCopied] = useState(false);

  const update = (key: keyof FormState, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleTabSwitch = (tab: Tab) => {
    setActiveTab(tab);
    const preset = TAB_PRESETS[tab];
    setForm(prev => ({ ...prev, ...preset }));
  };

  const output = useMemo(() => generateScript(activeTab, form), [activeTab, form]);

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleClear = () => setForm({ ...INITIAL_FORM, ...TAB_PRESETS[activeTab] });

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
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Main Config</p>
          <div className="space-y-2.5">
            <div>
              <Label className="text-xs">User PPPoE</Label>
              <Input className="h-8 text-xs mt-1" placeholder="username@isp" value={form.userPppoe} onChange={e => update('userPppoe', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Serial Number</Label>
                <Input className="h-8 text-xs mt-1" placeholder="ALCL..." value={form.serialNumber} onChange={e => update('serialNumber', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Mode</Label>
                <Select value={form.mode} onValueChange={v => update('mode', v)}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pppoe-only">PPPoE Only</SelectItem>
                    <SelectItem value="pppoe-voucher">PPPoE + Voucher</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label className="text-xs">Rack</Label>
                <Input className="h-8 text-xs mt-1" value={form.rack} onChange={e => update('rack', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Slot</Label>
                <Select value={form.slot} onValueChange={v => update('slot', v)}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SLOTS.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Port</Label>
                <Select value={form.port} onValueChange={v => update('port', v)}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SLOTS.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">PON ID</Label>
                <Input className="h-8 text-xs mt-1" value={form.ponId} onChange={e => update('ponId', e.target.value)} />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <Label className="text-xs">IP Static</Label>
                <span className="text-[9px] font-bold bg-primary/15 text-primary px-1.5 py-0.5 rounded">AUTO</span>
              </div>
              <Input className="h-8 text-xs mt-1" placeholder="Auto-assigned" value={form.ipStatic} onChange={e => update('ipStatic', e.target.value)} />
            </div>
          </div>

          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-4 mb-2">Advanced</p>
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">VLAN</Label>
                <Select value={form.vlan} onValueChange={v => update('vlan', v)}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VLANS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Password</Label>
                <Input className="h-8 text-xs mt-1" value={form.password} onChange={e => update('password', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">TCONT</Label>
                <Select value={form.tcont} onValueChange={v => update('tcont', v)}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TCONTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">GEMPORT</Label>
                <Select value={form.gemport} onValueChange={v => update('gemport', v)}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GEMPORTS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-4">
            <Button className="w-full h-9 text-xs font-semibold">Generate Config</Button>
          </div>
        </div>

        {/* Right: Terminal */}
        <div className="flex-1 bg-[hsl(240,20%,10%)] border border-border rounded-lg flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[hsl(0,0%,100%,0.06)]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[hsl(0,0%,100%,0.5)]">Output</span>
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

export default SingleConfig;

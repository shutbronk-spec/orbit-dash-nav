import React, { useState, useMemo } from 'react';
import { Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const TABS = ['JAMBAN', 'CIBATU', 'TUNGGILIS', 'LPM'] as const;
type Tab = typeof TABS[number];

interface FormState {
  userPppoe: string;
  serialNumber: string;
  mode: string;
  rack: string;
  slot: string;
  port: string;
  ponId: string;
  ipStatic: string;
  vlan: string;
  password: string;
  tcont: string;
  gemport: string;
}

const INITIAL_FORM: FormState = {
  userPppoe: '', serialNumber: '', mode: 'bridge', rack: '0', slot: '1', port: '0', ponId: '',
  ipStatic: '', vlan: '', password: '', tcont: '1', gemport: '1',
};

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

  const output = useMemo(() => generateScript(activeTab, form), [activeTab, form]);

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleClear = () => setForm(INITIAL_FORM);

  return (
    <div className="w-full">
      {/* Tabs */}
      <div className="flex gap-1 mb-3">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
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
          {/* Group 1: Main Config */}
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
                    <SelectItem value="bridge">Bridge</SelectItem>
                    <SelectItem value="route">Route</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {(['rack', 'slot', 'port', 'ponId'] as const).map(key => (
                <div key={key}>
                  <Label className="text-xs capitalize">{key === 'ponId' ? 'PON ID' : key.charAt(0).toUpperCase() + key.slice(1)}</Label>
                  <Input className="h-8 text-xs mt-1" value={form[key]} onChange={e => update(key, e.target.value)} />
                </div>
              ))}
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <Label className="text-xs">IP Static</Label>
                <span className="text-[9px] font-bold bg-primary/15 text-primary px-1.5 py-0.5 rounded">AUTO</span>
              </div>
              <Input className="h-8 text-xs mt-1" placeholder="Auto-assigned" value={form.ipStatic} onChange={e => update('ipStatic', e.target.value)} />
            </div>
          </div>

          {/* Group 2: Advanced */}
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-4 mb-2">Advanced</p>

          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">VLAN</Label>
                <Input className="h-8 text-xs mt-1" placeholder="100" value={form.vlan} onChange={e => update('vlan', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Password</Label>
                <Input className="h-8 text-xs mt-1" type="password" value={form.password} onChange={e => update('password', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">TCONT</Label>
                <Select value={form.tcont} onValueChange={v => update('tcont', v)}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>TCONT {n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">GEMPORT</Label>
                <Select value={form.gemport} onValueChange={v => update('gemport', v)}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>GEMPORT {n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-4">
            <Button className="w-full h-9 text-xs font-semibold" onClick={() => {}}>
              Generate
            </Button>
          </div>
        </div>

        {/* Right: Terminal */}
        <div className="flex-1 bg-[hsl(240,20%,10%)] border border-border rounded-lg flex flex-col overflow-hidden">
          {/* Terminal header */}
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

          {/* Traffic light dots */}
          <div className="flex gap-1.5 px-3 py-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[hsl(0,70%,50%)]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[hsl(45,90%,55%)]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[hsl(120,60%,45%)]" />
          </div>

          {/* Terminal content */}
          <div className="flex-1 px-3 pb-3 overflow-auto">
            <pre className="text-[11px] leading-relaxed font-mono text-[hsl(120,60%,70%)] whitespace-pre-wrap">{output}</pre>
            {copied && (
              <span className="text-[10px] text-primary animate-pulse">Copied to clipboard!</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SingleConfig;

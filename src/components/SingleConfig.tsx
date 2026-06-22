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
  userPppoe: '', serialNumber: '', mode: 'pppoe-only', rack: '1', slot: '1', port: '1', ponId: '',
  ipStatic: '', vlan: '1000', password: 'korinanet79', tcont: 'UP-50M', gemport: 'DOWN-50M',
};

const VLANS = ['1000', '1001', '1002', '2110'];
const TCONTS = ['UP-30M', 'UP-50M', 'UP-100M'];
const GEMPORTS = ['DOWN-30M', 'DOWN-50M', 'DOWN-100M'];
const SLOTS = Array.from({ length: 16 }, (_, i) => String(i + 1));

const CODE_MAP: Record<string, number> = {
  D:2,T:3,E:4,K:5,G:6,J:7,P:8,B:13,N:15,Z:17,Q:18,Y:19,M:22,V:26,U:27,W:21,F:14,X:16,C:23,
  A:28,L:24,H:25,S:11,AA:29,AB:31,AC:32,AD:33,AE:34,AF:35,AG:36,AH:37,AI:38,AJ:39,
  CA:41,CB:42,CC:43,CD:44,CE:45,DA:51,DB:52,DC:53,DD:54,
  EA:61,EB:62,EC:63,ED:64,EE:65,EF:66,EG:67,EH:68,EI:69,
  FA:71,FB:72,FC:73,FD:74,FE:75,FF:76,FG:77,FH:78,FI:79,
};

const SLOT_MAP: Record<string, number> = {
  J:7,T:4,P:3,M:2,F:5,S:6,LG:1,PD:1,PH:2,L:2,C:1,B:1,
  BM:1,CH:2,BR:2,JT:2,PT:1,BT:2,PL:1,PS:2,PW:2,
};

function calcIpStatic(userPppoe: string, tab: Tab): string {
  if (!userPppoe) return '';
  const parts = userPppoe.split('-');
  const skipIdx = parts.length - 2;

  for (let i = 0; i < parts.length; i++) {
    if (i === skipIdx) continue;
    const seg = parts[i];
    const m = seg.match(/^([A-Za-z]+)(\d+)$/);
    if (m) {
      const code = m[1].toUpperCase();
      const num = parseInt(m[2], 10);
      if (CODE_MAP[code] !== undefined) return `10.250.${CODE_MAP[code]}.${num}`;
    }
  }

  for (let i = 0; i < parts.length; i++) {
    if (i === skipIdx) continue;
    const num = parseInt(parts[i], 10);
    if (!isNaN(num) && /^\d+$/.test(parts[i])) {
      if (num >= 1 && num <= 250) {
        if (tab === 'TUNGGILIS') return `10.250.9.${num}`;
        if (tab === 'CIBATU') return `10.250.12.${num}`;
        return `10.250.0.${num}`;
      }
      if (num >= 251 && num <= 500) return `10.250.1.${num - 250}`;
    }
  }
  return '';
}

function parseRackSlotPortPon(userPppoe: string, tab: Tab): { rack: string; slot: string; port: string; ponId: string } {
  if (!userPppoe) return { rack: '1', slot: '1', port: '1', ponId: '' };
  const parts = userPppoe.split('-');
  if (parts.length < 2) return { rack: '1', slot: '1', port: '1', ponId: '' };

  const last = parts[parts.length - 1];
  const secondLast = parts[parts.length - 2];
  const ponId = /^\d+$/.test(last) ? last : '';

  const m = secondLast.match(/^([A-Za-z]+)(\d+)$/);
  if (m) {
    const code = m[1].toUpperCase();
    const portNum = m[2];
    let slot: number | undefined;
    if ((tab === 'TUNGGILIS' || tab === 'CIBATU') && code === 'P') {
      slot = 1;
    } else {
      slot = SLOT_MAP[code];
    }
    if (slot !== undefined) {
      return { rack: '1', slot: String(slot), port: portNum, ponId };
    }
  }

  if (/^\d+$/.test(secondLast) && /^\d+$/.test(last)) {
    return { rack: '1', slot: '2', port: secondLast, ponId: last };
  }

  return { rack: '1', slot: '1', port: '1', ponId };
}

const generateScript = (tab: Tab, f: FormState): string => {
  if (!f.userPppoe && !f.serialNumber) return '# Fill in the form to generate CLI script...\n';
  const r = f.rack, s = f.slot, p = f.port, pid = f.ponId || '1';
  const onuType = tab === 'TUNGGILIS' ? 'ZTE-F609' : 'ZTEG-F609';
  const sn = f.serialNumber || 'ZTEG12345678';
  const intf = `${r}/${s}/${p}`;

  let script = `conf t

interface gpon-olt_${intf}
no onu ${pid}
onu ${pid} type ${onuType} sn ${sn}
exit

interface gpon-onu_${intf}:${pid}
name ${f.userPppoe}
tcont 1 profile ${f.tcont}
tcont 2 profile ${f.tcont}
gemport 1 tcont 1
gemport 1 traffic-limit downstream ${f.gemport}
gemport 2 tcont 2
gemport 2 traffic-limit downstream ${f.gemport}
service-port 1 vport 1 user-vlan ${f.vlan} vlan ${f.vlan}
service-port 2 vport 1 user-vlan 200 vlan 200`;

  if (f.mode === 'pppoe_hotspot') {
    script += `\nservice-port 3 vport 2 user-vlan 2000 vlan 2000`;
  }

  script += `\npppoe-intermediate-agent enable vport 1
exit

pon-onu-mng gpon-onu_${intf}:${pid}
service pppoe gemport 1 vlan ${f.vlan}
service hs gemport 1 vlan 200`;

  if (f.mode === 'pppoe_hotspot') {
    script += `\nservice hotspot gemport 2 vlan 2000`;
  }

  script += `\nwan-ip 1 mode pppoe username ${f.userPppoe} password ${f.password} vlan-profile PPPOE${f.vlan} host 1
wan-ip 2 mode static ip-profile static ip-address ${f.ipStatic || '10.250.0.1'} mask 255.255.0.0 vlan-profile STATIC200 host 2
security-mgmt 1 state enable mode forward protocol web`;

  if (f.mode === 'pppoe_hotspot') {
    script += `\nvlan port wifi_0/3 mode tag vlan 2000
ssid auth wep wifi_0/3 open-system
ssid ctrl wifi_0/3 name @KORNET-voucher`;
  }

  script += `\nend\nwr`;

  return script;
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
    setForm(prev => {
      const updated = { ...prev, ...preset };
      if (prev.userPppoe) {
        const parsed = parseRackSlotPortPon(prev.userPppoe, tab);
        const ip = calcIpStatic(prev.userPppoe, tab);
        return { ...updated, ...parsed, ipStatic: ip };
      }
      return updated;
    });
  };

  // Auto-fill on userPppoe change
  useEffect(() => {
    if (!form.userPppoe) return;
    const parsed = parseRackSlotPortPon(form.userPppoe, activeTab);
    const ip = calcIpStatic(form.userPppoe, activeTab);
    setForm(prev => ({ ...prev, ...parsed, ipStatic: ip }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.userPppoe, activeTab]);

  const output = useMemo(() => generateScript(activeTab, form), [activeTab, form]);

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleClear = () => setForm({ ...INITIAL_FORM, ...TAB_PRESETS[activeTab] });

  return (
    <div className="w-full">
      <div className="flex gap-1 mb-3">
        {TABS.map(tab => (
          <button key={tab} onClick={() => handleTabSwitch(tab)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-t-lg border border-b-0 transition-colors
              ${activeTab === tab ? 'bg-card text-foreground border-border' : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="flex gap-3 min-h-[420px]">
        <div className="w-[340px] shrink-0 bg-card border border-border rounded-lg p-4 flex flex-col">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Main Config</p>
          <div className="space-y-2.5">
            <div>
              <Label className="text-xs">User PPPoE</Label>
              <Input className={`h-8 text-xs mt-1 ${form.userPppoe.length > 30 ? 'border-destructive focus-visible:ring-destructive' : ''}`} placeholder="username@isp" value={form.userPppoe}
                onChange={e => update('userPppoe', e.target.value)} />
              {form.userPppoe.length > 30 && (
                <p className="text-[10px] text-destructive mt-0.5">⚠ Username melebihi 30 karakter ({form.userPppoe.length}/30)</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Serial Number</Label>
                <Input className="h-8 text-xs mt-1" placeholder="ALCL..." value={form.serialNumber}
                  onChange={e => update('serialNumber', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Mode</Label>
                <Select value={form.mode} onValueChange={v => update('mode', v)}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pppoe-only">PPPoE Only</SelectItem>
                    <SelectItem value="pppoe_hotspot">PPPoE + Hotspot</SelectItem>
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
                  <SelectContent>{SLOTS.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Port</Label>
                <Select value={form.port} onValueChange={v => update('port', v)}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{SLOTS.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
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
              <Input className="h-8 text-xs mt-1" placeholder="Auto-assigned" value={form.ipStatic}
                onChange={e => update('ipStatic', e.target.value)} />
            </div>
          </div>

          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-4 mb-2">Advanced</p>
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">VLAN</Label>
                <Select value={form.vlan} onValueChange={v => update('vlan', v)}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{VLANS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
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
                  <SelectContent>{TCONTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">GEMPORT</Label>
                <Select value={form.gemport} onValueChange={v => update('gemport', v)}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{GEMPORTS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-4 flex gap-2">
            <Button className="flex-1 h-9 text-xs font-semibold" onClick={handleCopy}>
              <Copy className="w-3.5 h-3.5 mr-1.5" />{copied ? 'Copied!' : 'Copy Script'}
            </Button>
            <Button variant="outline" className="h-9 text-xs font-semibold px-3" onClick={handleClear}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

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

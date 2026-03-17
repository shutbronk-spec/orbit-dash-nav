import React from 'react';
import { BookOpen, Info, ChevronDown } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const InfoBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex gap-2.5 p-3 my-3 rounded-lg bg-primary/5 border border-primary/15 text-sm text-foreground">
    <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
    <div>{children}</div>
  </div>
);

const Code: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <code className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono text-foreground">{children}</code>
);

const Steps: React.FC<{ items: React.ReactNode[] }> = ({ items }) => (
  <ol className="space-y-2 pl-0 list-none">
    {items.map((item, i) => (
      <li key={i} className="flex gap-3 text-sm leading-relaxed">
        <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
          {i + 1}
        </span>
        <div className="flex-1">{item}</div>
      </li>
    ))}
  </ol>
);

const GuidePage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Guide & Dokumentasi</h1>
            <p className="text-sm text-muted-foreground">Panduan lengkap penggunaan OLT Config Generator Pro</p>
          </div>
        </div>
      </div>

      {/* Accordion Sections */}
      <Accordion type="single" collapsible defaultValue="single-config" className="space-y-2">
        {/* Section 1 */}
        <AccordionItem value="single-config" className="border border-border rounded-xl overflow-hidden bg-card">
          <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/50 text-base font-semibold">
            Single Config
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            <Steps items={[
              <span>Pilih tab OLT (<Code>JAMBAN</Code> / <Code>CIBATU</Code> / <Code>TUNGGILIS</Code> / <Code>LPM</Code>)
                <br /><span className="text-muted-foreground">→ preset otomatis mengisi VLAN, TCONT, GEMPORT, Password</span></span>,
              <span>Isi <strong>User PPPoE</strong>
                <br /><span className="text-muted-foreground">→ otomatis mengisi: Rack, Slot, Port, PON ID, IP Static</span></span>,
              <span>Isi <strong>Serial Number (SN)</strong></span>,
              <span>Pilih Mode: <Code>PPPoE Only</Code> atau <Code>PPPoE + Voucher</Code></span>,
              <span>Cek <strong>Advanced Config</strong>, ubah jika perlu</span>,
              <span>Klik <strong>Generate Config</strong></span>,
              <span>Script muncul di panel <strong>Output</strong></span>,
              <span>Klik <strong>Copy</strong> untuk salin ke clipboard</span>,
            ]} />
          </AccordionContent>
        </AccordionItem>

        {/* Section 2 */}
        <AccordionItem value="batch-config" className="border border-border rounded-xl overflow-hidden bg-card">
          <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/50 text-base font-semibold">
            Batch Config
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            <Steps items={[
              <span>Pilih <strong>Preset Lokasi</strong> dari dropdown
                <br /><span className="text-muted-foreground">→ preset otomatis mengisi semua Batch Settings</span></span>,
              <span>Download <strong>Template Excel</strong> jika belum punya
                <br /><span className="text-muted-foreground">Format kolom: <Code>Username</Code> | <Code>ID</Code> | <Code>SN</Code></span></span>,
              <span>Upload file Excel (<Code>.xlsx</Code> / <Code>.xls</Code>)</span>,
              <span>Cek <strong>Batch Settings</strong>, ubah jika perlu</span>,
              <span>Klik <strong>Generate Batch</strong></span>,
              <span>Script semua ONU muncul di <strong>terminal output</strong></span>,
              <span>Klik <strong>Copy</strong> untuk salin semua script sekaligus</span>,
            ]} />
          </AccordionContent>
        </AccordionItem>

        {/* Section 3 */}
        <AccordionItem value="pnp-export" className="border border-border rounded-xl overflow-hidden bg-card">
          <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/50 text-base font-semibold">
            PNP Export
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            <Steps items={[
              <span>Pilih <strong>Mode</strong>:
                <br />• <Code>TETAP</Code>: ONU ID tidak berubah
                <br />• <Code>RAPIKAN</Code>: ONU ID diurutkan ulang dari angka Start From
                <br />• <Code>SISIP</Code>: cari slot kosong dari file tujuan, sisipkan di sana</span>,
              <span>Upload file <strong>Export OLT</strong> (Kolom D = Username, Kolom J = SN)
                <br /><span className="text-muted-foreground">ATAU klik <strong>Load Sheet1</strong> untuk ambil dari Google Sheet</span></span>,
              <span>Jika mode <Code>SISIP</Code>: upload juga <strong>File Tujuan</strong></span>,
              <span><strong>Step 3 — Ganti Kode Port</strong> (opsional):
                <br />• Kode Lama auto-detect dari file
                <br />• Isi Kode Baru jika ingin mengganti</span>,
              <span>Cek <strong>Preview Table</strong> — pastikan data benar</span>,
              <span>Pilih <strong>Preset</strong> untuk Generate Config</span>,
              <span>Klik <strong>Download Template Excel</strong> untuk download hasil rapi
                <br /><span className="text-muted-foreground">ATAU klik <strong>Generate Config Langsung</strong> → script otomatis masuk ke halaman Batch Config</span></span>,
            ]} />
          </AccordionContent>
        </AccordionItem>

        {/* Section 4 */}
        <AccordionItem value="create-ticket" className="border border-border rounded-xl overflow-hidden bg-card">
          <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/50 text-base font-semibold">
            Ticket — Create Ticket
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            <Steps items={[
              <span>Setup awal: isi <strong>Google Apps Script URL</strong> di Konfigurasi Apps Script
                <br /><span className="text-muted-foreground">→ paste URL deployment GAS → klik Simpan URL</span></span>,
              <span>Isi form <strong>Create Ticket</strong>:
                <br />• <strong>Nama Pelanggan</strong> (wajib)
                <br />• <strong>Kontak</strong>: nomor HP/WA
                <br />• <strong>Lokasi</strong>: area/lokasi pelanggan
                <br />• <strong>Masalah/Gangguan</strong> (wajib): deskripsi lengkap
                <br />• <strong>Status</strong>: Pending / In Progress / Done
                <br />• <strong>PIC/Teknisi</strong>: nama teknisi, pisah dengan koma jika lebih dari 1</span>,
              <span>Klik <strong>Create Ticket</strong>
                <br /><span className="text-muted-foreground">→ sistem coba kirim ke Google Sheet via GAS</span>
                <br /><span className="text-muted-foreground">→ jika gagal, data disimpan lokal + otomatis copy ke clipboard</span></span>,
              <span>Ticket muncul di <strong>Recent Tickets</strong> (kanan)</span>,
              <span><strong>Stats bar</strong> update otomatis</span>,
            ]} />
          </AccordionContent>
        </AccordionItem>

        {/* Section 5 */}
        <AccordionItem value="monitoring-crm" className="border border-border rounded-xl overflow-hidden bg-card">
          <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/50 text-base font-semibold">
            Ticket — Monitoring CRM
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            <Steps items={[
              <span>Klik tab <strong>Monitoring CRM</strong></span>,
              <span>Klik <strong>Refresh</strong> untuk load ticket dari Google Sheet</span>,
              <span>Gunakan filter:
                <br />• <strong>Filter Status</strong>: Semua / Pending / In Progress / Done
                <br />• <strong>Filter PIC</strong>: filter by nama teknisi
                <br />• <strong>Search</strong>: cari by Ticket ID, nama, lokasi, masalah</span>,
              <span>Actions per ticket:
                <br />• <strong>Update Status</strong> (icon sync): ganti status cepat tanpa buka edit
                <br />• <strong>Edit</strong> (icon edit): ubah semua field ticket
                <br />• <strong>Delete</strong> (icon trash): hapus ticket dengan konfirmasi</span>,
              <span><strong>Stats bar</strong> bawah update realtime sesuai filter aktif</span>,
              <span>Auto-refresh setiap 30 detik jika halaman aktif</span>,
            ]} />
          </AccordionContent>
        </AccordionItem>

        {/* Section 6 */}
        <AccordionItem value="username-format" className="border border-border rounded-xl overflow-hidden bg-card">
          <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/50 text-base font-semibold">
            Format Username & Auto-fill Logic
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-medium mb-1">Format username:</p>
                <Code>{'{ID}-{kode area}-{kode port}{nomor port}-{PON ID}'}</Code>
                <p className="mt-2 text-muted-foreground">Contoh: <Code>4866-AB76-J2-81</Code></p>
              </div>

              <div>
                <p className="font-medium mb-2">Auto-fill yang terjadi saat username diisi:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• <strong className="text-foreground">Rack</strong>: selalu <Code>1</Code></li>
                  <li>• <strong className="text-foreground">Slot</strong>: dari kode port huruf (J→7, T→4, P→3, dst)</li>
                  <li>• <strong className="text-foreground">Port</strong>: angka setelah huruf kode port</li>
                  <li>• <strong className="text-foreground">PON ID</strong>: angka terakhir</li>
                  <li>• <strong className="text-foreground">IP Static</strong>: dari kode area (AB→10.250.31.x, J→10.250.7.x, dst)</li>
                </ul>
              </div>

              <InfoBox>
                <p className="font-medium mb-1">Tabel kode port → slot:</p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-x-4 gap-y-1 font-mono text-xs mt-2">
                  <span>J → 7</span>
                  <span>T → 4</span>
                  <span>P → 3</span>
                  <span>M → 2</span>
                  <span>F → 5</span>
                  <span>S → 6</span>
                  <span>L → 2</span>
                  <span>C → 1</span>
                  <span>B → 1</span>
                </div>
              </InfoBox>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 7 */}
        <AccordionItem value="tips" className="border border-border rounded-xl overflow-hidden bg-card">
          <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/50 text-base font-semibold">
            Tips & Troubleshooting
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            <div className="space-y-3">
              {[
                { problem: 'SN tidak valid', solution: 'Pastikan format 4 huruf + 8 karakter (contoh: ZTEG + 8 char)' },
                { problem: 'IP Static tidak auto-fill', solution: 'Pastikan format username benar sesuai pola {ID}-{kode area}-{kode port}{nomor}-{PON ID}' },
                { problem: 'Ticket tidak terkirim ke Sheet', solution: 'Cek GAS URL, pastikan sudah deploy as web app dengan akses "Anyone"' },
                { problem: 'Batch tidak generate', solution: <>Pastikan kolom Excel sesuai: <Code>Username</Code> | <Code>ID</Code> | <Code>SN</Code></> },
                { problem: 'PNP Export hasil berbeda', solution: <>Cek mode yang dipilih (<Code>TETAP</Code> / <Code>RAPIKAN</Code> / <Code>SISIP</Code>) — masing-masing punya logika ONU ID berbeda</> },
              ].map((item, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-lg bg-muted/50 border border-border text-sm">
                  <span className="text-destructive font-semibold shrink-0">✕</span>
                  <div>
                    <p className="font-medium text-foreground">{item.problem}</p>
                    <p className="text-muted-foreground mt-0.5">{item.solution}</p>
                  </div>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default GuidePage;

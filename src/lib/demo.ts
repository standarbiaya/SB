import type { Item,Rate,Regulation,Document,FAQ,Summary,ItemDetail } from './types';
// SIMULASI UI SAJA. BUKAN BESARAN, KUTIPAN, ATAU REGULASI RESMI.
export const demoItems:Item[] = [
  {id:'DEMO-001',jenis:'SBM',kelompok:'Honorarium',subkelompok:'Kegiatan',nama:'Honorarium Narasumber/Pembahas/Pakar',definisi:'Contoh entri kamus mengenai honorarium dalam kegiatan. Informasi substantif harus diverifikasi terhadap peraturan tahun berkenaan.',satuan:'OJ',status:'Contoh'},
  {id:'DEMO-002',jenis:'SBM',kelompok:'Perjalanan Dinas',subkelompok:'Penginapan',nama:'Biaya Penginapan Perjalanan Dinas',definisi:'Contoh entri biaya penginapan. Besaran resmi dapat bervariasi menurut wilayah dan ketentuan.',satuan:'OH',status:'Contoh'},
  {id:'DEMO-003',jenis:'SBM',kelompok:'Perjalanan Dinas',subkelompok:'Transportasi',nama:'Biaya Transportasi Perjalanan Dinas',definisi:'Contoh entri untuk keperluan pengujian navigasi dan filter.',satuan:'Orang/Kali',status:'Contoh'},
  {id:'DEMO-004',jenis:'SBK',kelompok:'Keluaran',subkelompok:'Kegiatan',nama:'Standar Biaya Keluaran (contoh)',definisi:'Contoh penjelasan sebuah satuan biaya keluaran; bukan nomenklatur resmi.',satuan:'Output',status:'Contoh'},
  {id:'DEMO-005',jenis:'SSB',kelompok:'Struktur Biaya',subkelompok:'Batasan',nama:'Standar Struktur Biaya (contoh)',definisi:'Contoh item standar struktur biaya untuk menguji tampilan portal.',satuan:'Persentase',status:'Contoh'},
  {id:'DEMO-006',jenis:'SBM',kelompok:'Konsumsi',subkelompok:'Rapat',nama:'Konsumsi Rapat (contoh)',definisi:'Contoh item satuan biaya konsumsi rapat untuk demonstrasi antarmuka.',satuan:'Orang/Kali',status:'Contoh'}
];
export const demoRates:Rate[]=[]; // sengaja tanpa nominal simulasi agar tidak dipersepsikan sebagai standar biaya
export const demoRegulations:Regulation[]=[
  {id:'REG-DEMO-1',jenis:'PMK',nomor:'CONTOH',tahun:2026,judul:'Contoh kartu regulasi (isi sumber resmi setelah sinkronisasi)',tanggal_berlaku:'',status:'Contoh',url:''},
  {id:'REG-DEMO-2',jenis:'KMK',nomor:'CONTOH',tahun:2025,judul:'Contoh referensi kebijakan (bukan kutipan resmi)',tanggal_berlaku:'',status:'Contoh',url:''}
];
export const demoDocuments:Document[]=[
  {id:'DOC-DEMO-1',judul:'Pengantar Standar Biaya — Placeholder',kategori:'Paparan',tahun:2026,deskripsi:'Unggah bahan paparan yang telah disetujui untuk publikasi.',drive_file_id:'',status_publikasi:'approved_public'},
  {id:'DOC-DEMO-2',judul:'Pedoman Penggunaan Portal — Placeholder',kategori:'Pedoman',tahun:2026,deskripsi:'Tempat untuk pedoman digital dan referensi umum.',drive_file_id:'',status_publikasi:'approved_public'},
  {id:'DOC-DEMO-3',judul:'Kajian Standar Biaya — Placeholder',kategori:'Kajian',tahun:2026,deskripsi:'Tempat untuk publikasi kajian yang tidak memuat informasi internal.',drive_file_id:'',status_publikasi:'approved_public'}
];
export const demoFaqs:FAQ[]=[
  {id:'F1',pertanyaan:'Apa fungsi kamus standar biaya?',jawaban:'Kamus menyatukan informasi item, satuan, tahun, dasar hukum, dan ketentuan penggunaannya dalam satu tempat.',referensi:'',status:'published'},
  {id:'F2',pertanyaan:'Apakah besaran biaya selalu sama setiap tahun?',jawaban:'Tidak harus. Gunakan filter tahun dan periksa peraturan yang berlaku untuk kegiatan terkait.',referensi:'',status:'published'},
  {id:'F3',pertanyaan:'Dari mana portal memperoleh data?',jawaban:'Pada implementasi production, data terverifikasi disinkronisasi dari Google Sheets dan metadata dokumen dari Google Drive melalui backend.',referensi:'',status:'published'}
];
export const demoSummary:Summary={itemCount:demoItems.length,regulationCount:demoRegulations.length,documentCount:demoDocuments.length,sbmCount:4,sbkCount:1,ssbCount:1,byType:[{name:'SBM',value:4},{name:'SBK',value:1},{name:'SSB',value:1}],byYear:[{year:'2024',count:2},{year:'2025',count:3},{year:'2026',count:6}],updatedAt:null};
export function demoDetail(id:string):ItemDetail|undefined {const item=demoItems.find(x=>x.id===id);return item?{item,rates:[],regulations:[]}:undefined;}

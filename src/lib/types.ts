export type Item = { id:string; jenis:string; kelompok:string; subkelompok:string; nama:string; definisi:string; satuan:string; status:string };
export type Rate = { id:string; item_id:string; tahun:number; wilayah:string; kategori:string; besaran:number; mata_uang:string; ketentuan:string };
export type Regulation = { id:string; jenis:string; nomor:string; tahun:number; judul:string; tanggal_berlaku:string; status:string; url:string };
export type Document = { id:string; judul:string; kategori:string; tahun:number; deskripsi:string; drive_file_id:string; status_publikasi:string };
export type FAQ = { id:string; pertanyaan:string; jawaban:string; referensi:string; status:string };
export type ItemDetail = { item:Item; rates:Rate[]; regulations:(Regulation & {pasal:string;lampiran:string;halaman:string;keterangan:string})[] };
export type Summary = { itemCount:number; regulationCount:number; documentCount:number; sbmCount:number; sbkCount:number; ssbCount:number; byType:{name:string;value:number}[]; byYear:{year:string;count:number}[]; updatedAt:string|null };
export type ApiResult<T> = { data:T; demo?:boolean; total?:number; error?:string };

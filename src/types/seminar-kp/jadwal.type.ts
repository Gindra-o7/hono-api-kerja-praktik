import { status_jadwal } from "../../generated/prisma";

export interface CreateJadwalInput {
  tanggal: Date;
  waktu_mulai: Date;
  waktu_selesai: Date;
  nim: string;
  nama_ruangan: string;
  id_pendaftaran_kp: string;
  nip_penguji: string;
}

export interface UpdateJadwalInput {
  id: string;
  tanggal?: Date;
  waktu_mulai?: Date;
  waktu_selesai?: Date;
  status?: status_jadwal;
  nama_ruangan?: string;
  nip_penguji?: string
}

export interface JadwalWithRelations {
  id: string;
  tanggal: Date | null;
  waktu_mulai: Date | null;
  waktu_selesai: Date | null;
  status: status_jadwal | null;
  nim: string | null;
  nama_ruangan: string | null;
  id_pendaftaran_kp: string | null;
  mahasiswa?: {
    nim: string;
    nama: string;
    email: string;
  } | null;
  pendaftaran_kp?: {
    id: string;
    nip_pembimbing: string | null;
    nip_penguji: string | null;
    dosen_pembimbing?: {
      nip: string;
      nama: string;
    } | null;
    dosen_penguji?: {
      nip: string;
      nama: string;
    } | null;
  } | null;
  ruangan?: {
    nama: string;
  } | null;
}

export interface LogJadwalInput {
  log_type: string;
  tanggal_lama?: Date | null;
  tanggal_baru: Date;
  ruangan_lama?: string | null;
  ruangan_baru: string;
  keterangan: string;
  id_jadwal: string | null;
  nip_penguji_lama?: string | null;
  nip_penguji_baru?: string | null;
}

export interface JadwalSayaParams {
  nip: string;
  tahun_ajaran: number;
}

export interface DataJadwalSeminar {
  id: string;
  mahasiswa: {
    nama: string,
    nim: string,
    semester?: number,
  }
  status_kp: string;
  ruangan: string;
  jam: string;
  tanggal: string;
  dosen_penguji: string;
  dosen_pembimbing: string;
  instansi: string;
  pembimbing_instansi: string;
  status: string
}

export interface JadwalSeminarResponse {
  total_seminar: number;
  total_seminar_minggu_ini: number;
  total_jadwal_ulang: number;
  jadwal: {
    semua: DataJadwalSeminar[],
    minggu_ini: DataJadwalSeminar[],
    hari_ini: DataJadwalSeminar[]
  }
  tahun_ajaran?: {
    id: number;
    nama: string
  }
}
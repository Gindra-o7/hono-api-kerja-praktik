import { format } from "date-fns";
import { id } from "date-fns/locale";
import StepHelper from "./dokumen-step.helper";
import { fromZonedTime } from "date-fns-tz";
import DateHelper from "./date.helper";
import { DataJadwalSeminar } from "../types/seminar-kp/jadwal.type";
import MahasiswaHelper from "./mahasiswa.helper";

export default class JadwalHelper {
  public static hitungMundur(targetDate: Date | null): string | null {
    if (!targetDate) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDateCopy = new Date(targetDate);
    targetDateCopy.setHours(0, 0, 0, 0);

    const diffTime = targetDateCopy.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return "Telah lewat";
    } else if (diffDays === 0) {
      return "Hari ini";
    } else {
      return `H-${diffDays}`;
    }
  }

  public static tambahHitungMundurJadwal(jadwalArray: any[] | null | undefined) {
    if (!jadwalArray || jadwalArray.length === 0) return [];

    return jadwalArray.map((jadwal) => ({
      ...jadwal,
      countdown: this.hitungMundur(jadwal.tanggal),
    }));
  }

  public static formatWaktu(date: Date): string {
    const now = DateHelper.toJakartaTime(new Date())
    const uploadWaktuJakarta = DateHelper.toJakartaTime(date)

    const diffInMilliseconds = now.getTime() - uploadWaktuJakarta.getTime();

    const seconds = Math.floor(diffInMilliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) {
      return `${years} ${years === 1 ? "tahun" : "tahun"} yang lalu`;
    } else if (months > 0) {
      return `${months} ${months === 1 ? "bulan" : "bulan"} yang lalu`;
    } else if (days > 0) {
      return `${days} ${days === 1 ? "hari" : "hari"} yang lalu`;
    } else if (hours > 0) {
      return `${hours} ${hours === 1 ? "jam" : "jam"} yang lalu`;
    } else if (minutes > 0) {
      return `${minutes} ${minutes === 1 ? "menit" : "menit"} yang lalu`;
    } else {
      return `${seconds} ${seconds === 1 ? "detik" : "detik"} yang lalu`;
    }
  }

  public static async isEligibleForScheduling(id_pendaftaran_kp: string): Promise<boolean> {
    return await StepHelper.validasiStepDokumen(1, id_pendaftaran_kp);
  }

  public static formatJadwalData(jadwal: any, mahasiswaDinilaiMap: Record<string, boolean>) {
    const nim = jadwal.pendaftaran_kp?.mahasiswa?.nim;
    const isPenilaianCompleted = nim ? !!mahasiswaDinilaiMap[nim] : false;

    const semester = MahasiswaHelper.getSemesterByNIM(nim)

    const tanggalJkt = jadwal.tanggal ? DateHelper.toJakartaTime(new Date(jadwal.tanggal)) : null
    const waktuMulaiJkt = jadwal.waktu_mulai ? DateHelper.toJakartaTime(new Date(jadwal.waktu_mulai)) : null
    const waktuSelesaiJkt = jadwal.waktu_selesai ? DateHelper.toJakartaTime(new Date(jadwal.waktu_selesai)) : null

    return {
      id: jadwal.id,
      nim: nim || "-",
      nama: jadwal.pendaftaran_kp?.mahasiswa?.nama || "-",
      ruangan: jadwal.ruangan?.nama || "-",
      tanggal: tanggalJkt ? format(tanggalJkt, "EEEE, MMMM dd yyyy", { locale: id }) : "-",
      waktu_mulai: waktuMulaiJkt ? format(waktuMulaiJkt, "HH:mm") : "-",
      waktu_selesai: waktuSelesaiJkt? format(waktuSelesaiJkt, "HH:mm") : "-",
      status: isPenilaianCompleted ? "Dinilai" : "Belum Dinilai",
      semester: semester || "-",
      dosen_pembimbing: jadwal.pendaftaran_kp?.dosen_pembimbing?.nama || "-",
      pembimbing_instansi: jadwal.pendaftaran_kp?.pembimbing_instansi?.nama || "-",
      judul_kp: jadwal.pendaftaran_kp?.judul_kp || "-",
      lokasi_kp: jadwal.pendaftaran_kp?.instansi?.nama ? `${jadwal.pendaftaran_kp.instansi.nama}, ${jadwal.pendaftaran_kp.instansi.alamat}` : "-",
      status_jadwal: jadwal.status || "-",
      id_nilai: jadwal.nilai?.id || null,
      nilai_penguji: jadwal.nilai?.nilai_penguji || null,
      id_komponen_penilaian_penguji: jadwal.nilai?.komponen_penilaian_penguji?.id || null,
      penguasaan_keilmuan: jadwal.nilai?.komponen_penilaian_penguji?.penguasaan_keilmuan || null,
      kemampuan_presentasi: jadwal.nilai?.komponen_penilaian_penguji?.kemampuan_presentasi || null,
      kesesuaian_urgensi: jadwal.nilai?.komponen_penilaian_penguji?.kesesuaian_urgensi || null,
      catatan_penguji: jadwal.nilai?.komponen_penilaian_penguji?.catatan || null,
      id_pendaftaran_kp: jadwal.pendaftaran_kp?.id || null,
    };
  }

  public static formatTanggal(date: Date): string {
    const waktuJakarta = DateHelper.toJakartaTime(date)

    const hari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const bulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

    const hariName = hari[waktuJakarta.getDay()];
    const tanggal = waktuJakarta.getDate();
    const bulanName = bulan[waktuJakarta.getMonth()];
    const tahun = waktuJakarta.getFullYear();

    return `${hariName}, ${tanggal} ${bulanName} ${tahun}`;
  }

  public static tanggalMingguIni(date: Date): boolean {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return date >= startOfWeek && date <= endOfWeek;
  }

  public static jumlahJadwalMingguIni(jadwalData: any[]): number {
    return jadwalData.filter((jadwal) => jadwal.tanggal && this.tanggalMingguIni(jadwal.tanggal)).length;
  }

  public static parseTanggalString(tanggalStr: string): Date | null {
    if (tanggalStr === "N/A") return null;

    const parts = tanggalStr.split(", ")[1].split(" ");
    const day = parseInt(parts[0]);

    const monthMap: Record<string, number> = {
      Januari: 0,
      Februari: 1,
      Maret: 2,
      April: 3,
      Mei: 4,
      Juni: 5,
      Juli: 6,
      Agustus: 7,
      September: 8,
      Oktober: 9,
      November: 10,
      Desember: 11,
    };

    const month = monthMap[parts[1]];
    const year = parseInt(parts[2]);

    return new Date(year, month, day);
  }

  public static filterJadwalHariIni(jadwalList: DataJadwalSeminar[]): DataJadwalSeminar[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return jadwalList.filter((jadwal) => {
      const jadwalDate = this.parseTanggalString(jadwal.tanggal);
      if (!jadwalDate) return false;

      return jadwalDate.getTime() === today.getTime();
    });
  }

  public static filterJadwalMingguIni(jadwalList: DataJadwalSeminar[]): DataJadwalSeminar[] {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return jadwalList.filter((jadwal) => {
      const jadwalDate = this.parseTanggalString(jadwal.tanggal);
      if (!jadwalDate) return false;

      return jadwalDate >= startOfWeek && jadwalDate <= endOfWeek;
    });
  }
}

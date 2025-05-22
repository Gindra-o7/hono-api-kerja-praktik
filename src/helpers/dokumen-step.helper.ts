import { jenis_dokumen } from "../generated/prisma";
import SeminarKpRepository from "../repositories/seminar-kp.repository";
import JadwalSeminarKPRepository from "../repositories/jadwal.repository";
import { APIError } from "../utils/api-error.util";

const STEP_1: jenis_dokumen[] = [
  jenis_dokumen.SURAT_KETERANGAN_SELESAI_KP, 
  jenis_dokumen.FORM_KEHADIRAN_SEMINAR, 
  jenis_dokumen.LAPORAN_TAMBAHAN_KP
];

const STEP_2: jenis_dokumen[] = [jenis_dokumen.ID_SURAT_UNDANGAN];

const STEP_3: jenis_dokumen[] = [jenis_dokumen.SURAT_UNDANGAN_SEMINAR_KP];

const STEP_5: jenis_dokumen[] = [
  jenis_dokumen.BERITA_ACARA_SEMINAR,
  jenis_dokumen.LEMBAR_PENGESAHAN_KP,
  jenis_dokumen.DAFTAR_HADIR_SEMINAR,
];

export default class StepHelper {
  public static async cekJadwalSelesai(id_pendaftaran_kp: string): Promise<boolean> {
    const jadwal = await JadwalSeminarKPRepository.getJadwalByPendaftaranId(id_pendaftaran_kp);

    if (!jadwal) {
      return false;
    }

    const now = new Date();
    const tanggalJadwal = jadwal.tanggal;

    if (!tanggalJadwal || !jadwal.waktu_selesai) {
      return false;
    }

    const tanggalSelesai = new Date(tanggalJadwal.getFullYear(), tanggalJadwal.getMonth(), tanggalJadwal.getDate(), jadwal.waktu_selesai.getHours(), jadwal.waktu_selesai.getMinutes());

    return now > tanggalSelesai;
  }

  public static async validasiStepDokumen(step: number, id_pendaftaran_kp: string): Promise<boolean> {
    let dokumenList: jenis_dokumen[] = [];
    switch (step) {
      case 1:
        dokumenList = STEP_1;
        break;
      case 2:
        dokumenList = STEP_2;
        break;
      case 3:
        dokumenList = STEP_3;
        break;
      case 5:
        dokumenList = STEP_5;
        break;
      default:
        return false;
    }

    for (const jenisDokumen of dokumenList) {
      const dokumen = await SeminarKpRepository.getDokumenSeminarKPByJenisAndPendaftaranId(jenisDokumen, id_pendaftaran_kp);
      if (!dokumen || dokumen.status !== "Divalidasi") {
        return false;
      }
    }

    return true;
  }

  public static async validasiStepAksesDokumen(jenis: jenis_dokumen, id_pendaftaran_kp: string): Promise<void> {
    let currentStep = 1;

    if (STEP_2.includes(jenis)) {
      currentStep = 2;
      if (!(await this.validasiStepDokumen(1, id_pendaftaran_kp))) {
        throw new APIError("Waduh, Berkas Pendaftaran kamu belum divalidasi nih! 😭", 403);
      }
    } else if (STEP_3.includes(jenis)) {
      currentStep = 3;
      if (!(await this.validasiStepDokumen(2, id_pendaftaran_kp))) {
        throw new APIError("Waduh, ID Surat Undangan kamu belum divalidasi nih! 😭", 403);
      }
    } else if (STEP_5.includes(jenis)) {
      currentStep = 5;
      if (!(await this.validasiStepDokumen(3, id_pendaftaran_kp))) {
        throw new APIError("Waduh, Surat Undangan kamu belum divalidasi nih! 😭", 403);
      }

      if (!(await this.cekJadwalSelesai(id_pendaftaran_kp))) {
        throw new APIError("Waduh, Seminar KP kamu selesai nih! 😭", 403);
      }
    }
  }

  public static async stepAkses(step: number, id_pendaftaran_kp: string): Promise<boolean> {
    if (step === 1) {
      return true;
    }

    if (step === 6) {
      const isValidStep3 = await this.validasiStepDokumen(3, id_pendaftaran_kp);
      const isValidStep5 = await this.validasiStepDokumen(5, id_pendaftaran_kp)
      const isJadwalSelesai = await this.cekJadwalSelesai(id_pendaftaran_kp)

      return isValidStep3 && isValidStep5 && isJadwalSelesai;
    }

    if (step === 5) {
      const isValidStep3 = await this.validasiStepDokumen(3, id_pendaftaran_kp);

      const isJadwalSelesai = await this.cekJadwalSelesai(id_pendaftaran_kp);

      return isValidStep3 && isJadwalSelesai;
    }

    if (step > 1) {
      const isValid = await this.validasiStepDokumen(step - 1, id_pendaftaran_kp);
      return isValid === true;
    }

    return false;
  }

  public static getStepForDokumen(jenis: jenis_dokumen): number {
    if (STEP_1.includes(jenis)) {
      return 1;
    } else if (STEP_2.includes(jenis)) {
      return 2;
    } else if (STEP_3.includes(jenis)) {
      return 3;
    } else if (STEP_5.includes(jenis)) {
      return 5;
    }

    return 0;
  }

  public static async mapPathToJenisDokumen(path: string): Promise<jenis_dokumen | null> {
    const mapping: Record<string, jenis_dokumen> = {
      //pendaftaran-step1
      "surat-keterangan-selesai-kp": jenis_dokumen.SURAT_KETERANGAN_SELESAI_KP,
      "laporan-tambahan-kp": jenis_dokumen.LAPORAN_TAMBAHAN_KP,
      "form-kehadiran-seminar": jenis_dokumen.FORM_KEHADIRAN_SEMINAR,
      
      //pendaftaran-step2
      "id-surat-undangan": jenis_dokumen.ID_SURAT_UNDANGAN,
      
      //pendaftaran-step3
      "surat-undangan-seminar-kp": jenis_dokumen.SURAT_UNDANGAN_SEMINAR_KP,
      
      //pasca-seminar-step5
      "berita-acara-seminar": jenis_dokumen.BERITA_ACARA_SEMINAR,
      "daftar-hadir-seminar": jenis_dokumen.DAFTAR_HADIR_SEMINAR,
      "lembar-pengesahan-kp": jenis_dokumen.LEMBAR_PENGESAHAN_KP,
      "revisi-laporan-tambahan": jenis_dokumen.REVISI_LAPORAN_TAMBAHAN,
      "sistem-kp-final": jenis_dokumen.SISTEM_KP_FINAL,
    };

    return mapping[path] || null;
  }

  public static async getNamaDokumen(jenis: jenis_dokumen): Promise<string> {
    const names: Record<jenis_dokumen, string> = {
      [jenis_dokumen.SURAT_KETERANGAN_SELESAI_KP]: "Surat Keterangan Selesai KP",
      [jenis_dokumen.LAPORAN_TAMBAHAN_KP]: "Laporan Tambahan KP",
      [jenis_dokumen.FORM_KEHADIRAN_SEMINAR]: "Form Kehadiran Seminar",
      [jenis_dokumen.ID_SURAT_UNDANGAN]: "ID Surat Undangan",
      [jenis_dokumen.SURAT_UNDANGAN_SEMINAR_KP]: "Surat Undangan Seminar KP",
      [jenis_dokumen.BERITA_ACARA_SEMINAR]: "Berita Acara Seminar",
      [jenis_dokumen.DAFTAR_HADIR_SEMINAR]: "Daftar Hadir Seminar",
      [jenis_dokumen.LEMBAR_PENGESAHAN_KP]: "Lembar Pengesahan KP",
      [jenis_dokumen.REVISI_LAPORAN_TAMBAHAN]: "Revisi Laporan Tambahan",
      [jenis_dokumen.SISTEM_KP_FINAL]: "Sistem KP Final",
    };

    return names[jenis];
  }

  public static getCurrentStep(documents: any[]): number {
    const steps = documents.map((doc) => this.getStepForDokumen(doc.jenis_dokumen as jenis_dokumen)).filter((step) => step !== undefined);

    if (steps.length === 0) return 1;

    const maxStep = Math.max(...steps);
    for (let step = maxStep; step >= 1; step--) {
      const docsInStep = documents.filter((doc) => this.getStepForDokumen(doc.jenis_dokumen as jenis_dokumen) === step);

      const allValidated = docsInStep.every((doc) => doc.status === "Divalidasi");
      if (allValidated) {
        return step + 1 <= 5 ? step + 1 : 5;
      }

      if (docsInStep.length > 0) {
        return step;
      }
    }

    return 1;
  }
}

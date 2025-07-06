import { jenis_dokumen } from "../generated/prisma";
import MahasiswaRepository from "../repositories/mahasiswa.repository";
import SeminarKpRepository from "../repositories/seminar-kp.repository";
import { CreateDokumenSeminarKPInput } from "../types/seminar-kp/dokumen.type";
import { APIError } from "../utils/api-error.util";
import StepHelper from "../helpers/dokumen-step.helper";
import JadwalHelper from "../helpers/jadwal.helper";
import MahasiswaHelper from "../helpers/mahasiswa.helper";
import MahasiswaService from "./mahasiswa.service";
import JadwalRepository from "../repositories/jadwal.repository";
import prisma from "../infrastructures/db.infrastructure";
import { validateLinkPath } from "../validators/dokumen.validator";
import NilaiHelper from "../helpers/nilai.helper";

export default class SeminarKpService {
  public static async postDokumenSeminarKp(email: string, jenis_dokumen: jenis_dokumen, input: CreateDokumenSeminarKPInput) {
    const validasiError = validateLinkPath(input.link_path, jenis_dokumen);
    if (validasiError) {
      throw new APIError(validasiError, 400);
    }

    const { nim } = await MahasiswaRepository.findNIMByEmail(email);
    if (!nim) {
      throw new APIError(`Waduh, mahasiswa tidak ditemukan! 😭`, 404);
    }

    const validasiPersyaratan = await MahasiswaService.validasiPersyaratanSeminarKp(nim);
    if (!validasiPersyaratan.semua_syarat_terpenuhi) {
      throw new APIError(`Waduh, anda belum memenuhi persyaratan untuk mengupload dokumen seminar KP! 😭`, 403);
    }

    await StepHelper.validasiStepAksesDokumen(jenis_dokumen, input.id_pendaftaran_kp);

    const existingDokumen = await SeminarKpRepository.getDokumenSeminarKPByJenisAndPendaftaranId(jenis_dokumen, input.id_pendaftaran_kp);

    if (existingDokumen) {
      return await SeminarKpRepository.updateDokumenSeminarKP(existingDokumen.id, {
        link_path: input.link_path,
        status: "Terkirim",
      });
    }

    const dokumen = await SeminarKpRepository.createDokumen(jenis_dokumen, input);

    return {
      dokumen,
      message: `Dokumen anda berhasil terkirim! Silahkan menunggu validasi dari koordinator KP.`,
    };
  }

  public static async getDataSeminarKpSaya(email: string) {
    const { nim } = await MahasiswaRepository.findNIMByEmail(email);
    if (!nim) {
      throw new APIError(`Waduh, mahasiswa tidak ditemukan! 😭`, 404);
    }

    const dokumen = await SeminarKpRepository.getDataSeminarKPSaya(nim);
    const validasiPersyaratan = await MahasiswaService.validasiPersyaratanSeminarKp(nim);

    const defaultDokumen = {
      pendaftaran_kp: [],
      dokumen_seminar_kp: [],
      jadwal: [],
      nilai: [],
      nim,
      nama: (await MahasiswaRepository.getNamaByNIM(nim))?.nama || "",
      email,
    };

    const dokumenData = dokumen || defaultDokumen;

    let id_pendaftaran_kp = "";
    if (dokumenData.pendaftaran_kp && dokumenData.pendaftaran_kp.length > 0) {
      id_pendaftaran_kp = dokumenData.pendaftaran_kp[0].id;
    } else if (dokumenData.dokumen_seminar_kp.length > 0) {
      id_pendaftaran_kp = dokumenData.dokumen_seminar_kp[0].id_pendaftaran_kp ?? "";
    }

    const stepInfo = id_pendaftaran_kp
      ? {
          step1_accessible: await StepHelper.stepAkses(1, id_pendaftaran_kp),
          step2_accessible: await StepHelper.stepAkses(2, id_pendaftaran_kp),
          step3_accessible: await StepHelper.stepAkses(3, id_pendaftaran_kp),
          step4_accessible: await StepHelper.stepAkses(4, id_pendaftaran_kp),
          step5_accessible: await StepHelper.stepAkses(5, id_pendaftaran_kp),
          step6_accessible: await StepHelper.stepAkses(6, id_pendaftaran_kp),
        }
      : {
          step1_accessible: false,
          step2_accessible: false,
          step3_accessible: false,
          step4_accessible: false,
          step5_accessible: false,
          step6_accessible: false,
        };

    const dokumensByStep = {
      step1: dokumenData.dokumen_seminar_kp.filter((doc) => StepHelper.getStepForDokumen(doc.jenis_dokumen as jenis_dokumen) === 1),
      step2: dokumenData.dokumen_seminar_kp.filter((doc) => StepHelper.getStepForDokumen(doc.jenis_dokumen as jenis_dokumen) === 2),
      step3: dokumenData.dokumen_seminar_kp.filter((doc) => StepHelper.getStepForDokumen(doc.jenis_dokumen as jenis_dokumen) === 3),
      step5: dokumenData.dokumen_seminar_kp.filter((doc) => StepHelper.getStepForDokumen(doc.jenis_dokumen as jenis_dokumen) === 5),
    };

    const dokumenDenganHitungMundur = {
      jadwal: JadwalHelper.tambahHitungMundurJadwal(dokumenData.jadwal),
    };

    return {
      response: true,
      message: "Berhasil mendapatkan data seminar KP",
      data: {
        persyaratan_seminar_kp: validasiPersyaratan,
        ...dokumenData,
        nilai: dokumenData.nilai.map((n) => ({
          ...n,
          nilai_huruf: NilaiHelper.getNilaiHuruf(n.nilai_akhir),
        })),
        ...dokumenDenganHitungMundur,
        dokumen_seminar_kp: dokumensByStep,
        steps_info: stepInfo,
      },
    };
  }

  public static async getAllDokumenSeminarKP(tahunAjaranId: number = 0) {
    if (tahunAjaranId <= 0) {
      const tahunAjaranSekarang = await JadwalRepository.getTahunAjaran();
      if (!tahunAjaranSekarang) {
        throw new APIError("Tahun ajaran tidak ditemukan!", 404);
      }
      tahunAjaranId = tahunAjaranSekarang.id;
    }

    const allDokumen = await SeminarKpRepository.getAllDokumenSeminarKP(tahunAjaranId);

    if (!allDokumen) {
      throw new APIError(`Dokumen tidak ditemukan`, 404);
    }

    const stats = {
      total_mahasiswa: allDokumen.length,
      status: {
        terkirim: 0,
        divalidasi: 0,
        ditolak: 0,
      },
      step: {
        step1: 0,
        step2: 0,
        step3: 0,
        step4: 0,
        step5: 0,
      },
    };

    const processedData = allDokumen.map((mahasiswa) => {
      let id_pendaftaran_kp = "";
      if (mahasiswa.dokumen_seminar_kp.length > 0) {
        id_pendaftaran_kp = mahasiswa.dokumen_seminar_kp[0].id_pendaftaran_kp ?? "";
      }

      const dokumensByStep = {
        step1: mahasiswa.dokumen_seminar_kp.filter((doc) => StepHelper.getStepForDokumen(doc.jenis_dokumen as jenis_dokumen) === 1),
        step2: mahasiswa.dokumen_seminar_kp.filter((doc) => StepHelper.getStepForDokumen(doc.jenis_dokumen as jenis_dokumen) === 2),
        step3: mahasiswa.dokumen_seminar_kp.filter((doc) => StepHelper.getStepForDokumen(doc.jenis_dokumen as jenis_dokumen) === 3),
        step5: mahasiswa.dokumen_seminar_kp.filter((doc) => StepHelper.getStepForDokumen(doc.jenis_dokumen as jenis_dokumen) === 5),
      };

      const currentStep = StepHelper.getCurrentStep(mahasiswa.dokumen_seminar_kp);

      const currentStepDocs = mahasiswa.dokumen_seminar_kp.filter((doc) => StepHelper.getStepForDokumen(doc.jenis_dokumen as jenis_dokumen) === currentStep);

      const hasDocsInCurrentStep = currentStepDocs.length > 0;

      const hasSubmittedDocs = currentStepDocs.some((doc) => doc.status === "Terkirim");

      if (hasDocsInCurrentStep) {
        stats.step[`step${currentStep}` as keyof typeof stats.step]++;
      } else {
        const previousStep = currentStep > 1 ? currentStep - 1 : 1;
        stats.step[`step${previousStep}` as keyof typeof stats.step]++;
      }

      let latestStatus = "Divalidasi";
      let latestDate = new Date(0);

      const rejectedDocs = currentStepDocs.filter((doc) => doc.status === "Ditolak");
      if (rejectedDocs.length > 0) {
        latestStatus = "Ditolak";
        rejectedDocs.forEach((doc) => {
          if (doc.tanggal_upload && new Date(doc.tanggal_upload) > latestDate) {
            latestDate = new Date(doc.tanggal_upload);
          }
        });
      } else {
        currentStepDocs.forEach((doc) => {
          if (doc.tanggal_upload && new Date(doc.tanggal_upload) > latestDate) {
            latestDate = new Date(doc.tanggal_upload);
            latestStatus = doc.status as string;
          }
        });
      }

      if (latestStatus === "Terkirim") stats.status.terkirim++;
      else if (latestStatus === "Divalidasi") stats.status.divalidasi++;
      else if (latestStatus === "Ditolak") stats.status.ditolak++;

      const lastSubmissionTime =
        mahasiswa.dokumen_seminar_kp.length > 0
          ? JadwalHelper.formatWaktu(
              new Date(
                Math.max(
                  ...mahasiswa.dokumen_seminar_kp
                    .filter((doc) => doc.tanggal_upload)
                    .filter((doc) => doc.tanggal_upload !== null)
                    .map((doc) => new Date(doc.tanggal_upload!).getTime())
                )
              )
            )
          : "Belum ada dokumen";

      return {
        nim: mahasiswa.nim,
        nama: mahasiswa.nama,
        email: mahasiswa.email,
        step_sekarang: hasDocsInCurrentStep ? currentStep : currentStep > 1 ? currentStep - 1 : 1,
        last_status: latestStatus,
        last_submission: lastSubmissionTime,
      };
    });

    const tahunAjaran = await prisma.tahun_ajaran.findUnique({
      where: {
        id: tahunAjaranId,
      },
    });

    return {
      response: true,
      message: "Berhasil mendapatkan seluruh dokumen mahasiswa!",
      data: {
        statistics: stats,
        mahasiswa: processedData,
        tahun_ajaran: {
          id: tahunAjaran?.id || 0,
          nama: tahunAjaran?.nama || "Unknown",
        },
      },
    };
  }

  public static async getDokumenSeminarKPByNIM(nim: string) {
    const mahasiswa = await SeminarKpRepository.getMahasiswaSeminarKPByNIM(nim);

    if (!mahasiswa) {
      throw new APIError(`Mahasiswa dengan NIM ${nim} tidak ditemukan!`, 404);
    }

    if (mahasiswa.dokumen_seminar_kp.length === 0) {
      throw new APIError(`Dokumen untuk mahasiswa dengan NIM ${nim} tidak ditemukan!`, 404);
    }

    const semester = MahasiswaHelper.getSemesterByNIM(nim);

    let id_pendaftaran_kp = "";
    if (mahasiswa.dokumen_seminar_kp.length > 0) {
      id_pendaftaran_kp = mahasiswa.dokumen_seminar_kp[0].id_pendaftaran_kp ?? "";
    }

    const dokumensByStep = {
      step1: mahasiswa.dokumen_seminar_kp.filter((doc) => StepHelper.getStepForDokumen(doc.jenis_dokumen as jenis_dokumen) === 1),
      step2: mahasiswa.dokumen_seminar_kp.filter((doc) => StepHelper.getStepForDokumen(doc.jenis_dokumen as jenis_dokumen) === 2),
      step3: mahasiswa.dokumen_seminar_kp.filter((doc) => StepHelper.getStepForDokumen(doc.jenis_dokumen as jenis_dokumen) === 3),
      step5: mahasiswa.dokumen_seminar_kp.filter((doc) => StepHelper.getStepForDokumen(doc.jenis_dokumen as jenis_dokumen) === 5),
    };

    const { dokumen_seminar_kp, ...data_mahasiswa } = mahasiswa;

    return {
      response: true,
      message: "Berhasil mendapatkan dokumen mahasiswa!",
      data: {
        ...data_mahasiswa,
        semester,
        dokumen: dokumensByStep,
      },
    };
  }

  public static async postTerimaDokumenSeminarKP(id: string, komentar?: string) {
    const dokumen = await SeminarKpRepository.getDokumenSeminarKPById(id);
    if (!dokumen) {
      throw new APIError("Dokumen tidak ditemukan!", 404);
    }

    const validasi = await SeminarKpRepository.updateDokumenSeminarKP(id, {
      status: "Divalidasi",
      komentar,
    });
    return {
      validasi,
      message: `Dokumen berhasil divalidasi!`,
    };
  }

  public static async postTolakDokumenSeminarKP(id: string, komentar: string) {
    const dokumen = await SeminarKpRepository.getDokumenSeminarKPById(id);
    if (!dokumen) {
      throw new APIError("Dokumen tidak ditemukan!", 404);
    }

    const tolak = await SeminarKpRepository.updateDokumenSeminarKP(id, {
      status: "Ditolak",
      komentar,
    });

    return {
      tolak,
      message: `Dokumen berhasil ditolak!`,
    };
  }
}

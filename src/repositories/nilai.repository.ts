import prisma from "../infrastructures/db.infrastructure";
import { APIError } from "../utils/api-error.util";

export default class NilaiRepository {
  public static async createNilaiPenguji(
    id: string, 
    penguasaanKeilmuan: number, 
    kemampuanPresentasi: number, 
    kesesuaianUrgensi: number, 
    catatan: string | null, 
    nilaiPenguji: number, 
    nim: string, 
    nip: string, 
    idJadwalSeminar?: string
  ) {
    const dosen = await prisma.dosen.findUnique({
      where: { nip },
    });

    if (!dosen) {
      throw new APIError(`Waduh, Dosen dengan NIP ${nip} tidak ditemukan! 😭`, 404);
    }

    const pendaftaranKp = await prisma.pendaftaran_kp.findFirst({
      where: {
        nim,
      },
      select: {
        nip_penguji: true,
      },
    });

    if (!pendaftaranKp) {
      throw new APIError(`Waduh, Mahasiswa dengan NIM ${nim} belum mendaftara KP ni! 😭`, 404);
    }

    if (pendaftaranKp.nip_penguji !== nip) {
      throw new APIError(`Waduh, Dosen dengan NIP ${nip} bukan penguji untuk mahasiswa ini! 😭`, 403);
    }

    const existingNilai = await prisma.nilai.findFirst({
      where: { nim },
      include: {
        komponen_penilaian_penguji: true,
      },
    });

    let nilai;

    if (existingNilai) {
      nilai = await prisma.nilai.update({
        where: { id: existingNilai.id },
        data: {
          nilai_penguji: nilaiPenguji,
          nip,
          id_jadwal_seminar: idJadwalSeminar,
        },
      });

      if (existingNilai.komponen_penilaian_penguji) {
        await prisma.komponen_penilaian_penguji.update({
          where: { id_nilai: existingNilai.id },
          data: {
            penguasaan_keilmuan: penguasaanKeilmuan,
            kemampuan_presentasi: kemampuanPresentasi,
            kesesuaian_urgensi: kesesuaianUrgensi,
            catatan,
          },
        });
      } else {
        await prisma.komponen_penilaian_penguji.create({
          data: {
            penguasaan_keilmuan: penguasaanKeilmuan,
            kemampuan_presentasi: kemampuanPresentasi,
            kesesuaian_urgensi: kesesuaianUrgensi,
            catatan,
            id_nilai: nilai.id,
          },
        });
      }
    } else {
      nilai = await prisma.nilai.create({
        data: {
          id,
          nilai_penguji: nilaiPenguji,
          nim,
          nip,
          id_jadwal_seminar: idJadwalSeminar,
        },
      });

      await prisma.komponen_penilaian_penguji.create({
        data: {
          penguasaan_keilmuan: penguasaanKeilmuan,
          kemampuan_presentasi: kemampuanPresentasi,
          kesesuaian_urgensi: kesesuaianUrgensi,
          catatan,
          id_nilai: nilai.id,
        },
      });
    }

    return nilai;
  }

  public static async createNilaiPembimbing(
    id: string, 
    penyelesaianMasalah: number, 
    bimbinganSikap: number, 
    kualitasLaporan: number, 
    catatan: string | null, 
    nilaiPembimbing: number, 
    nim: string, 
    nip: string, 
    idJadwalSeminar?: string) {
    const dosen = await prisma.dosen.findUnique({
      where: { nip },
    });

    if (!dosen) {
      throw new APIError(`Waduh, Dosen dengan NIP ${nip} tidak ditemukan`, 404);
    }

    const pendaftaranKp = await prisma.pendaftaran_kp.findFirst({
      where: {
        nim,
      },
      select: {
        nip_pembimbing: true,
      },
    });

    if (!pendaftaranKp) {
      throw new APIError(`Waduh, Mahasiswa dengan NIM ${nim} belum mendaftara KP ni! 😭`, 404);
    }

    if (pendaftaranKp.nip_pembimbing !== nip) {
      throw new APIError(`Waduh, Dosen dengan NIP ${nip} bukan pembimbing untuk mahasiswa ini! 😭`, 403);
    }

    const existingNilai = await prisma.nilai.findFirst({
      where: { nim },
      include: {
        komponen_penilaian_pembimbing: true,
      },
    });

    let nilai;

    if (existingNilai) {
      nilai = await prisma.nilai.update({
        where: { id: existingNilai.id },
        data: {
          nilai_pembimbing: nilaiPembimbing,
          nip,
          id_jadwal_seminar: idJadwalSeminar,
        },
      });

      if (existingNilai.komponen_penilaian_pembimbing) {
        await prisma.komponen_penilaian_pembimbing.update({
          where: { id_nilai: existingNilai.id },
          data: {
            penyelesaian_masalah: penyelesaianMasalah,
            bimbingan_sikap: bimbinganSikap,
            kualitas_laporan: kualitasLaporan,
            catatan,
          },
        });
      } else {
        await prisma.komponen_penilaian_pembimbing.create({
          data: {
            penyelesaian_masalah: penyelesaianMasalah,
            bimbingan_sikap: bimbinganSikap,
            kualitas_laporan: kualitasLaporan,
            catatan,
            id_nilai: nilai.id,
          },
        });
      }
    } else {
      nilai = await prisma.nilai.create({
        data: {
          id,
          nilai_pembimbing: nilaiPembimbing,
          nim,
          nip,
          id_jadwal_seminar: idJadwalSeminar,
        },
      });

      await prisma.komponen_penilaian_pembimbing.create({
        data: {
          penyelesaian_masalah: penyelesaianMasalah,
          bimbingan_sikap: bimbinganSikap,
          kualitas_laporan: kualitasLaporan,
          catatan,
          id_nilai: nilai.id,
        },
      });
    }

    return nilai;
  }

  public static async getNilaiById(id: string) {
    return prisma.nilai.findUnique({
      where: { id },
      include: {
        dosen: true,
        pembimbing_instansi: true,
        komponen_penilaian_penguji: true,
        komponen_penilaian_pembimbing: true,
        komponen_penilaian_instansi: true,
        mahasiswa: {
          select: {
            nim: true,
            nama: true,
            email: true,
          },
        },
        validasi_nilai: true,
        jadwal_seminar: true,
      },
    });
  }

  public static async updateNilaiAkhir(id: string, nilaiAkhir: number) {
    return prisma.nilai.update({
      where: { id },
      data: {
        nilai_akhir: nilaiAkhir,
      },
    });
  }

  public static async getTahunAjaranSekarang() {
    return prisma.tahun_ajaran.findFirst({
      select: {
        id: true,
        nama: true,
      },
      orderBy: {
        id: "desc",
      },
    });
  }

  public static async getJadwalById(id: string) {
    return prisma.jadwal.findUnique({
      where: { id },
      select: {
        tanggal: true,
        waktu_mulai: true,
        waktu_selesai: true,
        status: true,
      },
    });
  }

  public static async getAllMahasiswaNilai(tahunAjaranId: number = 1) {
    let tahunAjaranSekarang;

    if (tahunAjaranId > 0) {
      tahunAjaranSekarang = await prisma.tahun_ajaran.findUnique({
        where: {
          id: tahunAjaranId,
        },
      });

      if (!tahunAjaranSekarang) {
        throw new APIError(`Waduh, Tahun ajaran tidak ditemukan, 😭`, 404);
      }
    } else {
      tahunAjaranSekarang = await this.getTahunAjaranSekarang();
      if (!tahunAjaranSekarang) {
        throw new APIError(`Waduh, Tahun ajaran tidak ditemukan, 😭`, 404);
      }
    }

    const mahasiswaData = await prisma.mahasiswa.findMany({
      select: {
        nim: true,
        nama: true,
        pendaftaran_kp: {
          where: {
            id_tahun_ajaran: tahunAjaranSekarang.id,
          },
          select: {
            id: true,
            status: true,
            kelas_kp: true,
            instansi: {
              select: {
                nama: true,
              },
            },
            pembimbing_instansi: {
              select: {
                nama: true,
              },
            },
            dosen_pembimbing: {
              select: {
                nama: true,
              },
            },
            dosen_penguji: {
              select: {
                nama: true,
              },
            },
            dokumen_seminar_kp: {
              select: {
                status: true,
              },
            },
          },
        },
        nilai: {
          select: {
            id: true,
            nilai_instansi: true,
            nilai_pembimbing: true,
            nilai_penguji: true,
            nilai_akhir: true,
            komponen_penilaian_instansi: {
              select: {
                deliverables: true,
                ketepatan_waktu: true,
                kedisiplinan: true,
                attitude: true,
                kerjasama_tim: true,
                inisiatif: true,
                masukan: true,
              },
            },
            komponen_penilaian_pembimbing: {
              select: {
                penyelesaian_masalah: true,
                bimbingan_sikap: true,
                kualitas_laporan: true,
                catatan: true,
              },
            },
            komponen_penilaian_penguji: {
              select: {
                penguasaan_keilmuan: true,
                kemampuan_presentasi: true,
                kesesuaian_urgensi: true,
                catatan: true,
              },
            },
          },
        },
      },
    });

    return {
      mahasiswaData,
      tahunAjaran: tahunAjaranSekarang,
    };
  }

  public static async createValidasiNilai(id: string, idNilai: string, isApprove: boolean) {
    return await prisma.validasi_nilai.create({
      data: {
        id,
        id_nilai: idNilai,
        is_approve: isApprove,
        created_at: new Date(),
      },
    });
  }

  public static async updateValidasiNilai(id: string, isApprove: boolean) {
    return await prisma.validasi_nilai.update({
      where: {
        id,
      },
      data: {
        is_approve: isApprove,
        created_at: new Date(),
      },
    });
  }

  public static async getValidasiNilaiById(idNilai: string) {
    return await prisma.validasi_nilai.findUnique({
      where: {
        id_nilai: idNilai,
      },
    });
  }

  public static async findNilaiByJadwalId(jadwal_id: string) {
    const nilai = await prisma.nilai.findFirst({
      where: {
        id_jadwal_seminar: jadwal_id,
      },
      select: {
        nilai_pembimbing: true,
        nilai_penguji: true,
        nilai_instansi: true,
        nilai_akhir: true,
        komponen_penilaian_pembimbing: true,
        komponen_penilaian_penguji: true,
        komponen_penilaian_instansi: true,
        validasi_nilai: true,
      }
    })

    return nilai
  }
}

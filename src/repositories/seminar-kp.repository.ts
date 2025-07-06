import { jenis_dokumen } from "../generated/prisma";
import prisma from "../infrastructures/db.infrastructure";
import { CreateDokumenSeminarKPInput, UpdateDokumenSeminarKPInput, MahasiswaWithDokumen, SeminarKPSaya, DokumenMahasiswa } from "../types/seminar-kp/dokumen.type";

export default class SeminarKpRepository {
  public static async createDokumen(jenis_dokumen: jenis_dokumen, input: CreateDokumenSeminarKPInput) {
    return await prisma.dokumen_seminar_kp.create({
      data: {
        jenis_dokumen: jenis_dokumen,
        link_path: input.link_path,
        nim: input.nim,
        id_pendaftaran_kp: input.id_pendaftaran_kp,
        tanggal_upload: new Date(),
        status: "Terkirim",
      },
    });
  }

  public static async getAllDokumenSeminarKP(tahunAjaranId: number = 0): Promise<MahasiswaWithDokumen[]> {
    return await prisma.mahasiswa.findMany({
      where: {
        dokumen_seminar_kp: {
          some: {},
        },
        pendaftaran_kp: {
          some: {
            id_tahun_ajaran: tahunAjaranId > 0 ? tahunAjaranId : undefined,
          },
        },
      },
      select: {
        nim: true,
        nama: true,
        email: true,
        dokumen_seminar_kp: {
          select: {
            id: true,
            jenis_dokumen: true,
            link_path: true,
            tanggal_upload: true,
            status: true,
            komentar: true,
            id_pendaftaran_kp: true,
          },
        },
        pendaftaran_kp: {
          select: {
            id: true,
            status: true,
            id_tahun_ajaran: true,
            tahun_ajaran: {
              select: {
                id: true,
                nama: true,
              },
            },
          },
        },
      },
    });
  }

  public static async getMahasiswaSeminarKPByNIM(nim: string): Promise<DokumenMahasiswa | null> {
    return await prisma.mahasiswa.findUnique({
      where: {
        nim: nim,
      },
      select: {
        nim: true,
        nama: true,
        email: true,
        dokumen_seminar_kp: {
          select: {
            id: true,
            jenis_dokumen: true,
            link_path: true,
            tanggal_upload: true,
            status: true,
            komentar: true,
            id_pendaftaran_kp: true,
          },
        },
        pendaftaran_kp: {
          select: {
            id: true,
            status: true,
            dosen_pembimbing: {
              select: {
                nip: true,
                nama: true,
              },
            },
            dosen_penguji: {
              select: {
                nip: true,
                nama: true,
              },
            },
            tahun_ajaran: {
              select: {
                id: true,
                nama: true,
              },
            },
            instansi: {
              select: {
                pembimbing_instansi: {
                  select: {
                    nama: true,
                  },
                },
              },
            },
          },
        },
        nilai: {
          select: {
            nilai_instansi: true,
            komponen_penilaian_pembimbing: {
              select: {
                catatan: true,
              },
            },
            komponen_penilaian_penguji: {
              select: {
                catatan: true,
              },
            },
          },
        },
      },
    });
  }

  public static async getDataSeminarKPSaya(nim: string): Promise<SeminarKPSaya | null> {
    const result = await prisma.mahasiswa.findUnique({
      where: {
        nim: nim,
      },
      select: {
        nim: true,
        nama: true,
        email: true,
        pendaftaran_kp: {
          select: {
            id: true,
            judul_kp: true,
            id_instansi: true,
            tanggal_mulai: true,
            tanggal_selesai: true,
            instansi: {
              select: {
                nama: true,
                alamat: true,
              },
            },
            dosen_pembimbing: {
              select: {
                nip: true,
                nama: true,
                no_hp: true,
              },
            },
            dosen_penguji: {
              select: {
                nip: true,
                nama: true,
                no_hp: true,
              },
            },
          },
        },
        dokumen_seminar_kp: {
          select: {
            id: true,
            jenis_dokumen: true,
            link_path: true,
            tanggal_upload: true,
            status: true,
            komentar: true,
            id_pendaftaran_kp: true,
          },
        },
        jadwal: {
          select: {
            id: true,
            tanggal: true,
            waktu_mulai: true,
            waktu_selesai: true,
            status: true,
            ruangan: {
              select: {
                nama: true,
              },
            },
          },
        },
        nilai: {
          select: {
            id: true,
            komponen_penilaian_pembimbing: {
              select: {
                id: true,
                catatan: true,
                bimbingan_sikap: true,
                kualitas_laporan: true,
                penyelesaian_masalah: true,
              },
            },
            komponen_penilaian_penguji: {
              select: {
                id: true,
                catatan: true,
                penguasaan_keilmuan: true,
                kemampuan_presentasi: true,
                kesesuaian_urgensi: true,
              },
            },
            komponen_penilaian_instansi: {
              select: {
                id: true,
                masukan: true,
                deliverables: true,
                ketepatan_waktu: true,
                kedisiplinan: true,
                attitude: true,
                kerjasama_tim: true,
                inisiatif: true,
              }
            },
            nilai_penguji: true,
            nilai_instansi: true,
            nilai_pembimbing: true,
            nilai_akhir: true,
            validasi_nilai: true,
          },
        },
      },
    });

    if (!result) {
      return null;
    }

    const formatNilai = (nilai: number | null): number | null => {
      if (nilai === null || nilai === undefined) return null;
      return parseFloat(parseFloat(nilai.toString()).toFixed(2));
    };

    const formattedNilai = result.nilai.map((nilai) => ({
      ...nilai,
      nilai_penguji: formatNilai(nilai.nilai_penguji),
      nilai_instansi: formatNilai(nilai.nilai_instansi),
      nilai_pembimbing: formatNilai(nilai.nilai_pembimbing),
      nilai_akhir: formatNilai(nilai.nilai_akhir),
    }));

    return {
      ...result,
      nilai: formattedNilai,
    };
  }

  public static async getDokumenSeminarKPById(id: string) {
    return await prisma.dokumen_seminar_kp.findUnique({
      where: {
        id,
      },
    });
  }

  public static async getDokumenSeminarKPByJenisAndPendaftaranId(jenis_dokumen: jenis_dokumen, id_pendaftaran_kp: string) {
    return await prisma.dokumen_seminar_kp.findFirst({
      where: {
        jenis_dokumen: jenis_dokumen,
        id_pendaftaran_kp,
      },
    });
  }

  public static async updateDokumenSeminarKP(id: string, data: UpdateDokumenSeminarKPInput) {
    return await prisma.dokumen_seminar_kp.update({
      where: { id },
      data,
    });
  }

  public static async findNIMByPendaftaranKp(id_pendaftaran_kp: string) {
    if (!id_pendaftaran_kp || id_pendaftaran_kp === "") {
      return null;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id_pendaftaran_kp)) {
      return null;
    }

    return await prisma.pendaftaran_kp.findUnique({
      where: {
        id: id_pendaftaran_kp,
      },
      select: {
        nim: true,
      },
    });
  }
}

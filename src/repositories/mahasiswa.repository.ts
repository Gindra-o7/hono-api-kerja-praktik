import { jenis_dokumen, mahasiswa, status_dokumen } from "../generated/prisma";
import prisma from "../infrastructures/db.infrastructure";
import { FindByEmailParamsInterface, FindByEmailReturnInterface, FindByNIMParamsInterface } from "../types/mahasiswa/repository.type";
import { APIError } from "../utils/api-error.util";

export default class MahasiswaRepository {

    public static async getNamaByNIM(nim: string) {
        return await prisma.mahasiswa.findUnique({
            where: {
                nim: nim
            },
            select: {
                nama: true
            }
        })
    }
    
    public static async findByEmail({email}: FindByEmailParamsInterface): Promise<FindByEmailReturnInterface | null> {
        return await prisma.mahasiswa.findUnique({
            where: {
                email: email
            }
        })
    }

    public static async findByNIM({nim}: FindByNIMParamsInterface): Promise<mahasiswa | null> {
        return await prisma.mahasiswa.findUnique({
            where: {
                nim
            }
        })
    }

    public static async findNIMByEmail(email: string) {
        const result = await prisma.mahasiswa.findUnique({
            where: {
                email: email,
            },
                select: {
                    nim: true,
            },
        });
    
        if (!result) {
            throw new APIError(`Mahasiswa tidak ditemukan!`, 404);
        }
    
        return result;
    }

    public static async getPendaftaranKP(nim: string) {
        const result = await prisma.pendaftaran_kp.findFirst({
            where: {
                nim: nim,
            },
                select: {
                id: true,
                id_instansi: true,
                status: true,
                tanggal_selesai: true,
                email_pembimbing_instansi: true,
                nip_pembimbing: true,
                level_akses: true,
            },
        });
    
        if (!result) {
            throw new APIError(`Mahasiswa belum mendaftar KP nih!`, 404);
        }
        return result;
    }

    public static async countBimbinganByNIM(nim: string) {
        return await prisma.bimbingan.count({
            where: {
                nim: nim
            }
        })
    }

    public static async cekDokumenSeminarKP(nim: string, pendaftaran_id: string) {
        const tipeDokumen: jenis_dokumen[] = [
            jenis_dokumen.SURAT_KETERANGAN_SELESAI_KP,
            jenis_dokumen.LAPORAN_TAMBAHAN_KP,
            jenis_dokumen.FORM_KEHADIRAN_SEMINAR,
            jenis_dokumen.ID_SURAT_UNDANGAN,
            jenis_dokumen.SURAT_UNDANGAN_SEMINAR_KP
        ];

        const dokumen = await prisma.dokumen_seminar_kp.findMany({
            where: {
                nim: nim,
                id_pendaftaran_kp: pendaftaran_id,
                jenis_dokumen: {
                    in: tipeDokumen
                }
            }
        })

        const statusDokumen = tipeDokumen.map(docType => {
            const doc = dokumen.find(d => d.jenis_dokumen === docType);
            return {
                type: docType,
                exists: !!doc,
                validated: doc?.status === status_dokumen.Divalidasi
            }
        })

        const allDokumenDivalidasi = statusDokumen.every(doc => doc.exists && doc.validated);

        return {
            allDokumenDivalidasi,
            statusDokumen
        }
    }

    public static async getJadwalMahasiswa(nim: string, date: Date): Promise<any[]> {
        return prisma.jadwal.findMany({
            where: {
                tanggal: date,
                nim: nim
            },
            include: {
                ruangan: true,
                pendaftaran_kp: true
            }
        })
    }

    public static async getDailyReportsByNIM(nim: string) {
        return prisma.daily_report.findMany({
            where: {
                nim: nim
            },
            select: {
                id: true,
                tanggal_presensi: true,
                status: true
            }
        })
    }

    public static async getNilaiByNIM(nim: string) {
        return prisma.nilai.findFirst({
            where: {
                nim: nim
            },
            select: {
                nilai_instansi: true,
                nilai_pembimbing: true,
                nilai_penguji: true,
                nilai_akhir: true
            }
        })
    }
}
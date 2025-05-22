import { z } from "zod";
import { jenis_dokumen, status_dokumen } from "../generated/prisma";

export const validateLinkPath = (value: string, jenisDokumen: jenis_dokumen) => {
  if (jenisDokumen === jenis_dokumen.ID_SURAT_UNDANGAN) {
    if (value.length > 10) {
      return "ID Surat Undangan tidak boleh lebih dari 10 karakter";
    }
    return null;
  }

  const gdriveLinkRegex = /^https:\/\/drive\.google\.com\/(file\/d\/|drive\/folders\/|open\?id=)([a-zA-Z0-9_-]+)(\/?|\?usp=sharing|\&authuser=0)/;

  if (!gdriveLinkRegex.test(value)) {
    return "Link harus dari Google Drive dengan format yang valid";
  }

  if (!value.includes('usp=sharing') && !value.includes('/view') && !value.includes('/edit')) {
    return "Link Google Drive harus dapat diakses publik (pastikan sudah di-share dengan 'Anyone with the link')";
  }
  
  return null;
};

export const createDokumenSeminarKpSchema = z.object({
  link_path: z
    .string()
    .min(1, "Link/Path tidak boleh kosong")
    .refine((val) => {
      return true;
    }),
  nim: z.string().min(1, "NIM tidak boleh kosong"),
  id_pendaftaran_kp: z.string().uuid("ID pendaftaran KP harus berupa UUID")
});

export const createDokumenSeminarKpWithJenisSchema = (jenis: jenis_dokumen) => z.object({
  link_path: z
    .string()
    .min(1, "Link/Path tidak boleh kosong")
    .refine((val) => {
      const error = validateLinkPath(val, jenis);
      return error === null;
    }, (val) => ({
      message: validateLinkPath(val, jenis) || "Validasi gagal"
    })),
  nim: z.string().min(1, "NIM tidak boleh kosong"),
  id_pendaftaran_kp: z.string().uuid("ID pendaftaran KP harus berupa UUID")
});

export const updateDokumenSeminarKpSchema = z.object({
  link_path: z
    .string()
    .optional(),
  status: z.nativeEnum(status_dokumen).optional(),
  komentar: z.string().max(255).optional(),
});

export const dokumenIdSchema = z.object({
  id: z.string().uuid("ID dokumen harus berupa UUID")
});
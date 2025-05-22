import { Context } from "hono";
import NilaiService from "../services/nilai.service";
import NilaiHelper from "../helpers/nilai.helper";
import { APIError } from "../utils/api-error.util";

export default class NilaiHandler {
  public static async createUpdateNilaiPenguji(c: Context) {
    const body = await c.req.json();

    if (!body.nim) {
      throw new APIError(`NIM mahasiswa wajib diisi`, 400);
    }

    const inputData = {
      penguasaanKeilmuan: body.penguasaanKeilmuan,
      kemampuanPresentasi: body.kemampuanPresentasi,
      kesesuaianUrgensi: body.kesesuaianUrgensi,
      catatan: body.catatan,
      nim: body.nim,
      idJadwalSeminar: body.idJadwalSeminar,
    };

    const result = await NilaiService.createUpdateNilaiPenguji(inputData, body.id);
    return c.json(
      {
        message: "Nilai penguji berhasil disimpan",
        data: result,
      },
      201
    );
  }

  public static async createUpdateNilaiPembimbing(c: Context) {
    const body = await c.req.json();

    if (!body.nim) {
      throw new APIError(`NIM mahasiswa wajib diisi`, 400);
    }

    const inputData = {
      penyelesaianMasalah: body.penyelesaianMasalah,
      bimbinganSikap: body.bimbinganSikap,
      kualitasLaporan: body.kualitasLaporan,
      catatan: body.catatan,
      nim: body.nim,
      idJadwalSeminar: body.idJadwalSeminar,
    };

    const result = await NilaiService.createUpdateNilaiPembimbing(inputData, body.id);
    return c.json(
      {
        message: "Nilai pembimbing berhasil disimpan",
        data: result,
      },
      201
    );
  }

  public static async getNilaiById(c: Context) {
    const id = c.req.param("id");
    const result = await NilaiService.getNilaiById(id);

    if (!result) {
      throw new APIError(`Nilai tidak ditemukan`, 404);
    }

    return c.json({ data: result });
  }

  public static async getAllNilai(c: Context) {
    const { email } = c.get("user");
    if (!email) throw new APIError("Waduh, email kamu kosong cuy! 😭", 404);

    const tahunAjaranIdParam = c.req.query("tahun_ajaran_id");
    const tahunAjaranId = tahunAjaranIdParam ? parseInt(tahunAjaranIdParam) : 0;

    const allNilai = await NilaiService.getAllNilai(tahunAjaranId);
    return c.json(allNilai);
  }

  public static async createValidasiNilai(c: Context) {
    const { email } = c.get("user");
    if (!email) throw new APIError("Waduh, email kamu kosong cuy! 😭", 404);

    const body = await c.req.json();
    const result = await NilaiService.createValidasiNilai(body.idNilai);
    return c.json(result);
  }
}

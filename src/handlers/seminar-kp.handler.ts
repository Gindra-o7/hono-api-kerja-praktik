import { Context } from "hono";
import { jenis_dokumen } from "../generated/prisma";
import { createDokumenSeminarKpSchema, dokumenIdSchema } from "../validators/dokumen.validator";
import { successResponse } from "../helpers/response.helper";
import StepHelper from "../helpers/dokumen-step.helper";
import { APIError } from "../utils/api-error.util";
import SeminarKpService from "../services/seminar-kp.service";

export default class SeminarKPHandler {
  public static async postDokumenSeminarKP(c: Context, jenis: jenis_dokumen) {
    const { email } = c.get("user");
    if (!email) throw new APIError(`Email kosong!`, 404);

    const body = await c.req.json();

    const validatedData = createDokumenSeminarKpSchema.parse(body);

    const dokumen = await SeminarKpService.postDokumenSeminarKp(email, jenis, validatedData);
    return c.json(dokumen);
  }

  public static async getDokumenSeminarKPSaya(c: Context) {
    const { email } = c.get("user");
    if (!email) throw new APIError(`Email kosong!`, 404);

    return c.json(await SeminarKpService.getDataSeminarKpSaya(email));
  }

  public static async getAllDokumenSeminarKP(c: Context) {
    const { email } = c.get("user");
    if (!email) throw new APIError(`Email kosong!`, 404);

    const tahunAjaranIdParam = c.req.query("tahun_ajaran_id");
    const tahunAjaranId = tahunAjaranIdParam ? parseInt(tahunAjaranIdParam) : 0;

    const allDokumen = await SeminarKpService.getAllDokumenSeminarKP(tahunAjaranId);

    return c.json(allDokumen);
  }

  public static async getDokumenSeminarKPByNIM(c: Context) {
    const nim = c.req.param("nim");
    if (!nim) {
      throw new APIError(`Email kosong!`, 400);
    }

    return c.json(await SeminarKpService.getDokumenSeminarKPByNIM(nim));
  }

  public static async postTerimaDokumenSeminarKP(c: Context) {
    const { email } = c.get("user");
    if (!email) throw new APIError(`Email kosong!`, 404);

    const body = await c.req.json();
    const { id, komentar } = body;
    const parsed = dokumenIdSchema.parse({ id });

    const dokumen = await SeminarKpService.postTerimaDokumenSeminarKP(parsed.id, komentar);
    const jenisDokumenName = await StepHelper.getNamaDokumen(dokumen.validasi.jenis_dokumen);

    return successResponse(c, dokumen, `Dokumen ${jenisDokumenName} berhasil divalidasi`, 201);
  }

  public static async postTolakDokumenSeminarKP(c: Context) {
    const { email } = c.get("user");
    if (!email) throw new APIError(`Email kosong!`, 404);

    const body = await c.req.json();
    const { id, komentar } = body;
    if (!komentar) throw new APIError("Komentar penolakan harus diisi", 400);

    const parsed = dokumenIdSchema.parse({ id });

    const dokumen = await SeminarKpService.postTolakDokumenSeminarKP(parsed.id, komentar);
    const jenisDokumenName = await StepHelper.getNamaDokumen(dokumen.tolak.jenis_dokumen);

    return successResponse(c, dokumen, `Dokumen ${jenisDokumenName} ditolak`, 201);
  }
}

import { Context } from "hono";
import { Auth, DB, MD5 } from "./core";

export async function uSave(a: Context) {
    const i = await Auth(a)
    if (!i) { return a.text('401', 401) }
    const body = await a.req.formData();
    const mail = body.get('mail')?.toString() ?? '';
    if (!mail) { return a.text('mail_empty', 422) }
    if (mail.length > 320) { return a.text('mail_too_long', 422) }
    if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(mail)) { return a.text('mail_illegal', 422) }
    const name = body.get('name')?.toString() ?? ''
    if (!name) { return a.text('name_empty', 422) }
    if (name.length > 20) { return a.text('name_too_long', 422) }
    if (!/^[\p{L}][\p{L}\p{N}_-]*$/u.test(name)) { return a.text('name_illegal', 422) }
    const pass = body.get('pass')?.toString() ?? ''
    const pass_confirm = body.get('pass_confirm')?.toString() ?? ''
    const user = DB.prepare(`SELECT * FROM user WHERE uid = ?`).get([i.uid]) as any
    if (!user || MD5(pass_confirm + user.salt) != user.hash) { return a.text('pass_confirm', 401) }
    try {
        DB.prepare(`UPDATE user SET mail = ? , name = ? , hash = COALESCE(?, hash) WHERE uid = ?`)
            .run([mail, name, pass ? MD5(pass + user.salt) : null, i.uid])
    } catch (error) {
        return a.text('data_conflict', 409)
    }
    return a.text('ok')
}

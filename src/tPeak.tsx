import { Context } from "hono";
import { Auth, DB } from "./core";

export async function tPeak(a: Context) {
    const i = await Auth(a)
    if (!i || i.grade < 2) { return a.text('401', 401) }
    const tid = parseInt(a.req.param('tid') ?? '0')
    // 无法置顶则报错
    if (!DB.prepare(`
            UPDATE post
            SET attr = CASE WHEN attr = 0 THEN 1 ELSE 0 END
            WHERE pid = ? AND attr IN (0,1) AND land > 0
        `) // 必须是thread(land>0)
        .run([tid])
        .changes) { return a.text('410:gone', 410) }
    return a.text('ok')
}

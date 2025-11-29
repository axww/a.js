import { Context } from "hono";
import { Auth, DB, HTMLText } from "./core";

export async function mData(a: Context) {
    const i = await Auth(a)
    if (!i) { return a.text('401', 401) }
    const sort = parseInt(a.req.query('sort') ?? '0')

    // 因为 message 都是 post 所以 tid 是 -land
    const data = await DB.db
        .prepare(`
        SELECT
            post.pid AS post_pid,
            -post.land AS post_tid,
            post.time AS post_time,
            post.content AS post_content,
            user.uid AS post_uid,
            user.name AS post_name,
            quote.pid AS quote_pid,
            quote.content AS quote_content
        FROM post
        LEFT JOIN user ON user.uid = post.user
        LEFT JOIN post AS quote ON quote.pid = post.cite
        WHERE post.attr = 0 AND post.call = ? ` + (sort ? `AND post.sort < ?` : ``) + `
        ORDER BY post.attr DESC, post.call DESC, post.sort DESC
        LIMIT 10
            `)
        .all([i.uid, sort]) //? 传入sort但构造句没有时
    await Promise.all(data.map(async function (row: { quote_content: string | null | undefined; post_content: string | null | undefined; }) {
        row.quote_content = await HTMLText(row.quote_content, 300);
        row.post_content = await HTMLText(row.post_content, 300);
    }))
    return a.json(data)
}

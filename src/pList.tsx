import { Context } from "hono";
import { Auth, Config, Pagination, HTMLText, DB } from "./core";
import { PList } from "../render/PList";
import { raw } from "hono/html";

export async function pList(a: Context) {
    const i = await Auth(a)
    const tid = parseInt(a.req.param('tid'))
    const thread = await DB.db
        .prepare(`
            SELECT
                post.*,
                user.name AS name,
                user.grade AS grade,
                user.credits AS credits,
                '' AS quote_content,
                '' AS quote_name
            FROM post
            LEFT JOIN user ON post.user = user.uid
            WHERE post.pid = ?
            AND post.call = 0
            AND post.attr IN (0,1)
        `) // 必须是Thread(call=0)
        .get([tid])
    if (!thread) { return a.notFound() }
    const page = parseInt(a.req.query('page') ?? '0') || 1
    const page_size_p = await Config.get<number>(a, 'page_size_p') || 20
    const total = await DB.db
        .prepare(`
            SELECT COUNT(*) AS total
            FROM post
            WHERE attr = 0 AND land = ?
        `)
        .get([-tid]) ?? 0

    const data = total ? await DB.db
        .prepare(`
            SELECT
                post.*,
                user.name AS name,
                user.grade AS grade,
                user.credits AS credits,
                quote_post.content AS quote_content,
                quote_user.name AS quote_name
            FROM post
            LEFT JOIN user ON post.user = user.uid
            LEFT JOIN post AS quote_post
                ON quote_post.pid = post.cite
                AND quote_post.attr IN (0,1)
                AND post.cite <> -post.land
            LEFT JOIN user AS quote_user
                ON quote_user.uid = quote_post.user
            WHERE post.attr = 0
                AND post.land = ?
            ORDER BY post.attr ASC, post.land ASC, post.time ASC
            LIMIT ? OFFSET ?;
        `)
        .all([-tid, (page - 1) * page_size_p, page_size_p])
        : []
    const pagination = Pagination(page_size_p, total, page, 2)
    const title = raw(await HTMLText(thread.content, 140, true))
    const thread_lock = [1, 2].includes(thread.land) && (a.get('time') > (thread.sort + 604800))
    data.unshift(thread);
    return a.html(PList(a, { i, page, pagination, data, title, thread_lock }))
}

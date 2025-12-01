import { Context } from "hono";
import { Auth, Config, DB, Pagination } from "./core";
import { TList } from "../render/TList";
import { raw } from "hono/html";

export async function tList(a: Context) {
    const i = await Auth(a)
    const page = parseInt(a.req.query('page') ?? '0') || 1
    const land = await Config.get<number>(a, 'land', true) ?? parseInt(a.req.query('land') ?? '0')
    const page_size_t = await Config.get<number>(a, 'page_size_t') || 20
    const total = (DB.prepare(`
            SELECT count(*) AS total
            FROM post
            WHERE attr IN (0,1)
            AND `+ (land ? `land` : `call`) + ` = ?
        `)
        .get([land]) as any
    )?.total ?? 0
    const data = total ? DB.prepare(`
            SELECT *,
            u.name AS name,
            u.grade AS grade,
            u.credits AS credits,
            (
                SELECT JSON_OBJECT (
                    'pid', l.pid,
                    'sort', l.sort,
                    'name', lu.name,
                    'grade', lu.grade,
                    'credits', lu.credits
                )
                FROM post l
                LEFT JOIN user lu ON lu.uid = l.user
                WHERE l.attr = 0
                AND l.land = -p.pid
                ORDER BY l.attr DESC, l.land DESC, l.sort DESC
                LIMIT 1
            ) AS last
            FROM post p
            LEFT JOIN user u ON u.uid = p.user
            WHERE p.attr IN (0,1)
            AND `+ (land ? `p.land` : `p.call`) + ` = ?
            ORDER BY p.attr DESC, `+ (land ? `p.land` : `p.call`) + ` DESC, p.sort DESC
            LIMIT ?,?
        `)
        .all([land, (page - 1) * page_size_t, page_size_t]) : []
    const pagination = Pagination(page_size_t, total, page, 2)
    const title = raw(await Config.get<string>(a, 'site_name', false))
    return a.html(TList(a, { i, page, pagination, data, title }))
}

import { Context } from "hono";
import { sign } from "hono/jwt";
import { setCookie } from "hono/cookie";
import { Md5 } from "ts-md5";
import { Config, DB, RandomString } from "./core";

export async function uRegister(a: Context) {
    const body = await a.req.formData()
    const cert = body.get('cert')?.toString().toLowerCase() ?? ''
    const pass = body.get('pass')?.toString() ?? ''
    if (!cert || !pass) { return a.notFound() }
    let rand = RandomString(16);
    const uid = DB.prepare(`INSERT OR IGNORE INTO user (mail,name,hash,salt,time) VALUES (?,?,?,?,?)`)
        .run([cert, '#' + a.get('time'), Md5.hashStr(pass + rand), rand, a.get('time')])
        .lastInsertRowid
    if (!uid) { return a.text('data_conflict', 409) }
    try {
        setCookie(a, 'JWT', await sign({ uid }, await Config.get<string>(a, 'secret_key')), { maxAge: 2592000 });
        return a.text('ok');
    } catch (error) {
        console.error('JWT signing failed:', error);
        return a.text('500', 500);
    }
}

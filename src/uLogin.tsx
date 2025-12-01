import { Context } from "hono";
import { sign } from "hono/jwt";
import { setCookie } from "hono/cookie";
import { Md5 } from "ts-md5";
import { Config, DB } from "./core";

export async function uLogin(a: Context) {
    const body = await a.req.formData();
    const cert = body.get('cert')?.toString().toLowerCase() // 登录凭证 邮箱 或 昵称
    const pass = body.get('pass')?.toString();
    if (!cert || !pass) {
        return a.text('401', 401);
    }
    const user = DB.prepare(`SELECT * FROM user WHERE mail = ? OR name = ?`).get([cert, cert]) as any
    if (!user) {
        return a.text('no user', 401);
    }
    if (Md5.hashStr(pass + user.salt) !== user.hash) {
        return a.text('401', 401);
    }
    try {
        setCookie(a, 'JWT', await sign({ uid: user.uid }, await Config.get<string>(a, 'secret_key')), { maxAge: 2592000 });
        return a.text('ok');
    } catch (error) {
        console.error('JWT signing failed:', error);
        return a.text('500', 500);
    }
}

import { Context } from "hono";
import { html } from "hono/html";
import { Config } from "../src/core";
import { CBegin } from "./CBegin";
import { CFinish } from "./CFinish";

export async function UAuth(a: Context, z: any) {
  return html`
${CBegin(a, z)}

<div class="flex flex-col justify-center px-6 lg:px-8 h-full">
    <form class="space-y-8 sm:mx-auto sm:w-full sm:max-w-sm" onsubmit="auth(this);">
      <div class="sm:mx-auto sm:w-full sm:max-w-sm">
        <h2 class="text-center text-2xl/9 font-bold tracking-tight text-gray-900">${await Config.get<string>(a, 'site_name', false)}</h2>
      </div>
      <div>
        <input type="text" name="cert" placeholder="邮箱" required class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 mb-2">
        <input type="password" name="pass" placeholder="密码" required class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6">
      </div>
      <div class="text-center">
        <button type="submit" name="login" class="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 cursor-pointer">登录/注册</button>
      </div>
    </form>
</div>

<script>
    async function auth(form) {
        event.preventDefault();
        if (event.submitter.name == "login") { // 登录
          if (!form.querySelector('input[name="cert"]').value) {
            alert("邮箱地址为空");
            return;
          }
          if (!form.querySelector('input[name="pass"]').value) {
            alert("密码为空");
            return;
          }
        } else { // 注册
          if (!form.querySelector('input[name="cert"]').value) {
            alert("邮箱地址为空");
            return;
          }
          if (
            !/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,}$/.test(
              form.querySelector('input[name="cert"]').value
            )
          ) {
            alert("邮箱格式错误");
            return;
          }
          if (!form.querySelector('input[name="pass"]').value) {
            alert("密码为空");
            return;
          }
        }
        const data = new FormData(form);
        data.set('pass', md5(data.get('pass')));
        if (
          (
            await fetch(
              new Request("/login", {method: 'POST', body: data})
            )
          ).ok
        ) {
          window.location = document.referrer;
        } else {
          const response = await fetch(
            new Request("/login", { method: "POST", body: data })
          );
          const text = await response.text();
          if (text === "no user") {
            // 用户不存在 进行注册操作
            const data = new FormData(form);
            if (!data.get('cert')) {alert('邮箱地址为空');return;}
            if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(data.get('cert'))) {alert('邮箱格式错误');return;}
            data.set('pass', md5(data.get('pass')));
            if ((await fetch(new Request('/register', {method: 'POST', body: data}))).ok) {
                window.location='/i';
            } else { alert('注册失败，内部错误'); }
          } else {
            alert("登录失败");
          }
        }
      }
</script>

${CFinish(a, z)}
`;
}
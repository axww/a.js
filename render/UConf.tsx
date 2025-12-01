import { Context } from "hono";
import { html } from "hono/html";
import { CBegin } from "./CBegin";
import { CFinish } from "./CFinish";

export function UConf(a: Context, z: any) {
  z.i = z.i! // 非空断言
  let role = "会员";
  switch (z.i.grade) {
    case -2: role = '禁言'; break;
    case -1: role = '广告'; break;
    case 1: role = '贵宾'; break;
    case 2: role = '管理'; break;
    case 3: role = '站长'; break;
  }
  return html`
${CBegin(a, z)}

<div class="container w-full mx-auto max-w-5xl p-6 bg-white shadow-md rounded-lg divide-y divide-gray-200">
  <form onsubmit="event.preventDefault(); save(this);">
    <div class="space-y-6 border-b border-gray-900/10 pb-6">
        <div class="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
          <div class="sm:col-span-3">
            <label for="first-name" class="block text-sm/6 font-normal text-gray-900">邮箱</label>
            <div class="mt-2">
              <input type="text" name="mail" value="${z.i.mail}" class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 border">
            </div>
          </div>
          <div class="sm:col-span-3">
            <label for="last-name" class="block text-sm/6 font-normal text-gray-900">昵称（字符、数字、横线(-)、下划线(_)，需以字符开头）</label>
            <div class="mt-2">
              <input type="text" name="name" value="${z.i.name}" class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 border">
            </div>
          </div>
          <div class="sm:col-span-3">
            <label for="pass" class="block text-sm/6 font-normal text-gray-900">新密码</label>
            <div class="mt-2">
              <input type="password" name="pass" placeholder="留空不更换" class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 border">
            </div>
          </div>
          <div class="sm:col-span-3">
            <label for="pass_repeat" class="block text-sm/6 font-normal text-gray-900">确认新密码</label>
            <div class="mt-2">
              <input type="password" name="pass_repeat" placeholder="再输入一遍" class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 border">
            </div>
          </div>
        </div>
        <div>
        <p class="mt-1 text-sm/6">
          <span class="text-gray-900">ID</span>
          <span class="text-gray-600">${z.i.uid}</span>
        </p>
        <p class="mt-1 text-sm/6">
          <span class="text-gray-900">金币</span>
          <span class="text-gray-600">${z.i.golds}</span>
        </p>
        <p class="mt-1 text-sm/6">
          <span class="text-gray-900">经验</span>
          <span class="text-gray-600">${z.i.credits}</span>
        </p>
        <p class="mt-1 text-sm/6">
          <span class="text-gray-900">职务</span>
          <span class="text-gray-600">${role}</span>
        </p>
        </div>
    </div>
    <div class="mt-6 flex items-center justify-end gap-x-6">
      <label class="block text-sm/6 font-normal text-gray-900">原密码</label>
      <div>
        <input type="password" name="pass_confirm" required placeholder="保存前输入" class="align-top block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 border">
      </div>
      <button type="button" onclick="history.back()" class="text-sm/6 font-semibold text-gray-900 cursor-pointer">返回</button>
      <button type="submit" class="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 cursor-pointer">保存</button>
    </div>
  </form>
</div>

<script>
    async function save(form){
        const data = new FormData(form);
        if (data.get('pass')) {
            if(data.get('pass') != data.get('pass_repeat')) {
                alert('密码不一致');
                return;
            }
            data.set('pass', md5(data.get('pass')));
            data.delete('pass_repeat');
        }
        data.set('pass_confirm', md5(data.get('pass_confirm')));
        const result = await fetch(new Request("/i", {method: "POST", body: data}));
        if (result.ok) {
            alert('修改成功')
            location.reload()
        } else {
            alert(await result.text())
        }
    }
</script>

${CFinish(a, z)}
`;
}
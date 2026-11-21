const sb=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY);
const $=s=>document.querySelector(s);
const cat={desserts:"الحلويات",pastries:"المعجنات",traditional:"الطبخات البلدية",seafood:"الطبخات البحرية"};
const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=n=>`${Number(n).toFixed(2)} ر.س`;
async function showDashboard(){
 const {data:{session}}=await sb.auth.getSession();
 if(!session){$("#login-panel").hidden=false;$("#dashboard").hidden=true;return}
 const {data:admin,error}=await sb.from("admin_users").select("user_id").eq("user_id",session.user.id).maybeSingle();
 if(error||!admin){await sb.auth.signOut();$("#login-message").textContent="هذا الحساب غير مخوّل لإدارة المتجر.";$("#login-message").className="form-message error";return}
 $("#login-panel").hidden=true;$("#dashboard").hidden=false;loadAdminProducts();loadOrders();
}
$("#login-form").addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const {error}=await sb.auth.signInWithPassword({email:f.get("email"),password:f.get("password")});$("#login-message").textContent=error?"تعذر تسجيل الدخول. تحققي من البيانات.":"تم تسجيل الدخول.";$("#login-message").className=error?"form-message error":"form-message";if(!error)showDashboard()});
$("#logout").onclick=async()=>{await sb.auth.signOut();showDashboard()};
document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-tab]").forEach(x=>x.classList.toggle("active",x===b));$("#products-tab").hidden=b.dataset.tab!=="products";$("#orders-tab").hidden=b.dataset.tab!=="orders"});
$("#product-form").addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const payload={name:f.get("name"),category:f.get("category"),price:Number(f.get("price")),image_url:f.get("image_url")||"",description:f.get("description")||"",is_available:true};const {error}=await sb.from("products").insert(payload);$("#product-message").textContent=error?"تعذرت إضافة الطبق. تحققي من صلاحيات المالك والبيانات.":"تمت إضافة الطبق.";$("#product-message").className=error?"form-message error":"form-message";if(!error){e.currentTarget.reset();loadAdminProducts()}});
async function loadAdminProducts(){const host=$("#admin-products");const {data,error}=await sb.from("products").select("*").order("created_at",{ascending:false});if(error){host.textContent="تعذر تحميل الأطباق.";return}host.innerHTML=data.length?data.map(p=>`<div class="admin-item"><div><strong>${safe(p.name)}</strong><p>${cat[p.category]} · ${money(p.price)} · ${p.is_available?"ظاهر للزبائن":"مخفي"}</p></div><div class="admin-actions"><button data-toggle="${p.id}" data-value="${p.is_available}">${p.is_available?"إخفاء":"إظهار"}</button><button data-delete="${p.id}" class="reject">حذف</button></div></div>`).join(""):'<p class="muted">لم تتم إضافة أطباق بعد.</p>'}
$("#admin-products").addEventListener("click",async e=>{const t=e.target.closest("[data-toggle]"),d=e.target.closest("[data-delete]");if(t){await sb.from("products").update({is_available:t.dataset.value!=="true"}).eq("id",t.dataset.toggle);loadAdminProducts()}if(d&&confirm("حذف هذا الطبق؟")){await sb.from("products").delete().eq("id",d.dataset.delete);loadAdminProducts()}});
async function loadOrders(){const host=$("#orders-list");host.textContent="جاري تحميل الطلبات...";const {data,error}=await sb.from("orders").select("*,order_items(product_name,quantity,unit_price)").order("created_at",{ascending:false});if(error){host.textContent="تعذر تحميل الطلبات.";return}host.innerHTML=data.length?data.map(o=>`<article class="admin-item"><div><strong>${safe(o.customer_name)} · ${money(o.total)}</strong><p>${safe(o.customer_phone)} · ${o.customer_email?safe(o.customer_email):"بدون إيميل"} · ${safe(o.delivery_address)}</p><div class="order-details">${(o.order_items||[]).map(i=>`${safe(i.product_name)} × ${i.quantity}`).join("، ")}${o.notes?"<br>ملاحظات: "+safe(o.notes):""}</div><span class="status">${({pending:"بانتظار المراجعة",approved:"مقبول",rejected:"مرفوض",completed:"مكتمل"})[o.status]||o.status}</span>${o.delivery_eta?`<p>موعد التوصيل: ${safe(o.delivery_eta)}</p>`:""}</div><div class="admin-actions">${o.status==="pending"?`<button class="approve" data-status="approved" data-id="${o.id}">قبول</button><button class="reject" data-status="rejected" data-id="${o.id}">رفض</button>`:o.status==="approved"?`<button class="approve" data-status="completed" data-id="${o.id}">تم التوصيل</button>`:""}</div></article>`).join(""):'<p class="muted">لا توجد طلبات حتى الآن.</p>'}
$("#orders-list").addEventListener("click",async e=>{
 const b=e.target.closest("[data-status]");if(!b)return;
 const status=b.dataset.status,id=b.dataset.id,upd={status};
 if(status==="approved"){const eta=prompt("متى موعد التوصيل المتوقع؟ (مثال: غدًا الساعة 5 مساءً)");if(eta===null)return;upd.delivery_eta=eta.trim()}
 if(status==="rejected"){const why=prompt("سبب الرفض (اختياري، يوصل للعميل):");if(why===null)return;upd.status_note=why.trim()}
 b.disabled=true;
 const {error}=await sb.from("orders").update(upd).eq("id",id);
 if(error){alert("تعذر تحديث حالة الطلب.");b.disabled=false;return}
 const {data,error:mailError}=await sb.functions.invoke("send-order-email",{body:{order_id:id}});
 if(mailError||data?.error)alert("تم تحديث الحالة لكن تعذر إرسال الإيميل للعميل.");
 else if(data?.skipped)alert("تم تحديث الحالة. هذا الطلب ما فيه إيميل للعميل.");
 loadOrders();
});
$("#refresh-orders").onclick=loadOrders;
showDashboard();

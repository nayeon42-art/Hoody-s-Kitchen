const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY);
const categoryNames = {desserts:"الحلويات",pastries:"المعجنات",traditional:"الطبخات البلدية",seafood:"الطبخات البحرية"};
let products = [], cart = [], activeCategory = "all";
const $ = s => document.querySelector(s);
const money = n => `${Number(n).toFixed(2)} ر.س`;
function safe(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
async function loadProducts(){
 const host=$("#products");
 const {data,error}=await sb.from("products").select("id,name,description,price,category,image_url").eq("is_available",true).order("created_at",{ascending:false});
 if(error){host.innerHTML='<div class="empty-state">تعذر تحميل القائمة. تأكدي من إعداد قاعدة البيانات ثم حدّثي الصفحة.</div>';return;}
 products=data||[]; renderProducts();
}
function renderProducts(){
 const shown=activeCategory==="all"?products:products.filter(p=>p.category===activeCategory);
 $("#menu-title").textContent=activeCategory==="all"?"أطباقنا المميزة":categoryNames[activeCategory];
 $("#menu-count").textContent=`${shown.length} أطباق`;
 $("#products").innerHTML=shown.length?shown.map(p=>`<article class="product-card"><div class="product-photo">${p.image_url?`<img src="${safe(p.image_url)}" alt="${safe(p.name)}" loading="lazy">`:'<span class="product-placeholder">✿</span>'}</div><div class="product-info"><span class="eyebrow">${categoryNames[p.category]||""}</span><h3>${safe(p.name)}</h3><p>${safe(p.description||"محضّر بعناية في مطبخنا.")}</p><div class="product-meta"><strong class="price">${money(p.price)}</strong><button class="add-button" data-add="${p.id}">أضيفي للسلة +</button></div></div></article>`).join(""):'<div class="empty-state">ما فيه أطباق معروضة في هذا القسم حاليًا. نضيفها قريبًا.</div>';
}
document.querySelectorAll(".category").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".category").forEach(x=>x.classList.remove("active"));b.classList.add("active");activeCategory=b.dataset.category;renderProducts()}));
$("#products").addEventListener("click",e=>{const b=e.target.closest("[data-add]");if(!b)return;const p=products.find(x=>x.id===b.dataset.add);if(!p)return;const item=cart.find(x=>x.id===p.id);item?item.qty++:cart.push({id:p.id,name:p.name,price:Number(p.price),qty:1});renderCart();openCart();});
function renderCart(){
 $("#cart-count").textContent=cart.reduce((a,x)=>a+x.qty,0);
 $("#cart-total").textContent=money(cart.reduce((a,x)=>a+x.price*x.qty,0));
 $("#cart-items").innerHTML=cart.length?cart.map(x=>`<div class="cart-row"><div><strong>${safe(x.name)}</strong><span class="muted">${money(x.price)}</span></div><div class="qty-controls"><button data-dec="${x.id}">−</button><b>${x.qty}</b><button data-inc="${x.id}">+</button></div></div>`).join(""):'<p class="muted">سلتك فارغة حاليًا.</p>';
}
$("#cart-items").addEventListener("click",e=>{const inc=e.target.closest("[data-inc]"),dec=e.target.closest("[data-dec]");if(!inc&&!dec)return;const id=(inc||dec).dataset[inc?"inc":"dec"];const x=cart.find(i=>i.id===id);if(!x)return;if(inc)x.qty++;else x.qty--;cart=cart.filter(i=>i.qty>0);renderCart()});
function openCart(){$("#cart-drawer").classList.add("open");$("#cart-overlay").classList.add("open")}
function closeCart(){$("#cart-drawer").classList.remove("open");$("#cart-overlay").classList.remove("open")}
$("#open-cart").onclick=openCart;$("#close-cart").onclick=closeCart;$("#cart-overlay").onclick=closeCart;
$("#checkout-form").addEventListener("submit",async e=>{
 e.preventDefault();const msg=$("#checkout-message"),btn=$("#submit-order");if(!cart.length){msg.textContent="السلة فارغة.";msg.className="form-message error";return}
 const f=new FormData(e.currentTarget);btn.disabled=true;btn.textContent="جارٍ إرسال الطلب...";msg.textContent="";
 const {data,error}=await sb.rpc("place_kitchen_order",{p_customer_name:f.get("customer_name"),p_customer_phone:f.get("customer_phone"),p_delivery_address:f.get("delivery_address"),p_notes:f.get("notes")||"",p_items:cart.map(x=>({product_id:x.id,quantity:x.qty}))});
 btn.disabled=false;btn.textContent="إرسال الطلب";
 if(error){msg.textContent="تعذر إرسال الطلب. حاولي مرة أخرى أو تواصلي مع المتجر.";msg.className="form-message error";return}
 cart=[];renderCart();e.currentTarget.reset();msg.textContent=`تم استلام طلبك بنجاح. رقم الطلب: ${String(data).slice(0,8)}`;msg.className="form-message";
});
loadProducts();renderCart();

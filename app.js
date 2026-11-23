const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY);
const categoryNames = {desserts:"الحلويات",pastries:"المعجنات",traditional:"الطبخات البلدية",seafood:"الطبخات البحرية"};
const slides = [
 {cat:"desserts",emoji:"🍰",title:"حلويات بيتية بطعم الحنين",text:"تنعمل على الطلب وتوصلك طازجة، لكل مناسبة صغيرة أو كبيرة."},
 {cat:"pastries",emoji:"🥐",title:"معجنات هشّة وطازجة",text:"عجينة خفيفة وحشوات بطعم البيت، للفطور أو للضيوف."},
 {cat:"traditional",emoji:"🍲",title:"طبخات بلدية بطعم زمان",text:"الأكلات اللي تعودتي عليها على سفرة العيلة، بنفس الاهتمام."},
 {cat:"seafood",emoji:"🦐",title:"طبخات بحرية بعناية",text:"مأكولات بحرية تتحضّر بالتتبيلة اللي تحبينها."}
];
const store={get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};
let products=[], cart=store.get("hk_cart",[]), favs=new Set(store.get("hk_favs",[])), activeCategory="all", query="", onlyFavs=false, bi=0;
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const money=n=>`${Number(n).toFixed(2)} ر.س`;
const safe=(s="")=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const heart='<svg class="ic" viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>';
function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove("show"),2200)}

async function loadProducts(){
 const host=$("#products");
 const {data,error}=await sb.from("products").select("id,name,description,price,category,image_url").eq("is_available",true).order("created_at",{ascending:false});
 if(error){host.innerHTML='<div class="empty-state">تعذر تحميل القائمة. تأكدي من إعداد قاعدة البيانات ثم حدّثي الصفحة.</div>';return}
 products=data||[];
 cart=cart.filter(i=>products.some(p=>p.id===i.id)).map(i=>{const p=products.find(x=>x.id===i.id);return {...i,name:p.name,price:Number(p.price)}});
 renderProducts();renderCart();
}
function card(p){const f=favs.has(p.id);return `<article class="product-card"><div class="product-photo">${p.image_url?`<img src="${safe(p.image_url)}" alt="${safe(p.name)}" loading="lazy">`:'<span class="product-placeholder">✿</span>'}<button class="fav-btn${f?" on":""}" data-fav="${p.id}" aria-pressed="${f}" aria-label="المفضلة">${heart}</button><span class="cat-chip">${categoryNames[p.category]||""}</span></div><div class="product-info"><h3>${safe(p.name)}</h3><p>${safe(p.description||"محضّر بعناية في مطبخنا.")}</p><div class="product-meta"><strong class="price">${money(p.price)}</strong><button class="add-button" data-add="${p.id}">أضيفي للسلة +</button></div></div></article>`}
function renderProducts(){
 const q=query.trim().toLowerCase();
 const shown=products.filter(p=>(activeCategory==="all"||p.category===activeCategory)&&(!onlyFavs||favs.has(p.id))&&(!q||`${p.name} ${p.description||""}`.toLowerCase().includes(q)));
 $("#menu-title").textContent=onlyFavs?"مفضلتي":activeCategory==="all"?"أطباقنا المميزة":categoryNames[activeCategory];
 $("#menu-count").textContent=`${shown.length} أطباق`;
 $("#products").innerHTML=shown.length?shown.map(card).join(""):`<div class="empty-state">${onlyFavs?"ما أضفتي شي للمفضلة بعد. اضغطي القلب على أي طبق.":q?"ما لقينا طبق بهذا الاسم. جربي كلمة ثانية.":"ما فيه أطباق معروضة في هذا القسم حاليًا. نضيفها قريبًا."}</div>`;
 $("#fav-count").textContent=favs.size;$("#fav-count").hidden=!favs.size;
}
function setCategory(c,scroll){
 activeCategory=(activeCategory===c&&c!=="all")?"all":c;
 $$("[data-category]").forEach(b=>b.classList.toggle("active",b.dataset.category===activeCategory));
 renderProducts();if(scroll)$("#menu").scrollIntoView({behavior:"smooth"});
}
function renderBanner(){
 const s=slides[bi],b=$("#banner");b.dataset.tone=bi;
 b.innerHTML=`<div class="b-text"><h2>${s.title}</h2><p>${s.text}</p><button class="light-btn" data-go="${s.cat}">استعرضي ${categoryNames[s.cat]}</button></div><div class="b-art" aria-hidden="true">${s.emoji}</div><div class="b-ctl"><button class="round" data-slide="1" aria-label="السابق">›</button><button class="round" data-slide="-1" aria-label="التالي">‹</button><span class="dots">${slides.map((_,i)=>`<i class="${i===bi?"on":""}"></i>`).join("")}</span></div>`;
}
function addToCart(id){
 const p=products.find(x=>x.id===id);if(!p)return;
 const it=cart.find(x=>x.id===id);it?it.qty++:cart.push({id:p.id,name:p.name,price:Number(p.price),qty:1});
 renderCart();toast(`تمت إضافة ${p.name} للسلة`);
 const c=$("#open-cart");c.classList.remove("bump");void c.offsetWidth;c.classList.add("bump");
}
function renderCart(){
 store.set("hk_cart",cart);
 $("#cart-count").textContent=cart.reduce((a,x)=>a+x.qty,0);
 $("#cart-total").textContent=money(cart.reduce((a,x)=>a+x.price*x.qty,0));
 $("#cart-items").innerHTML=cart.length?cart.map(x=>`<div class="cart-row"><div><strong>${safe(x.name)}</strong><span class="muted">${money(x.price)} × ${x.qty} = ${money(x.price*x.qty)}</span></div><div class="qty-controls"><button data-dec="${x.id}" aria-label="إنقاص">−</button><b>${x.qty}</b><button data-inc="${x.id}" aria-label="زيادة">+</button><button class="rm" data-remove="${x.id}" aria-label="حذف">×</button></div></div>`).join(""):'<p class="muted">سلتك فارغة حاليًا.</p>';
}
let map,marker,pos=null;
const locStatus=t=>$("#loc-status").textContent=t;
function initMap(){
 if(map||!window.L)return;
 map=L.map("map",{scrollWheelZoom:false}).setView([24.7136,46.6753],11);
 L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"}).addTo(map);
 map.on("click",e=>setPos(e.latlng.lat,e.latlng.lng));
}
function setPos(lat,lng,zoom){
 if(!map)return;pos={lat,lng};
 if(marker)marker.setLatLng([lat,lng]);
 else{marker=L.marker([lat,lng],{draggable:true}).addTo(map);marker.on("dragend",()=>{const p=marker.getLatLng();pos={lat:p.lat,lng:p.lng}})}
 if(zoom)map.setView([lat,lng],zoom);
 locStatus("تم تحديد الموقع ✓ تقدرين تحركين الدبوس لتعديله.");
}
$("#locate-btn").onclick=()=>{
 initMap();
 if(!navigator.geolocation){locStatus("جهازك ما يدعم تحديد الموقع، اضغطي على الخريطة.");return}
 locStatus("جارٍ تحديد موقعك...");
 navigator.geolocation.getCurrentPosition(p=>setPos(p.coords.latitude,p.coords.longitude,17),()=>locStatus("ما قدرنا نحدد موقعك. اضغطي على الخريطة لتحديده."),{enableHighAccuracy:true,timeout:10000});
};
function openCart(){$("#cart-drawer").classList.add("open");$("#cart-overlay").classList.add("open");setTimeout(()=>{initMap();map&&map.invalidateSize()},350)}
function closeCart(){$("#cart-drawer").classList.remove("open");$("#cart-overlay").classList.remove("open")}
document.addEventListener("click",e=>{
 const t=e.target.closest("[data-add],[data-fav],[data-go],[data-slide],[data-category],[data-inc],[data-dec],[data-remove]");if(!t)return;
 const d=t.dataset;
 if(d.add)return addToCart(d.add);
 if(d.fav){favs.has(d.fav)?favs.delete(d.fav):favs.add(d.fav);store.set("hk_favs",[...favs]);return renderProducts()}
 if(d.go)return setCategory(d.go,true);
 if(d.slide){bi=(bi+Number(d.slide)+slides.length)%slides.length;return renderBanner()}
 if(d.category!==undefined&&!d.inc)return setCategory(d.category,t.classList.contains("tile"));
 const id=d.inc||d.dec||d.remove,x=cart.find(i=>i.id===id);if(!x)return;
 if(d.inc)x.qty++;else if(d.dec)x.qty--;else x.qty=0;
 cart=cart.filter(i=>i.qty>0);renderCart();
});
$("#search").addEventListener("input",e=>{query=e.target.value;renderProducts()});
$("#fav-toggle").onclick=e=>{onlyFavs=!onlyFavs;e.currentTarget.setAttribute("aria-pressed",onlyFavs);renderProducts();if(onlyFavs)$("#menu").scrollIntoView({behavior:"smooth"})};
$("#open-cart").onclick=openCart;$("#close-cart").onclick=closeCart;$("#cart-overlay").onclick=closeCart;
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeCart()});
$("#checkout-form").addEventListener("submit",async e=>{
 e.preventDefault();const msg=$("#checkout-message"),btn=$("#submit-order");if(!cart.length){msg.textContent="السلة فارغة.";msg.className="form-message error";return}
 const form=e.currentTarget,f=new FormData(form);btn.disabled=true;btn.textContent="جارٍ إرسال الطلب...";msg.textContent="";
 const {data,error}=await sb.rpc("place_kitchen_order",{p_customer_name:f.get("customer_name"),p_customer_phone:f.get("customer_phone"),p_delivery_address:f.get("delivery_address"),p_notes:f.get("notes")||"",p_items:cart.map(x=>({product_id:x.id,quantity:x.qty}))});
 if(!error&&data&&pos)await sb.rpc("attach_order_location",{p_order_id:data,p_lat:pos.lat,p_lng:pos.lng});
 if(!error&&data&&f.get("customer_email"))await sb.rpc("attach_order_email",{p_order_id:data,p_email:String(f.get("customer_email")).trim()});
 btn.disabled=false;btn.textContent="إرسال الطلب";
 if(error){msg.textContent="تعذر إرسال الطلب. حاولي مرة أخرى أو تواصلي مع المتجر.";msg.className="form-message error";return}
 cart=[];renderCart();form.reset();if(marker){map.removeLayer(marker);marker=null}pos=null;locStatus("اضغطي على الخريطة أو حركي الدبوس لتحديد موقعك.");msg.textContent=`تم استلام طلبك بنجاح. رقم الطلب: ${String(data).slice(0,8)}`;msg.className="form-message";
});
renderBanner();renderCart();loadProducts();

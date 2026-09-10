
const products=[
 {name:"Pudim",price:8,img:"imagens/pudim1.jpg"},
 {name:"Oreo",price:8,img:"imagens/oreo1.jpg"},
 {name:"Morango",price:8,img:"imagens/morango1.jpg"},
 {name:"Ninho c/ Nutella",price:8,img:"imagens/ninho1.jpg"},
 {name:"Tablito",price:8,img:"imagens/tablito1.jpg"},
 {name:"Maracujá c/ Nutella",price:7,img:"imagens/maracuja1.jpg"},
 {name:"Paçoca",price:8,img:"imagens/pacoca1.jpg"},
 {name:"Ovomaltine",price:8,img:"imagens/ovomaltine1.jpg"},
 {name:"Abacaxi",price:8,img:"imagens/abacaxi1.jpg"},
];
const cart=Array(products.length).fill(0);
const money=v=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const productsEl=document.getElementById("products");

function renderProducts(){
 productsEl.innerHTML=products.map((p,i)=>`
 <article class="card">
  <img src="${p.img}" alt="${p.name}" class="card-photo">
  <div class="card-body">
   <h3>${p.name}</h3>
   <strong>${money(p.price)}</strong>
   <div class="qty">
    <button aria-label="Diminuir ${p.name}" onclick="change(${i},-1)">−</button>
    <span>${cart[i]}</span>
    <button aria-label="Aumentar ${p.name}" onclick="change(${i},1)">+</button>
   </div>
  </div>
 </article>`).join("");
 renderCart();
}
function change(i,n){cart[i]=Math.max(0,cart[i]+n);renderProducts();}
function renderCart(){
 const selected=products.map((p,i)=>({p,q:cart[i]})).filter(x=>x.q);
 const el=document.getElementById("cartItems");
 el.innerHTML=selected.length
  ? selected.map(x=>`<div class="cart-line"><span>${x.q}x ${x.p.name}</span><strong>${money(x.q*x.p.price)}</strong></div>`).join("")
  : '<p class="empty">Seu carrinho está vazio. 💗</p>';
 const total=selected.reduce((s,x)=>s+x.q*x.p.price,0);
 document.getElementById("total").textContent=money(total);
}
document.getElementById("sendOrder").addEventListener("click",()=>{
 const selected=products.map((p,i)=>({p,q:cart[i]})).filter(x=>x.q);
 if(!selected.length){alert("Escolha pelo menos um sabor 😊");return}
 const name=document.getElementById("customerName").value.trim()||"Não informado";
 const address=document.getElementById("customerAddress").value.trim()||"Não informado";
 const note=document.getElementById("customerNote").value.trim();
 const total=selected.reduce((s,x)=>s+x.q*x.p.price,0);
 const items=selected.map(x=>`• ${x.q}x ${x.p.name} — ${money(x.q*x.p.price)}`).join("\n");
 const msg=`Olá! Quero fazer um pedido na Gela Gourmet:\n\n${items}\n\n*Total: ${money(total)}*\n\nNome: ${name}\nEndereço/retirada: ${address}${note?`\nObservação: ${note}`:""}`;
 const whatsapp="5519993149687";
 window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(msg)}`,"_blank");
});
renderProducts();

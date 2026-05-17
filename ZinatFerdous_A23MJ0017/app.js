const API = 'http://localhost:3000';
function checkAuth() { if (!localStorage.getItem('loggedIn')) window.location.href = 'index.html'; }
function logout() { localStorage.clear(); window.location.href = 'index.html'; }
async function getArticles() { const res = await fetch(API+'/articles'); return await res.json(); }
async function createArticle(d) { const r = await fetch(API+'/articles',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}); return r.json(); }
async function updateArticle(id,d) { const r = await fetch(API+'/articles/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}); return r.json(); }
async function deleteArticle(id) { await fetch(API+'/articles/'+id,{method:'DELETE'}); }
async function loadDashboard() { checkAuth(); const a=await getArticles(); document.getElementById('total').textContent=a.length; document.getElementById('draft').textContent=a.filter(x=>x.status==='Draft').length; document.getElementById('reviewed').textContent=a.filter(x=>x.status==='Reviewed').length; document.getElementById('published').textContent=a.filter(x=>x.status==='Published').length; }
async function loadViewer() { checkAuth(); displayArticles(await getArticles()); }
function displayArticles(articles) { const l=document.getElementById('articleList'); if(!l)return; l.innerHTML=articles.map(a=>'<div class="card" style="border:1px solid #ddd;padding:15px;margin:10px;border-radius:8px;"><h3>'+a.title+'</h3><p>'+a.summary+'</p><b>Status: '+a.status+'</b> | Tags: '+a.tags+'<br><button onclick="removeArticle('+a.id+')">Delete</button> <button onclick="promoteArticle('+a.id+",\""+a.status+"\")"+'>Promote</button></div>').join(''); }
async function saveArticle() { const d={title:document.getElementById('title').value,summary:document.getElementById('summary').value,content:document.getElementById('content').value,tags:document.getElementById('tags').value,status:document.getElementById('status').value,createdAt:new Date().toISOString().split('T')[0],author:'admin@dhl.com'}; await createArticle(d); alert('Article saved!'); window.location.href='viewer.html'; }
async function removeArticle(id) { if(confirm('Delete this article?')){ await deleteArticle(id); loadViewer(); } }
async function promoteArticle(id,s) { const flow={'Draft':'Reviewed','Reviewed':'Published','Published':'Published'}; await updateArticle(id,{status:flow[s]}); loadViewer(); }
async function searchArticles() { const q=document.getElementById('searchInput').value.toLowerCase(); displayArticles((await getArticles()).filter(a=>a.title.toLowerCase().includes(q)||a.tags.toLowerCase().includes(q))); }
async function filterByStatus() { const s=document.getElementById('statusFilter').value; const a=await getArticles(); displayArticles(s?a.filter(x=>x.status===s):a); }

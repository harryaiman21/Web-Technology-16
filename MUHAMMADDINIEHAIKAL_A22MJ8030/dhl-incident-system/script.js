const API = "http://localhost:3000/incidents";

if (window.location.pathname.includes("create.html")) {
    const fields = ["title", "description", "priority", "status", "department", "reporter", "incidentId"];
    window.onload = () => {
        fields.forEach(field => {
            if (localStorage.getItem("draft_" + field)) {
                const element = document.getElementById(field);
                if (element) element.value = localStorage.getItem("draft_" + field);
            }
        });
    };
    fields.forEach(field => {
        const element = document.getElementById(field);
        if (element) {
            element.addEventListener("input", (e) => {
                localStorage.setItem("draft_" + field, e.target.value);
            });
        }
    });
}

function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    if (email === "admin@gmail.com" && password === "123456") {
        window.location.href = "dashboard.html";
    } else {
        alert("Invalid Login Credentials");
    }
}

async function createIncident() {
    const idInput = document.getElementById("incidentId");
    const titleInput = document.getElementById("title");
    if (!idInput || !titleInput || idInput.value.trim() === "") {
        alert("Please enter a valid Incident ID (e.g., DHL-001)");
        return;
    }
    const newIncident = {
        id: String(idInput.value.trim()), 
        title: titleInput.value.trim(),
        description: document.getElementById("description").value,
        priority: document.getElementById("priority").value,
        status: document.getElementById("status").value,
        department: document.getElementById("department").value,
        reporter: document.getElementById("reporter").value,
        date: new Date().toLocaleDateString()
    };
    try {
        const response = await fetch(API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newIncident)
        });
        if (response.ok) {
            const fields = ["title", "description", "priority", "status", "department", "reporter", "incidentId"];
            fields.forEach(f => localStorage.removeItem("draft_" + f));
            alert("Success! Created ID: " + newIncident.id);
            window.location.href = "incidents.html";
        } else {
            alert("Error: ID already exists!");
        }
    } catch (error) {
        alert("Connection error!");
    }
}

function getPriorityStyle(prio) {
    if (prio === "Critical") return "background: #fee2e2; color: #b91c1c; border: 1px solid #f87171;";
    if (prio === "High") return "background: #ffedd5; color: #c2410c; border: 1px solid #fb923c;";
    if (prio === "Medium") return "background: #fef9c3; color: #a16207; border: 1px solid #facc15;";
    if (prio === "Low") return "background: #dbeafe; color: #1d4ed8; border: 1px solid #60a5fa;";
    return "";
}

function getStatusStyle(status) {
    if (status === "Pending") return "background: #fef9c3; color: #a16207; border: 1px solid #facc15;";
    if (status === "Under Review" || status === "In Progress") return "background: #dbeafe; color: #1d4ed8; border: 1px solid #60a5fa;";
    if (status === "Resolved") return "background: #dcfce7; color: #15803d; border: 1px solid #4ade80;";
    return "";
}

async function loadIncidents() {
    try {
        const response = await fetch(API);
        const incidents = await response.json();
        const table = document.getElementById("incidentTable");
        if (table) {
            table.innerHTML = "";
            incidents.forEach(item => {
                table.innerHTML += `
                <tr id="row-${item.id}">
                    <td class="edit-id" style="text-align:center;">${item.id}</td>
                    <td class="edit-title" style="text-align:center; font-weight:bold;">${item.title}</td>
                    <td style="text-align:center;">
                        <div class="box-display" style="padding:5px; border-radius:5px; font-weight:bold; ${getPriorityStyle(item.priority)}">${item.priority}</div>
                        <select class="edit-priority" style="display:none; padding:5px;">
                            <option value="Low" ${item.priority==='Low'?'selected':''}>Low</option>
                            <option value="Medium" ${item.priority==='Medium'?'selected':''}>Medium</option>
                            <option value="High" ${item.priority==='High'?'selected':''}>High</option>
                            <option value="Critical" ${item.priority==='Critical'?'selected':''}>Critical</option>
                        </select>
                    </td>
                    <td style="text-align:center;">
                        <div class="box-display" style="padding:5px; border-radius:5px; font-weight:bold; ${getStatusStyle(item.status)}">${item.status}</div>
                        <select class="edit-status" style="display:none; padding:5px;">
                            <option value="Pending" ${item.status==='Pending'?'selected':''}>Pending</option>
                            <option value="Under Review" ${item.status==='Under Review'?'selected':''}>Under Review</option>
                            <option value="In Progress" ${item.status==='In Progress'?'selected':''}>In Progress</option>
                            <option value="Resolved" ${item.status==='Resolved'?'selected':''}>Resolved</option>
                        </select>
                    </td>
                    <td class="edit-dept" style="text-align:center;">${item.department}</td>
                    <td class="edit-reporter" style="text-align:center;">${item.reporter || '-'}</td>
                    <td style="text-align:center;">
                        <button class="btn-edit" onclick="enableEdit('${item.id}')" style="background:blue; color:white; padding:5px 10px; border-radius:5px; border:none; cursor:pointer;">Edit</button>
                        <button class="btn-update" onclick="updateIncident('${item.id}')" style="display:none; background:#00ff00; color:white; padding:5px 10px; border-radius:5px; border:none; font-weight:bold; cursor:pointer;">Update</button>
                        <button onclick="deleteIncident('${item.id}')" style="background:#d40511; color:white; padding:5px 10px; border-radius:5px; border:none; cursor:pointer;">Delete</button>
                    </td>
                </tr>`;
            });
        }
        const recent = document.getElementById("recentTable");
        if (recent) {
            recent.innerHTML = "";
            incidents.slice(-10).reverse().forEach(item => {
                recent.innerHTML += `
                <tr>
                    <td style="text-align:center;">${item.id}</td>
                    <td style="text-align:center; font-weight:bold;">${item.title}</td>
                    <td style="text-align:center;"><div style="padding:5px; border-radius:5px; font-weight:bold; font-size:12px; ${getPriorityStyle(item.priority)}">${item.priority}</div></td>
                    <td style="text-align:center;"><div style="padding:5px; border-radius:5px; font-weight:bold; font-size:12px; ${getStatusStyle(item.status)}">${item.status}</div></td>
                    <td style="text-align:center;">${item.department}</td>
                    <td style="text-align:center;">${item.reporter || '-'}</td>
                </tr>`;
            });
            document.getElementById("total").innerText = incidents.length;
            document.getElementById("pending").innerText = incidents.filter(i => i.status === "Pending").length;
            document.getElementById("resolved").innerText = incidents.filter(i => i.status === "Resolved").length;
            document.getElementById("critical").innerText = incidents.filter(i => i.priority === "Critical").length;
        }
    } catch (error) { console.error(error); }
}

function enableEdit(id) {
    const row = document.getElementById(`row-${id}`);
    row.querySelector(".btn-edit").style.display = "none";
    row.querySelector(".btn-update").style.display = "inline-block";
    row.querySelectorAll(".box-display").forEach(el => el.style.display = "none");
    row.querySelectorAll("select").forEach(el => el.style.display = "inline-block");
    const idCell = row.querySelector(".edit-id");
    const titleCell = row.querySelector(".edit-title");
    const deptCell = row.querySelector(".edit-dept");
    const reporterCell = row.querySelector(".edit-reporter");
    idCell.innerHTML = `<input type="text" value="${idCell.innerText}" style="width:90px; padding:5px; text-align:center;">`;
    titleCell.innerHTML = `<input type="text" value="${titleCell.innerText}" style="width:100%; padding:5px;">`;
    deptCell.innerHTML = `<input type="text" value="${deptCell.innerText}" style="width:100%; padding:5px;">`;
    reporterCell.innerHTML = `<input type="text" value="${reporterCell.innerText}" style="width:100%; padding:5px;">`;
}

async function updateIncident(oldId) {
    const row = document.getElementById(`row-${oldId}`);
    const newId = row.querySelector(".edit-id input").value.trim();
    const updatedData = {
        id: newId,
        title: row.querySelector(".edit-title input").value,
        priority: row.querySelector(".edit-priority").value,
        status: row.querySelector(".edit-status").value,
        department: row.querySelector(".edit-dept input").value,
        reporter: row.querySelector(".edit-reporter input").value,
        date: new Date().toLocaleDateString()
    };
    try {
        if (newId !== oldId) {
            await fetch(`${API}/${oldId}`, { method: "DELETE" });
            await new Promise(r => setTimeout(r, 500));
            await fetch(API, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedData)
            });
        } else {
            await fetch(`${API}/${oldId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedData)
            });
        }
        alert("Update Successful!");
        loadIncidents();
    } catch (error) { alert("Update Failed!"); }
}

async function deleteIncident(id) {
    if (confirm("Are you sure?")) {
        await fetch(`${API}/${id}`, { method: "DELETE" });
        loadIncidents();
    }
}

function filterIncidents() {
    const searchQuery = document.getElementById("search").value.toLowerCase();
    const prioFilter = document.getElementById("filterPrio").value;
    const statusFilter = document.getElementById("filterStatus").value;
    const rows = document.querySelectorAll("#incidentTable tr");
    rows.forEach(row => {
        const title = row.querySelector(".edit-title")?.innerText.toLowerCase() || "";
        const id = row.cells[0]?.innerText.toLowerCase() || "";
        const prio = row.querySelector(".edit-priority")?.value || row.querySelectorAll(".box-display")[0]?.innerText || "";
        const status = row.querySelector(".edit-status")?.value || row.querySelectorAll(".box-display")[1]?.innerText || "";
        const matchSearch = title.includes(searchQuery) || id.includes(searchQuery);
        const matchPrio = prioFilter === "All" || prio === prioFilter;
        const matchStatus = statusFilter === "All" || status === statusFilter;
        row.style.display = (matchSearch && matchPrio && matchStatus) ? "" : "none";
    });
}
window.onload = loadIncidents;
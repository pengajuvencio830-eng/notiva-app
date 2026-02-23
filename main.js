let db;
let currentView = "notes";
let editingId = null;
let searchQuery = "";
const request = indexedDB.open("NotivaDB", 2);
let selectedNotes = new Set();
let selectionMode = false;
//. 
function activateSelection(noteId, element) {
  if (!selectionMode) {
    selectionMode = true;
  }
  
  // Garante que adiciona apenas, não alterna
  if (!selectedNotes.has(noteId)) {
    selectedNotes.add(noteId);
    element.classList.add("selected");
  }
  
  updateSelectionUI();
}

function toggleSelection(noteId, element) {
  if (selectedNotes.has(noteId)) {
    selectedNotes.delete(noteId);
    element.classList.remove("selected");
  } else {
    selectedNotes.add(noteId);
    element.classList.add("selected");
  }

  if (selectedNotes.size === 0) {
    selectionMode = false;
  }

  updateSelectionUI();
}

function createWelcomeNote() {
  const tx = db.transaction("notes", "readonly");
  const store = tx.objectStore("notes");

  const getAll = store.getAll();
  getAll.onsuccess = () => {
    const notes = getAll.result || [];

    // Se NÃO houver nenhuma nota, cria a nota de instruções
    if (notes.length === 0) {
      const writeTx = db.transaction("notes", "readwrite");
      const writeStore = writeTx.objectStore("notes");

      writeStore.add({
        title: "🎉 Bem‑vindo ao Notiva!",
        content: `🎉 Bem‑vindo ao Notiva — Seu Centro de Organização 🎉

Esta nota de instruções foi criada automática para te ajudar a começar com o Notiva. Você pode apagá‑la a qualquer momento ou editá‑la como quiser.

🧭 **Como usar o Notiva**

📌 1) Criar uma Nota  
- Toque no botão ➕ na barra inferior para adicionar uma nova nota.  
- Preencha o Título, Disciplina e o Conteúdo.  
- Toque em “Salvar”.

🔎 2) Pesquisar notas  
- Use a barra de pesquisa no topo para encontrar notas por título, assunto ou conteúdo.

⭐ 3) Favoritos  
- Toque em ⭐ dentro da visualização da nota para marcar como favorita.  
- Use o ícone ❤️ no menu inferior para ver apenas seus favoritos.

🗑 4) Lixeira  
- Ao apagar uma nota, ela vai para a Lixeira.  
- Na Lixeira, você pode:
   ↻ Restaurar notas apagadas  
   🗑 Apagar permanentemente

📁 5) Exportar e Importar  
Dentro das configurações:
- **Exportar como JSON** — backup completo das suas notas.  
- **Exportar como PDF** — relatório pronto para impressão.  
- **Importar JSON** — restaurar um backup antigo.

🎨 6) Tema  
- Escolha entre **Dark** e **Light** para combinar com seu estilo.

👤 7) Perfil  
- Defina seu nome nas configurações para personalizar o app.  
- O ID é gerado automaticamente.

🔄 8) Instalar App  
- Na mesma área de configurações, use **Instalar App** para transformar o Notiva em um app progressivo no seu dispositivo.

🔗 Links úteis  
📘 Documentação e Guia: https://github.com/pengajuvencio830‑eng/notiva‑app  
📩 Suporte: notiva@gmail.com

💡 **Dica profissional:**  
Sempre mantenha backups regulares usando **Exportar JSON**. Assim você tem segurança extra mesmo se limpar o cache do navegador.

✨ Aproveite sua experiência com o Notiva! ✨`,
        subject: "Introdução",
        createdAt: Date.now(),
        favorite: true,
        deleted: false
      });

      writeTx.oncomplete = () => {
        renderNotes();
        showToast("📝 Nota de instruções criada com sucesso!");
      };
    }
  };
}
function editSelected() {
  if (selectedNotes.size !== 1) return;
  
  const id = [...selectedNotes][0];
  clearSelection();
  editNote(id);
}
function deleteSelected() {
  if (selectedNotes.size === 0) return;

  const tx = db.transaction("notes", "readwrite");
  const store = tx.objectStore("notes");

  selectedNotes.forEach(id => {

    if (currentView === "notes") {
      // Mover para lixeira
      const req = store.get(id);

      req.onsuccess = () => {
        const note = req.result;
        if (!note) return;

        note.deleted = true;
        store.put(note);
      };

    } else if (currentView === "trash") {
      // Apagar permanentemente
      store.delete(id);
    }

  });

  tx.oncomplete = () => {
    showToast(
      currentView === "notes"
        ? "Notas movidas para lixeira"
        : "Notas excluídas permanentemente"
    );

    clearSelection();
    renderNotes();
  };
}
function restoreSelected() {
  if (selectedNotes.size === 0) return;

  const tx = db.transaction("notes", "readwrite");
  const store = tx.objectStore("notes");

  selectedNotes.forEach(id => {
    const req = store.get(id);

    req.onsuccess = () => {
      const note = req.result;
      if (!note) return;

      note.deleted = false;
      store.put(note);
    };
  });

  tx.oncomplete = () => {
    showToast("Notas restauradas");
    clearSelection();
    renderNotes();
  };
}
function shareSelected() {
  if (selectedNotes.size !== 1) return;

  const id = [...selectedNotes][0];
  shareNote(id);
}

function clearSelection() {
  selectionMode = false;
  selectedNotes.clear();

  document.querySelectorAll(".note-card.selected")
    .forEach(el => el.classList.remove("selected"));

  updateSelectionUI();
}


function updateSelectionUI() {
  const bar = document.getElementById("selectionBar");
  const countSpan = document.getElementById("selectionCount");
  const actions = document.getElementById("selectionActions");
  
  const count = selectedNotes.size;
  
  countSpan.textContent = count;
  
  if (count > 0) {
    bar.classList.remove("hidden");
  } else {
    bar.classList.add("hidden");
  }
  
  actions.innerHTML = "";
  
  // ===== SE ESTIVER NA LIXEIRA =====
  if (currentView === "trash") {
    
    if (count === 1) {
      actions.innerHTML = `
        <button onclick="restoreSelected()"><i data-lucide="rotate-ccw"></i></button>
        <button onclick="deleteSelected()"><i data-lucide="trash-2"></i></button>
      `;
    }
    
    if (count > 1) {
      actions.innerHTML = `
        <button onclick="restoreSelected()"><i data-lucide="rotate-ccw"></i></button>
        <button onclick="deleteSelected()"><i data-lucide="trash-2"></i></button>
      `;
    }
    
  }
  // ===== SE ESTIVER NAS NOTAS NORMAIS =====
  else {
    
    if (count === 1) {
      actions.innerHTML = `
        <button onclick="editSelected()"><i data-lucide="edit"></i></button>
        <button onclick="shareSelected()"><i data-lucide="share-2"></i></button>
        <button onclick="deleteSelected()"><i data-lucide="trash-2"></i></button>
      `;
    }
    
    if (count > 1) {
      actions.innerHTML = `
        <button onclick="deleteSelected()"><i data-lucide="trash-2"></i></button>
      `;
    }
    
  }
  
  lucide.createIcons();
}


request.onupgradeneeded = e => {
  db = e.target.result;
  if (!db.objectStoreNames.contains("notes")) {
    const store = db.createObjectStore("notes", { keyPath: "id", autoIncrement: true });
    store.createIndex("deleted", "deleted", { unique: false });
  }
};

//delete

function escapeHTML(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
request.onsuccess = e => {
  db = e.target.result;

  // Cria a nota de boas-vindas se não houver nenhuma
  createWelcomeNote();

  renderNotes();
  
  checkVisitorStatus(); 
};
function showLoading() {
  document.getElementById("loading").classList.remove("hidden");
}

function hideLoading() {
  document.getElementById("loading").classList.add("hidden");
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 2500);
}

function clearInputs() {
  document.getElementById("titleInput").value = "";
  document.getElementById("contentInput").value = "";
  document.getElementById("subjectInput").value = "";
}

function saveNote(title, content, subject) {
return new Promise((resolve, reject) => {  showLoading();
  const tx = db.transaction("notes", "readwrite");
  const store = tx.objectStore("notes");
  
  if (editingId !== null) {
  const getReq = store.get(editingId);
  
  getReq.onsuccess = () => {
    const existing = getReq.result;
    
    store.put({
      id: editingId,
      title,
      content,
      subject,
      createdAt: existing.createdAt,
      updatedAt: Date.now(),
      deleted: existing.deleted || false
    });
  };
} else {
    store.add({
      title,
      content,
      subject,
      createdAt: Date.now(),
      deleted: false
    });
  }
  
  
      tx.oncomplete = () => {
      hideLoading();
      celebrate("success");
      showToast(editingId ? "Nota atualizada" : "Nota salva");

      editingId = null;
      clearInputs();
      document.getElementById("modal").classList.add("hidden");
      renderNotes();

      resolve();
    };


//new Class()

tx.onerror = () => {
hideLoading();
showToast("Erro ao salvar");
reject();
};

});
}

function renderNotes() {
  
  const container = document.getElementById("notesContainer");
const header = document.getElementById("listTitle");

if (header) {
  header.style.opacity = 0;
  
  setTimeout(() => {
    header.textContent =
      currentView === "trash" ?
      "🗑 Lixeira" :
      currentView === "favorites" ?
      "⭐ Favoritos" :
      "Notas";
    
    header.style.opacity = 1;
  }, 150);
}

showSkeleton(); 
  const tx = db.transaction("notes", "readonly");
  const store = tx.objectStore("notes");
  
  const request = store.getAll();
  
  request.onsuccess = () => {
    setTimeout(()=>{
    container.innerHTML = "";
    clearSelection();
      
    let notes = request.result || [];
    notes = notes.filter(note => {
  
  if (currentView === "trash") {
    return note.deleted;
  }
  
  if (currentView === "favorites") {
    return !note.deleted && note.favorite;
  }
  
  return !note.deleted;
  
});;
    notes = notes.filter(note => {
  return (
    (note.title || "").toLowerCase().includes(searchQuery) ||
    (note.content || "").toLowerCase().includes(searchQuery) ||
    (note.subject || "").toLowerCase().includes(searchQuery)
  );
});

notes.sort((a, b) => b.createdAt - a.createdAt);

    if (notes.length === 0) {

  const header = document.getElementById("listTitle");
  if (header) header.style.display = "none";

  container.innerHTML = `
    <div style="text-align:center;margin-top:40px;color:#777;display:flex;flex-direction:column;align-items:center;gap:10px;">
      <i data-lucide="${currentView === "trash" ? "trash-2" : "notebook"}" style="width:40px;height:40px;"></i>
<span>
${
  currentView === "trash"
    ? "Lixeira vazia"
    : currentView === "favorites"
    ? "Nenhum favorito ainda ❤️"
    : "Nenhuma nota ainda"
}
</span>
    </div>
  `;
  
  
  
  
  
  lucide.createIcons();
  return;
}
    const header = document.getElementById("listTitle");
if (header) header.style.display = "block";
    notes.forEach(note => {
  const div = document.createElement("div");
  div.className = "note-card";
  
  div.innerHTML = `
  <h3>${escapeHTML(note.title)}</h3>
  <small>${escapeHTML(note.subject || "")}</small>
<p>
  ${
    note.content.length > 120
      ? escapeHTML(note.content.substring(0, 120)) + "..."
      : escapeHTML(note.content)
  }
</p>
<div style="margin-top:10px;font-size:12px;opacity:0.6;">
  ${note.updatedAt 
      ? "Atualizado às " + new Date(note.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
      : "Salvo às " + new Date(note.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
</div>
  `;
  
  container.appendChild(div);
  
  
  div.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    activateSelection(note.id, div);
  });
  
  let pressTimer;
let isLongPress = false;

div.addEventListener("pointerdown", (e) => {
  isLongPress = false;
  
  pressTimer = setTimeout(() => {
    isLongPress = true;
    activateSelection(note.id, div);
  }, 500);
});

div.addEventListener("pointerup", () => {
  clearTimeout(pressTimer);
});

div.addEventListener("pointerleave", () => {
  clearTimeout(pressTimer);
});

div.addEventListener("click", (e) => {
  if (isLongPress) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }
  
  if (selectionMode) {
    toggleSelection(note.id, div);
  } else {
    openViewModal(note);
  }
});
});
    
    lucide.createIcons();
  },500);
}
}


function restoreNote(id) {
  const tx = db.transaction("notes", "readwrite");
  const store = tx.objectStore("notes");
  const req = store.get(id);
  
  req.onsuccess = () => {
    const note = req.result;
  if (!note) return;

  note.deleted = false;
    store.put(note);
    showToast("Nota restaurada");
    celebrate("success");
    renderNotes();
  };
}

function deletePermanent(id) {
  const tx = db.transaction("notes", "readwrite");
  const store = tx.objectStore("notes");
  
  store.delete(id);
  
  tx.oncomplete = () => {
    showToast("Nota excluída permanentemente");
    celebrate();
    renderNotes();
  };
}

function editNote(id) {
  const tx = db.transaction("notes", "readonly");
  const req = tx.objectStore("notes").get(id);
  
  req.onsuccess = () => {
    const note = req.result;
    if (!note) return;

    editingId = id;
    
    document.getElementById("titleInput").value = note.title;
    document.getElementById("contentInput").value = note.content;
    document.getElementById("subjectInput").value = note.subject;
    document.getElementById("modal").classList.remove("hidden");
  };
}


document.addEventListener("DOMContentLoaded", () => {
  
  document.getElementById("closeViewModal")
  .addEventListener("click", () => {
    document.getElementById("viewModal")
      .classList.add("hidden");
});

  // ===== EXPORT MODAL =====
const exportBtn = document.getElementById("exportBtn");
const exportModal = document.getElementById("exportModal");
const cancelExportBtn = document.getElementById("cancelExportBtn");
const exportJsonBtn = document.getElementById("exportJsonBtn");
const exportPdfBtn = document.getElementById("exportPdfBtn");

// Abrir modal
exportBtn.addEventListener("click", () => {
  exportModal.classList.remove("hidden");
});

document.getElementById("cancelSelectionBtn")
  .addEventListener("click", clearSelection);
  
// Fechar modal
cancelExportBtn.addEventListener("click", () => {
  exportModal.classList.add("hidden");
});

// Export JSON
exportJsonBtn.addEventListener("click", () => {
  exportModal.classList.add("hidden");
  exportData();
});

// Export PDF
exportPdfBtn.addEventListener("click", () => {
  exportModal.classList.add("hidden");
  exportPDF(); // <- precisa existir
});

// Fechar clicando fora
exportModal.addEventListener("click", (e) => {
  if (e.target === exportModal) {
    exportModal.classList.add("hidden");
  }
});


document.getElementById("saveBtn").onclick = async () => {
  const btn = document.getElementById("saveBtn");
  
  const title = document.getElementById("titleInput").value.trim();
  const content = document.getElementById("contentInput").value.trim();
  const subject = document.getElementById("subjectInput").value.trim();
  
  if (!title || !content) return;
  
  btn.disabled = true;
  btn.innerHTML = "Salvando... ⏳";
  
  await saveNote(title, content, subject);
  
  btn.innerHTML = "Salvar";
  btn.disabled = false;
};


document.getElementById("addBtn").onclick = () => {
  editingId = null;
  clearInputs();
  document.getElementById("modal").classList.remove("hidden");
};

document.getElementById("cancelBtn").onclick = () => {
  document.getElementById("modal").classList.add("hidden");
};
document.getElementById("favoritesTab").onclick = () => {
  currentView = "favorites";
  renderNotes();
};
document.getElementById("notesTab").onclick = () => {
  currentView = "notes";
  renderNotes();
};

document.getElementById("trashTab").onclick = () => {
  currentView = "trash";
  renderNotes();
  
  // fechar painel
  const settingsPanel = document.getElementById("settingsPanel");
  settingsPanel.classList.remove("active");
};

document.getElementById("searchInput").addEventListener("input", (e) => {
  searchQuery = e.target.value.toLowerCase();
  renderNotes();
});

const settingsPanel = document.getElementById("settingsPanel");
const openSettings = document.getElementById("openSettings");
const closeSettings = document.getElementById("closeSettings");

openSettings.addEventListener("click", () => {
  settingsPanel.classList.add("active");
});

closeSettings.addEventListener("click", () => {
  settingsPanel.classList.remove("active");
});

settingsPanel.addEventListener("click", (e) => {
  if (e.target === settingsPanel) {
    settingsPanel.classList.remove("active");
  }
});

const profileForm = document.getElementById("profileForm");
const profileDisplay = document.getElementById("profileDisplay");
const profileNameInput = document.getElementById("profileNameInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const editProfileBtn = document.getElementById("editProfileBtn");
const displayName = document.getElementById("displayName");
const profileIdSpan = document.getElementById("profileId");

function generateId() {
  return "NTV-" + Math.random().toString(36).substr(2, 9).toUpperCase();
}

function loadProfile() {
  const savedProfile = JSON.parse(localStorage.getItem("notivaProfile"));

  if (savedProfile) {
    displayName.textContent = savedProfile.name;
    profileIdSpan.textContent = savedProfile.id;

    profileForm.classList.add("hidden");
    profileDisplay.classList.remove("hidden");
  }
}

saveProfileBtn.addEventListener("click", (e) => {
  e.preventDefault();
  const name = profileNameInput.value.trim();
  if (!name) return;

  let existing = JSON.parse(localStorage.getItem("notivaProfile"));

  const profileData = {
    name: name,
    id: existing?.id || generateId()
  };

  localStorage.setItem("notivaProfile", JSON.stringify(profileData));

  displayName.textContent = profileData.name;
  profileIdSpan.textContent = profileData.id;

  profileForm.classList.add("hidden");
  profileDisplay.classList.remove("hidden");

  showToast("Perfil atualizado");
});

editProfileBtn.addEventListener("click", () => {
  const savedProfile = JSON.parse(localStorage.getItem("notivaProfile"));
  if (!savedProfile) return;

  profileNameInput.value = savedProfile.name;

  profileDisplay.classList.add("hidden");
  profileForm.classList.remove("hidden");

  setTimeout(() => {
    profileNameInput.focus();
  }, 100);
});

const savedTheme = localStorage.getItem("notivaTheme");
if (savedTheme) {
  document.documentElement.setAttribute("data-theme", savedTheme);
}

setTimeout(() => {
  const profile = JSON.parse(localStorage.getItem("notivaProfile"));
  if (!profile) {
    showToast("Defina seu nome nas configurações.");
  }
}, 15000);

loadProfile();

});

function changeTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("notivaTheme", theme);
}

function exportData() {
  if (!db) {
    showToast("Base de dados ainda não pronta");
    return;
  }

  showLoading();

  const tx = db.transaction("notes", "readonly");
  const store = tx.objectStore("notes");
  const request = store.getAll();

  request.onsuccess = () => {
    const notes = request.result || [];

    const blob = new Blob(
      [JSON.stringify(notes, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "notiva-backup.json";
    a.click();

    URL.revokeObjectURL(url);

    hideLoading();
    showToast("Backup exportado com sucesso");
  };

  request.onerror = () => {
    hideLoading();
    showToast("Erro ao exportar");
  };
}

function importData() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";

  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;

    showLoading();

    const reader = new FileReader();

    reader.onload = event => {
      try {
        const notes = JSON.parse(event.target.result);

        const tx = db.transaction("notes", "readwrite");
        const store = tx.objectStore("notes");

        notes.forEach(note => {
          store.put(note);
        });

        tx.oncomplete = () => {
          hideLoading();
          showToast("Backup importado com sucesso");
          renderNotes();
        };

        tx.onerror = () => {
          hideLoading();
          showToast("Erro ao importar");
        };

      } catch (err) {
        hideLoading();
        showToast("Arquivo inválido");
      }
    };

    reader.readAsText(file);
  };

  input.click();
}

// === REGISTRO DA FONTE DE ASSINATURA ===
const greatVibesBase64 = "COLE_AQUI_O_BASE64_DA_FONTE";

function registerSignatureFont() {
  if (!window.jspdf) {
  showToast("Biblioteca PDF não carregada");
  return;
}
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.addFileToVFS("GreatVibes-Regular.ttf", greatVibesBase64);
  doc.addFont("GreatVibes-Regular.ttf", "GreatVibes", "normal");
}


async function exportPDF() {
  if (!db) {
    showToast("Base de dados ainda não pronta");
    return;
  }

  showLoading();

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const tx = db.transaction("notes", "readonly");
  const store = tx.objectStore("notes");
  const request = store.getAll();

  request.onsuccess = () => {
    const notes = request.result
      .filter(n => !n.deleted)
      .sort((a, b) => b.createdAt - a.createdAt);

    if (notes.length === 0) {
      hideLoading();
      showToast("Nenhuma nota para exportar");
      return;
    }

    let pageNumber = 0;
    let y;

    /* =========================
       CAPA (SEM PAGINAÇÃO)
    ==========================*/
    doc.setFont("helvetica", "bold");
    doc.setFontSize(42);
    doc.text("NOTIVA", pageWidth / 2, 70, { align: "center" });

    doc.setFontSize(16);
    doc.setFont("helvetica", "normal");
    doc.text("Relatório Oficial de Registo", pageWidth / 2, 85, {
      align: "center"
    });

    doc.setDrawColor(0);
    doc.setLineWidth(1);
    doc.line(60, 95, pageWidth - 60, 95);

    doc.setFontSize(12);
    doc.text(
      "Data de emissão: " + new Date().toLocaleString(),
      pageWidth / 2,
      115,
      { align: "center" }
    );
    const profile = JSON.parse(localStorage.getItem("notivaProfile"));

if (profile) {
  doc.setFontSize(12);
  doc.text(
    "Emitido para: " + profile.name,
    pageWidth / 2,
    130,
    { align: "center" }
  );

  doc.text(
    "ID do Utilizador: " + profile.id,
    pageWidth / 2,
    140,
    { align: "center" }
  );
}

    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(
      "Notiva • Sistema de Registo Digital",
      pageWidth / 2,
      pageHeight - 40,
      { align: "center" }
    );

    // Nova página para conteúdo
    doc.addPage();
    pageNumber++;

    y = 40;

    /* =========================
       HEADER (APENAS PRIMEIRA PÁGINA DE CONTEÚDO)
    ==========================*/
    function addFirstPageHeader() {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(0);
      doc.text("Relatório de Notas", pageWidth / 2, 25, {
        align: "center"
      });

      doc.setDrawColor(0);
      doc.line(20, 32, pageWidth - 20, 32);

      y = 45;
    }

    /* =========================
       FOOTER COM PAGINAÇÃO
    ==========================*/
    function addFooter() {
      doc.setDrawColor(220);
      doc.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20);

      doc.setFontSize(8);
      doc.setTextColor(120);

      doc.text(
        "Notiva • +258 87 978 8860 / 85 347 4224 • notiva@gmail.com",
        pageWidth / 2,
        pageHeight - 12,
        { align: "center" }
      );

      doc.text(
        "Página " + pageNumber,
        pageWidth - 20,
        pageHeight - 12,
        { align: "right" }
      );
    }

    addFirstPageHeader();

    /* =========================
       CONTEÚDO DAS NOTAS
    ==========================*/
    notes.forEach(note => {
      if (y > pageHeight - 70) {
        addFooter();
        doc.addPage();
        pageNumber++;
        y = 40; // sem header nas próximas páginas
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(20);
      doc.text(note.title, 20, y);
      y += 8;

      doc.setDrawColor(200);
      doc.line(20, y, pageWidth - 20, y);
      y += 6;

      if (note.subject) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(70);
        doc.text("Disciplina: " + note.subject, 20, y);
        y += 7;
      }

      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(
        "Criado em: " + new Date(note.createdAt).toLocaleString(),
        20,
        y
      );
      y += 10;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(30);

      const splitText = doc.splitTextToSize(note.content, pageWidth - 40);

      splitText.forEach(line => {
        if (y > pageHeight - 60) {
          addFooter();
          doc.addPage();
          pageNumber++;
          y = 40;
        }
        doc.text(line, 20, y);
        y += 7;
      });

      y += 15;
    });

    /* =========================
       BLOCO FINAL DE VALIDAÇÃO
    ==========================*/
    if (y > pageHeight - 90) {
      addFooter();
      doc.addPage();
      pageNumber++;
      y = 40;
    }

    doc.setDrawColor(0);
    doc.rect(20, pageHeight - 85, pageWidth - 40, 50);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(40);
    doc.text("Validação Institucional", 25, pageHeight - 75);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    doc.line(30, pageHeight - 60, pageWidth - 30, pageHeight - 60);
    doc.text("Responsável / Assinatura", 30, pageHeight - 52);

    doc.line(30, pageHeight - 45, pageWidth - 30, pageHeight - 45);
    doc.text("Carimbo / Validação Oficial", 30, pageHeight - 37);

    addFooter();

    doc.save("notiva-relatorio-corporativo.pdf");

    hideLoading();
    showToast("PDF Corporativo exportado com sucesso");
  };

  request.onerror = () => {
    hideLoading();
    showToast("Erro ao gerar PDF");
  };
}

function checkVisitorStatus() {
  const profile = JSON.parse(localStorage.getItem("notivaProfile"));
  const greeted = localStorage.getItem("notivaGreeted");

  if (!profile && !greeted) {
    showToast("🎉 Parabéns por usar o Notiva!");
    
    setTimeout(() => {
      showToast("👋 Grave seu nome nas definições.");
    }, 4000);

    localStorage.setItem("notivaGreeted", "true");
  }
}

function celebrate(type = "normal") {
  if (typeof confetti !== "function") return;
  
  const colors = type === "success" ?
    ["#00c853", "#69f0ae"] :
    ["#2962ff", "#82b1ff"];
  
  confetti({
    particleCount: 120,
    spread: 70,
    colors,
    origin: { y: 0.6 }
  });
}

function showSkeleton() {
  const container = document.getElementById("notesContainer");
  container.innerHTML = "";
  
  for (let i = 0; i < 3; i++) {
    container.innerHTML += `
            <div class="note-card skeleton">
                <div class="skeleton-title"></div>
                <div class="skeleton-text"></div>
                <div class="skeleton-text short"></div>
            </div>
        `;
  }
}

function openViewModal(note) {
  
  const modal = document.getElementById("viewModal");
  
  const favoriteBtn = document.getElementById("favoriteNoteBtn");
  const editBtn = document.getElementById("editNoteBtn");
  const deleteBtn = document.getElementById("deleteNoteBtn");
  const shareBtn = document.getElementById("shareNoteBtn");
  const restoreBtn = document.getElementById("restoreNoteBtn");
  
  
  /* =========================
     CONTROLE DE VISIBILIDADE
  ========================== */
  
  if (note.deleted) {
    
    // Mostrar apenas restaurar
    if (restoreBtn) restoreBtn.classList.remove("hidden");
    
    if (favoriteBtn) favoriteBtn.classList.add("hidden");
    if (editBtn) editBtn.classList.add("hidden");
    if (shareBtn) shareBtn.classList.add("hidden");
    if (deleteBtn) deleteBtn.classList.remove("hidden");
    
  } else {
    
    // Mostrar ações normais
    if (restoreBtn) restoreBtn.classList.add("hidden");
    
    if (favoriteBtn) favoriteBtn.classList.remove("hidden");
    if (editBtn) editBtn.classList.remove("hidden");
    if (shareBtn) shareBtn.classList.remove("hidden");
    if (deleteBtn) deleteBtn.classList.remove("hidden");
    
  }
  
  
  /* =========================
     EVENTOS
  ========================== */
  
  // FAVORITO
  if (favoriteBtn && !note.deleted) {
    favoriteBtn.classList.toggle("favorite-active", note.favorite);
    
    favoriteBtn.onclick = (e) => {
      e.stopPropagation();
      toggleFavorite(note.id);
    };
  }
  
  // EDITAR
  if (editBtn && !note.deleted) {
    editBtn.onclick = (e) => {
      e.stopPropagation();
      modal.classList.add("hidden");
      editNote(note.id);
    };
  }
  
  
  // ELIMINAR
if (deleteBtn) {
  deleteBtn.onclick = (e) => {
    e.stopPropagation();

    const tx = db.transaction("notes", "readwrite");
    const store = tx.objectStore("notes");

    if (note.deleted) {
      // 🔥 APAGAR PERMANENTEMENTE
      store.delete(note.id);

      tx.oncomplete = () => {
        showToast("Nota excluída permanentemente");
        modal.classList.add("hidden");
        renderNotes();
      };

    } else {
      // 📦 MOVER PARA LIXEIRA
      note.deleted = true;
      store.put(note);

      tx.oncomplete = () => {
        showToast("Nota movida para lixeira");
        modal.classList.add("hidden");
        renderNotes();
      };
    }
  };
}
  
  // RESTAURAR
  if (restoreBtn && note.deleted) {
    restoreBtn.onclick = (e) => {
      e.stopPropagation();
      
      const tx = db.transaction("notes", "readwrite");
      const store = tx.objectStore("notes");
      
      note.deleted = false;
      store.put(note);
      
      tx.oncomplete = () => {
        showToast("Nota restaurada");
        modal.classList.add("hidden");
        renderNotes();
      };
    };
  }
  
  // COMPARTILHAR
  if (shareBtn && !note.deleted) {
    shareBtn.onclick = (e) => {
      e.stopPropagation();
      shareNote(note.id);
    };
  }
  
  
  /* =========================
     CONTEÚDO
  ========================== */
  
  document.getElementById("viewTitle").textContent = note.title;
document.getElementById("viewSubject").textContent = note.subject || "";
document.getElementById("viewContent").textContent = note.content;

const metaElement = document.getElementById("viewMeta");

if (note.updatedAt) {
  metaElement.textContent =
    "Atualizado em " +
    new Date(note.updatedAt).toLocaleDateString() +
    " às " +
    new Date(note.updatedAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
} else {
  metaElement.textContent =
    "Criado em " +
    new Date(note.createdAt).toLocaleDateString() +
    " às " +
    new Date(note.createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
}
  modal.classList.remove("hidden");
}
function toggleFavorite(id) {
  const tx = db.transaction("notes", "readwrite");
  const store = tx.objectStore("notes");
  const req = store.get(id);
  
  req.onsuccess = () => {
    const note = req.result;
    if (!note) return;
    
    note.favorite = !note.favorite;
    store.put(note);
    
    // 🔥 Atualizar botão visual imediatamente
    const favoriteBtn = document.getElementById("favoriteNoteBtn");
    if (favoriteBtn) {
      favoriteBtn.classList.toggle("favorite-active", note.favorite);
    }
    
    showToast(
      note.favorite ?
      "Adicionado aos favoritos ❤️" :
      "Removido dos favoritos"
    );
    
    // 🔥 Se estiver na aba favoritos e remover, atualizar lista
    if (currentView === "favorites" && !note.favorite) {
      renderNotes();
    }
  };
}
function deleteWithAnimation(noteId, element) {
  element.classList.add("note-deleting");

  setTimeout(() => {
    moveToTrash(noteId);
    renderNotes();
    closeViewModal();
  }, 400);
}

function shareNote(id) {
  const tx = db.transaction("notes", "readonly");
  const store = tx.objectStore("notes");
  const req = store.get(id);
  
  req.onsuccess = async () => {
    const note = req.result;
    if (!note) return;
    
    const text = `${note.title}\n\n${note.content}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: note.title,
          text: note.content
        });
      } catch (err) {
        console.log("Partilha cancelada");
      }
    } else {
      navigator.clipboard.writeText(text);
      showToast("Texto copiado para a área de transferência");
    }
  };
}
//renderNotes
lucide.createIcons();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js")
      .then(() => console.log("Service Worker registrado"))
      .catch(err => console.log("Erro ao registrar SW:", err));
  });
}
let deferredPrompt;
const installBtn = document.getElementById("installBtn");

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.style.display = "block";
});

installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) {
    alert("Instalação ainda não disponível");
    return;
  }

  deferredPrompt.prompt();
  deferredPrompt = null;
});


window.addEventListener('appinstalled', () => {
  showToast('App instalado com sucesso');
  installBtn.style.display = 'none';
});


const modal = document.getElementById("onboardingModal");
const stepContainer = document.getElementById("onboardingStep");
const nextBtn = document.getElementById("nextBtn");

let currentStep = 0;
let userData = {
  type: null,
  profile: {},
  theme: null
};

const steps = [
  "presentation",
  "terms",
  "type",
  "questions",
  "profile",
  "theme",
  "finalize"
];

function startOnboarding() {
  modal.classList.remove("hidden");
  renderStep();
}

function renderStep() {
  nextBtn.disabled = true;
  stepContainer.innerHTML = "";

  const step = steps[currentStep];

  switch(step) {
    case "presentation":
      stepContainer.innerHTML = `
        <img src="app-icon.png" alt="App" style="width:150px;margin-bottom:20px;">
        <p>Bem-vindo ao Notiva.</p>
      `;
      nextBtn.disabled = false;
      break;

    case "terms":
      stepContainer.innerHTML = `
        <h3>Termos e Condições</h3>
        <div style="height:150px; overflow:auto; border:1px solid #ccc; padding:10px;">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit...
        </div>
        <label>
          <input type="checkbox" id="agreeTerms"> Concordo com os termos
        </label>
      `;
      document.getElementById("agreeTerms").addEventListener("change", (e)=>{
        nextBtn.disabled = !e.target.checked;
      });
      break;

    case "type":
      stepContainer.innerHTML = `
        <h3>Selecione o tipo de uso</h3>
        <button class="type-btn" data-type="student">Estudante</button>
        <button class="type-btn" data-type="company">Empresa</button>
        <button class="type-btn" data-type="church">Igreja</button>
        <button class="type-btn" data-type="other">Outros</button>
      `;
      document.querySelectorAll(".type-btn").forEach(btn=>{
        btn.addEventListener("click", ()=>{
          userData.type = btn.dataset.type;
          nextBtn.disabled = false;
        });
      });
      break;

    case "questions":
      renderQuestions();
      break;

    case "profile":
      stepContainer.innerHTML = `
        <h3>Crie seu perfil</h3>
        <input type="text" id="profileName" placeholder="Digite seu nome">
        <small id="profileError" style="color:red;display:none;">Nome inválido</small>
      `;
      const input = document.getElementById("profileName");
      const error = document.getElementById("profileError");
      input.addEventListener("input", ()=>{
        if(input.value.trim().length >= 2){
          error.style.display = "none";
          nextBtn.disabled = false;
          userData.profile.name = input.value.trim();
        } else {
          error.style.display = "block";
          nextBtn.disabled = true;
        }
      });
      break;

    case "theme":
      stepContainer.innerHTML = `
        <h3>Escolha o tema</h3>
        <button class="theme-btn" data-theme="light">Light</button>
        <button class="theme-btn" data-theme="dark">Dark</button>
        <button class="theme-btn" data-theme="skip">Ignorar</button>
      `;
      document.querySelectorAll(".theme-btn").forEach(btn=>{
        btn.addEventListener("click", ()=>{
          const val = btn.dataset.theme;
          userData.theme = val==="skip"?null:val;
          nextBtn.disabled = false;
        });
      });
      break;

    case "finalize":
      stepContainer.innerHTML = `<h3>Preparando seu app...</h3><p>Aguarde um momento.</p>`;
      nextBtn.disabled = true;
      setTimeout(()=>{
        localStorage.setItem("notivaOnboarded","true");
        modal.classList.add("hidden");
        if(userData.theme) changeTheme(userData.theme);
        renderNotes();
        showToast("Configuração inicial concluída");
      },1500);
      break;
  }
}

function renderQuestions(){
  stepContainer.innerHTML = "";
  nextBtn.disabled = true;

  if(userData.type === "student"){
    stepContainer.innerHTML = `
      <h3>Informações do estudante</h3>
      <select id="studentLevel">
        <option value="">Selecione...</option>
        <option value="highschool">Ensino Médio</option>
        <option value="college">Faculdade</option>
      </select>
    `;
    document.getElementById("studentLevel").addEventListener("change",(e)=>{
      userData.profile.level = e.target.value;
      nextBtn.disabled = !e.target.value;
    });
  }
  else if(userData.type === "company"){
    stepContainer.innerHTML = `
      <h3>Informações da empresa</h3>
      <input type="text" id="companyName" placeholder="Nome da empresa">
      <input type="text" id="companySector" placeholder="Setor de atuação">
    `;
    const name = document.getElementById("companyName");
    const sector = document.getElementById("companySector");
    [name, sector].forEach(el=>{
      el.addEventListener("input", ()=>{
        if(name.value.trim() && sector.value.trim()){
          nextBtn.disabled = false;
          userData.profile.companyName = name.value.trim();
          userData.profile.sector = sector.value.trim();
        } else {
          nextBtn.disabled = true;
        }
      });
    });
  }
  else if(userData.type === "church"){
    stepContainer.innerHTML = `
      <h3>Informações da igreja</h3>
      <input type="text" id="churchName" placeholder="Nome da igreja">
      <input type="text" id="churchLeader" placeholder="Líder principal">
    `;
    const name = document.getElementById("churchName");
    const leader = document.getElementById("churchLeader");
    [name, leader].forEach(el=>{
      el.addEventListener("input", ()=>{
        if(name.value.trim() && leader.value.trim()){
          nextBtn.disabled = false;
          userData.profile.churchName = name.value.trim();
          userData.profile.churchLeader = leader.value.trim();
        } else {
          nextBtn.disabled = true;
        }
      });
    });
  }
  else if(userData.type === "other"){
    stepContainer.innerHTML = `
      <h3>Outros</h3>
      <textarea id="otherDescription" placeholder="Descreva o uso do app"></textarea>
    `;
    const desc = document.getElementById("otherDescription");
    desc.addEventListener("input", ()=>{
      if(desc.value.trim()){
        nextBtn.disabled = false;
        userData.profile.description = desc.value.trim();
      } else {
        nextBtn.disabled = true;
      }
    });
  }
}

nextBtn.addEventListener("click", ()=>{
  currentStep++;
  renderStep();
});

// Inicia apenas se não tiver feito antes
if(!localStorage.getItem("notivaOnboarded")){
  startOnboarding();
            }

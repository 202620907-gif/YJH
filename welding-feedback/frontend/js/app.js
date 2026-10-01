const API_URL = "/api/analyze";
const HISTORY_KEY = "weld-feedback-history";

const $ = (id) => document.getElementById(id);

const state = {
  file: null,
  previewUrl: null,
  process: "TIG",
  loading: false,
};

const SEVERITY_STYLE = {
  심각: { badge: "bg-red-200 text-red-800", icon: "🚨" },
  보통: { badge: "bg-amber-200 text-amber-800", icon: "⚠️" },
  경미: { badge: "bg-sky-200 text-sky-800", icon: "💡" },
};

const RING_LENGTH = 2 * Math.PI * 52;

function init() {
  document.querySelectorAll(".process-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      state.process = chip.dataset.process;
      document.querySelectorAll(".process-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
    });
  });
  document.querySelector(`[data-process="TIG"]`).classList.add("active");

  $("upload-area").addEventListener("click", () => $("input-album").click());
  $("btn-camera").addEventListener("click", () => $("input-camera").click());
  $("btn-album").addEventListener("click", () => $("input-album").click());
  $("input-camera").addEventListener("change", (e) => pickFile(e.target.files[0]));
  $("input-album").addEventListener("change", (e) => pickFile(e.target.files[0]));

  $("btn-remove").addEventListener("click", (e) => {
    e.stopPropagation();
    clearFile();
  });

  const area = $("upload-area");
  ["dragover", "dragleave", "drop"].forEach((ev) =>
    area.addEventListener(ev, (e) => {
      e.preventDefault();
      area.classList.toggle("dragover", ev === "dragover");
      if (ev === "drop") pickFile(e.dataTransfer.files[0]);
    })
  );

  $("btn-analyze").addEventListener("click", analyze);
  $("btn-again").addEventListener("click", () => {
    $("result-section").classList.add("hidden");
    $("result-section").classList.remove("shown");
    $("result-section").scrollIntoView({ behavior: "smooth" });
    clearFile();
  });

  $("btn-clear-history").addEventListener("click", () => {
    if (confirm("모든 실습 기록을 삭제할까요?")) {
      localStorage.removeItem(HISTORY_KEY);
      renderHistory();
    }
  });

  renderHistory();
}

function pickFile(file) {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    showToast("이미지 파일만 업로드할 수 있어요.");
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showToast("파일이 너무 커요. 10MB 이하 사진을 사용하세요.");
    return;
  }
  clearFile();
  state.file = file;
  state.previewUrl = URL.createObjectURL(file);
  $("preview").src = state.previewUrl;
  $("preview-wrap").classList.remove("hidden");
  $("upload-area").classList.add("hidden");
  $("btn-analyze").disabled = false;
  $("error-msg").classList.add("hidden");
}

function clearFile() {
  if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
  state.file = null;
  state.previewUrl = null;
  $("input-camera").value = "";
  $("input-album").value = "";
  $("preview-wrap").classList.add("hidden");
  $("upload-area").classList.remove("hidden");
  $("btn-analyze").disabled = true;
}

async function analyze() {
  if (!state.file || state.loading) return;
  state.loading = true;
  $("loading").classList.remove("hidden");
  $("error-msg").classList.add("hidden");

  const form = new FormData();
  form.append("file", state.file);
  form.append("process", state.process);
  form.append("material", $("material").value);
  form.append("position", $("position").value);
  form.append("memo", $("memo").value);

  try {
    const res = await fetch(API_URL, { method: "POST", body: form });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `서버 오류 (${res.status})`);
    }
    const result = await res.json();
    renderResult(result);
    saveHistory(result);
  } catch (err) {
    const msg = String(err.message || err);
    if (msg.includes("fetch") || msg.includes("NetworkError")) {
      showError("서버에 연결할 수 없어요. README의 실행 방법대로 백엔드를 먼저 실행해 주세요.");
    } else {
      showError(msg);
    }
  } finally {
    state.loading = false;
    $("loading").classList.add("hidden");
  }
}

function renderResult(result) {
  const section = $("result-section");
  section.classList.remove("hidden");
  section.classList.add("shown");

  $("score-num").textContent = result.score;
  $("score-num").className = `text-4xl font-extrabold ${scoreColor(result.score)}`;
  $("score-grade").textContent = `GRADE ${result.grade}`;
  const ring = $("score-ring");
  ring.style.strokeDashoffset = RING_LENGTH * (1 - result.score / 100);
  ring.style.stroke = scoreHex(result.score);

  $("summary").textContent = result.summary;
  $("analyzer-badge").textContent =
    result.analyzer === "openai" ? "🤖 OpenAI Vision으로 분석됨" : "⚙️ 데모 분석기(Mock)로 분석됨 · .env에서 OpenAI 연동 가능";

  const list = $("defect-list");
  list.innerHTML = "";
  if (result.defects.length === 0) {
    list.innerHTML = `
      <div class="defect-card bg-emerald-950/60 border-emerald-800 text-center">
        <p class="text-2xl mb-1">🎉</p>
        <p class="font-bold text-emerald-400">발견된 결함이 없습니다!</p>
        <p class="text-sm text-slate-300 mt-1">지금 자세와 조건을 그대로 유지하세요.</p>
      </div>`;
  }
  result.defects.forEach((d, i) => {
    const style = SEVERITY_STYLE[d.severity] || SEVERITY_STYLE["보통"];
    const card = document.createElement("div");
    card.className = `defect-card sev-${d.severity}`;
    card.style.animationDelay = `${i * 0.1}s`;
    card.innerHTML = `
      <div class="flex items-center gap-2 mb-2">
        <span class="text-lg">${style.icon}</span>
        <h3 class="font-bold text-base">${d.name}</h3>
        <span class="ml-auto px-2 py-0.5 rounded-full text-[11px] font-bold ${style.badge}">${d.severity}</span>
      </div>
      <p class="text-sm text-slate-300 leading-relaxed mb-3">${d.description}</p>
      <div class="text-xs space-y-2">
        <div>
          <p class="font-bold text-red-400 mb-1">🔍 왜 생겼을까?</p>
          <ul class="list-disc list-inside text-slate-300 space-y-0.5">
            ${d.causes.map((c) => `<li>${c}</li>`).join("")}
          </ul>
        </div>
        <div>
          <p class="font-bold text-emerald-400 mb-1">🛠️ 이렇게 개선해 보세요</p>
          <ul class="list-disc list-inside text-slate-300 space-y-0.5">
            ${d.fixes.map((f) => `<li>${f}</li>`).join("")}
          </ul>
        </div>
      </div>`;
    list.appendChild(card);
  });

  const tipsCard = $("tips-card");
  if (result.tips && result.tips.length > 0) {
    tipsCard.classList.remove("hidden");
    $("tips-list").innerHTML = result.tips.map((t) => `<li>${t}</li>`).join("");
  } else {
    tipsCard.classList.add("hidden");
  }

  setTimeout(() => section.scrollIntoView({ behavior: "smooth" }), 100);
}

function scoreColor(score) {
  if (score >= 90) return "text-emerald-500";
  if (score >= 75) return "text-lime-500";
  if (score >= 60) return "text-amber-500";
  return "text-red-500";
}

function scoreHex(score) {
  if (score >= 90) return "#10b981";
  if (score >= 75) return "#84cc16";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
}

function saveHistory(result) {
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  history.unshift({
    date: new Date().toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    process: result.process,
    score: result.score,
    grade: result.grade,
    defects: result.defects.map((d) => d.name.split(" (")[0]),
  });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 20)));
  renderHistory();
}

function renderHistory() {
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  const container = $("history-list");
  if (history.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-500 text-center py-4">아직 기록이 없습니다. 첫 실습 사진을 분석해 보세요!</p>`;
    return;
  }
  container.innerHTML = history
    .map(
      (h) => `
      <div class="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5">
        <span class="w-10 h-10 rounded-lg grid place-items-center font-extrabold text-sm ${historyBg(h.score)}">${h.score}</span>
        <div class="min-w-0">
          <p class="text-sm font-semibold">${h.process} · ${h.grade}등급</p>
          <p class="text-xs text-slate-400 truncate">${h.defects.length ? h.defects.join(", ") : "결함 없음 ✨"} · ${h.date}</p>
        </div>
      </div>`
    )
    .join("");
}

function historyBg(score) {
  if (score >= 90) return "bg-emerald-900/60 text-emerald-400";
  if (score >= 75) return "bg-lime-900/60 text-lime-400";
  if (score >= 60) return "bg-amber-900/60 text-amber-400";
  return "bg-red-900/60 text-red-400";
}

function showError(msg) {
  const el = $("error-msg");
  el.textContent = msg;
  el.classList.remove("hidden");
}

let toastTimer;
function showToast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add("hidden"), 2500);
}

init();

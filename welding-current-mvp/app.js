"use strict";

const processInfo = {
  smaw: {
    name: "피복아크 · SMAW",
    subtitle: "탄소강용 일반 루틸계 피복전극",
    control: "용접기 전류(A)를 직접 설정합니다.",
    passControl: "루트는 범위 하단에서 시작하고 충전에서 5–10A 올려 비교하세요. 캡은 같은 값 또는 5–10A 낮게 조절합니다.",
  },
  tig: {
    name: "티그 · TIG",
    subtitle: "탄소강 · 직류 정극성(DCEN) 기준",
    control: "페달 또는 토치 스위치로 열 입력을 조절합니다.",
    passControl: "루트는 페달을 낮게 시작해 용입을 확인하세요. 충전은 조금 더 열을 주고, 캡은 페달을 낮춰 폭을 다듬습니다.",
  },
  gmawSolid: {
    name: "CO₂ 솔리드와이어",
    subtitle: "가스메탈아크 · GMAW",
    control: "전류는 주로 와이어 송급속도로 바뀌며 전압도 함께 설정합니다.",
    passControl: "루트는 WFS/전압 조합의 낮은 쪽에서 시작하세요. 충전은 WFS를 조금씩 올리고 전압은 장비표로 맞춥니다. 암페어 표시값을 단독 설정값으로 보지 마세요.",
  },
  fcaw: {
    name: "CO₂ 플럭스코어드와이어",
    subtitle: "가스실드 플럭스코어드 · FCAW-G",
    control: "전압은 용접기에서 설정하고 전류는 주로 와이어 송급속도로 바뀝니다.",
    passControl: "루트는 제품 절차의 낮은 송급 범위에서 시작하세요. 충전은 송급량을 조정하고, 매 패스 사이 슬래그를 제거합니다.",
  },
};

const smawCurrents = {
  "2.6 mm": { flat: [60, 90], verticalOverhead: [50, 80] },
  "3.2 mm": { flat: [100, 120], verticalOverhead: [80, 110] },
  "4.0 mm": { flat: [110, 160], verticalOverhead: [100, 150] },
};

const elements = {
  thickness: document.querySelector("#thickness"),
  thicknessRange: document.querySelector("#thickness-range"),
  position: document.querySelector("#position"),
  resultTitle: document.querySelector("#result-title"),
  resultThickness: document.querySelector("#result-thickness"),
  processSubtitle: document.querySelector("#process-subtitle"),
  recommendation: document.querySelector("#recommendation-content"),
  resultFootnote: document.querySelector("#result-footnote"),
  prepValues: document.querySelector("#prep-values"),
  prepNote: document.querySelector("#prep-note"),
  passCount: document.querySelector("#pass-count"),
  diagram: document.querySelector("#joint-diagram"),
};

let selectedProcess = "smaw";

function roundToFive(value) {
  return Math.round(value / 5) * 5;
}

function roundToHalf(value) {
  return Math.round(value * 2) / 2;
}

function scaleRange(range, factor) {
  return [roundToFive(range[0] * factor), roundToFive(range[1] * factor)];
}

function getBaseSettings(process, thickness, position) {
  if (process === "smaw") {
    if (thickness < 2) {
      return { amps: null, volts: null, consumable: "", note: "2 mm 미만은 SMAW 자동 추천 제외" };
    }
    const diameter = thickness <= 3 ? "2.6 mm" : thickness <= 6 ? "3.2 mm" : "4.0 mm";
    return {
      amps: smawCurrents[diameter][position],
      volts: null,
      consumable: `E6013 · ${diameter}`,
      note: "제조사 E6013 전류표의 전극 지름·자세별 범위 (DC+)" ,
    };
  }

  let amps;
  let volts = null;
  let consumable;
  let note;

  if (process === "tig") {
    consumable = "DCEN · 아르곤 · 텅스텐 Ø2.4";
    note = "탄소강 TIG 교육용 시작 범위";
    if (thickness <= 2) amps = [30, 60];
    else if (thickness <= 3) amps = [50, 90];
    else if (thickness <= 6) amps = [80, 140];
    else if (thickness <= 12) amps = [120, 180];
    else amps = [160, 220];
  } else if (process === "gmawSolid") {
    consumable = "ER70S-6 · 솔리드 Ø0.9 mm · 순수 CO₂";
    note = "순수 CO₂ 솔리드와이어 교육용 시작 범위";
    if (thickness <= 2) { amps = [50, 100]; volts = [16, 18]; }
    else if (thickness <= 3) { amps = [80, 130]; volts = [17, 19]; }
    else if (thickness <= 6) { amps = [100, 180]; volts = [18, 22]; }
    else if (thickness <= 12) { amps = [150, 220]; volts = [22, 26]; }
    else { amps = [180, 260]; volts = [24, 28]; }
  } else {
    consumable = "E71T-1C · FCAW-G Ø1.2 mm · CO₂";
    note = "CO₂ 가스실드 플럭스코어드 교육용 시작 범위";
    if (thickness < 3) {
      return { amps: null, volts: null, consumable, note: "얇은 판재에는 Ø1.2 mm FCAW 와이어 자동 추천 제외" };
    }
    if (thickness <= 6) { amps = [120, 180]; volts = [22, 25]; }
    else if (thickness <= 12) { amps = [160, 240]; volts = [24, 28]; }
    else { amps = [200, 280]; volts = [26, 30]; }
  }

  if (position === "verticalOverhead") {
    amps = scaleRange(amps, 0.9);
    if (volts) volts = [roundToHalf(volts[0] - 1), roundToHalf(volts[1] - 1)];
    note += " · 수직/위보기는 낮은 열입력 참고값";
  }

  return { amps, volts, consumable, note };
}

function getJointPrep(thickness) {
  if (thickness <= 3) {
    return {
      bevel: "개선 없음 · 사각 맞대기",
      rootFace: "가공하지 않음 (판 두께 유지)",
      rootGap: "0–1 mm 참고",
      note: "얇은 판재는 개선보다 변형·용락 방지가 중요해요.",
      passCount: "1",
    };
  }
  if (thickness <= 6) {
    return {
      bevel: "포함각 약 60° (양쪽 약 30°)",
      rootFace: "1–1.5 mm",
      rootGap: "1–2 mm",
      note: "한쪽 V 개선 맞대기 연습용 기준입니다.",
      passCount: "2–3",
    };
  }
  if (thickness <= 12) {
    return {
      bevel: "포함각 약 60° (양쪽 약 30°)",
      rootFace: "1–1.5 mm",
      rootGap: "1.5–2.5 mm",
      note: "루트 용입을 확인하고 필요한 경우 패스 수를 늘리세요.",
      passCount: "4",
    };
  }
  return {
    bevel: "포함각 약 60–70° 또는 양면 개선",
    rootFace: "1.5–2 mm",
    rootGap: "2–3 mm",
    note: "두꺼운 판재는 다층 용접이 필요해요. 양면 접근이 가능하면 양면 개선도 검토하세요.",
    passCount: "4+",
  };
}

function getPassSchedule(amps, thickness, volts) {
  const makeBand = (range, from, to, round) => {
    const span = range[1] - range[0];
    return [round(range[0] + span * from), round(range[0] + span * to)];
  };
  const makePass = (label, from, to) => ({
    label,
    amps: makeBand(amps, from, to, roundToFive),
    volts: volts ? makeBand(volts, from, to, roundToHalf) : null,
  });

  if (thickness <= 3) return [{ label: "단일 패스", amps, volts }];
  if (thickness <= 6) {
    return [makePass("루트 패스", 0, 0.35), makePass("본용접 1차", 0.2, 0.65), makePass("본용접 2차 · 캡", 0.25, 0.65)];
  }
  return [makePass("루트 패스", 0, 0.3), makePass("본용접 1차", 0.2, 0.5), makePass("본용접 2차", 0.4, 0.8), makePass("본용접 3차 · 캡", 0.25, 0.65)];
}

function diagramSvg(squareEdge) {
  const left = squareEdge ? 135 : 126;
  const right = squareEdge ? 165 : 174;
  const plates = squareEdge
    ? "M20 20H135V112H20Z M280 20H165V112H280Z"
    : "M20 20H106L126 77V112H20Z M280 20H194L174 77V112H280Z";
  const weld = squareEdge ? "M135 20H165V112H135Z" : "M129 77H171V112H129Z";
  const bevelMarks = squareEdge ? "" : '<path d="M106 20L126 77M194 20L174 77" stroke="#ef762f" stroke-width="3"/><path d="M126 77V112M174 77V112" stroke="#525b60" stroke-width="3"/><text x="150" y="36" text-anchor="middle" fill="#bc4f14" font-size="10">개선각</text>';
  const rootFace = squareEdge ? "M130 20V112" : "M119 77V112M115 77H123M115 112H123";
  const rootFaceLabel = squareEdge ? 88 : 98;
  return `<svg viewBox="0 0 300 150" role="img" aria-label="맞대기 이음 개선각, 루트면, 루트간격 설명도"><path d="${plates}" fill="#e4e8e9" stroke="#71797d" stroke-width="3"/><path d="${weld}" fill="#ef9a61" opacity=".9"/>${bevelMarks}<path d="M${left} 124H${right}M${left} 120V128M${right} 120V128" stroke="#18796f" stroke-width="2"/><path d="${rootFace}" stroke="#525b60" stroke-width="2"/><text x="150" y="143" text-anchor="middle" fill="#18796f" font-size="10">루트간격</text><text x="${rootFaceLabel}" y="99" text-anchor="middle" fill="#525b60" font-size="9">루트면</text></svg>`;
}

function renderRecommendation(thickness, position) {
  const valid = Number.isFinite(thickness) && thickness >= 0.8 && thickness <= 20;
  const info = processInfo[selectedProcess];
  elements.resultTitle.textContent = info.name;
  elements.processSubtitle.textContent = info.subtitle;
  elements.resultThickness.textContent = valid ? `${thickness} mm` : "두께 확인";

  if (!valid) {
    elements.recommendation.innerHTML = '<div class="empty-result">두께를 0.8–20 mm 사이로 입력해 주세요.</div>';
    elements.resultFootnote.textContent = "";
    return null;
  }

  const settings = getBaseSettings(selectedProcess, thickness, position);
  if (!settings.amps) {
    const message = selectedProcess === "smaw"
      ? "2 mm 미만은 SMAW로 쉽게 용락될 수 있어 일반 전류를 추천하지 않아요. TIG 등 적합한 공법을 지도교사와 확인하세요."
      : "이 두께에는 선택한 소모재 지름이 너무 클 수 있어요. 더 작은 와이어 규격과 제조사 자료를 확인하세요.";
    elements.recommendation.innerHTML = `<div class="empty-result">${message}</div>`;
    elements.resultFootnote.textContent = "";
    return settings;
  }

  const passes = getPassSchedule(settings.amps, thickness, settings.volts);
  const positionLabel = position === "flat" ? "아래보기/수평" : "수직/위보기";
  const voltageOverview = settings.volts
    ? `<div class="overall-voltage"><span>전체 전압 참고 범위</span><strong>${settings.volts[0]}–${settings.volts[1]} V</strong></div>`
    : "";
  const passCards = passes.map((pass, index) => `
    <article class="pass-card">
      <p class="pass-name"><span class="step-label">0${index + 1}</span> ${pass.label}</p>
      <p class="pass-number">${pass.amps[0]}–${pass.amps[1]} <b>A</b></p>
      ${pass.volts ? `<p class="pass-voltage">전압 ${pass.volts[0]}–${pass.volts[1]} V</p>` : ""}
    </article>`).join("");
  const passHeading = settings.volts ? "패스별 전류·전압 시작 범위" : "패스별 전류 시작 범위";
  const controlNote = `${info.control} ${info.passControl}`;

  elements.recommendation.innerHTML = `
    <div class="consumable-card">
      <div><small>기준 소모재</small><strong>${settings.consumable}</strong></div>
      <span class="position-chip">${positionLabel}</span>
    </div>
    <p class="recommendation-note">${settings.note}</p>
    <div class="overall-current"><strong>${settings.amps[0]}–${settings.amps[1]}</strong><span>A</span><small>전체 참고 범위</small></div>
    ${voltageOverview}
    <div class="pass-heading"><strong>${passHeading}</strong><span>시작 참고값</span></div>
    <div class="pass-list">${passCards}</div>
    <p class="process-control-note">${controlNote}</p>
    <p class="estimate-note">패스별 밴드는 전체 참고 범위 안에서 분배한 교육용 시작값이며, 승인된 WPS의 패스별 설정값은 아닙니다.</p>`;

  elements.resultFootnote.textContent = selectedProcess === "smaw"
    ? "SMAW 범위는 Weldcote E6013 제조사 전류표를 반영합니다."
    : "TIG·GMAW·FCAW는 교육용 일반 시작 범위이며 제품별 WPS/소모재 표를 우선하세요.";
  return settings;
}

function renderJointPrep(thickness) {
  if (!Number.isFinite(thickness) || thickness < 0.8 || thickness > 20) {
    document.querySelector("#joint-section").hidden = true;
    return;
  }
  document.querySelector("#joint-section").hidden = false;
  const prep = getJointPrep(thickness);
  elements.prepValues.innerHTML = [
    ["개선각", prep.bevel],
    ["루트면 (Root face)", prep.rootFace],
    ["루트간격 (Root gap)", prep.rootGap],
  ].map(([label, value]) => `<div class="prep-value"><span>${label}</span><strong>${value}</strong></div>`).join("");
  elements.prepNote.textContent = prep.note;
  elements.passCount.textContent = `예상 패스 수: 약 ${prep.passCount}회부터 확인`;
  elements.diagram.innerHTML = diagramSvg(thickness <= 3);
}

function render() {
  const rawThickness = elements.thickness.value.trim();
  const thickness = rawThickness === "" ? Number.NaN : Number(rawThickness);
  const valid = Number.isFinite(thickness) && thickness >= 0.8 && thickness <= 20;
  const position = elements.position.value;
  if (valid) elements.thicknessRange.value = String(thickness);
  renderRecommendation(thickness, position);
  renderJointPrep(thickness);
}

document.querySelectorAll("[data-process]").forEach((button) => {
  button.addEventListener("click", () => {
    selectedProcess = button.dataset.process;
    document.querySelectorAll("[data-process]").forEach((option) => {
      const selected = option === button;
      option.classList.toggle("is-selected", selected);
      option.setAttribute("aria-pressed", String(selected));
    });
    render();
  });
});

elements.thickness.addEventListener("input", render);
elements.thicknessRange.addEventListener("input", () => {
  elements.thickness.value = elements.thicknessRange.value;
  render();
});
elements.position.addEventListener("change", render);
document.querySelectorAll("[data-thickness]").forEach((button) => {
  button.addEventListener("click", () => {
    elements.thickness.value = button.dataset.thickness;
    elements.thicknessRange.value = button.dataset.thickness;
    render();
  });
});

render();

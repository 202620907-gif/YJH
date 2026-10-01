import hashlib
import random
from io import BytesIO

from PIL import Image, ImageFilter, ImageStat

from schemas import Defect

DEFECT_LIBRARY = {
    "undercut": {
        "name": "언더컷 (Undercut)",
        "description": "비드 가장자리의 모재가 파인 홈이 관찰됩니다. 그대로 두면 피로 강도가 크게 떨어지는 부위입니다.",
        "causes": {
            "default": ["용접 전류가 너무 높음", "토치 전진 속도가 너무 빠름"],
            "TIG": ["전류 대비 토치 이동 속도가 빠름", "필러 와이어 공급이 부족함"],
            "SMAW": ["아크가 너무 길어(롱아크) 전압이 높아짐", "전극 각도가 비드 가장자리를 파고듦"],
            "GMAW": ["전압이 높거나 와이어 송급 속도가 낮음", "토치 각도가 푸시 방향으로 기울어 있음"],
        },
        "fixes": [
            "전류를 10~15A 낮추고 이동 속도를 약간 늦춰 보세요.",
            "토치를 진행 방향 기준 70~80도로 세워 아크를 비드 중앙에 유지하세요.",
            "가장자리에 모재가 녹아 채워지도록 위빙 폭을 줄이세요.",
        ],
    },
    "overlap": {
        "name": "오버랩 (Overlap)",
        "description": "용착 금속이 모재 위로 흘러붙어 융합되지 않은 채 겹쳐진 모양이 보입니다.",
        "causes": {
            "default": ["용접 전류가 너무 낮아 모재 융합이 부족함", "이동 속도가 너무 느려 용융금이 흘러내림"],
            "TIG": ["필러 로드를 너무 많이 넣음", "열 입력이 부족한 상태에서 필러를 녹임"],
            "SMAW": ["전류가 낮거나 전극이 너무 느리게 이동함", "다운힐 자세에서 용융금이 앞으로 흘러넘침"],
            "GMAW": ["전압이 낮아 와이어가 모재에 뭉치는 단락이 잦음", "토치가 뒤로 기울어(백핸드) 용융금이 앞에 쌓임"],
        },
        "fixes": [
            "전류를 10~20A 올려 모재가 충분히 녹도록 하세요.",
            "이동 속도를 일정하게 유지하고, 용융풀이 앞으로 흐르지 않게 토치 각도를 조정하세요.",
            "오버랩 부위는 그라인딩으로 제거 후 다시 용접하세요.",
        ],
    },
    "porosity": {
        "name": "기공 · 기포 (Porosity)",
        "description": "비드 표면에 작은 구멍(기포 자국)이 관찰됩니다. 내부 결함으로 이어질 수 있는 주요 결함입니다.",
        "causes": {
            "default": ["보호가스 유량 부족 또는 바람 유입", "모재 표면의 녹, 기름, 수분 오염"],
            "TIG": ["가스 노즐이 모재에서 너무 멂", "텅스텐 노출 길이가 너무 김"],
            "SMAW": ["피복 전극이 흡습됨(개봉 후 오래 방치)", "롱아크로 공기가 유입됨"],
            "GMAW": ["가스 호스 누설 또는 노즐에 스패터가 막힘", "환기 팬 바람이 용접부에 직접 닿음"],
        },
        "fixes": [
            "보호가스 유량계를 확인하세요. (TIG 8~12L/min, CO2 15~20L/min 권장)",
            "모재를 와이어 브러시와 아세톤으로 깨끗이 닦고 시작하세요.",
            "개봉한 전극은 건조기(오븐)에 보관하고 바람 원인을 차단하세요.",
        ],
    },
    "spatter": {
        "name": "스패터 (Spatter)",
        "description": "비드 주변에 튄 금속 방울이 다수 부착되어 있습니다. 조건·자세 이상을 알려주는 신호입니다.",
        "causes": {
            "default": ["전류·전압 조건 불균형", "모재 오염 또는 고정 불량으로 인한 틈새"],
            "TIG": ["전류가 높아 필러가 과열됨", "아크 길이가 길다 짧다 반복됨"],
            "SMAW": ["아크 길이가 너무 김", "전류가 규격보다 높음", "스틱(아크 튕김) 발생"],
            "GMAW": ["전압과 송급 속도 불일치", "와이어 돌출부(스틱아웃)가 너무 김"],
        },
        "fixes": [
            "아크 길이를 모재 지름의 절반 이하로 짧게 유지하세요.",
            "CO2 용접이라면 전압과 송급 속도를 매뉴얼 표준 조건에 맞추세요.",
            "용접 전 안티 스패터 스프레이를 사용하고, 튄 자국은 철솔로 제거하세요.",
        ],
    },
    "bead_irregular": {
        "name": "비드 불균일 (Irregular Bead)",
        "description": "비드 폭이 일정하지 않고 물결 무늬(리플)가 불규칙합니다. 손 이동의 일정성이 부족한 상태입니다.",
        "causes": {
            "default": ["토치 이동 속도가 일정하지 않음", "위빙 폭과 리듬이 매 용접마다 다름"],
            "TIG": ["필러 공급 리듬이 일정하지 않음", "손목 고정 없이 팔 전체로 움직임"],
            "SMAW": ["전극 소모에 따른 아크 길이 변화를 보정하지 못함", "자세가 불안정해 시선이 고정되지 않음"],
            "GMAW": ["손떨림 보정 없이 장거리 이동함", "트리거 조작과 이동 속도가 맞지 않음"],
        },
        "fixes": [
            "양팔꿈치를 몸에 붙이고 손목 대신 팔꿈치 축으로 이동하는 자세를 연습하세요.",
            "가이드 선을 그어 놓고 일정 속도로 직선 이동하는 드라이런을 반복하세요.",
            "'1초에 1물결' 같은 리듬을 정해 위빙 간격을 일정하게 유지하세요.",
        ],
    },
    "crack": {
        "name": "크랙 · 균열 (Crack)",
        "description": "비드 또는 열영향부에 균열이 의심되는 선이 관찰됩니다. 가장 위험한 결함으로 반드시 제거·재용접이 필요합니다.",
        "causes": {
            "default": ["급냉에 의한 수소 유입 균열", "고정이 불안정해 응력이 집중됨"],
            "TIG": ["필러 금속과 모재 조성 불일치", "후열 처리 없이 급랭됨"],
            "SMAW": ["저수소계 전극 미사용 또는 흡습", "틈새(루트 갭)가 과도하게 벌어짐"],
            "GMAW": ["강판 두께 대비 낮은 열입력으로 급랭됨", "피팅 간격 불량"],
        },
        "fixes": [
            "균열 부위를 균열 끝에서 10mm 이상 여유를 두고 그라인딩으로 완전 제거하세요.",
            "저수소계 소재(예: E7018)를 사용하고 개봉 후 즉시 사용하세요.",
            "틱택 용접 수와 간격을 늘려 고정 응력을 분산시키세요.",
        ],
    },
    "soot": {
        "name": "탄 착색 · 그을음 (Soot)",
        "description": "비드 주변이 검거나 푸르스름하게 그을려 있습니다. 보호가스 커버가 불충분했다는 신호입니다.",
        "causes": {
            "default": ["보호가스 유량 부족 또는 과다", "노즐과 모재 거리(CTWD)가 너무 멂"],
            "TIG": ["가스렌즈 없이 텅스텐 노출이 김", "용접 후 토치를 너무 빨리 치움(후가스 부족)"],
            "SMAW": ["전극 피복이 불균일하게 연소됨", "롱아크로 공기와 접촉이 많음"],
            "GMAW": ["노즐 내부 스패터로 가스 흐름이 방해받음", "바람이 많은 실습실 환경"],
        },
        "fixes": [
            "TIG는 가스렌즈를 장착하고 용접 후 5~10초 후가스(다운 타이머)를 유지하세요.",
            "노즐 내부 스패터를 매 용접 전에 제거하고 유량을 권장 범위로 맞추세요.",
            "착색은 와이어 브러시로 제거하고 다음 층에 영향이 없게 정리하세요.",
        ],
    },
    "arc_strike": {
        "name": "아크 스트라이크 (Arc Strike)",
        "description": "비드 밖 모재에 틱 자국(아크 점화 흔적)이 남아 있습니다. 모재 국부 경화의 원인이 됩니다.",
        "causes": {
            "default": ["비드 밖에서 아크를 실수로 점화함", "토치를 대고 실수로 트리거·스트라이크 함"],
            "TIG": ["HF 하이프레퀀시 점화 중 토치가 모재에 닿음"],
            "SMAW": ["성냥불 긋듯 점화하다 비드 밖에 닿음"],
            "GMAW": ["트리거 확인 차에 노즐이 모재에 접촉함"],
        },
        "fixes": [
            "아크는 반드시 용접 시작점에서 점화하세요.",
            "남은 자국은 그라인딩으로 제거하고 표면을 확인하세요.",
        ],
    },
}

GOOD_POINTS = [
    "비드의 전체적인 흐름이 시작점에서 끝점까지 이어져 있습니다.",
    "용접 라인이 직선을 유지하려는 노력이 보입니다.",
    "리플(물결 무늬)이 일정 간격으로 형성되려고 하고 있습니다.",
    "스패터가 적어 조건 설정이 크게 벗어나지 않았습니다.",
]

SEVERITY_DEDUCTION = {"심각": 18, "보통": 11, "경미": 6}

GRADE_TABLE = [(90, "A"), (80, "B"), (70, "C"), (60, "D"), (0, "F")]


def _image_stats(image_bytes: bytes) -> dict:
    image = Image.open(BytesIO(image_bytes)).convert("RGB")
    small = image.resize((128, 128))
    gray = small.convert("L")
    brightness = ImageStat.Stat(gray).mean[0]
    edges = gray.filter(ImageFilter.FIND_EDGES)
    edge_mean = ImageStat.Stat(edges).mean[0]
    r, g, b = [ImageStat.Stat(small.split()[i]).mean[0] for i in range(3)]
    return {"brightness": brightness, "edge_mean": edge_mean, "warmth": r - b}


class MockAnalyzer:
    name = "mock"

    def analyze(self, image_bytes: bytes, process: str, material: str, position: str, memo: str) -> dict:
        seed = hashlib.md5(image_bytes).hexdigest()
        rng = random.Random(seed)
        stats = _image_stats(image_bytes)

        picked = []
        if stats["edge_mean"] > 28:
            picked.append(("spatter", rng.choice(["경미", "보통"])))
        if stats["brightness"] < 55:
            picked.append(("soot", "경미"))
        if stats["edge_mean"] > 34:
            picked.append(("bead_irregular", "보통"))

        pool = ["undercut", "overlap", "porosity", "bead_irregular", "arc_strike"]
        target = rng.randint(1, 3)
        while len(picked) < target:
            key = rng.choice(pool)
            if key not in [k for k, _ in picked]:
                severity = "보통" if key in ("undercut", "overlap") else "경미"
                picked.append((key, severity))

        if rng.random() < 0.12:
            picked.append(("crack", "심각"))
        if not picked:
            picked.append(("bead_irregular", "경미"))

        defects = []
        for key, severity in picked:
            entry = DEFECT_LIBRARY[key]
            causes = entry["causes"].get(process) or entry["causes"]["default"]
            defects.append(
                {
                    "name": entry["name"],
                    "severity": severity,
                    "description": entry["description"],
                    "causes": causes[:2],
                    "fixes": entry["fixes"][:2],
                }
            )

        score = 95
        for d in defects:
            score -= SEVERITY_DEDUCTION[d["severity"]]
        score = max(40, min(96, score))

        grade = next(g for threshold, g in GRADE_TABLE if score >= threshold)

        names = "와 ".join(d["name"].split(" (")[0] for d in defects)
        good = rng.choice(GOOD_POINTS)
        summary = (
            f"{process} 용접 사진을 분석했습니다. {good} "
            f"다만 {names}이(가) 관찰되어 점수는 {score}점입니다. "
            "아래 원인과 개선 방법을 확인하고 다음 실습에 적용해 보세요."
        )

        tips = [f"[{d['name'].split(' (')[0]}] {d['fixes'][0]}" for d in defects]
        tips.append("용접 전 모재 청소와 조건표 확인을 습관화하세요.")

        return {
            "score": score,
            "grade": grade,
            "summary": summary,
            "defects": defects,
            "tips": tips,
            "process": process,
            "analyzer": self.name,
        }

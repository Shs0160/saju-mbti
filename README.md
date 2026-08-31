# 사주팔자 × MBTI

천문 계산으로 뽑은 만세력 위에 MBTI를 겹쳐, **타고난 기질과 지금의 성격이 어디서 갈라졌는지** 읽어주는 웹페이지입니다.

백엔드가 없습니다. 절기 계산부터 해석 생성까지 전부 브라우저 안에서 돌고, 생년월일은 어디로도 전송되지 않습니다.

[English](#saju--mbti) · [데모](https://saju-mbti.vercel.app)

---

## 무엇이 다른가

사주만 보는 서비스도, MBTI만 보는 서비스도 많습니다. 이 페이지는 **둘의 차이**를 봅니다.

사주는 태어난 순간에 받은 설계도이고, MBTI는 살아오면서 만들어진 지금의 형태입니다. 그래서 원국에서 MBTI 4축을 역산해 "그대로 자랐다면 이랬을 유형"을 뽑고, 실제 MBTI와 비교합니다. **어긋난 축이 곧 환경이 바꿔놓은 부분**이고, 원국의 어떤 압력이 그걸 만들었는지까지 짚습니다.

> 원국은 당신을 판단이 분명한 사람으로 만들었습니다. 감정보다 이치가 먼저 보이는 쪽이었어요.
> 그런데 지금의 당신은 사람의 마음을 먼저 살핍니다.
> 원국에는 관성이 4개 들어 있습니다. 해야 할 일과 지켜야 할 시선이, 어릴 때부터 유난히 많았다는 뜻이에요.

---

## 만세력 정확도

절기 테이블을 박아넣지 않고 **VSOP87 절단 급수로 태양 황경을 직접 계산**합니다.

| 검증 항목 | 결과 |
|---|---|
| 24절기 실시각 | 한국천문연구원 공식값과 분 단위 일치 |
| 양력 ↔ 음력 왕복 | 1900~2060년 **5,796건 100% 통과** |
| 윤달 판정 | 1995 윤8월, 2020 윤4월, 2023 윤2월, 2025 윤6월, 2033 윤11월 |
| 일진(日辰) | 1900-01-01 갑술, 2000-01-01 무오 |
| 설날 간격 | 86년 연속 자기일관성 무오류 |

절기 시각 대조 예시:

```
2024 입춘  17:27      2024 춘분  12:06      2024 하지  05:51
2025 입춘  23:10      2026 입춘  05:02
```

### 반영한 보정

- **한국 표준시 역사**: 1908~1911년, 1954~1961년 UTC+08:30 구간
- **일광절약시간제**: 1948~1960년, 1987~1988년 총 12개 구간
- **진태양시**: 출생지 경도 기준 (서울 −32분, 부산 −24분)
- **야자시**: 밤 11시 이후를 다음 날로 볼지 선택
- **ΔT**: Espenak-Meeus 다항식으로 TT와 UT 차이 보정

음력은 변환 테이블 없이 **삭(합삭) 시각을 Meeus 알고리즘으로 계산**하고, 동지를 포함한 달을 11월로 놓는 시헌력 규칙으로 윤달까지 판정합니다.

---

## 타고난 기질을 뽑는 방식

원국의 다섯 가지 정보를 MBTI 4축으로 환산합니다. 가중치 순서는 **격국(월지) > 십신 분포 > 오행 비율 > 신살** 입니다.

```
기여율   격국 39~41%   십신 36~38%   오행 15~22%   신살 2~7%
```

십신 10종에 각각 4축 지향값을 부여합니다. 정편(正偏) 구분이 핵심입니다. 正은 규범과 안정(S/J), 偏은 변동과 확장(N/P) 쪽으로 갑니다.

```
        E/I    S/N    T/F    J/P
정관    0.85  -0.35  -0.85  -1.00
정재   -0.15  -0.95  -0.55  -0.90
편재   -0.50   0.65  -0.70   0.95
상관   -0.90   0.85  -0.40   0.90
```

오행의 T/F 대응은 오상(五常)을 따릅니다. 木=仁, 火=禮, 土=信, 金=義, 水=智.

**신강·신약은 축에 넣지 않습니다.** 방향이 아니라 성향이 드러나는 강도이므로 최종값에 배수(신강 ×1.18, 신약 ×0.85)로만 적용합니다.

### 분포

무작위 생일 6,000명 기준입니다.

```
에너지 E 50.0 : I 50.0      인식 S 50.0 : N 50.0
판단   T 50.0 : F 50.0      생활 J 50.0 : P 50.0

16유형 전부 출현 · 최다 ENTP 15.1% · 최소 ENTJ 0.7%
```

축 테이블만으로는 T/F가 61.7:38.3으로 쏠렸습니다. 십신 10종 중 F쪽이 식신·편인·정인 3개뿐이라 열 평균이 T로 기울기 때문입니다. 표본 중앙값을 0으로 맞추는 보정값을 넣어 균형을 잡았습니다.

---

## 알아두어야 할 한계

정직하게 적습니다.

1. **축 매핑은 명리 원전에 없습니다.** 사주에는 MBTI 개념이 없으므로 대응 근거가 고전에 존재하지 않습니다. 십신과 오행의 전통적 의미를 MBTI 4축 정의에 맞춰 배치한 자체 구성입니다.
2. **검증 데이터가 없습니다.** 실제 적중률을 잰 적이 없습니다. 축별 신뢰도 표시는 명리 실무 경험에 근거한 판단이지 측정값이 아닙니다.
3. **T/F 축이 가장 약합니다.** 십신은 관계와 기능의 언어지 정서 처리 방식의 언어가 아닙니다. 명리에 감정을 재는 축이 없다는 구조적 한계입니다. 페이지에도 신뢰도 '하'로 표시됩니다.
4. **유형 분포가 고르지 않습니다.** 正 계열은 실제 인구 분포와 거의 일치하지만(ISFJ 12.0 대 13.8, ISTJ 11.6 대 11.6) ENTP가 15.1%로 실제 3.2%보다 과합니다.
5. **재미로 보는 콘텐츠입니다.** 의학·법률·투자 판단의 근거로 쓰지 마세요.

---

## 기술

의존성이 없습니다. 라이브러리도, 빌드 도구도, 프레임워크도 쓰지 않습니다.

```
engine.js       만세력. VSOP87 태양 황경, Meeus 삭 계산, 음력 변환, 사주 도출
content.js      해석. 축 역산, 변화 서사, 영역별 리포트
app.js          UI. 입력, 계산 호출, 렌더
template.html   판면. 한지·활자본 판식 스타일
build.js        위 넷을 단일 HTML로 합침
```

### 빌드

```bash
node build.js
```

두 개가 나옵니다.

- `dist/index.html` 정적 호스팅용 완결 문서
- `saju-mbti.html` 임베드용 조각

### 배포

파일 하나만 올리면 끝입니다.

```bash
npx vercel deploy dist --prod
```

배포 전에 `dist/index.html` 안의 `__SITE_URL__`을 실제 도메인으로 바꾸고, OG 미리보기용 `og.png`(1200×630)를 같은 폴더에 넣으세요.

### 외부 요청

Google Fonts 하나뿐입니다. 생년월일과 MBTI는 서버로 전송되지 않으며, 결과 공유는 URL 해시에 상태를 담는 방식입니다.

---

## 라이선스

MIT

---
---

# Saju × MBTI

A web page that computes your Korean **Saju** (Four Pillars of Destiny) from real astronomical data, then overlays MBTI to show **where your innate temperament and your current personality diverged**.

No backend. Everything from solar-term calculation to text generation runs in the browser, and your birth data never leaves the page.

[한국어](#사주팔자--mbti) · [Demo](https://saju-mbti.vercel.app)

---

## What makes it different

Plenty of services read your Saju. Plenty more type you as an MBTI. This one reads **the gap between them**.

Saju is the blueprint you were handed at birth. MBTI is the shape life has since worn you into. So the engine derives an MBTI-like type from your natal chart alone, then compares it against your actual MBTI. **The axes that disagree are what your environment changed**, and the report traces which pressure in the chart caused it.

---

## Ephemeris accuracy

No lookup tables. Solar longitude is computed directly from a **truncated VSOP87 series**.

| Check | Result |
|---|---|
| 24 solar terms | Matches KASI (Korea Astronomy Institute) official times to the minute |
| Solar ↔ lunar round trip | **5,796 conversions, 1900-2060, 100% pass** |
| Leap months | 1995 leap-8, 2020 leap-4, 2023 leap-2, 2025 leap-6, 2033 leap-11 |
| Sexagenary day | 1900-01-01 = 甲戌, 2000-01-01 = 戊午 |
| Lunar New Year | 86 consecutive years, no interval violations |

### Corrections applied

- **Historical Korea Standard Time**: UTC+08:30 during 1908-1911 and 1954-1961
- **Daylight saving**: 12 periods across 1948-1960 and 1987-1988
- **True solar time**: longitude offset by birthplace (Seoul −32 min, Busan −24 min)
- **Late-night hour rule**: option to roll 23:00+ into the next day
- **ΔT**: Espenak-Meeus polynomials for TT/UT difference

The lunar calendar is derived by computing **new moon instants via Meeus**, then applying the Shixian rule where the month containing the winter solstice is month 11. Leap months fall out of this, no table required.

---

## How the innate type is derived

Five signals from the natal chart map onto the four MBTI axes, weighted in this order: **month-branch structure (格局) > ten-god distribution > five-element ratio > symbolic stars**.

```
Contribution   格局 39-41%   ten gods 36-38%   elements 15-22%   stars 2-7%
```

Each of the ten gods carries a four-axis vector. The **正 / 偏 (direct / indirect) split** does the heavy lifting: 正 gods pull toward structure and stability (S/J), 偏 gods toward variation and expansion (N/P).

The T/F element mapping follows the Five Constants: Wood = benevolence, Fire = propriety, Earth = trust, Metal = righteousness, Water = wisdom.

**Body strength is not an axis.** It governs how strongly traits surface, not which direction they point, so it applies only as a multiplier (strong ×1.18, weak ×0.85).

### Distribution

Across 6,000 random birth dates:

```
E 50.0 : I 50.0        S 50.0 : N 50.0
T 50.0 : F 50.0        J 50.0 : P 50.0

All 16 types present · most common ENTP 15.1% · rarest ENTJ 0.7%
```

---

## Known limitations

Stated plainly.

1. **The axis mapping is not classical.** Saju has no concept of MBTI, so no canonical correspondence exists. This is an original construction that places traditional meanings of the ten gods and five elements against the MBTI axis definitions.
2. **There is no validation data.** Accuracy has never been measured. The per-axis confidence labels reflect practitioner judgment, not measurement.
3. **The T/F axis is the weakest.** The ten gods speak the language of relationships and functions, not emotional processing. Saju simply has no axis for measuring feeling. The page labels this axis low-confidence.
4. **Type distribution is uneven.** The 正 cluster tracks real-world MBTI frequencies closely (ISFJ 12.0 vs 13.8, ISTJ 11.6 vs 11.6), but ENTP comes out at 15.1% against a real 3.2%.
5. **This is entertainment.** Do not use it for medical, legal, or financial decisions.

---

## Tech

Zero dependencies. No libraries, no build tooling, no framework.

```
engine.js       Ephemeris. VSOP87 solar longitude, Meeus new moon, lunar conversion, chart derivation
content.js      Interpretation. Axis derivation, change narratives, per-domain report
app.js          UI. Input, calculation, rendering
template.html   Layout. Hanji paper and woodblock-print typography
build.js        Bundles the four into a single HTML file
```

### Build

```bash
node build.js
```

Produces `dist/index.html` (standalone document) and `saju-mbti.html` (embeddable fragment).

### Deploy

One file is all it takes.

```bash
npx vercel deploy dist --prod
```

Before deploying, replace `__SITE_URL__` in `dist/index.html` with your domain and drop a 1200×630 `og.png` beside it for link previews.

### Network

Google Fonts is the only external request. Birth data and MBTI are never transmitted; result sharing encodes state in the URL hash.

---

## License

MIT

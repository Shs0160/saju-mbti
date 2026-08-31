const fs = require('fs');
const path = require('path');

const engine = fs.readFileSync('engine.js', 'utf8').replace(/if \(typeof module[\s\S]*$/, '')
  + '\nconst ENGINE = { GAN, JI, OHENG, buildSaju, tenGod, lunarMonthLength, leapMonthOf, solarToLunar, lunarToSolar };\n';
const content = fs.readFileSync('content.js', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');

const html = fs.readFileSync('template.html', 'utf8')
  .replace('/*__ENGINE__*/', () => engine)
  .replace('/*__CONTENT__*/', () => content)
  .replace('/*__APP__*/', () => app);

/* 1) 아티팩트용 — body 조각 (런타임이 doctype/head/body로 감쌈) */
fs.writeFileSync('saju-mbti.html', html);

/* 2) 정적 호스팅용 — 완결된 HTML 문서 */
const DESC = '사주는 태어날 때 받은 설계도, MBTI는 살아오면서 만들어진 지금의 모양. 둘을 겹쳐서 환경이 당신의 무엇을 바꿔놓았는지 읽어드립니다.';
const SITE = '__SITE_URL__';   // 배포 도메인으로 치환 (예: https://saju-mbti.pages.dev)

const cut = html.indexOf('<style>');
const headBits = html.slice(0, cut).replace(/<title>[\s\S]*?<\/title>\s*/, '').trim();
const bodyHtml = html.slice(cut);

const standalone = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>사주팔자 × MBTI</title>
<meta name="description" content="${DESC}">
<meta name="color-scheme" content="light">
<meta name="theme-color" content="#F8F2E2">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%8C%97%3C/text%3E%3C/svg%3E">
<link rel="canonical" href="${SITE}/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="사주팔자 × MBTI">
<meta property="og:title" content="사주팔자 × MBTI">
<meta property="og:description" content="${DESC}">
<meta property="og:url" content="${SITE}/">
<meta property="og:image" content="${SITE}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="사주팔자 × MBTI">
<meta name="twitter:description" content="${DESC}">
<meta name="twitter:image" content="${SITE}/og.png">
${headBits}
</head>
<body>
${bodyHtml}
</body>
</html>
`;
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync(path.join('dist', 'index.html'), standalone);

console.log('아티팩트용  saju-mbti.html   ' + (html.length / 1024).toFixed(1) + ' KB');
console.log('정적배포용  dist/index.html  ' + (standalone.length / 1024).toFixed(1) + ' KB');

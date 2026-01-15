/**
 * 스프라이트 이미지를 개별 뱃지 이미지로 분리하는 스크립트
 * 3x3 그리드에서 필요한 6개 뱃지를 추출합니다.
 *
 * 사용법: node split-sprite.js <스프라이트_이미지_경로>
 * 예시: node split-sprite.js sprite.png
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// sharp 라이브러리 사용 (이미지 처리)
let sharp;
try {
  sharp = (await import("sharp")).default;
} catch (e) {
  console.error("❌ sharp 라이브러리가 설치되어 있지 않습니다.");
  console.log("설치 명령: pnpm add sharp");
  process.exit(1);
}

// 등급별 매핑 (3x3 그리드에서 추출할 위치)
// 그리드 순서: (row, col) - 0부터 시작
const GRADE_MAPPING = {
  black: { row: 2, col: 2 }, // 골드 (오른쪽 아래) - 블랙으로 사용
  red: { row: 2, col: 1 }, // 빨간색 (중앙 아래)
  brown: { row: 2, col: 0 }, // 브론즈 (왼쪽 아래)
  purple: { row: 1, col: 2 }, // 짙은 보라색 (오른쪽 중앙)
  blue: { row: 1, col: 0 }, // 짙은 파란색 (왼쪽 중앙)
  white: { row: 0, col: 0 }, // 실버/회색 (왼쪽 위) - 화이트로 사용
};

async function splitSprite(spritePath, outputDir) {
  try {
    // 이미지 메타데이터 가져오기
    const metadata = await sharp(spritePath).metadata();
    const imgWidth = metadata.width;
    const imgHeight = metadata.height;

    console.log(`스프라이트 이미지 크기: ${imgWidth}x${imgHeight}`);

    // 셀 크기 계산 (3x3 그리드 가정)
    const cellWidth = Math.floor(imgWidth / 3);
    const cellHeight = Math.floor(imgHeight / 3);

    console.log(`각 셀 크기: ${cellWidth}x${cellHeight}`);

    // 출력 디렉토리 생성
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 각 등급별로 이미지 추출
    for (const [gradeName, { row, col }] of Object.entries(GRADE_MAPPING)) {
      // 셀 위치 계산
      const left = col * cellWidth;
      const top = row * cellHeight;

      // 이미지 자르기
      await sharp(spritePath)
        .extract({
          left,
          top,
          width: cellWidth,
          height: cellHeight,
        })
        .toFile(path.join(outputDir, `${gradeName}.png`));

      console.log(`✅ ${gradeName}.png 저장 완료 (위치: row=${row}, col=${col})`);
    }

    console.log(`\n✨ 모든 뱃지 이미지가 ${outputDir}에 저장되었습니다!`);
  } catch (error) {
    console.error("❌ 오류 발생:", error.message);
    process.exit(1);
  }
}

// 메인 실행
const spritePath = process.argv[2];
const outputDir = process.argv[3] || path.join(__dirname, "packages", "app", "public", "badges");

if (!spritePath) {
  console.error("사용법: node split-sprite.js <스프라이트_이미지_경로> [출력_디렉토리]");
  console.log("예시: node split-sprite.js sprite.png");
  process.exit(1);
}

if (!fs.existsSync(spritePath)) {
  console.error(`❌ 오류: 이미지 파일을 찾을 수 없습니다: ${spritePath}`);
  process.exit(1);
}

splitSprite(spritePath, outputDir).catch((error) => {
  console.error("❌ 실행 중 오류 발생:", error);
  process.exit(1);
});

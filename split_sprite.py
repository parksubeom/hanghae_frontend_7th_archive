#!/usr/bin/env python3
"""
스프라이트 이미지를 개별 뱃지 이미지로 분리하는 스크립트
3x3 그리드에서 필요한 6개 뱃지를 추출합니다.
"""

from PIL import Image
import os
import sys

# 등급별 매핑 (3x3 그리드에서 추출할 위치)
# 그리드 순서: (row, col) - 0부터 시작
GRADE_MAPPING = {
    "black": (2, 2),    # 골드 (오른쪽 아래) - 블랙으로 사용
    "red": (2, 1),      # 빨간색 (중앙 아래)
    "brown": (2, 0),    # 브론즈 (왼쪽 아래)
    "purple": (1, 2),   # 짙은 보라색 (오른쪽 중앙)
    "blue": (1, 0),     # 짙은 파란색 (왼쪽 중앙)
    "white": (0, 0),    # 실버/회색 (왼쪽 위) - 화이트로 사용
}

def split_sprite(sprite_path, output_dir, cell_width=None, cell_height=None):
    """
    스프라이트 이미지를 개별 이미지로 분리
    
    Args:
        sprite_path: 스프라이트 이미지 파일 경로
        output_dir: 출력 디렉토리
        cell_width: 각 셀의 너비 (None이면 자동 계산)
        cell_height: 각 셀의 높이 (None이면 자동 계산)
    """
    # 이미지 로드
    img = Image.open(sprite_path)
    img_width, img_height = img.size
    
    print(f"스프라이트 이미지 크기: {img_width}x{img_height}")
    
    # 셀 크기 계산 (3x3 그리드 가정)
    if cell_width is None:
        cell_width = img_width // 3
    if cell_height is None:
        cell_height = img_height // 3
    
    print(f"각 셀 크기: {cell_width}x{cell_height}")
    
    # 출력 디렉토리 생성
    os.makedirs(output_dir, exist_ok=True)
    
    # 각 등급별로 이미지 추출
    for grade_name, (row, col) in GRADE_MAPPING.items():
        # 셀 위치 계산
        x = col * cell_width
        y = row * cell_height
        
        # 이미지 자르기
        box = (x, y, x + cell_width, y + cell_height)
        cell_img = img.crop(box)
        
        # 파일 저장
        output_path = os.path.join(output_dir, f"{grade_name}.png")
        cell_img.save(output_path, "PNG")
        print(f"✅ {grade_name}.png 저장 완료 (위치: row={row}, col={col})")
    
    print(f"\n✨ 모든 뱃지 이미지가 {output_dir}에 저장되었습니다!")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("사용법: python split_sprite.py <스프라이트_이미지_경로> [출력_디렉토리]")
        print("예시: python split_sprite.py sprite.png packages/app/public/badges")
        sys.exit(1)
    
    sprite_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "packages/app/public/badges"
    
    if not os.path.exists(sprite_path):
        print(f"❌ 오류: 이미지 파일을 찾을 수 없습니다: {sprite_path}")
        sys.exit(1)
    
    split_sprite(sprite_path, output_dir)


// src/lib/utils.ts

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// [수정] UTC 기준으로 포맷팅하여 서버/클라이언트 일관성 확보
export const formatDate = (dateString: string | Date) => {
  const date = typeof dateString === "string" ? new Date(dateString) : dateString;

  // Invalid Date 체크
  if (isNaN(date.getTime())) {
    console.warn("Invalid date:", dateString);
    return "날짜 없음";
  }

  // UTC 기준으로 날짜 추출하여 서버/클라이언트 간 일관성 보장
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  // 서버/클라이언트 항상 동일하게 "2024. 1. 1." 형태로 반환
  return `${year}. ${month}. ${day}.`;
};

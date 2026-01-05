// src/lib/utils.ts

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// [수정] toLocaleDateString 제거하고 직접 포맷팅
export const formatDate = (dateString: string | Date) => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // 서버/클라이언트 항상 동일하게 "2024. 1. 1." 형태로 반환
  return `${year}. ${month}. ${day}.`;
};

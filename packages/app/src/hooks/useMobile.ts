import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 768;

// [수정] 서버와 클라이언트에서 일관된 초기값을 보장하기 위해 항상 false로 시작
// useEffect에서만 실제 값을 설정하여 하이드레이션 불일치 방지
export function useMobile() {
  // 서버와 클라이언트 모두에서 동일한 초기값(false) 사용
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    // 클라이언트에서만 실행됨
    if (typeof window === "undefined") return;

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return mobile;
}

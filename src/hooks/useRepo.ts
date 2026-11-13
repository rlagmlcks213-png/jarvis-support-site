"use client";

import { useCallback, useEffect, useState } from "react";
import { errorMessage, getViewer, subscribeData } from "@/lib/repository";

/**
 * repository 함수를 호출하고, 이 브라우저에서 데이터를 바꾸면 자동으로 다시 불러온다.
 * data가 undefined면 첫 로딩 중.
 */
export function useRepo<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => subscribeData(() => setTick((t) => t + 1)), []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fn()
      .then((d) => {
        if (!alive) return;
        setData(d);
        setError(null);
      })
      .catch((e) => alive && setError(errorMessage(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload };
}

/**
 * 지금 보는 사람이 관리자인지. undefined = 확인 중.
 * 화면에 관리자 버튼을 보여줄지 정하는 용도이고, 실제 권한은 서버가 매번 다시 확인한다.
 */
export function useViewer(): { isAdmin: boolean; name: string | null } | undefined {
  const [viewer, setViewer] = useState<{ isAdmin: boolean; name: string | null } | undefined>(undefined);
  useEffect(() => {
    getViewer()
      .then(setViewer)
      .catch(() => setViewer({ isAdmin: false, name: null }));
  }, []);
  return viewer;
}

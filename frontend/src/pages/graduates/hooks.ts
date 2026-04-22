import { useEffect, type RefObject } from "react";
import { downloadBlob } from "../../lib/download";
import {
  listGraduates,
  listRegions,
  listStudyPrograms,
  type Graduate,
  type StudyProgram,
} from "../../lib/api";

export async function loadGraduatesScreen(params: Record<string, unknown>) {
  const [studyProgramsResponse, regionsResponse, graduatesResponse] = await Promise.all([
    listStudyPrograms(),
    listRegions({ type: "PERIPHERY" }),
    listGraduates(params),
  ]);

  return {
    programs: (studyProgramsResponse.items ?? []) as StudyProgram[],
    regions: regionsResponse.items ?? [],
    items: (graduatesResponse.items ?? []) as Graduate[],
    total: Number(graduatesResponse.total ?? 0),
  };
}

export function useSyncedScrollbar(
  tableWrapRef: RefObject<HTMLDivElement | null>,
  floatingScrollbarRef: RefObject<HTMLDivElement | null>,
  floatingScrollbarInnerRef: RefObject<HTMLDivElement | null>,
  deps: ReadonlyArray<unknown>
) {
  useEffect(() => {
    const wrap = tableWrapRef.current;
    const bar = floatingScrollbarRef.current;
    const inner = floatingScrollbarInnerRef.current;
    if (!wrap || !bar || !inner) return;

    let syncing = false;

    const update = () => {
      inner.style.width = `${wrap.scrollWidth}px`;
      bar.style.display = wrap.scrollWidth > wrap.clientWidth ? "block" : "none";
      bar.scrollLeft = wrap.scrollLeft;
    };

    const syncFromWrap = () => {
      if (syncing) return;
      syncing = true;
      bar.scrollLeft = wrap.scrollLeft;
      syncing = false;
    };

    const syncFromBar = () => {
      if (syncing) return;
      syncing = true;
      wrap.scrollLeft = bar.scrollLeft;
      syncing = false;
    };

    update();
    wrap.addEventListener("scroll", syncFromWrap);
    bar.addEventListener("scroll", syncFromBar);
    window.addEventListener("resize", update);

    return () => {
      wrap.removeEventListener("scroll", syncFromWrap);
      bar.removeEventListener("scroll", syncFromBar);
      window.removeEventListener("resize", update);
    };
  }, deps);
}

export function useMenuDismiss(
  refs: Array<RefObject<HTMLElement | null>>,
  closeMenus: () => void
) {
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (refs.some((ref) => ref.current?.contains(target))) return;
      closeMenus();
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [closeMenus, refs]);
}

"use client";

import { useEffect, useRef } from "react";
import { formatMagnitude } from "@/lib/format";
import { formatKst } from "@/lib/timezone";
import type { NormalizedEarthquake } from "@/lib/types";
import { IconX } from "./icons";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-[var(--border-glass)] last:border-none">
      <th scope="row" className="py-2 pr-3 text-left text-xs font-normal text-[var(--ink-2)]">
        {label}
      </th>
      <td className="tabular py-2 text-right text-sm text-[var(--ink-0)]">{value}</td>
    </tr>
  );
}

export function TrustDialog({
  open,
  onClose,
  current,
  isSynthetic = false,
}: {
  open: boolean;
  onClose: () => void;
  current: NormalizedEarthquake | null;
  isSynthetic?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="trust-dialog"
      onClose={onClose}
      onCancel={onClose}
      aria-labelledby="trust-dialog-heading"
    >
      <div className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 id="trust-dialog-heading" className="text-sm font-semibold text-[var(--ink-0)]">
            원자료 · 저장값 · 화면값 세부 대조
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-full p-1 text-[var(--ink-2)] hover:text-[var(--ink-0)]"
          >
            <IconX className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {current ? (
          <>
            <p className="text-xs text-[var(--ink-2)]">
              아래 값은 {isSynthetic ? "합성 fixture" : "USGS 원자료"}를 한 번 정규화한 뒤 그대로 저장·표시합니다.
              지진 ID로 원자료 항목을 대조할 수 있습니다.
            </p>
            <table className="w-full">
              <tbody>
                <Row
                  label={isSynthetic ? "지진 ID (합성 원자료 → 합성 저장값 → 화면값)" : "지진 ID (원자료 = 저장값 = 화면값)"}
                  value={current.earthquakeId}
                />
                <Row label="규모 (mag)" value={`${current.unit} ${formatMagnitude(current.magnitude)}`} />
                <Row label="위치 (place)" value={current.place} />
                <Row label="깊이 (depth)" value={`${current.depthKm.toFixed(1)} km`} />
                <Row label="발생 시각 (time)" value={formatKst(current.observedAt)} />
                <Row label="원천 생성 시각 (metadata.generated)" value={formatKst(current.sourceGeneratedAt)} />
                <Row label="저장 일자 키 (recordDate, KST)" value={current.recordDate} />
              </tbody>
            </table>
          </>
        ) : (
          <p className="text-sm text-[var(--ink-1)]">대조할 값이 아직 없습니다.</p>
        )}
      </div>
    </dialog>
  );
}

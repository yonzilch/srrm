import React, { useState, useRef, useEffect, useCallback } from "react";

let uidCounter = 0;

/**
 * 可折叠区域组件（修复版）
 * - 默认收起，点击标题展开/收起
 * - 修复：移除 defaultOpen 导致的首次点击无效问题
 * - 使用 ref + scrollHeight 测量内容高度
 */
export default function CollapsibleSection({
  header,
  children,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const heightRef = useRef<number>(0);
  const uid = useRef(++uidCounter);

  // open 变化时重新测量内容高度
  useEffect(() => {
    if (contentRef.current) {
      heightRef.current = contentRef.current.scrollHeight;
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // 初始测量
  useEffect(() => {
    if (contentRef.current) {
      heightRef.current = contentRef.current.scrollHeight;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = useCallback(() => setOpen((v) => !v), []);

  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        type="button"
        role="switch"
        aria-checked={open}
        aria-controls={`collapse-${uid.current}`}
        className="flex w-full items-center justify-between gap-2 py-3.5 text-left hover:bg-white/5 rounded-xl px-2 transition-colors"
        onClick={toggle}
      >
        <span className="text-sm truncate">{header}</span>
        <span
          className={`flex-shrink-0 text-[10px] text-white/40 transition-transform duration-200 select-none ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

      <div
        id={`collapse-${uid.current}`}
        className="overflow-hidden transition-[max-height,opacity] duration-200 ease-in-out"
        style={{
          maxHeight: open ? `${heightRef.current}px` : "0",
          opacity: open ? 1 : 0,
        }}
      >
        <div ref={contentRef} className="pb-3">
          {children}
        </div>
      </div>
    </div>
  );
}
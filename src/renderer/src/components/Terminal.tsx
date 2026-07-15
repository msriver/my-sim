import React, { useEffect, useRef, useState } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import type { PtyExitInfo } from "../../../shared/ipc";
import { ConfirmDialog } from "./ConfirmDialog";

interface Props {
  issueId: string;
  issueTitle: string;
  active: boolean;
  onExit: () => void;
  onSessionExit: (issueId: string) => void;
}

export function Terminal({ issueId, issueTitle, active, onExit, onSessionExit }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [exitInfo, setExitInfo] = useState<PtyExitInfo | null>(null);
  const [confirmingKill, setConfirmingKill] = useState(false);
  const killedByUserRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Guards every callback below against firing after this effect run's own cleanup - React
    // StrictMode double-invokes this effect once in dev (mount -> cleanup -> mount again), and
    // without this, a ResizeObserver callback queued by the first (already-disposed) run can
    // still fire and call fitAddon.fit() on a torn-down terminal, crashing with "Cannot read
    // properties of undefined (reading 'dimensions')".
    let cancelled = false;

    const term = new XTerm({
      convertEol: true,
      fontSize: 14,
      theme: { background: "#111318" },
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(container);

    // xterm's internal renderer finishes initializing on the next animation frame - calling
    // fitAddon.fit() synchronously right after open() can throw "Cannot read properties of
    // undefined (reading 'dimensions')" because it isn't ready yet. Deferring one frame (plus
    // a try/catch backstop, since fit() can still be racy e.g. right after a resize) avoids it.
    // Also tells the actual pty about the new size after every fit (not just the initial one) -
    // otherwise resizing the window after the session starts never reaches the underlying
    // `claude` process, and a full-screen TUI redraws at the wrong size.
    function fitSafely() {
      if (cancelled) return;
      try {
        fitAddon.fit();
      } catch (err) {
        console.log(`[ui] xterm fit() 실패 (무시): ${err instanceof Error ? err.message : err}`);
        return;
      }
      window.api.pty.resize(issueId, term.cols, term.rows);
    }

    const initialFitFrame = requestAnimationFrame(fitSafely);

    const resizeObserver = new ResizeObserver(fitSafely);
    resizeObserver.observe(container);

    const offData = window.api.pty.onData((id, data) => {
      if (cancelled || id !== issueId) return;
      term.write(data);
    });
    const offExit = window.api.pty.onExit((id, info) => {
      if (cancelled || id !== issueId) return;
      console.log(
        `[ui] pty 세션 종료됨: "${issueTitle}" (exitCode=${info.exitCode}${info.signal ? `, signal=${info.signal}` : ""})`
      );
      setExitInfo(info);
      onSessionExit(issueId);
    });
    const onTermData = term.onData((data) => {
      if (cancelled) return;
      window.api.pty.write(issueId, data);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(initialFitFrame);
      resizeObserver.disconnect();
      onTermData.dispose();
      offData();
      offExit();
      term.dispose();
      // Sessions persist across view changes by design (Phase 6: background multi-session) -
      // unmounting this component (e.g. the user navigates elsewhere) must NOT kill the pty.
      // Killing only happens via the explicit "세션 종료" button, or the app quitting.
    };
    // Deliberately only [issueId]: this effect creates the xterm instance that holds this
    // session's scrollback. Re-running it on every parent re-render (e.g. because an inline
    // onSessionExit callback got a new identity) would dispose and recreate that buffer,
    // destroying the exact persistence this phase exists to provide. onSessionExit is only
    // ever used to call a stable state setter, so a "stale" closure over it is harmless.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueId]);

  const exitedNormally = exitInfo !== null && exitInfo.exitCode === 0 && !exitInfo.signal;

  function handleKillConfirm() {
    console.log(`[ui] 세션 종료 확인: "${issueTitle}"`);
    killedByUserRef.current = true;
    window.api.pty.kill(issueId);
    setConfirmingKill(false);
  }

  return (
    <div className="terminal-view" style={{ display: active ? "flex" : "none" }}>
      <div className="terminal-header">
        <span>{issueTitle} · Claude Code</span>
        <div className="terminal-header-actions">
          <button
            onClick={() => {
              console.log(`[ui] "← 목록으로" 클릭: "${issueTitle}"`);
              onExit();
            }}
          >
            ← 목록으로
          </button>
          {!exitInfo && (
            <button
              className="danger"
              onClick={() => {
                console.log(`[ui] "세션 종료" 클릭: "${issueTitle}"`);
                setConfirmingKill(true);
              }}
            >
              세션 종료
            </button>
          )}
        </div>
      </div>
      {exitInfo && (
        <div
          className={`terminal-exit-banner ${
            killedByUserRef.current ? "killed" : exitedNormally ? "normal" : "abnormal"
          }`}
        >
          {killedByUserRef.current
            ? "사용자가 세션을 종료했습니다."
            : exitedNormally
              ? "세션이 정상적으로 종료되었습니다."
              : `세션이 비정상 종료되었습니다 (code=${exitInfo.exitCode}${exitInfo.signal ? `, signal=${exitInfo.signal}` : ""}).`}
        </div>
      )}
      <div className="terminal-body">
        <div className="terminal-container" ref={containerRef} />
      </div>

      {confirmingKill && (
        <ConfirmDialog
          title="세션 종료"
          message={`"${issueTitle}" 세션을 종료하시겠습니까? 진행 중인 작업이 즉시 중단됩니다.`}
          confirmLabel="종료"
          onConfirm={handleKillConfirm}
          onCancel={() => setConfirmingKill(false)}
        />
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Drives the "hover → cinematic modal" pattern used across the card grids: rest the pointer on a
 * card for `showDelay` ms (default 2s) and a modal opens; leaving the card (or the modal itself)
 * starts a short grace period before it closes, so the pointer has time to travel from the card to
 * the modal without it slamming shut. Keyboard focus opens it immediately (no dwell) so the
 * interaction stays reachable without a mouse; blur closes it after the same grace period.
 */
export function useCinemaModal(showDelay = 2000, hideDelay = 260) {
  const [open, setOpen] = useState(false);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelShow = useCallback(() => {
    if (showTimer.current) {
      clearTimeout(showTimer.current);
      showTimer.current = null;
    }
  }, []);
  const cancelHide = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const scheduleShow = useCallback(() => {
    cancelHide();
    cancelShow();
    showTimer.current = setTimeout(() => setOpen(true), showDelay);
  }, [cancelHide, cancelShow, showDelay]);

  const scheduleHide = useCallback(() => {
    cancelShow();
    cancelHide();
    hideTimer.current = setTimeout(() => setOpen(false), hideDelay);
  }, [cancelShow, cancelHide, hideDelay]);

  const openNow = useCallback(() => {
    cancelShow();
    cancelHide();
    setOpen(true);
  }, [cancelShow, cancelHide]);

  const close = useCallback(() => {
    cancelShow();
    cancelHide();
    setOpen(false);
  }, [cancelShow, cancelHide]);

  useEffect(() => () => {
    cancelShow();
    cancelHide();
  }, [cancelShow, cancelHide]);

  return {
    open,
    close,
    /** Spread onto the hoverable card root. */
    cardBind: {
      onMouseEnter: scheduleShow,
      onMouseLeave: scheduleHide,
      onFocus: openNow,
      onBlur: scheduleHide,
    },
    /** Spread onto the modal panel root so moving into it cancels the pending close. */
    modalBind: {
      onMouseEnter: cancelHide,
      onMouseLeave: scheduleHide,
    },
  } as const;
}

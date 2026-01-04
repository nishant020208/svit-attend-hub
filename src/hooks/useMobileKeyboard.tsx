import { useEffect, useRef, useState } from "react";

/**
 * Hook to handle mobile keyboard interactions without UI glitches
 * Returns focus handlers and state to manage keyboard-related layout shifts
 */
export function useMobileKeyboard() {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const initialHeight = useRef(window.innerHeight);

  useEffect(() => {
    // Detect keyboard open by viewport height change
    const handleResize = () => {
      const heightDiff = initialHeight.current - window.innerHeight;
      const isOpen = heightDiff > 150; // Keyboard typically takes 150px+
      setIsKeyboardOpen(isOpen);
    };

    // Visual viewport API for better keyboard detection
    if ("visualViewport" in window && window.visualViewport) {
      const vv = window.visualViewport;
      const handleViewportResize = () => {
        const isOpen = vv.height < initialHeight.current * 0.75;
        setIsKeyboardOpen(isOpen);
      };
      
      vv.addEventListener("resize", handleViewportResize);
      return () => vv.removeEventListener("resize", handleViewportResize);
    } else {
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    // Scroll input into view after keyboard opens
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
  };

  const handleBlur = () => {
    // Reset scroll position on blur if needed
    setTimeout(() => {
      if (window.scrollY > 100) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 100);
  };

  return {
    isKeyboardOpen,
    inputProps: {
      onFocus: handleFocus,
      onBlur: handleBlur,
    },
  };
}

/**
 * CSS class names to apply to fixed elements when keyboard is open
 */
export function getKeyboardSafeStyles(isKeyboardOpen: boolean) {
  return isKeyboardOpen ? "hidden sm:flex" : "flex";
}

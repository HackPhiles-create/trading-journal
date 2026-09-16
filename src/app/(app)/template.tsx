// A pure-CSS transition, not a JS-driven one (see below for why).
//
// template.tsx re-mounts on every navigation (unlike layout.tsx), which is
// exactly what a per-route transition needs. This uses a CSS @keyframes
// animation (tw-animate-css's animate-in utilities) rather than Framer
// Motion's imperative animate(): a JS-driven animation that starts from
// opacity:0 can get stuck invisible if the animation never fires (observed
// in Android's WebView — Framer Motion's initial/animate transition never
// ran there, leaving every page permanently blank). A CSS animation has no
// such failure mode: if it doesn't run for any reason, the element simply
// renders at its normal, fully-visible end state.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-in fade-in slide-in-from-bottom-1 duration-300 ease-out">{children}</div>;
}

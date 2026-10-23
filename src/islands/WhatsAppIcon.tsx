import { whatsappPaths } from "../components/icon-paths";

/** Mesmo desenho do Icon.astro, para os botões dentro das ilhas. */
export function WhatsAppIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={whatsappPaths.balloon} />
      <path fill="currentColor" stroke="none" d={whatsappPaths.handset} />
    </svg>
  );
}

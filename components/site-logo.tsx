import Link from "next/link";

export function LogoMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="logo-mark">
      <path d="M8 29c7-1 10-11 17-11 7 0 8 7 15 5-3 10-10 17-20 17C13 40 9 36 8 29Z" />
      <path d="M7 22c6 1 10-8 17-8 6 0 9 4 15 2-4-6-9-9-16-9C15 7 9 13 7 22Z" opacity=".45" />
    </svg>
  );
}

export function SiteLogo({ light = false }: { light?: boolean }) {
  return (
    <Link className={`brand ${light ? "brand-light" : ""}`} href="/" aria-label="Oceanman ana sayfa">
      <LogoMark />
      <span>
        <strong>OCEAN</strong>MAN
        <small>EDİRNE · MEN&apos;S STUDIO</small>
      </span>
    </Link>
  );
}

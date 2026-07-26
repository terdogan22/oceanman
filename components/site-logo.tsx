/* eslint-disable @next/next/no-html-link-for-pages -- The footer logo intentionally performs a full page reload. */
import Image from "next/image";
import Link from "next/link";

export function LogoMark() {
  return (
    <Image
      className="logo-mark"
      src="/images/oceanman-logo.jpg"
      alt=""
      width={48}
      height={48}
      priority
    />
  );
}

export function SiteLogo({ light = false, reloadOnClick = false }: { light?: boolean; reloadOnClick?: boolean }) {
  const content = (
    <>
      <LogoMark />
      <span>
        <span className="brand-name"><strong>OCEAN</strong> MAN</span>
        <small>YENİ NESİL BERBER · EDİRNE</small>
      </span>
    </>
  );

  if (reloadOnClick) {
    return (
      <a className={`brand ${light ? "brand-light" : ""}`} href="/" aria-label="Oceanman ana sayfayı yenile ve en üste git">
        {content}
      </a>
    );
  }

  return (
    <Link className={`brand ${light ? "brand-light" : ""}`} href="/" aria-label="Oceanman ana sayfa">
      {content}
    </Link>
  );
}

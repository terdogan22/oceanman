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

export function SiteLogo({ light = false }: { light?: boolean }) {
  return (
    <Link className={`brand ${light ? "brand-light" : ""}`} href="/" aria-label="Oceanman ana sayfa">
      <LogoMark />
      <span>
        <strong>OCEAN</strong>MAN
        <small>YENİ NESİL BERBER · EDİRNE</small>
      </span>
    </Link>
  );
}

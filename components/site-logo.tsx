import Image from "next/image";
import Link from "next/link";
import logo from "@/fotoac/logo-dla.png";

export function SiteLogo() {
  return <Link className="logo" href="/" aria-label="DLA AC, beranda"><Image className="logo-image" src={logo} alt="" width={58} height={58} /><span>DLA AC<small>JUAL BELI AC &amp; TEKNISI</small></span></Link>;
}

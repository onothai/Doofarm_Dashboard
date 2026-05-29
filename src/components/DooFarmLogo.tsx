import logoUrl from "../assets/doofarm-logo.png";

type DooFarmLogoProps = {
  className?: string;
  alt?: string;
};

export function DooFarmLogo({
  className = "doofarmLogo",
  alt = "DooFarm",
}: DooFarmLogoProps) {
  return <img className={className} src={logoUrl} alt={alt} />;
}

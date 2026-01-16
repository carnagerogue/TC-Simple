import Image from "next/image";

type IntegrationTileProps = {
  name: string;
  description: string;
  logo: string;
};

export function IntegrationTile({ name, description, logo }: IntegrationTileProps) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm shadow-slate-200/40">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50">
        <Image src={logo} alt={`${name} logo`} width={36} height={36} />
      </div>
      <div>
        <p className="text-base font-semibold text-slate-900">{name}</p>
        <p className="text-sm text-slate-600">{description}</p>
      </div>
    </div>
  );
}


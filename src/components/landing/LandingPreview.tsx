"use client";

import type { LandingBlock, LandingPaleta } from "@/lib/landing-blocks";
import { BlockRenderer } from "./BlockRenderer";

type Props = {
  bloques: LandingBlock[];
  paleta?: LandingPaleta;
  nombre: string;
  hostelId?: string;
};

export function LandingPreview({ bloques, paleta, nombre, hostelId }: Props) {
  const bgColor = paleta?.fondo ?? "#0f1623";
  const textColor = paleta?.texto ?? "#ffffff";
  const sorted = bloques.slice().sort((a, b) => a.orden - b.orden);

  return (
    <div
      className="h-full w-full overflow-y-auto"
      style={{ background: bgColor, color: textColor }}
    >
      {sorted.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center text-center px-8">
          <span className="text-5xl mb-4">🏨</span>
          <h1 className="text-3xl font-bold" style={{ color: textColor }}>{nombre}</h1>
          <p className="mt-4 text-sm opacity-40">
            Agregá bloques desde el panel para construir tu landing →
          </p>
        </div>
      ) : (
        sorted.map((bloque) => (
          <BlockRenderer
            key={bloque.id}
            block={bloque}
            paleta={paleta}
            hostelId={hostelId}
          />
        ))
      )}
    </div>
  );
}

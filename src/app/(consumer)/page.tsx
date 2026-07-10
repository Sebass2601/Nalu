import Image from "next/image";
import MultiLayerParallax from "@/components/ui/MultiLayerParallax"
import { Cinzel } from 'next/font/google';

const cinzel = Cinzel({ subsets: ["latin"] });

export default function Home() {
  return (
    <main className={cinzel.className}>
      <MultiLayerParallax />
    </main>
  );
}

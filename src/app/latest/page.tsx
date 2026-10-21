import { Gallery } from "@/components/gallery";
export const metadata = { title: "Latest wallpapers" };
export default function Page() {
  return (
    <div className="shell">
      <Gallery mode="latest" />
    </div>
  );
}

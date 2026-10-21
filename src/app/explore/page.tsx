import { Gallery } from "@/components/gallery";
export const metadata = { title: "Explore wallpapers" };
export default function Page() {
  return (
    <div className="shell">
      <Gallery />
    </div>
  );
}

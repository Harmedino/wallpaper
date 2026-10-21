import { Gallery } from "@/components/gallery";
export const metadata = { title: "Trending wallpapers" };
export default function Page() {
  return (
    <div className="shell">
      <Gallery mode="trending" />
    </div>
  );
}

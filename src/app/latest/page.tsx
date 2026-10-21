import { Gallery } from "@/components/gallery";
export const metadata = { title: "Latest wallpapers" };
export default function Page() {
  return (
    <div className="shell pt-14">
      <Gallery mode="latest" />
    </div>
  );
}

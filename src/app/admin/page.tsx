import { Admin } from "@/components/admin";
export const metadata = {
  title: "Administrator dashboard",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <Admin />;
}

import { redirect } from "next/navigation";

// The pending page became the multi-step onboarding flow.
export default function PendingPage() {
  redirect("/onboarding");
}

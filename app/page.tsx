import { redirect } from "next/navigation";

/** Root redirects to the Dashboard (SoT §4.2 / APP_FLOW §1.4). */
export default function Home() {
  redirect("/dashboard");
}

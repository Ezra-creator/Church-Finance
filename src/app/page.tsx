import { redirect } from "next/navigation";
import { auth } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function IndexPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/today");
  } else {
    redirect("/login");
  }
}

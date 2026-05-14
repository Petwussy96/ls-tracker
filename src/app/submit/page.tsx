// Server component — requires auth (enforced via middleware as well).
// Reads the session and renders the form.

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SubmitForm } from "@/components/SubmitForm";

export const dynamic = "force-dynamic";

export default async function SubmitPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?next=/submit");
  }
  return (
    <SubmitForm
      currentUser={{
        username: session.user.username,
        displayName: session.user.name ?? session.user.username,
      }}
    />
  );
}

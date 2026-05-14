import { JoinForm } from "@/components/JoinForm";

export const dynamic = "force-dynamic";

export default function JoinPage({ searchParams }: { searchParams: { code?: string } }) {
  return <JoinForm prefillCode={searchParams.code ?? ""} />;
}

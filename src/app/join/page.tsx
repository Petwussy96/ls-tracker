import { JoinForm } from "@/components/JoinForm";

export default function JoinPage({ searchParams }: { searchParams: { code?: string } }) {
  return <JoinForm prefillCode={searchParams.code ?? ""} />;
}

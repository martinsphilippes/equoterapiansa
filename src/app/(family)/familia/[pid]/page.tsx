import { redirect } from "next/navigation";
export default async function FamilyPractitionerIndex({ params }: { params: Promise<{ pid: string }> }) {
  const { pid } = await params;
  redirect(`/familia/${pid}/agenda`);
}

import { EntryEdit } from "@/components/finance/pages";
import type { Params } from "@/lib/types";
export default async function Page({ params }: { params: Params<{ id: string }> }) { const { id } = await params; return <EntryEdit kind="receivable" id={id} />; }

import { EntryNew } from "@/components/finance/pages";
import type { SearchParams } from "@/lib/types";
export default async function Page({ searchParams }: { searchParams: SearchParams }) { return <EntryNew kind="receivable" sp={await searchParams} />; }

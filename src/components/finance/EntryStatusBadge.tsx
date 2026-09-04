import { Badge } from "@/components/ui";
import type { EntryDisplayStatus } from "@/lib/db/finance-types";
import { STATUS_LABEL } from "@/lib/domain/finance";

const tone: Record<EntryDisplayStatus, "green" | "gray" | "amber" | "red" | "blue"> = { planned: "blue", pending: "gray", partial: "amber", paid: "green", overdue: "red", cancelled: "gray" };

export function EntryStatusBadge({ status }: { status: EntryDisplayStatus }) {
  return <Badge tone={tone[status]}>{STATUS_LABEL[status]}</Badge>;
}

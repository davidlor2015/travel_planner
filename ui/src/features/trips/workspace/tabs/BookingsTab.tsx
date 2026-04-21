import { ReservationsPanel } from "../../ReservationsPanel";

interface BookingsTabProps {
  token: string;
  tripId: number;
}

export function BookingsTab({ token, tripId }: BookingsTabProps) {
  return (
    <div className="space-y-3">
      <ReservationsPanel token={token} tripId={tripId} />
    </div>
  );
}

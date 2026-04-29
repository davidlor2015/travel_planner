import { fireEvent, render } from "@testing-library/react-native";

import { PendingTripInvitesSection } from "@/features/trips/PendingTripInvitesSection";
import type { PendingTripInvite } from "@/features/trips/types";

function invite(overrides: Partial<PendingTripInvite> = {}): PendingTripInvite {
  return {
    id: overrides.id ?? 42,
    trip_id: overrides.trip_id ?? 7,
    trip_title: overrides.trip_title ?? "Lisbon Week",
    destination: overrides.destination ?? "Lisbon, Portugal",
    start_date: overrides.start_date ?? "2026-10-02",
    end_date: overrides.end_date ?? "2026-10-07",
    invitee_email: overrides.invitee_email ?? "guest@example.com",
    role: overrides.role ?? "member",
    status: overrides.status ?? "pending",
    created_at: overrides.created_at ?? "2026-04-29T12:00:00Z",
    expires_at: overrides.expires_at ?? "2026-05-06T12:00:00Z",
    invited_by_email: overrides.invited_by_email ?? "owner@example.com",
    invited_by_display_name: overrides.invited_by_display_name ?? "Avery",
  };
}

describe("PendingTripInvitesSection", () => {
  it("renders pending invite details", () => {
    const view = render(
      <PendingTripInvitesSection
        invites={[invite()]}
        isLoading={false}
        error={null}
        action={null}
        onAccept={jest.fn()}
        onDecline={jest.fn()}
        onRetry={jest.fn()}
      />,
    );

    expect(view.getByText("You've been invited to Lisbon Week")).toBeTruthy();
    expect(view.getByText("Avery invited guest@example.com.")).toBeTruthy();
    expect(view.getByText(/Lisbon, Portugal/)).toBeTruthy();
    expect(view.getByText("Accept")).toBeTruthy();
    expect(view.getByText("Decline")).toBeTruthy();
  });

  it("calls accept and decline handlers", () => {
    const onAccept = jest.fn();
    const onDecline = jest.fn();
    const view = render(
      <PendingTripInvitesSection
        invites={[invite()]}
        isLoading={false}
        error={null}
        action={null}
        onAccept={onAccept}
        onDecline={onDecline}
        onRetry={jest.fn()}
      />,
    );

    fireEvent.press(view.getByText("Accept"));
    fireEvent.press(view.getByText("Decline"));

    expect(onAccept).toHaveBeenCalledWith(42);
    expect(onDecline).toHaveBeenCalledWith(42);
  });

  it("renders empty state", () => {
    const view = render(
      <PendingTripInvitesSection
        invites={[]}
        isLoading={false}
        error={null}
        action={null}
        onAccept={jest.fn()}
        onDecline={jest.fn()}
        onRetry={jest.fn()}
      />,
    );

    expect(view.getByTestId("pending-invites-empty")).toBeTruthy();
    expect(view.getByText("No pending trip invitations.")).toBeTruthy();
  });

  it("renders error state and retries", () => {
    const onRetry = jest.fn();
    const view = render(
      <PendingTripInvitesSection
        invites={[]}
        isLoading={false}
        error="We couldn't load your trip invites. Try again."
        action={null}
        onAccept={jest.fn()}
        onDecline={jest.fn()}
        onRetry={onRetry}
      />,
    );

    expect(view.getByTestId("pending-invites-error")).toBeTruthy();
    fireEvent.press(view.getByText("Try again"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders loading state", () => {
    const view = render(
      <PendingTripInvitesSection
        invites={[]}
        isLoading
        error={null}
        action={null}
        onAccept={jest.fn()}
        onDecline={jest.fn()}
        onRetry={jest.fn()}
      />,
    );

    expect(view.getByTestId("pending-invites-loading")).toBeTruthy();
  });
});

from app.core import email


def send_leave_requested(to: str, *, leave_type: str, start_date: str, end_date: str) -> None:
    email.send_email(
        to=to,
        subject="Leave request submitted",
        body_text=(
            f"Your {leave_type} request from {start_date} to {end_date} has been "
            "submitted and is awaiting approval."
        ),
    )


def send_leave_decided(to: str, *, message: str, approved: bool) -> None:
    email.send_email(
        to=to,
        subject="Leave request approved" if approved else "Leave request rejected",
        body_text=message,
    )


def send_leave_cancelled(to: str, *, leave_type: str) -> None:
    email.send_email(
        to=to,
        subject="Leave request cancelled",
        body_text=f"Your {leave_type} request has been cancelled.",
    )

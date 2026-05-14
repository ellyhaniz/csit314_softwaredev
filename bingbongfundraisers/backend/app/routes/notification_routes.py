from fastapi import APIRouter

from app.repositories.notification_repository import NotificationRepository

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("/{user_id}", summary="Get notifications for a user")
def get_notifications(user_id: int):
    notifications = NotificationRepository.get_by_user(user_id)
    unread = sum(1 for n in notifications if not n["is_read"])
    return {"notifications": notifications, "unread": unread}


@router.post("/{user_id}/read-all", summary="Mark all notifications as read")
def mark_all_read(user_id: int):
    NotificationRepository.mark_all_read(user_id)
    return {"message": "All notifications marked as read"}

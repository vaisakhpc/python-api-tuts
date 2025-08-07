from rest_framework.routers import DefaultRouter
from ..views.user_views import UserViewSet

router = DefaultRouter()
router.register(r"", UserViewSet, basename="user")

urlpatterns = router.urls

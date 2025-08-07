from rest_framework.routers import DefaultRouter
from api.views.mfholding_view import MFHoldingViewSet
from api.views.mutual_fund_view import MutualFundViewSet

router = DefaultRouter()
router.register(r"mfholdings", MFHoldingViewSet, basename="mfholding")
router.register(r"mutualfunds", MutualFundViewSet, basename="mutualfund")

urlpatterns = router.urls

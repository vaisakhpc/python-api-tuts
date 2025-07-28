from django.urls import path, include
from api.views.token_view import MyTokenObtainPairView
from rest_framework_simplejwt.views import (
    TokenRefreshView,
)
from api.views.user_registration_view import ResendRegistrationEmailView
from api.views.user_password_view import SetPasswordView
from api.views.apiuser_token_view import UserTokenObtainView, UserTokenRefreshView
from api.views.mutual_fund_search_view import MutualFundSearchView
from api.views.fetch_mutual_funds_view import FetchMutualFundsView
from api.views.mutual_fund_detail_view import MutualFundDetailView
from api.views.portfolio_returns_view import PortfolioReturnsView
from api.views.historical_profit_view import HistoricalProfitView
from api.views.transaction_import_view import TransactionImportView

urlpatterns = [
    path('users/', include('api.routes.user_urls')),
    path('token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('user/resend-registration/', ResendRegistrationEmailView.as_view()),
    path('user/set-password/', SetPasswordView.as_view()),
    path('user/token/', UserTokenObtainView.as_view()),
    path('user/token/refresh/', UserTokenRefreshView.as_view()),
    path('mutualfunds/search/', MutualFundSearchView.as_view(), name='mutualfund-search'),
    path('mutualfund/<str:isin_growth>/', MutualFundDetailView.as_view(), name='mf-detail-by-isin'),
    path('mutualfund/code/<int:mf_scheme_code>/', MutualFundDetailView.as_view(), name='mf-detail-by-code'),
    path('', include('api.routes.mf_urls')),
    path('fetch-funds/', FetchMutualFundsView.as_view(), name='fetch-mutual-funds'),
    path('portfolio-returns/', PortfolioReturnsView.as_view()),
    path('historical-profit/', HistoricalProfitView.as_view()),
    path('import-transactions/', TransactionImportView.as_view()),
]
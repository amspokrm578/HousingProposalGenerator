from django.contrib import admin
from django.urls import include, path
from rest_framework.authtoken.views import obtain_auth_token

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("proposals.urls")),
    path("api/analytics/", include("analytics.urls")),
    path("api/accounts/", include("accounts.urls")),
    path("api/auth/token/", obtain_auth_token, name="auth-token"),
    path("api/auth/", include("rest_framework.urls")),
]

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import BoroughViewSet, NeighborhoodViewSet, ProposalViewSet

router = DefaultRouter()
router.register(r"boroughs", BoroughViewSet, basename="borough")
router.register(r"neighborhoods", NeighborhoodViewSet, basename="neighborhood")
router.register(r"proposals", ProposalViewSet, basename="proposal")

urlpatterns = [
    path("", include(router.urls)),
]

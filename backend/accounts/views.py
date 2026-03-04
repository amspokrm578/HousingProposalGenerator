from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ensure_user_profile
from .serializers import CurrentUserSerializer


class CurrentUserView(APIView):
    """
    Return the currently authenticated user along with their Green-Tape role.

    Frontend clients can use this endpoint to determine whether the logged-in
    user is a Public Development Outcome (PDO) user and adapt the UI
    (e.g., enabling the self-improvement loop dashboard).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        ensure_user_profile(request.user)
        serializer = CurrentUserSerializer(request.user)
        return Response(serializer.data)


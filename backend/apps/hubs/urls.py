from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.hubs.views import (
    HubViewSet, CCTVRevealView,
    HubContactViewSet, HubLicenceViewSet, HubBroadbandViewSet
)

router = DefaultRouter()
router.register(r'', HubViewSet, basename='hub')

urlpatterns = [
    # CCTV Reveal security endpoint (strict admin password challenge)
    path('<int:pk>/cctv/reveal/', CCTVRevealView.as_view(), name='hub-cctv-reveal'),

    # Sub-resource collection endpoints
    path('<int:hub_pk>/contacts/', HubContactViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='hub-contacts-list'),
    path('<int:hub_pk>/contacts/<int:pk>/', HubContactViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='hub-contacts-detail'),

    path('<int:hub_pk>/licences/', HubLicenceViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='hub-licences-list'),
    path('<int:hub_pk>/licences/<int:pk>/', HubLicenceViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='hub-licences-detail'),

    path('<int:hub_pk>/broadband/', HubBroadbandViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='hub-broadband-list'),
    path('<int:hub_pk>/broadband/<int:pk>/', HubBroadbandViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='hub-broadband-detail'),

    # Master router
    path('', include(router.urls)),
]
